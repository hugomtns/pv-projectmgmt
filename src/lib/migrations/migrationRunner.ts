/**
 * Migration Runner
 *
 * Orchestrates the migration from old financial architecture to new design-level architecture.
 * Called from store initialization or user-triggered migration UI.
 */

import type { FinancialModel, DesignFinancialModel, ProjectFinancialSettings } from '@/lib/types/financial';
import { DEFAULT_FINANCIAL_ASSUMPTIONS } from '@/lib/types/financial';
import type { BOQ } from '@/lib/types/boq';
import type { Design } from '@/lib/types';
import {
  migrateFinancialData,
  validateMigration,
  detectMigrationConflicts,
  getMigrationStats,
  type ConflictResolution,
  type MigrationResult,
  type MigrationStats,
  type MigrationConflict,
} from './financialModelMigration';

// ============================================================================
// Migration Runner
// ============================================================================

export interface MigrationInput {
  oldModels: FinancialModel[];
  boqs: BOQ[];
  designs: Design[];
  projects: Array<{ id: string; name: string }>;
  conflictResolutions?: Record<string, ConflictResolution>;
}

export interface MigrationOutput {
  newDesignModels: DesignFinancialModel[];
  newProjectSettings: ProjectFinancialSettings[];
  result: MigrationResult;
}

/**
 * Check if migration is needed
 */
export function needsMigration(
  oldModelsExist: boolean,
  boqsExist: boolean,
  newModelsExist: boolean,
  newSettingsExist: boolean
): boolean {
  // If we have old data but no new data, migration needed
  if ((oldModelsExist || boqsExist) && !newModelsExist && !newSettingsExist) {
    return true;
  }

  // If we have both old and new data, migration may be incomplete
  if ((oldModelsExist || boqsExist) && (newModelsExist || newSettingsExist)) {
    // Could be partially migrated, should show option to complete
    return true;
  }

  return false;
}

/**
 * Check if old data can be archived (migration complete)
 */
export function canArchiveOldData(
  _oldModels: FinancialModel[],
  _boqs: BOQ[],
  newDesignModels: DesignFinancialModel[]
): boolean {
  // All old models should be migrated or explicitly skipped
  // For now, simple check: if we have new models, we can archive
  return newDesignModels.length > 0;
}

/**
 * Run the complete migration process
 */
export async function runMigration(input: MigrationInput): Promise<MigrationOutput> {
  const { oldModels, boqs, designs, projects, conflictResolutions } = input;

  // Step 1: Run migration
  const result = migrateFinancialData(
    oldModels,
    boqs,
    designs,
    projects,
    conflictResolutions
  );

  if (!result.success) {
    return {
      newDesignModels: [],
      newProjectSettings: [],
      result,
    };
  }

  // Step 2: Build outputs (we need to reconstruct from migration internals)
  // Since migrateFinancialData doesn't return the actual objects, we need to run it again
  // or refactor to return them. For now, let's create a helper to extract them.

  const { newDesignModels, newProjectSettings } = extractMigrationData(
    oldModels,
    boqs,
    designs,
    projects,
    conflictResolutions
  );

  // Step 3: Validate
  const validation = validateMigration(newDesignModels, oldModels, boqs);

  if (!validation.valid) {
    return {
      newDesignModels: [],
      newProjectSettings: [],
      result: {
        ...result,
        success: false,
        errors: [...result.errors, ...validation.errors],
        warnings: [...result.warnings, ...validation.warnings],
      },
    };
  }

  return {
    newDesignModels,
    newProjectSettings,
    result: {
      ...result,
      warnings: [...result.warnings, ...validation.warnings],
    },
  };
}

/**
 * Extract migration data (helper to get actual objects)
 * This duplicates logic from migrateFinancialData but returns the actual objects
 */
function extractMigrationData(
  oldModels: FinancialModel[],
  boqs: BOQ[],
  designs: Design[],
  _projects: Array<{ id: string; name: string }>,
  conflictResolutions?: Record<string, ConflictResolution>
): {
  newDesignModels: DesignFinancialModel[];
  newProjectSettings: ProjectFinancialSettings[];
} {
  const newDesignModels: DesignFinancialModel[] = [];
  const newProjectSettings: ProjectFinancialSettings[] = [];

  // Import conversion functions
  const { convertBOQItemsToCAPEX, convertFinancialModelToDesign } = require('./financialModelMigration');

  // Group BOQs by designId
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

    if (projectDesigns.length === 0) {
      return; // Skip (conflict)
    }

    // Create project settings (once per project)
    if (!newProjectSettings.find((s) => s.projectId === oldModel.projectId)) {
      newProjectSettings.push({
        id: crypto.randomUUID(),
        projectId: oldModel.projectId,
        defaultAssumptions: {
          ppa_escalation: oldModel.inputs.ppa_escalation,
          om_escalation: oldModel.inputs.om_escalation,
          degradation_rate: oldModel.inputs.degradation_rate,
          tax_rate: oldModel.inputs.tax_rate,
          discount_rate: oldModel.inputs.discount_rate,
          project_lifetime: oldModel.inputs.project_lifetime,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Single design case
    if (projectDesigns.length === 1) {
      const design = projectDesigns[0];
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
    }
    // Multiple designs case
    else {
      const resolution = conflictResolutions?.[oldModel.projectId];
      if (!resolution) return;

      switch (resolution.strategy) {
        case 'assign_to_first': {
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
          break;
        }

        case 'duplicate_to_all': {
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
          });
          break;
        }

        case 'create_empty_all': {
          projectDesigns.forEach((design) => {
            const boq = boqsByDesign.get(design.id);
            const capexFromBOQ = boq ? convertBOQItemsToCAPEX(boq) : [];

            const newModel: DesignFinancialModel = {
              designId: design.id,
              projectId: oldModel.projectId,
              name: `${design.name} - Financial Model`,
              capacity: oldModel.inputs.capacity,
              p50_year_0_yield: oldModel.inputs.p50_year_0_yield,
              ppa_price: oldModel.inputs.ppa_price,
              capex: capexFromBOQ,
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
          });
          break;
        }
      }
    }
  });

  // Process standalone BOQs
  boqs.forEach((boq) => {
    const design = designs.find((d) => d.id === boq.designId);
    if (!design) return;

    const alreadyMigrated = newDesignModels.some((m) => m.designId === design.id);
    if (alreadyMigrated) return;

    const capexFromBOQ = convertBOQItemsToCAPEX(boq);
    const projectSettings = newProjectSettings.find((s) => s.projectId === design.projectId);

    const newModel: DesignFinancialModel = {
      id: crypto.randomUUID(),
      designId: design.id,
      projectId: design.projectId,
      name: `${design.name} - Financial Model`,
      capacity: 100,
      p50_year_0_yield: 192_640,
      ppa_price: 65,
      capex: capexFromBOQ,
      opex: [],
      global_margin: 0,
      ...(projectSettings?.defaultAssumptions || DEFAULT_FINANCIAL_ASSUMPTIONS),
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

    // Ensure project settings exist
    if (!newProjectSettings.find((s) => s.projectId === design.projectId)) {
      newProjectSettings.push({
        id: crypto.randomUUID(),
        projectId: design.projectId,
        defaultAssumptions: { ...DEFAULT_FINANCIAL_ASSUMPTIONS },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  });

  return { newDesignModels, newProjectSettings };
}

/**
 * Preview migration (detect conflicts, get stats)
 */
export function previewMigration(input: Omit<MigrationInput, 'conflictResolutions'>): {
  stats: MigrationStats;
  conflicts: MigrationConflict[];
} {
  const { oldModels, boqs, designs, projects } = input;

  const stats = getMigrationStats(oldModels, boqs, designs, projects);
  const conflicts = detectMigrationConflicts(oldModels, boqs, designs, projects);

  return { stats, conflicts };
}

/**
 * Archive old data (mark as migrated, don't delete yet)
 */
export function archiveOldData(
  oldModels: FinancialModel[],
  boqs: BOQ[]
): {
  archivedModels: Array<FinancialModel & { _migrated: true; _archivedAt: string }>;
  archivedBOQs: Array<BOQ & { _migrated: true; _archivedAt: string }>;
} {
  const now = new Date().toISOString();

  return {
    archivedModels: oldModels.map((m) => ({ ...m, _migrated: true, _archivedAt: now })),
    archivedBOQs: boqs.map((b) => ({ ...b, _migrated: true, _archivedAt: now })),
  };
}
