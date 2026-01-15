import { useProjectStore } from '@/stores/projectStore';
import { Button } from '@/components/ui/button';
import { ClipboardList, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NtpReadinessCardProps {
  projectId: string;
  onNavigateToChecklist: () => void;
}

export function NtpReadinessCard({
  projectId,
  onNavigateToChecklist,
}: NtpReadinessCardProps) {
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));

  if (!project) return null;

  const ntpChecklist = project.ntpChecklist;

  // No checklist initialized
  if (!ntpChecklist) {
    return (
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-dashed">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-muted-foreground">NTP Checklist</p>
            <p className="text-sm text-muted-foreground">Not initialized</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onNavigateToChecklist}>
          View
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    );
  }

  // Calculate progress
  const items = ntpChecklist.items;
  const requiredItems = items.filter((item) => item.required);
  const requiredComplete = requiredItems.filter((item) => item.status === 'complete').length;
  const totalRequired = requiredItems.length;
  const requiredPercent = totalRequired > 0 ? Math.round((requiredComplete / totalRequired) * 100) : 0;

  // Color based on completion percentage
  const getProgressColor = () => {
    if (requiredPercent >= 100) return 'bg-green-500';
    if (requiredPercent >= 80) return 'bg-emerald-500';
    if (requiredPercent >= 50) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const isComplete = requiredPercent === 100;

  return (
    <div
      className={cn(
        'p-4 rounded-lg border',
        isComplete
          ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
          : 'bg-muted/50'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
          <span className="font-semibold">NTP Readiness</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onNavigateToChecklist}>
          View Checklist
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <span className={cn(
          'text-3xl font-bold',
          isComplete ? 'text-green-600 dark:text-green-400' : ''
        )}>
          {requiredPercent}%
        </span>

        <div className="flex-1">
          {/* Progress bar */}
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary mb-1">
            <div
              className={cn('h-full transition-all', getProgressColor())}
              style={{ width: `${requiredPercent}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {requiredComplete} / {totalRequired} required items complete
          </p>
        </div>
      </div>

      {isComplete && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-green-200 dark:border-green-900 text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">Ready for NTP!</span>
        </div>
      )}
    </div>
  );
}
