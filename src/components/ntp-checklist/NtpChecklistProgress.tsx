import type { NtpChecklistItem } from '@/lib/types';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NtpChecklistProgressProps {
  items: NtpChecklistItem[];
}

export function NtpChecklistProgress({ items }: NtpChecklistProgressProps) {
  const requiredItems = items.filter((item) => item.required);
  const optionalItems = items.filter((item) => !item.required);

  const requiredComplete = requiredItems.filter((item) => item.status === 'complete').length;
  const requiredInProgress = requiredItems.filter((item) => item.status === 'in_progress').length;
  const requiredNotStarted = requiredItems.filter((item) => item.status === 'not_started').length;

  const optionalComplete = optionalItems.filter((item) => item.status === 'complete').length;

  const totalRequired = requiredItems.length;
  const totalOptional = optionalItems.length;

  const requiredPercent = totalRequired > 0 ? Math.round((requiredComplete / totalRequired) * 100) : 0;

  // Color based on required completion percentage
  const getProgressColor = () => {
    if (requiredPercent >= 100) return 'bg-green-500';
    if (requiredPercent >= 80) return 'bg-emerald-500';
    if (requiredPercent >= 50) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">NTP Readiness</h3>
        <span className="text-2xl font-bold">
          {requiredPercent}%
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Required items</span>
          <span className="font-medium">{requiredComplete} / {totalRequired}</span>
        </div>
        {/* Custom progress bar with dynamic color */}
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn('h-full transition-all', getProgressColor())}
            style={{ width: `${requiredPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <div className="text-sm">
            <span className="font-medium">{requiredComplete}</span>
            <span className="text-muted-foreground ml-1">Complete</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" />
          <div className="text-sm">
            <span className="font-medium">{requiredInProgress}</span>
            <span className="text-muted-foreground ml-1">In Progress</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Circle className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm">
            <span className="font-medium">{requiredNotStarted}</span>
            <span className="text-muted-foreground ml-1">Not Started</span>
          </div>
        </div>
      </div>

      {totalOptional > 0 && (
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Optional items</span>
            <span>{optionalComplete} / {totalOptional} complete</span>
          </div>
        </div>
      )}

      {requiredPercent === 100 && (
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">All required items complete - Ready for NTP!</span>
          </div>
        </div>
      )}
    </div>
  );
}
