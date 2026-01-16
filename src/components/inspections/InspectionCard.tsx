import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import type { Inspection } from '@/lib/types';
import {
  INSPECTION_TYPE_LABELS,
  INSPECTION_STATUS_LABELS,
} from '@/lib/types/inspection';

interface InspectionCardProps {
  inspection: Inspection;
  onClick?: () => void;
}

const STATUS_COLORS: Record<Inspection['status'], string> = {
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

const TYPE_COLORS: Record<Inspection['type'], string> = {
  pre_construction: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  progress: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  commissioning: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  annual_om: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
};

export function InspectionCard({ inspection, onClick }: InspectionCardProps) {
  // Calculate progress
  const totalItems = inspection.items.length;
  const completedItems = inspection.items.filter(
    (item) => item.result !== 'pending'
  ).length;
  const passedItems = inspection.items.filter((item) => item.result === 'pass').length;
  const failedItems = inspection.items.filter((item) => item.result === 'fail').length;
  const punchListItems = inspection.items.filter(
    (item) => item.isPunchListItem && !item.punchListResolvedAt
  ).length;

  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header: Type and Status */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <Badge variant="secondary" className={TYPE_COLORS[inspection.type]}>
            {INSPECTION_TYPE_LABELS[inspection.type]}
          </Badge>
          <Badge variant="secondary" className={STATUS_COLORS[inspection.status]}>
            {INSPECTION_STATUS_LABELS[inspection.status]}
          </Badge>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Calendar className="h-4 w-4" />
          <span>
            {inspection.completedDate
              ? `Completed ${format(new Date(inspection.completedDate), 'MMM d, yyyy')}`
              : `Scheduled ${format(new Date(inspection.scheduledDate), 'MMM d, yyyy')}`}
          </span>
        </div>

        {/* Inspector */}
        <div className="text-sm text-muted-foreground mb-3">
          Inspector: {inspection.inspectorName}
          {inspection.inspectorCompany && ` (${inspection.inspectorCompany})`}
        </div>

        {/* Progress */}
        <div className="space-y-2">
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-12 text-right">
              {completedItems}/{totalItems}
            </span>
          </div>

          {/* Status counts */}
          <div className="flex items-center gap-3 text-xs">
            {passedItems > 0 && (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                {passedItems} passed
              </span>
            )}
            {failedItems > 0 && (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <XCircle className="h-3 w-3" />
                {failedItems} failed
              </span>
            )}
            {completedItems < totalItems && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {totalItems - completedItems} pending
              </span>
            )}
          </div>

          {/* Punch list indicator */}
          {punchListItems > 0 && (
            <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
              <AlertTriangle className="h-3 w-3" />
              {punchListItems} punch list item{punchListItems !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
