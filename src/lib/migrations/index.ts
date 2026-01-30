/**
 * Financial Model Migration - Public API
 */

export {
  // Migration execution
  runMigration,
  previewMigration,
  needsMigration,
  canArchiveOldData,
  archiveOldData,

  // Types
  type MigrationInput,
  type MigrationOutput,
} from './migrationRunner';

export {
  // Core migration functions (for advanced usage)
  migrateFinancialData,
  validateMigration,
  detectMigrationConflicts,
  getMigrationStats,
  convertBOQItemsToCAPEX,
  convertFinancialModelToDesign,

  // Types
  type MigrationConflictType,
  type MigrationConflict,
  type ConflictResolutionStrategy,
  type ConflictResolution,
  type MigrationResult,
  type MigrationStats,
  type ValidationResult,
} from './financialModelMigration';
