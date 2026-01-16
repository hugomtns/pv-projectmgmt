import { useState } from 'react';
import { usePerformanceLogStore } from '@/stores/performanceLogStore';
import { useUserStore } from '@/stores/userStore';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { PerformanceLog } from '@/lib/types/performanceLog';
import { PERFORMANCE_PERIOD_LABELS } from '@/lib/types/performanceLog';
import { Trash2, TrendingUp, TrendingDown, Minus, Calendar, Zap } from 'lucide-react';

interface PerformanceLogCardProps {
  log: PerformanceLog;
}

export function PerformanceLogCard({ log }: PerformanceLogCardProps) {
  const deleteLog = usePerformanceLogStore((state) => state.deleteLog);
  const currentUser = useUserStore((state) => state.currentUser);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canEdit =
    currentUser?.roleId === 'role-admin' || currentUser?.id === log.creatorId;

  // Performance ratio status
  const getPRStatus = () => {
    if (!log.performanceRatio) return null;
    if (log.performanceRatio >= 0.85) return 'good';
    if (log.performanceRatio >= 0.75) return 'moderate';
    return 'poor';
  };

  const prStatus = getPRStatus();

  // Format date range
  const formatDateRange = () => {
    const start = new Date(log.startDate).toLocaleDateString();
    const end = new Date(log.endDate).toLocaleDateString();
    return `${start} - ${end}`;
  };

  // Format large numbers
  const formatProduction = (kwh: number) => {
    if (kwh >= 1000000) {
      return `${(kwh / 1000000).toFixed(2)} GWh`;
    }
    if (kwh >= 1000) {
      return `${(kwh / 1000).toFixed(1)} MWh`;
    }
    return `${kwh.toFixed(0)} kWh`;
  };

  const handleDelete = () => {
    deleteLog(log.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              {/* Icon */}
              <div
                className={cn(
                  'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
                  prStatus === 'good' && 'bg-green-500/10',
                  prStatus === 'moderate' && 'bg-yellow-500/10',
                  prStatus === 'poor' && 'bg-red-500/10',
                  !prStatus && 'bg-muted'
                )}
              >
                {prStatus === 'good' && <TrendingUp className="h-5 w-5 text-green-500" />}
                {prStatus === 'moderate' && <Minus className="h-5 w-5 text-yellow-500" />}
                {prStatus === 'poor' && <TrendingDown className="h-5 w-5 text-red-500" />}
                {!prStatus && <Zap className="h-5 w-5 text-muted-foreground" />}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {PERFORMANCE_PERIOD_LABELS[log.period]}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDateRange()}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Actual: </span>
                    <span className="font-medium">{formatProduction(log.actualProduction)}</span>
                  </div>
                  {log.expectedProduction && (
                    <div>
                      <span className="text-muted-foreground">Expected: </span>
                      <span>{formatProduction(log.expectedProduction)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* PR Badge */}
            {log.performanceRatio && (
              <Badge
                variant="outline"
                className={cn(
                  prStatus === 'good' && 'border-green-500 text-green-500',
                  prStatus === 'moderate' && 'border-yellow-500 text-yellow-500',
                  prStatus === 'poor' && 'border-red-500 text-red-500'
                )}
              >
                PR: {(log.performanceRatio * 100).toFixed(1)}%
              </Badge>
            )}
          </div>

          {/* Additional metrics */}
          {(log.availabilityPercent !== undefined || log.curtailment !== undefined) && (
            <div className="flex gap-4 mt-3 pt-3 border-t text-sm text-muted-foreground">
              {log.availabilityPercent !== undefined && (
                <span>Availability: {log.availabilityPercent.toFixed(1)}%</span>
              )}
              {log.curtailment !== undefined && log.curtailment > 0 && (
                <span>Curtailment: {formatProduction(log.curtailment)}</span>
              )}
            </div>
          )}

          {/* Notes */}
          {log.notes && (
            <p className="text-sm text-muted-foreground mt-2 truncate">{log.notes}</p>
          )}

          {/* Actions */}
          {canEdit && (
            <div className="flex justify-end mt-3 pt-3 border-t">
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive h-7"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete Performance Log"
        description="Are you sure you want to delete this performance log? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </>
  );
}
