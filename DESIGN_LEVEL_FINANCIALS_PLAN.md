# Design-Level Financial Models - Implementation Plan

## Executive Summary

This document outlines the plan to refactor the financial modeling system from project-level to design-level, allowing multiple financial scenarios per project with the ability to designate a "winner" design.

**Branch:** `feature/design-level-financials`

**Status:** Planning Phase - No Implementation Yet

---

## Current Architecture Analysis

### Current State

#### 1. Financial Models
- **Scope:** Project-level (1:1 relationship with Project)
- **Storage:** `financialStore` with localStorage persistence (`financial-storage`)
- **Structure:**
  ```typescript
  interface FinancialModel {
    id: string;
    projectId: string;  // FK to Project (1:1)
    name: string;
    inputs: FinancialInputs;
    results?: ProjectResults;
    createdBy/creatorId: string;
    createdAt/updatedAt: string;
  }
  ```
- **Key Constraint:** Only ONE financial model per project (enforced in `addFinancialModel()`)

#### 2. BOQs (Bills of Quantities)
- **Scope:** Design-level (1:1 relationship with Design)
- **Storage:** `boqStore` with localStorage persistence (`boq-storage`)
- **Structure:**
  ```typescript
  interface BOQ {
    id: string;
    designId: string;     // FK to Design (1:1)
    projectId: string;    // Denormalized for queries
    name: string;
    items: BOQItem[];
    totalValue: number;
    // ... metadata
  }
  ```
- **Functionality:** Can export BOQ items to project financial model's `capex_items`

#### 3. Designs
- **Scope:** Project-level (N:1 relationship with Project)
- **Storage:** `designStore` with localStorage persistence
- **Structure:** Contains `projectId`, versions, comments, status

### Current UX Flow

1. User creates a Project
2. User adds multiple Designs to the Project
3. User creates ONE Financial Model at the Project level
4. User creates BOQs for each Design (CAPEX lists)
5. User manually exports BOQ → Financial Model CAPEX (clunky merge)
6. User manually enters OPEX at project level
7. Single financial analysis for entire project

### Problems with Current Architecture

1. **Hierarchy Mismatch:** Financial models at project level, BOQs at design level
2. **Clunky UX:** Manual export from BOQ to Financial Model CAPEX
3. **No Multi-Scenario Analysis:** Can't compare financial viability of different designs
4. **BOQ ≠ CAPEX Semantically:** BOQs should BE the CAPEX, not export to it
5. **No Design Winner Selection:** Can't mark which design is financially optimal
6. **OPEX Scope Issue:** OPEX is project-wide but might vary by design
7. **Financing Metrics Mismatch:** Financing should be per-design, not project-wide

---

## Desired Architecture

### New State

#### 1. Project Financial Settings (New)
- **Scope:** Project-level parent/container
- **Purpose:** Store project-wide financial assumptions and aggregate views
- **Structure:**
  ```typescript
  interface ProjectFinancialSettings {
    id: string;
    projectId: string;  // FK to Project (1:1)

    // Default assumptions for new design financial models
    defaultAssumptions: {
      ppa_escalation: number;
      om_escalation: number;
      degradation_rate: number;
      tax_rate: number;
      discount_rate: number;
      project_lifetime: number;
    };

    // Winner selection
    winnerDesignId?: string;  // FK to Design (marks winner)

    // Metadata
    createdAt: string;
    updatedAt: string;
  }
  ```

#### 2. Design Financial Models (Refactored from FinancialModel)
- **Scope:** Design-level (1:1 relationship with Design)
- **Purpose:** Complete financial analysis per design
- **Structure:**
  ```typescript
  interface DesignFinancialModel {
    id: string;
    designId: string;     // FK to Design (1:1) - CHANGED
    projectId: string;    // Denormalized for queries
    name: string;

    // Financial inputs (same structure, new scope)
    inputs: DesignFinancialInputs;  // Includes capacity, yield, PPA, etc.

    // CAPEX = BOQ items (merged concept)
    capex: CostLineItem[];  // Replaces BOQ items

    // OPEX items (design-specific)
    opex: CostLineItem[];

    // Financing parameters (design-specific)
    financing: FinancingParameters;

    // Calculated results
    results?: ProjectResults;

    // Winner flag (denormalized for easy filtering)
    isWinner: boolean;

    // Metadata
    createdBy/creatorId: string;
    createdAt/updatedAt: string;
  }

  interface FinancingParameters {
    gearing_ratio: number;
    interest_rate: number;
    debt_tenor: number;
    target_dscr: number;
  }
  ```

#### 3. BOQ Store (Deprecated/Merged)
- **Option A (Recommended):** Deprecate `BOQ` entity entirely, merge into `DesignFinancialModel.capex`
- **Option B (Backward Compatible):** Keep BOQ as a view/derived entity, but primary source is `DesignFinancialModel.capex`

#### 4. Design Updates
- **New Fields:**
  ```typescript
  interface Design {
    // ... existing fields
    isFinancialWinner?: boolean;  // Marked when financial model is winner
  }
  ```

### New UX Flow

1. User creates a Project
2. User adds multiple Designs to the Project
3. For each Design:
   a. User creates a Design Financial Model (auto-inherits project defaults)
   b. User defines/imports CAPEX items (formerly BOQ) directly in the model
   c. User defines OPEX items specific to this design
   d. User configures financing parameters for this design
   e. User runs financial calculations
4. User compares financial results across all design financial models
5. User marks one Design Financial Model as "Winner" (also marks Design as winner)
6. Project-level financial view shows:
   - Winner design's financial results (prominent)
   - Comparison table of all design financial models
   - Ability to switch winner

---

## Data Model Changes

### 1. New Types (`src/lib/types/financial.ts`)

```typescript
// New: Project-level financial settings
export interface ProjectFinancialSettings {
  id: string;
  projectId: string;
  defaultAssumptions: DefaultFinancialAssumptions;
  winnerDesignId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DefaultFinancialAssumptions {
  ppa_escalation: number;
  om_escalation: number;
  degradation_rate: number;
  tax_rate: number;
  discount_rate: number;
  project_lifetime: number;
}

// Refactored: Design-level financial model
export interface DesignFinancialModel {
  id: string;
  designId: string;           // CHANGED: FK to Design (was projectId)
  projectId: string;          // Denormalized
  name: string;

  // Core inputs
  capacity: number;           // MW
  p50_year_0_yield: number;   // MWh
  ppa_price: number;

  // Line items (formerly separate capex_items/opex_items in FinancialInputs)
  capex: CostLineItem[];      // Replaces BOQ
  opex: CostLineItem[];
  global_margin: number;      // CAPEX margin

  // Technical/Economic params (inheritable from project defaults)
  degradation_rate: number;
  ppa_escalation: number;
  om_escalation: number;
  tax_rate: number;
  discount_rate: number;
  project_lifetime: number;

  // Financing (design-specific)
  financing: FinancingParameters;

  // Yield estimation (optional)
  yieldEstimate?: YieldEstimate;

  // Results cache
  results?: ProjectResults;

  // Winner status
  isWinner: boolean;

  // Metadata
  createdBy: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancingParameters {
  gearing_ratio: number;
  interest_rate: number;
  debt_tenor: number;
  target_dscr: number;
}

// Backward compatibility: Keep CostLineItem unchanged
export interface CostLineItem {
  id: string;
  name: string;
  amount: number;
  is_capex: boolean;
  category: string;
  unit_price?: number;
  quantity?: number;
  unit?: string;
  margin_percent?: number;

  // New: track if imported from component library
  source?: 'manual' | 'dxf_extraction' | 'component_library';
  sourceId?: string;
}
```

### 2. Updated Types

#### Design Type (`src/lib/types.ts`)
```typescript
export interface Design {
  // ... existing fields
  isFinancialWinner?: boolean;  // NEW: Set when design's financial model is winner
}
```

### 3. Deprecated Types

#### BOQ Types (`src/lib/types/boq.ts`)
- **Status:** Deprecated but kept for migration
- **Migration Path:** BOQ → DesignFinancialModel.capex
- **Timeline:** Remove after successful migration (v2.0)

---

## Store Architecture Changes

### 1. New Store: `projectFinancialSettingsStore`

**File:** `src/stores/projectFinancialSettingsStore.ts`

**Purpose:** Manage project-level financial settings and winner selection

**Actions:**
```typescript
interface ProjectFinancialSettingsState {
  settings: ProjectFinancialSettings[];

  // CRUD
  createSettings(projectId: string, defaults?: Partial<DefaultFinancialAssumptions>): string | undefined;
  updateSettings(id: string, updates: Partial<ProjectFinancialSettings>): void;
  deleteSettings(id: string): void;  // Cascade when project deleted

  // Winner management
  setWinnerDesign(projectId: string, designId: string): void;
  clearWinner(projectId: string): void;

  // Helpers
  getSettingsByProject(projectId: string): ProjectFinancialSettings | undefined;
}
```

**Persistence:** `localStorage` key: `project-financial-settings-storage`

### 2. Refactored Store: `financialStore` → `designFinancialStore`

**File:** `src/stores/designFinancialStore.ts` (rename from `financialStore.ts`)

**Purpose:** Manage design-level financial models (formerly project-level)

**Breaking Changes:**
- Rename: `financialModels` → `designFinancialModels`
- Entity change: `FinancialModel` → `DesignFinancialModel`
- Foreign key change: `projectId` → `designId` (primary), keep `projectId` (denormalized)

**Actions:**
```typescript
interface DesignFinancialState {
  designFinancialModels: DesignFinancialModel[];

  // CRUD
  addModel(designId: string, name: string, defaults?: Partial<DesignFinancialModel>): string | undefined;
  updateModel(id: string, updates: Partial<DesignFinancialModel>): void;
  updateCapex(id: string, capex: CostLineItem[]): void;  // NEW: Direct CAPEX management
  updateOpex(id: string, opex: CostLineItem[]): void;
  updateFinancing(id: string, financing: Partial<FinancingParameters>): void;
  updateResults(id: string, results: ProjectResults): void;
  deleteModel(id: string): void;

  // Winner management
  markAsWinner(id: string): void;  // Sets isWinner, updates projectFinancialSettings

  // Yield calculation (keep existing)
  calculateYieldForModel(...): Promise<YieldEstimate | null>;
  applyYieldEstimate(...): void;
  clearYieldEstimate(...): void;

  // Helpers
  getModelByDesign(designId: string): DesignFinancialModel | undefined;
  getModelsByProject(projectId: string): DesignFinancialModel[];
  getWinnerModelByProject(projectId: string): DesignFinancialModel | undefined;
}
```

**Persistence:**
- Storage key: `design-financial-storage` (NEW KEY - requires migration)
- Old key: `financial-storage` (migrate and remove)

**Constraints:**
- ONE financial model per design (enforce in `addModel()`)
- ONE winner per project (enforce in `markAsWinner()`)

### 3. Deprecated Store: `boqStore`

**Status:** Mark as deprecated, keep for backward compatibility during migration

**Migration Strategy:**
1. Read existing BOQs
2. Convert BOQItems → CostLineItems
3. Create DesignFinancialModel with converted CAPEX
4. Mark BOQ as migrated
5. Remove BOQ after confirmation

**Actions to Add:**
```typescript
// Add to boqStore
interface BOQState {
  // ... existing

  // Migration helpers
  convertBOQToCapex(boqId: string): CostLineItem[];
  markAsMigrated(boqId: string): void;
  isMigrated(boqId: string): boolean;
}
```

### 4. Updated Store: `designStore`

**Changes:** Add helper to update `isFinancialWinner` flag

```typescript
interface DesignState {
  // ... existing

  // NEW: Winner management
  markAsFinancialWinner(designId: string): void;
  clearFinancialWinner(projectId: string): void;  // Clears all winners in project
}
```

---

## Migration Strategy

### Phase 1: Dual-Mode Operation (Backward Compatible)

**Goal:** Run old and new systems in parallel, no data loss

**Steps:**
1. Deploy new stores alongside old ones
2. Add migration utility: `src/lib/migrations/financialModelMigration.ts`
3. On app boot, check for unmigrated data:
   - Detect old `financial-storage` key
   - Detect BOQs without corresponding DesignFinancialModels
4. Show migration banner/dialog to user
5. User triggers migration:
   - For each old FinancialModel (project-level):
     - Create ProjectFinancialSettings for the project
     - If project has ONE design: Migrate model to that design
     - If project has MULTIPLE designs: Show conflict resolution UI
       - Option A: Duplicate model to all designs
       - Option B: Assign to specific design, create empty for others
       - Option C: Create empty models for all designs
   - For each BOQ:
     - Get corresponding Design
     - If Design has DesignFinancialModel: Merge BOQ.items into model.capex
     - If not: Create DesignFinancialModel with BOQ.items as capex
6. Mark old data as archived (don't delete immediately)
7. Switch UI to new mode

**Migration Utility Interface:**
```typescript
interface MigrationResult {
  success: boolean;
  migratedModels: number;
  migratedBOQs: number;
  conflicts: MigrationConflict[];
  errors: string[];
}

interface MigrationConflict {
  type: 'multiple_designs_one_model' | 'orphan_model' | 'orphan_boq';
  projectId: string;
  designIds?: string[];
  modelId?: string;
  boqId?: string;
  message: string;
}

async function migrateFinancialData(
  conflictResolutions?: Record<string, ConflictResolution>
): Promise<MigrationResult>;
```

### Phase 2: Data Validation

**Goal:** Ensure data integrity post-migration

**Checks:**
1. Every DesignFinancialModel has valid designId
2. Every Design has at most one DesignFinancialModel
3. Every Project has at most one winner design
4. ProjectFinancialSettings.winnerDesignId matches Design.isFinancialWinner
5. DesignFinancialModel.isWinner matches ProjectFinancialSettings.winnerDesignId
6. No orphan BOQs (all converted or deleted)
7. Sum of migrated CAPEX items equals original BOQ totalValue

### Phase 3: Cleanup (Future Release)

**Goal:** Remove deprecated code

**Timeline:** After 90 days of stable operation

**Steps:**
1. Remove `boqStore` entirely
2. Remove `BOQ` types from `src/lib/types/boq.ts`
3. Remove old `financial-storage` localStorage key
4. Remove migration utility
5. Remove backward compatibility shims

---

## UI/UX Changes

### 1. Project Financial Overview Page (New)

**Route:** `/financials/:projectId` (repurposed)

**Purpose:** Project-level financial dashboard showing all design financial models

**Sections:**
1. **Header:**
   - Project name
   - Winner design indicator (prominent)
   - "Configure Defaults" button

2. **Winner Card (Large):**
   - Design name + "Winner" badge
   - Key metrics (IRR, NPV, LCOE, DSCR)
   - Quick actions: View Details, Change Winner

3. **Design Financial Models Comparison Table:**
   - Columns: Design Name, Capacity, CAPEX, OPEX, IRR, NPV, LCOE, DSCR, Status, Actions
   - Sortable/filterable
   - Highlight winner row
   - Actions: View, Edit, Set as Winner, Delete

4. **Quick Stats:**
   - Total designs analyzed
   - Total CAPEX range
   - IRR range
   - Recommendations (if IRR < threshold, flag as unviable)

5. **Project Defaults Settings (Dialog):**
   - Configure default assumptions for new design models
   - Apply to all existing models (confirmation)

**Components:**
- `src/pages/ProjectFinancialOverview.tsx` (new)
- `src/components/financials/WinnerCard.tsx` (new)
- `src/components/financials/DesignFinancialComparison.tsx` (new)
- `src/components/financials/ProjectFinancialSettingsDialog.tsx` (new)

### 2. Design Financial Model Detail Page (Refactored)

**Route:** `/designs/:designId/financial` (new) or `/designs/:designId?tab=financial`

**Purpose:** Detailed financial analysis for a specific design

**Sections:**
1. **Header:**
   - Design name + project breadcrumb
   - Winner badge (if applicable)
   - "Mark as Winner" button (prominent if not winner)

2. **Tabs:**
   - **Inputs:** Capacity, yield, PPA price, technical params
   - **CAPEX:** Line items (formerly BOQ) with DXF import, component library integration
   - **OPEX:** Line items (formerly in project model)
   - **Financing:** Gearing, interest rate, debt tenor, DSCR target
   - **Results:** Full financial dashboard (existing)
   - **Comparison:** Side-by-side with other designs in project

3. **CAPEX Tab (Merged BOQ UX):**
   - Manage CostLineItem[] directly
   - "Generate from DXF" button (existing BOQ functionality)
   - "Import from Component Library" button
   - Inline editing of quantities/prices
   - Category grouping
   - Total CAPEX calculation
   - Margin controls

4. **Actions:**
   - Calculate / Recalculate
   - Export to PDF
   - Clone to Another Design
   - Mark as Winner
   - Delete Model

**Components:**
- `src/pages/DesignFinancialModelPage.tsx` (refactored from FinancialModelPage)
- `src/components/financials/CapexManager.tsx` (replaces BOQ components)
- `src/components/financials/OpexManager.tsx` (extracted from FinancialInputForm)
- `src/components/financials/FinancingParametersForm.tsx` (extracted)
- `src/components/financials/DesignComparisonView.tsx` (new)

### 3. Design Detail Page Updates

**Route:** `/designs/:designId`

**Changes:**
1. Add "Financial Model" tab (links to design financial model)
2. Remove "BOQ" tab (deprecated)
3. Show winner badge if `design.isFinancialWinner === true`
4. Quick financial summary card (IRR, NPV, LCOE if model exists)

**Components to Update:**
- `src/pages/DesignDetailPage.tsx`

### 4. Financials Index Page (Minimal Changes)

**Route:** `/financials`

**Changes:**
1. List projects with financial settings (not individual models)
2. Show winner design per project
3. Click → Navigate to Project Financial Overview

**Components to Update:**
- `src/pages/Financials.tsx`

### 5. Migration UI

**Components:**
- `src/components/migration/FinancialMigrationBanner.tsx` (persistent banner)
- `src/components/migration/FinancialMigrationDialog.tsx` (guided migration flow)
- `src/components/migration/ConflictResolutionDialog.tsx` (handle edge cases)

---

## Implementation Phases

### Phase 0: Foundation (Week 1)
- [ ] Create feature branch: `feature/design-level-financials`
- [ ] Update type definitions in `src/lib/types/financial.ts`
- [ ] Create `ProjectFinancialSettings` type
- [ ] Create `DesignFinancialModel` type (refactored)
- [ ] Create `FinancingParameters` type
- [ ] Update `Design` type with `isFinancialWinner`

### Phase 1: New Stores (Week 1-2)
- [ ] Create `projectFinancialSettingsStore.ts`
- [ ] Implement CRUD actions
- [ ] Implement winner selection logic
- [ ] Add persistence layer
- [ ] Write unit tests

- [ ] Refactor `financialStore.ts` → `designFinancialStore.ts`
- [ ] Update entity structure (projectId → designId)
- [ ] Add CAPEX/OPEX direct management
- [ ] Add winner marking logic
- [ ] Update permission checks
- [ ] Write unit tests

- [ ] Update `designStore.ts`
- [ ] Add winner flag management
- [ ] Write unit tests

### Phase 2: Migration Utility (Week 2)
- [ ] Create `src/lib/migrations/financialModelMigration.ts`
- [ ] Implement migration logic
- [ ] Handle conflict resolution
- [ ] Add validation checks
- [ ] Write migration tests
- [ ] Create rollback mechanism

### Phase 3: Core UI Components (Week 3)
- [ ] Create `CapexManager.tsx` (replaces BOQ UI)
- [ ] Create `OpexManager.tsx`
- [ ] Create `FinancingParametersForm.tsx`
- [ ] Create `WinnerCard.tsx`
- [ ] Create `DesignFinancialComparison.tsx`
- [ ] Create `ProjectFinancialSettingsDialog.tsx`

### Phase 4: Page Refactoring (Week 3-4)
- [ ] Create `ProjectFinancialOverview.tsx` (new)
- [ ] Refactor `FinancialModelPage.tsx` → `DesignFinancialModelPage.tsx`
- [ ] Update `DesignDetailPage.tsx` (add financial tab)
- [ ] Update `Financials.tsx` (index page)
- [ ] Update routing in `src/router/routes.tsx`

### Phase 5: Migration UI (Week 4)
- [ ] Create `FinancialMigrationBanner.tsx`
- [ ] Create `FinancialMigrationDialog.tsx`
- [ ] Create `ConflictResolutionDialog.tsx`
- [ ] Add migration trigger in `src/lib/initializeStores.ts`

### Phase 6: Integration & Testing (Week 5)
- [ ] Integration testing
- [ ] E2E testing with Playwright/Cypress
- [ ] Performance testing (large datasets)
- [ ] User acceptance testing
- [ ] Bug fixes

### Phase 7: Documentation & Cleanup (Week 5-6)
- [ ] Update `CLAUDE.md` with new architecture
- [ ] Add migration guide for users
- [ ] Update component documentation
- [ ] Deprecation warnings in old code
- [ ] Final testing and polish

### Phase 8: Deployment (Week 6)
- [ ] Deploy to staging
- [ ] Monitor for errors
- [ ] Deploy to production
- [ ] Monitor migration success rate
- [ ] Provide user support

### Phase 9: Cleanup (Future - After 90 days)
- [ ] Remove BOQ store and types
- [ ] Remove old localStorage keys
- [ ] Remove migration utility
- [ ] Remove deprecated components
- [ ] Final documentation update

---

## Risks and Considerations

### Technical Risks

1. **Data Loss During Migration**
   - **Risk:** User loses existing financial models or BOQs
   - **Mitigation:**
     - Keep old data in localStorage (don't delete)
     - Provide export/backup before migration
     - Comprehensive validation after migration
     - Rollback mechanism

2. **Performance Issues**
   - **Risk:** Loading all design financial models for a project is slow
   - **Mitigation:**
     - Lazy load models on demand
     - Index by designId and projectId
     - Paginate comparison tables
     - Use virtualization for large lists

3. **localStorage Quota Exceeded**
   - **Risk:** Design financial models consume more storage than project-level
   - **Mitigation:**
     - Monitor storage usage
     - Implement data archival for old models
     - Consider IndexedDB for large datasets (like documents/designs)
     - Warn users before quota exceeded

4. **Circular Dependencies**
   - **Risk:** designStore ↔ designFinancialStore ↔ projectFinancialSettingsStore
   - **Mitigation:**
     - Careful store separation
     - Use getState() for cross-store access
     - Avoid setState() calls in other stores

### UX Risks

1. **User Confusion During Migration**
   - **Risk:** Users don't understand new hierarchy
   - **Mitigation:**
     - Clear migration dialog with explanation
     - Visual guide (before/after diagrams)
     - Help tooltips on new pages
     - Gradual rollout with user training

2. **Breaking Existing Workflows**
   - **Risk:** Users can't find old functionality
   - **Mitigation:**
     - Maintain URL backward compatibility (redirects)
     - Add "What's New" modal on first login
     - Document workflow changes
     - Provide feedback mechanism

3. **Winner Selection Ambiguity**
   - **Risk:** Users unsure which design should be winner
   - **Mitigation:**
     - Show clear comparison metrics
     - Provide recommendation algorithm (highest IRR, lowest LCOE, etc.)
     - Allow "No winner" state
     - Explain implications of winner selection

### Business Risks

1. **Feature Adoption**
   - **Risk:** Users continue using old project-level approach
   - **Mitigation:**
     - Make winner selection prominent
     - Show value of multi-scenario comparison
     - Provide templates for common design variations

2. **Backward Compatibility**
   - **Risk:** Integrations or exports expect old data structure
   - **Mitigation:**
     - Maintain export compatibility (PDF, CSV formats unchanged)
     - Add version flag to exported data
     - Provide old format export option (deprecated)

---

## Success Metrics

### Migration Success
- [ ] 100% of old FinancialModels migrated
- [ ] 100% of BOQs converted to CAPEX
- [ ] 0 data loss incidents
- [ ] < 5% users require manual intervention

### Performance
- [ ] Page load time < 2s for project with 10 designs
- [ ] localStorage usage increase < 50% vs old system
- [ ] Financial calculation time unchanged

### User Adoption
- [ ] 80% of users migrate within 30 days
- [ ] < 10% support tickets related to migration
- [ ] Positive user feedback (NPS > 8)

---

## Open Questions

1. **Should we allow multiple winners per project?**
   - Current plan: Single winner
   - Alternative: Multiple winners for different scenarios (base case, optimistic, conservative)

2. **Should OPEX be design-specific or project-specific?**
   - Current plan: Design-specific (can vary by design)
   - Alternative: Shared OPEX pool, distributed across designs

3. **Should we keep BOQ as a separate entity (read-only view of CAPEX)?**
   - Current plan: Deprecate BOQ entirely
   - Alternative: Keep BOQ as a derived/computed view for backward compatibility

4. **Should financial settings cascade from project → design?**
   - Current plan: Yes, with override capability
   - Alternative: Fully independent per design

5. **Should we support design financial model templates?**
   - Example: "Small utility-scale", "Large utility-scale", "Rooftop commercial"
   - Benefit: Faster model creation

6. **Should winner selection be manual or automatic (by metrics)?**
   - Current plan: Manual with recommendations
   - Alternative: Auto-select highest IRR as default

---

## Next Steps

1. **Review this plan with stakeholders**
2. **Get approval on data model changes**
3. **Resolve open questions**
4. **Begin Phase 0 implementation**
5. **Set up feature flag for gradual rollout**

---

## Related Files

### Stores
- `src/stores/financialStore.ts` → `src/stores/designFinancialStore.ts`
- `src/stores/projectFinancialSettingsStore.ts` (new)
- `src/stores/boqStore.ts` (deprecate)
- `src/stores/designStore.ts` (update)

### Types
- `src/lib/types/financial.ts` (major changes)
- `src/lib/types/boq.ts` (deprecate)
- `src/lib/types.ts` (minor changes to Design)

### Pages
- `src/pages/ProjectFinancialOverview.tsx` (new)
- `src/pages/DesignFinancialModelPage.tsx` (refactor from FinancialModelPage)
- `src/pages/Financials.tsx` (update)
- `src/pages/DesignDetailPage.tsx` (update)

### Components
- `src/components/financials/CapexManager.tsx` (new, replaces BOQ)
- `src/components/financials/OpexManager.tsx` (new)
- `src/components/financials/FinancingParametersForm.tsx` (new)
- `src/components/financials/WinnerCard.tsx` (new)
- `src/components/financials/DesignFinancialComparison.tsx` (new)
- `src/components/financials/ProjectFinancialSettingsDialog.tsx` (new)
- `src/components/boq/*` (deprecate)
- `src/components/migration/*` (new)

### Utilities
- `src/lib/migrations/financialModelMigration.ts` (new)
- `src/lib/calculator/calculator.ts` (minor updates for new structure)

---

**Document Version:** 1.0
**Last Updated:** 2025-01-30
**Author:** Planning Phase
**Status:** Awaiting Approval
