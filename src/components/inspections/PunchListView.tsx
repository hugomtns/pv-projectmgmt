import { useState, useMemo } from 'react';
import { useInspectionStore } from '@/stores/inspectionStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle, Camera, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  INSPECTION_TYPE_LABELS,
  INSPECTION_CATEGORY_LABELS,
  type InspectionItem,
} from '@/lib/types/inspection';
import type { Inspection } from '@/lib/types/inspection';

interface PunchListViewProps {
  projectId: string;
  onItemClick?: (inspection: Inspection, item: InspectionItem) => void;
}

export function PunchListView({ projectId, onItemClick }: PunchListViewProps) {
  const [showResolved, setShowResolved] = useState(false);

  const allInspections = useInspectionStore((state) => state.inspections);
  const markPunchListResolved = useInspectionStore((state) => state.markPunchListResolved);

  // Get punch list items for this project
  const punchListItems = useMemo(() => {
    const projectInspections = allInspections.filter((i) => i.projectId === projectId);
    const items: Array<{ inspection: Inspection; item: InspectionItem }> = [];

    for (const inspection of projectInspections) {
      for (const item of inspection.items) {
        if (item.isPunchListItem) {
          items.push({ inspection, item });
        }
      }
    }

    // Sort by unresolved first, then by date
    return items.sort((a, b) => {
      if (a.item.punchListResolvedAt && !b.item.punchListResolvedAt) return 1;
      if (!a.item.punchListResolvedAt && b.item.punchListResolvedAt) return -1;
      return new Date(b.item.updatedAt).getTime() - new Date(a.item.updatedAt).getTime();
    });
  }, [allInspections, projectId]);

  const openItems = punchListItems.filter((p) => !p.item.punchListResolvedAt);
  const resolvedItems = punchListItems.filter((p) => p.item.punchListResolvedAt);

  const displayItems = showResolved ? punchListItems : openItems;

  if (punchListItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
        <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-lg font-medium mb-1">No punch list items</h3>
        <p className="text-sm text-muted-foreground">
          Items flagged for follow-up will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-medium">
            Punch List
          </h3>
          {openItems.length > 0 && (
            <Badge variant="outline" className="border-orange-500 text-orange-600">
              {openItems.length} open
            </Badge>
          )}
          {resolvedItems.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {resolvedItems.length} resolved
            </span>
          )}
        </div>
        {resolvedItems.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowResolved(!showResolved)}
          >
            {showResolved ? 'Hide Resolved' : 'Show Resolved'}
          </Button>
        )}
      </div>

      {/* Punch list items */}
      <div className="space-y-3">
        {displayItems.map(({ inspection, item }) => (
          <Card
            key={`${inspection.id}-${item.id}`}
            className={cn(
              'cursor-pointer hover:bg-accent/50 transition-colors',
              item.punchListResolvedAt && 'opacity-60'
            )}
            onClick={() => onItemClick?.(inspection, item)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-medium">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {INSPECTION_TYPE_LABELS[inspection.type]} · {INSPECTION_CATEGORY_LABELS[item.category]}
                  </CardDescription>
                </div>
                {item.punchListResolvedAt ? (
                  <Badge variant="outline" className="border-green-500 text-green-600 shrink-0">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Resolved
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-orange-500 text-orange-600 shrink-0">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Open
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {format(new Date(inspection.scheduledDate), 'MMM d, yyyy')}
                  </span>
                  {item.photos.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      {item.photos.length}
                    </span>
                  )}
                  {item.notes && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      Note
                    </span>
                  )}
                </div>
                {!item.punchListResolvedAt && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      markPunchListResolved(inspection.id, item.id);
                    }}
                  >
                    <CheckCircle className="w-3 h-3" />
                    Resolve
                  </Button>
                )}
              </div>
              {item.punchListResolvedAt && item.punchListResolvedBy && (
                <p className="text-xs text-muted-foreground mt-2">
                  Resolved by {item.punchListResolvedBy} on{' '}
                  {format(new Date(item.punchListResolvedAt), 'MMM d, yyyy')}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
