import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Database,
  ArrowRight,
  FileWarning,
  Info,
} from 'lucide-react';
import { useFinancialStore } from '@/stores/financialStore';
import { useDesignStore } from '@/stores/designStore';
import { useProjectStore } from '@/stores/projectStore';
import { useBOQStore } from '@/stores/boqStore';
import { previewMigration, runMigration, type MigrationOutput } from '@/lib/migrations/migrationRunner';
import type { MigrationStats, MigrationConflict } from '@/lib/migrations/financialModelMigration';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';
import { toast } from 'sonner';

interface FinancialMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

type MigrationStep = 'preview' | 'conflicts' | 'migrating' | 'complete';

export function FinancialMigrationDialog({
  open,
  onOpenChange,
  onComplete,
}: FinancialMigrationDialogProps) {
  const [step, setStep] = useState<MigrationStep>('preview');
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [conflicts, setConflicts] = useState<MigrationConflict[]>([]);
  const [migrationOutput, setMigrationOutput] = useState<MigrationOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, any>>({});

  // Stores
  const oldModels = useFinancialStore((state) => state.financialModels);
  const designs = useDesignStore((state) => state.designs);
  const projects = useProjectStore((state) => state.projects);
  const boqs = useBOQStore((state) => state.boqs);

  // Load preview when dialog opens
  useEffect(() => {
    if (open && step === 'preview') {
      loadPreview();
    }
  }, [open, step]);

  const loadPreview = () => {
    setIsLoading(true);
    try {
      const preview = previewMigration({ oldModels, boqs, designs, projects });
      setStats(preview.stats);
      setConflicts(preview.conflicts);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to preview migration:', error);
      toast.error('Failed to load migration preview');
      setIsLoading(false);
    }
  };

  const handleStartMigration = () => {
    if (conflicts.length > 0) {
      // Show conflict resolution dialog
      setStep('conflicts');
    } else {
      // Start migration immediately
      executeMigration();
    }
  };

  const handleConflictsResolved = (resolutions: Record<string, any>) => {
    setConflictResolutions(resolutions);
    executeMigration(resolutions);
  };

  const executeMigration = async (resolutions?: Record<string, any>) => {
    setStep('migrating');
    setIsLoading(true);

    try {
      const output = await runMigration({
        oldModels,
        boqs,
        designs,
        projects,
        conflictResolutions: resolutions || conflictResolutions,
      });

      setMigrationOutput(output);

      if (output.result.success) {
        setStep('complete');
        toast.success('Migration completed successfully', {
          description: `Migrated ${output.newDesignModels.length} design financial models`,
        });
      } else {
        toast.error('Migration completed with errors', {
          description: 'Some items could not be migrated. Check the results below.',
        });
        setStep('complete');
      }
    } catch (error) {
      console.error('Migration failed:', error);
      toast.error('Migration failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      setStep('preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    onComplete();
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (step === 'migrating') {
      toast.error('Cannot cancel migration in progress');
      return;
    }
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open && step !== 'conflicts'} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Financial Data Migration
            </DialogTitle>
            <DialogDescription>
              {step === 'preview' && 'Review what will be migrated'}
              {step === 'migrating' && 'Migration in progress...'}
              {step === 'complete' && 'Migration complete'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            {step === 'preview' && stats && (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-blue-600">
                          {stats.totalOldModels}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Financial Models
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-green-600">
                          {stats.totalBOQs}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Bills of Quantities
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* What Will Happen */}
                <Card>
                  <CardContent className="pt-6 space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Migration Plan
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <p>
                          Create <strong>{stats.settingsToCreate}</strong> project
                          financial settings with default assumptions
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <p>
                          Convert <strong>{stats.modelsToMigrate}</strong> project-level
                          financial models to design-level models
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <p>
                          Merge <strong>{stats.boqsToMigrate}</strong> BOQs into design
                          financial model CAPEX
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <p>
                          Preserve all existing data (no deletion, safe rollback)
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Conflicts Warning */}
                {conflicts.length > 0 && (
                  <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="font-semibold flex items-center gap-2 text-amber-900 dark:text-amber-100">
                        <FileWarning className="h-4 w-4" />
                        {conflicts.length} Conflict{conflicts.length !== 1 && 's'}{' '}
                        Detected
                      </h3>
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        Some items require your input to complete the migration. You'll be
                        prompted to resolve these after clicking "Start Migration".
                      </p>
                      <div className="space-y-2">
                        {conflicts.slice(0, 3).map((conflict, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-sm p-2 bg-background rounded"
                          >
                            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                            <p className="text-muted-foreground">{conflict.message}</p>
                          </div>
                        ))}
                        {conflicts.length > 3 && (
                          <p className="text-sm text-muted-foreground text-center">
                            ... and {conflicts.length - 3} more
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {step === 'migrating' && (
              <div className="py-12 text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
                <div>
                  <h3 className="text-lg font-medium mb-2">Migration in Progress</h3>
                  <p className="text-sm text-muted-foreground">
                    Please wait while we migrate your financial data...
                  </p>
                </div>
              </div>
            )}

            {step === 'complete' && migrationOutput && (
              <div className="space-y-4">
                {migrationOutput.result.success ? (
                  <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
                    <CardContent className="pt-6 text-center">
                      <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                        Migration Successful!
                      </h3>
                      <p className="text-sm text-green-800 dark:text-green-200">
                        Your financial data has been successfully migrated to the new
                        design-level architecture.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
                    <CardContent className="pt-6 text-center">
                      <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                        Migration Completed with Errors
                      </h3>
                      <p className="text-sm text-red-800 dark:text-red-200">
                        Some items could not be migrated. Your original data is safe.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Results Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-green-600">
                          {migrationOutput.result.migratedModels}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Models Migrated
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-green-600">
                          {migrationOutput.result.migratedBOQs}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          BOQs Migrated
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Errors */}
                {migrationOutput.result.errors.length > 0 && (
                  <Card className="border-red-500">
                    <CardContent className="pt-6 space-y-2">
                      <h4 className="font-semibold text-red-900 dark:text-red-100">
                        Errors:
                      </h4>
                      <ScrollArea className="h-32">
                        {migrationOutput.result.errors.map((error: string, i: number) => (
                          <p key={i} className="text-sm text-red-800 dark:text-red-200">
                            • {error}
                          </p>
                        ))}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            {step === 'preview' && (
              <>
                <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                  Cancel
                </Button>
                <Button
                  onClick={handleStartMigration}
                  disabled={isLoading || !stats}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {conflicts.length > 0 ? 'Review Conflicts' : 'Start Migration'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}
            {step === 'migrating' && (
              <Button disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Migrating...
              </Button>
            )}
            {step === 'complete' && (
              <Button onClick={handleComplete}>
                Close
                <CheckCircle2 className="ml-2 h-4 w-4" />
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict Resolution Dialog */}
      <ConflictResolutionDialog
        open={step === 'conflicts'}
        onOpenChange={(open) => !open && setStep('preview')}
        conflicts={conflicts}
        projects={projects}
        designs={designs}
        onResolve={handleConflictsResolved}
      />
    </>
  );
}
