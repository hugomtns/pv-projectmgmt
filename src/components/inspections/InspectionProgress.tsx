import { cn } from '@/lib/utils';
import type { InspectionItem } from '@/lib/types/inspection';

interface InspectionProgressProps {
  items: InspectionItem[];
  className?: string;
}

export function InspectionProgress({ items, className }: InspectionProgressProps) {
  const pass = items.filter((i) => i.result === 'pass').length;
  const fail = items.filter((i) => i.result === 'fail').length;
  const na = items.filter((i) => i.result === 'na').length;
  const pending = items.filter((i) => i.result === 'pending').length;
  const total = items.length;

  const completed = pass + fail + na;
  const progressPercent = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden flex">
        {pass > 0 && (
          <div
            className="bg-green-500 h-full"
            style={{ width: `${(pass / total) * 100}%` }}
          />
        )}
        {fail > 0 && (
          <div
            className="bg-red-500 h-full"
            style={{ width: `${(fail / total) * 100}%` }}
          />
        )}
        {na > 0 && (
          <div
            className="bg-gray-400 h-full"
            style={{ width: `${(na / total) * 100}%` }}
          />
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">
          {Math.round(progressPercent)}% complete
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-green-600 dark:text-green-400">{pass} pass</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-red-600 dark:text-red-400">{fail} fail</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-muted-foreground">{na} N/A</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
            <span className="text-muted-foreground">{pending} pending</span>
          </span>
        </div>
      </div>
    </div>
  );
}
