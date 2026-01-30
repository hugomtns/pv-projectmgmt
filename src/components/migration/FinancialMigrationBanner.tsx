import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  ArrowRight,
  X,
  Database,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface FinancialMigrationBannerProps {
  oldModelsCount: number;
  oldBoqsCount: number;
  onStartMigration: () => void;
  onDismiss: () => void;
  migrationInProgress?: boolean;
  migrationComplete?: boolean;
}

export function FinancialMigrationBanner({
  oldModelsCount,
  oldBoqsCount,
  onStartMigration,
  onDismiss,
  migrationInProgress = false,
  migrationComplete = false,
}: FinancialMigrationBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || migrationComplete) {
    return null;
  }

  const totalItems = oldModelsCount + oldBoqsCount;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  return (
    <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20 relative">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
            {migrationInProgress ? (
              <Loader2 className="h-5 w-5 text-amber-600 animate-spin" />
            ) : (
              <Database className="h-5 w-5 text-amber-600" />
            )}
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4" />
              {migrationInProgress
                ? 'Financial Data Migration In Progress'
                : 'Financial Data Migration Available'}
            </h3>

            <div className="text-amber-800 dark:text-amber-200 space-y-3">
            {migrationInProgress ? (
              <p>
                Your financial data is being migrated to the new design-level
                architecture. Please wait...
              </p>
            ) : (
              <>
                <p>
                  We've detected {totalItems} financial{' '}
                  {totalItems === 1 ? 'item' : 'items'} using the old project-level
                  structure:
                </p>

                <div className="flex gap-2 flex-wrap">
                  {oldModelsCount > 0 && (
                    <Badge variant="outline" className="bg-background">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {oldModelsCount} Financial{' '}
                      {oldModelsCount === 1 ? 'Model' : 'Models'}
                    </Badge>
                  )}
                  {oldBoqsCount > 0 && (
                    <Badge variant="outline" className="bg-background">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {oldBoqsCount} BOQ{oldBoqsCount === 1 ? '' : 's'}
                    </Badge>
                  )}
                </div>

                <p className="text-sm">
                  <strong>Why migrate?</strong> The new design-level financial models
                  allow you to create and compare multiple financial scenarios per
                  project, select winners, and manage CAPEX/OPEX at the design level.
                </p>

                <p className="text-sm">
                  <strong>Note:</strong> Your existing data will be preserved. You can
                  roll back if needed.
                </p>
              </>
            )}
            </div>

            {!migrationInProgress && (
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={onStartMigration}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Start Migration
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={handleDismiss}>
                  Remind Me Later
                </Button>
              </div>
            )}
          </div>

          {!migrationInProgress && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
