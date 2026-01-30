/**
 * Financial Model Migration Utility
 *
 * Migrates from old project-level financial models to new design-level architecture:
 * - FinancialModel (project-level) → DesignFinancialModel (design-level)
 * - BOQ items → CAPEX items in DesignFinancialModel
 * - Creates ProjectFinancialSettings for each project
 */

import type { FinancialModel, DesignFinancialModel, CostLineItem } from '@/lib/types/financial';
import type { BOQ } from '@/lib/types/boq';
import type { Design } from '@/lib/types';

// ============================================================================
// Migration Types
// ============================================================================

export type MigrationConflictType =
  | 'multiple_designs_one_model'  // Project has multiple designs but only one financial model
  | 'no_designs'                  // Project has financial model but no designs
  | 'orphan_model'                // Financial model references non-existent project
  | 'orphan_boq';                 // BOQ references non-existent design

export interface MigrationConflict {
  type: MigrationConflictType;
  projectId?: string;
  projectName?: string;
  designIds?: string[];
  modelId?: string;
  modelName?: string;
  boqId?: string;
  boqName?: string;
  message: string;
}

export type ConflictResolutionStrategy =
  | 'assign_to_first'      // Assign model to first design, create empty for others
  | 'assign_to_specific'   // Assign model to specific design
  | 'duplicate_to_all'     // Duplicate model to all designs
  | 'create_empty_all'     // Create empty models for all designs
  | 'skip';                // Skip this conflict

export interface ConflictResolution {
  conflictType: MigrationConflictType;
  projectId: string;
  strategy: ConflictResolutionStrategy;
  designId?: string;       // For 'assign_to_specific' strategy
}

export interface MigrationResult {
  success: boolean;
  migratedModels: number;
  migratedBOQs: number;
  createdSettings: number;
  conflicts: MigrationConflict[];
  errors: string[];
  warnings: string[];
}

export interface MigrationStats {
  totalOldModels: number;
  totalBOQs: number;
  totalProjects: number;
  totalDesigns: number;
  modelsToMigrate: number;
  boqsToMigrate: number;
  settingsToCreate: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Migration Functions
// ============================================================================

/**
 * Detect conflicts in the migration (e.g., multiple designs per project)
 */
export function detectMigrationConflicts(
  oldModels: FinancialModel[],
  boqs: BOQ[],
  designs: Design[],
  projects: Array<{ id: string; name: string }>
): MigrationConflict[] {
  const conflicts: MigrationConflict[] = [];

  // Group designs by project
  const designsByProject = new Map<string, Design[]>();
  designs.forEach((design) => {
    const list = designsByProject.get(design.projectId) || [];
    list.push(design);
    designsByProject.set(design.projectId, list);
  });

  // Check each old financial model
  oldModels.forEach((model) => {
    const project = projects.find((p) => p.id === model.projectId);

    // Orphan model (project doesn't exist)
    if (!project) {
      conflicts.push({
        type: 'orphan_model',
        modelId: model.id,
        modelName: model.name,
        message: `Financial model "${model.name}" references non-existent project ${model.projectId}`,
      });
      return;
    }

    const projectDesigns = designsByProject.get(model.projectId) || [];

    // Project has no designs
    if (projectDesigns.length === 0) {
      conflicts.push({
        type: 'no_designs',
        projectId: model.projectId,
        projectName: project.name,
        modelId: model.id,
        modelName: model.name,
        message: `Project "${project.name}" has a financial model but no designs. Cannot migrate to design-level.`,
      });
      return;
    }

    // Project has multiple designs (need to decide which design gets the model)
    if (projectDesigns.length > 1) {
      conflicts.push({
        type: 'multiple_designs_one_model',
        projectId: model.projectId,
        projectName: project.name,
        designIds: projectDesigns.map((d) => d.id),
        modelId: model.id,
        modelName: model.name,
        message: `Project "${project.name}" has ${projectDesigns.length} designs but only one financial model. Choose: assign to first design, duplicate to all, or create empty for all.`,
      });
    }
  });

  // Check orphan BOQs (design doesn't exist)
  boqs.forEach((boq) => {
    const design = designs.find((d) => d.id === boq.designId);
    if (!design) {
      conflicts.push({
        type: 'orphan_boq',
        boqId: boq.id,
        boqName: boq.name,
        message: `BOQ "${boq.name}" references non-existent design ${boq.designId}`,
      });
    }
  });

  return conflicts;
}

/**
 * Convert BOQ items to CostLineItem format for CAPEX
 */
export function convertBOQItemsToCAPEX(boq: BOQ): CostLineItem[] {
  return boq.items.map((item) => ({
    id: crypto.randomUUID(), // Generate new ID for cost item
    name: item.name,
    amount: item.totalPrice,
    is_capex: true,
    category: item.category,
    unit_price: item.unitPrice,
    quantity: item.quantity,
    unit: item.unit,
    margin_percent: undefined, // Will use global margin
    source: item.source as 'manual' | 'dxf_extraction' | 'component_library',
    sourceId: item.sourceId || `boq_${boq.id}`, // Track original BOQ
  }));
}

/**
 * Convert old FinancialInputs to new DesignFinancialModel format
 */
export function convertFinancialModelToDesign(
  oldModel: FinancialModel,
  targetDesignId: string,
  targetProjectId: string,
  existingCAPEX?: CostLineItem[] // If BOQ already converted
): Omit<DesignFinancialModel, 'id' | 'createdAt' | 'updatedAt'> {
  const inputs = oldModel.inputs;

  return {
    designId: targetDesignId,
    projectId: targetProjectId,
    name: oldModel.name,

    // Core inputs
    capacity: inputs.capacity,
    p50_year_0_yield: inputs.p50_year_0_yield,
    ppa_price: inputs.ppa_price,

    // Additional CAPEX: Non-equipment costs (equipment costs now come from BOQ)
    // If BOQ exists, only migrate manual items; otherwise migrate all old items
    additionalCapex: existingCAPEX
      ? inputs.capex_items.filter((item) => item.is_capex && item.source === 'manual')
      : inputs.capex_items.filter((item) => item.is_capex),
    global_margin: inputs.global_margin,

    // OPEX: Use old opex_items
    opex: inputs.opex_items.filter((item) => !item.is_capex),

    // Technical/Economic params
    degradation_rate: inputs.degradation_rate,
    ppa_escalation: inputs.ppa_escalation,
    om_escalation: inputs.om_escalation,
    tax_rate: inputs.tax_rate,
    discount_rate: inputs.discount_rate,
    project_lifetime: inputs.project_lifetime,

    // Financing (extracted from old inputs)
    financing: {
      gearing_ratio: inputs.gearing_ratio,
      interest_rate: inputs.interest_rate,
      debt_tenor: inputs.debt_tenor,
      target_dscr: inputs.target_dscr,
    },

    // Yield estimate
    yieldEstimate: inputs.yieldEstimate,

    // Results
    results: oldModel.results,

    // Winner status (default to false)
    isWinner: false,

    // Metadata (preserve original creator)
    createdBy: oldModel.createdBy,
    creatorId: oldModel.creatorId,
  };
}

/**
 * Perform the migration with conflict resolutions
 */
export function migrateFinancialData(
  oldModels: FinancialModel[],
  boqs: BOQ[],
  designs: Design[],
  projects: Array<{ id: string; name: string }>,
  conflictResolutions?: Record<string, ConflictResolution>
): MigrationResult {
  const result: MigrationResult = {
    success: true,
    migratedModels: 0,
    migratedBOQs: 0,
    createdSettings: 0,
    conflicts: [],
    errors: [],
    warnings: [],
  };

  // Detect conflicts first
  const allConflicts = detectMigrationConflicts(oldModels, boqs, designs, projects);

  // Separate resolvable conflicts from blocking ones
  const blockingConflicts = allConflicts.filter(
    (c) => c.type === 'orphan_model' || c.type === 'orphan_boq' || c.type === 'no_designs'
  );

  const resolvableConflicts = allConflicts.filter(
    (c) => c.type === 'multiple_designs_one_model'
  );

  // Check if all resolvable conflicts have resolutions
  const unresolvedConflicts = resolvableConflicts.filter(
    (c) => !conflictResolutions?.[c.projectId || '']
  );

  if (blockingConflicts.length > 0) {
    result.success = false;
    result.conflicts = blockingConflicts;
    result.errors.push(
      `Found ${blockingConflicts.length} blocking conflict(s) that cannot be auto-resolved. Manual intervention required.`
    );
    return result;
  }

  if (unresolvedConflicts.length > 0) {
    result.success = false;
    result.conflicts = unresolvedConflicts;
    result.errors.push(
      `Found ${unresolvedConflicts.length} conflict(s) requiring resolution strategy.`
    );
    return result;
  }

  // Migration data structures
  const newDesignModels: DesignFinancialModel[] = [];
  const newProjectSettings: Array<{
    projectId: string;
    defaultAssumptions: any;
  }> = [];

  // Group BOQs by designId for easy lookup
  const boqsByDesign = new Map<string, BOQ>();
  boqs.forEach((boq) => {
    boqsByDesign.set(boq.designId, boq);
  });

  // Group designs by projectId
  const designsByProject = new Map<string, Design[]>();
  designs.forEach((design) => {
    const list = designsByProject.get(design.projectId) || [];
    list.push(design);
    designsByProject.set(design.projectId, list);
  });

  // Process each old financial model
  oldModels.forEach((oldModel) => {
    const projectDesigns = designsByProject.get(oldModel.projectId) || [];

    // Skip if already filtered by conflicts
    if (projectDesigns.length === 0) {
      return;
    }

    // Create project settings (one per project, once)
    if (!newProjectSettings.find((s) => s.projectId === oldModel.projectId)) {
      newProjectSettings.push({
        projectId: oldModel.projectId,
        defaultAssumptions: {
          ppa_escalation: oldModel.inputs.ppa_escalation,
          om_escalation: oldModel.inputs.om_escalation,
          degradation_rate: oldModel.inputs.degradation_rate,
          tax_rate: oldModel.inputs.tax_rate,
          discount_rate: oldModel.inputs.discount_rate,
          project_lifetime: oldModel.inputs.project_lifetime,
        },
      });
      result.createdSettings++;
    }

    // Handle single design (straightforward)
    if (projectDesigns.length === 1) {
      const design = projectDesigns[0];

      // Check if design has BOQ to merge
      const boq = boqsByDesign.get(design.id);
      const capexFromBOQ = boq ? convertBOQItemsToCAPEX(boq) : undefined;

      const newModel: DesignFinancialModel = {
        ...convertFinancialModelToDesign(
          oldModel,
          design.id,
          oldModel.projectId,
          capexFromBOQ
        ),
        id: crypto.randomUUID(),
        createdAt: oldModel.createdAt,
        updatedAt: oldModel.updatedAt,
      };

      newDesignModels.push(newModel);
      result.migratedModels++;

      if (boq) {
        result.migratedBOQs++;
        result.warnings.push(
          `BOQ "${boq.name}" merged into design financial model "${newModel.name}"`
        );
      }
    }
    // Handle multiple designs (apply resolution strategy)
    else {
      const resolution = conflictResolutions?.[oldModel.projectId];

      if (!resolution) {
        // Shouldn't happen if we checked properly above
        result.errors.push(
          `No resolution found for project ${oldModel.projectId} with multiple designs`
        );
        return;
      }

      switch (resolution.strategy) {
        case 'assign_to_first': {
          // Assign model to first design
          const firstDesign = projectDesigns[0];
          const boq = boqsByDesign.get(firstDesign.id);
          const capexFromBOQ = boq ? convertBOQItemsToCAPEX(boq) : undefined;

          const newModel: DesignFinancialModel = {
            ...convertFinancialModelToDesign(
              oldModel,
              firstDesign.id,
              oldModel.projectId,
              capexFromBOQ
            ),
            id: crypto.randomUUID(),
            createdAt: oldModel.createdAt,
            updatedAt: oldModel.updatedAt,
          };

          newDesignModels.push(newModel);
          result.migratedModels++;

          if (boq) {
            result.migratedBOQs++;
          }

          result.warnings.push(
            `Assigned financial model to first design "${firstDesign.name}". Other designs will have no model.`
          );
          break;
        }

        case 'duplicate_to_all': {
          // Duplicate model to all designs
          projectDesigns.forEach((design) => {
            const boq = boqsByDesign.get(design.id);
            const capexFromBOQ = boq ? convertBOQItemsToCAPEX(boq) : undefined;

            const newModel: DesignFinancialModel = {
              ...convertFinancialModelToDesign(
                oldModel,
                design.id,
                oldModel.projectId,
                capexFromBOQ
              ),
              id: crypto.randomUUID(),
              name: `${design.name} - Financial Model`,
              createdAt: oldModel.createdAt,
              updatedAt: oldModel.updatedAt,
            };

            newDesignModels.push(newModel);
            result.migratedModels++;

            if (boq) {
              result.migratedBOQs++;
            }
          });

          result.warnings.push(
            `Duplicated financial model to all ${projectDesigns.length} designs in project.`
          );
          break;
        }

        case 'create_empty_all': {
          // Create empty models for all designs (BOQ is now source of equipment CAPEX)
          projectDesigns.forEach((design) => {
            const boq = boqsByDesign.get(design.id);

            const newModel: DesignFinancialModel = {
              designId: design.id,
              projectId: oldModel.projectId,
              name: `${design.name} - Financial Model`,
              capacity: oldModel.inputs.capacity,
              p50_year_0_yield: oldModel.inputs.p50_year_0_yield,
              ppa_price: oldModel.inputs.ppa_price,
              additionalCapex: [], // Equipment costs come from BOQ
              opex: [],
              global_margin: 0,
              degradation_rate: oldModel.inputs.degradation_rate,
              ppa_escalation: oldModel.inputs.ppa_escalation,
              om_escalation: oldModel.inputs.om_escalation,
              tax_rate: oldModel.inputs.tax_rate,
              discount_rate: oldModel.inputs.discount_rate,
              project_lifetime: oldModel.inputs.project_lifetime,
              financing: {
                gearing_ratio: oldModel.inputs.gearing_ratio,
                interest_rate: oldModel.inputs.interest_rate,
                debt_tenor: oldModel.inputs.debt_tenor,
                target_dscr: oldModel.inputs.target_dscr,
              },
              isWinner: false,
              createdBy: oldModel.createdBy,
              creatorId: oldModel.creatorId,
              id: crypto.randomUUID(),
              createdAt: oldModel.createdAt,
              updatedAt: oldModel.updatedAt,
            };

            newDesignModels.push(newModel);
            result.migratedModels++;

            if (boq) {
              result.migratedBOQs++;
            }
          });

          result.warnings.push(
            `Created empty financial models for all ${projectDesigns.length} designs. Old model data discarded.`
          );
          break;
        }

        case 'skip': {
          result.warnings.push(
            `Skipped migration for project "${oldModel.projectId}" as requested.`
          );
          break;
        }
      }
    }
  });

  // Process standalone BOQs (designs without old financial models)
  boqs.forEach((boq) => {
    const design = designs.find((d) => d.id === boq.designId);
    if (!design) return; // Orphan, already handled

    // Check if we already migrated this BOQ (via financial model above)
    const alreadyMigrated = newDesignModels.some((m) => m.designId === design.id);
    if (alreadyMigrated) return;

    // Create design financial model for design with BOQ
    // BOQ is now the source of equipment CAPEX; additionalCapex is for non-equipment costs

    // Get project settings if they exist
    const projectSettings = newProjectSettings.find((s) => s.projectId === design.projectId);

    // Create minimal model (equipment costs come from BOQ)
    const newModel: DesignFinancialModel = {
      id: crypto.randomUUID(),
      designId: design.id,
      projectId: design.projectId,
      name: `${design.name} - Financial Model`,
      capacity: 100, // Default
      p50_year_0_yield: 192_640, // Default (100 MW × 0.22 CF × 8760)
      ppa_price: 65, // Default
      additionalCapex: [], // Equipment costs come from BOQ
      opex: [],
      global_margin: 0,
      ...(projectSettings?.defaultAssumptions || {
        degradation_rate: 0.004,
        ppa_escalation: 0.0,
        om_escalation: 0.01,
        tax_rate: 0.25,
        discount_rate: 0.08,
        project_lifetime: 25,
      }),
      financing: {
        gearing_ratio: 0.75,
        interest_rate: 0.045,
        debt_tenor: 15,
        target_dscr: 1.30,
      },
      isWinner: false,
      createdBy: boq.createdBy,
      creatorId: boq.creatorId,
      createdAt: boq.createdAt,
      updatedAt: boq.updatedAt,
    };

    newDesignModels.push(newModel);
    result.migratedModels++;
    result.migratedBOQs++;
    result.warnings.push(
      `Created design financial model from BOQ "${boq.name}" (no old financial model existed)`
    );
  });

  return {
    ...result,
    success: true,
  };
}

/**
 * Validate migrated data for integrity
 */
export function validateMigration(
  newDesignModels: DesignFinancialModel[],
  oldModels: FinancialModel[],
  _boqs: BOQ[] // Kept for API compatibility; BOQ is now separate from financial model
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check 1: Every design model has valid designId
  newDesignModels.forEach((model) => {
    if (!model.designId || model.designId.trim() === '') {
      errors.push(`Model "${model.name}" has invalid/empty designId`);
    }
  });

  // Check 2: No duplicate design models (one per design)
  const designIds = newDesignModels.map((m) => m.designId);
  const duplicates = designIds.filter((id, index) => designIds.indexOf(id) !== index);
  if (duplicates.length > 0) {
    errors.push(
      `Duplicate design models found for designs: ${duplicates.join(', ')}`
    );
  }

  // Check 3: At most one winner per project
  const winnersByProject = new Map<string, number>();
  newDesignModels.forEach((model) => {
    if (model.isWinner) {
      const count = winnersByProject.get(model.projectId) || 0;
      winnersByProject.set(model.projectId, count + 1);
    }
  });

  winnersByProject.forEach((count, projectId) => {
    if (count > 1) {
      errors.push(`Project ${projectId} has ${count} winner models (expected max 1)`);
    }
  });

  // Check 4: Additional CAPEX validation
  // Note: Equipment CAPEX now comes from BOQ, additionalCapex is for non-equipment costs
  newDesignModels.forEach((model) => {
    if (model.additionalCapex.length > 0) {
      const additionalTotal = model.additionalCapex.reduce((sum, item) => sum + item.amount, 0);
      if (additionalTotal < 0) {
        warnings.push(`Model "${model.name}" has negative additional CAPEX total (${additionalTotal})`);
      }
    }
  });

  // Check 5: Model count validation
  if (newDesignModels.length === 0 && oldModels.length > 0) {
    errors.push('No models were migrated despite having old models');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get migration statistics before running
 */
export function getMigrationStats(
  oldModels: FinancialModel[],
  boqs: BOQ[],
  designs: Design[],
  projects: Array<{ id: string; name: string }>
): MigrationStats {
  const conflicts = detectMigrationConflicts(oldModels, boqs, designs, projects);

  const blockingConflicts = conflicts.filter(
    (c) => c.type === 'orphan_model' || c.type === 'orphan_boq' || c.type === 'no_designs'
  );

  return {
    totalOldModels: oldModels.length,
    totalBOQs: boqs.length,
    totalProjects: projects.length,
    totalDesigns: designs.length,
    modelsToMigrate: oldModels.length - blockingConflicts.filter((c) => c.type === 'orphan_model' || c.type === 'no_designs').length,
    boqsToMigrate: boqs.length - blockingConflicts.filter((c) => c.type === 'orphan_boq').length,
    settingsToCreate: new Set(oldModels.map((m) => m.projectId)).size,
  };
}
