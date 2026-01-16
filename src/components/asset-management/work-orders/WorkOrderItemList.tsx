import { useState } from 'react';
import { useWorkOrderStore } from '@/stores/workOrderStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { WorkOrderItem } from '@/lib/types/workOrder';
import {
  MAINTENANCE_CATEGORY_LABELS,
  MAINTENANCE_CATEGORY_COLORS,
} from '@/lib/types';
import { ChevronDown, ChevronRight, Check, X, SkipForward, AlertTriangle } from 'lucide-react';

interface WorkOrderItemListProps {
  workOrderId: string;
  items: WorkOrderItem[];
}

export function WorkOrderItemList({ workOrderId, items }: WorkOrderItemListProps) {
  const updateWorkOrderItem = useWorkOrderStore((state) => state.updateWorkOrderItem);

  // Group items by category
  const categories = Array.from(new Set(items.map((item) => item.category)));

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Work Items ({items.length})</h4>

      {categories.map((category) => (
        <WorkOrderCategorySection
          key={category}
          workOrderId={workOrderId}
          category={category}
          items={items.filter((item) => item.category === category)}
          onUpdateItem={updateWorkOrderItem}
        />
      ))}

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No work items in this order
        </p>
      )}
    </div>
  );
}

interface WorkOrderCategorySectionProps {
  workOrderId: string;
  category: string;
  items: WorkOrderItem[];
  onUpdateItem: (
    workOrderId: string,
    itemId: string,
    updates: Partial<Pick<WorkOrderItem, 'result' | 'notes' | 'isPunchListItem' | 'timeSpentMinutes'>>
  ) => void;
}

function WorkOrderCategorySection({
  workOrderId,
  category,
  items,
  onUpdateItem,
}: WorkOrderCategorySectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  const categoryColor = MAINTENANCE_CATEGORY_COLORS[category as keyof typeof MAINTENANCE_CATEGORY_COLORS] || '#6b7280';
  const completedCount = items.filter(
    (item) => item.result === 'completed' || item.result === 'skipped'
  ).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-3 py-2 h-auto"
        >
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: categoryColor }}
            />
            <span className="font-medium">
              {MAINTENANCE_CATEGORY_LABELS[category as keyof typeof MAINTENANCE_CATEGORY_LABELS] || category}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {completedCount}/{items.length}
          </span>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-1 pl-6 pr-2 pb-2">
          {items.map((item) => (
            <WorkOrderItemRow
              key={item.id}
              workOrderId={workOrderId}
              item={item}
              onUpdate={onUpdateItem}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface WorkOrderItemRowProps {
  workOrderId: string;
  item: WorkOrderItem;
  onUpdate: (
    workOrderId: string,
    itemId: string,
    updates: Partial<Pick<WorkOrderItem, 'result' | 'notes' | 'isPunchListItem' | 'timeSpentMinutes'>>
  ) => void;
}

function WorkOrderItemRow({ workOrderId, item, onUpdate }: WorkOrderItemRowProps) {
  const getResultIcon = () => {
    switch (item.result) {
      case 'completed':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'skipped':
        return <SkipForward className="h-4 w-4 text-muted-foreground" />;
      case 'failed':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const handleResultChange = (result: WorkOrderItem['result']) => {
    onUpdate(workOrderId, item.id, { result });
  };

  const handleTogglePunchList = () => {
    onUpdate(workOrderId, item.id, { isPunchListItem: !item.isPunchListItem });
  };

  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded hover:bg-muted/50">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {getResultIcon()}
        <span className="text-sm truncate">{item.title}</span>
        {item.required && (
          <Badge variant="outline" className="text-xs shrink-0">Required</Badge>
        )}
        {item.isPunchListItem && !item.punchListResolvedAt && (
          <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0" />
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="sm"
          variant={item.result === 'completed' ? 'default' : 'ghost'}
          className="h-7 w-7 p-0"
          onClick={() => handleResultChange(item.result === 'completed' ? 'pending' : 'completed')}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant={item.result === 'skipped' ? 'secondary' : 'ghost'}
          className="h-7 w-7 p-0"
          onClick={() => handleResultChange(item.result === 'skipped' ? 'pending' : 'skipped')}
          disabled={item.required}
        >
          <SkipForward className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant={item.result === 'failed' ? 'destructive' : 'ghost'}
          className="h-7 w-7 p-0"
          onClick={() => handleResultChange(item.result === 'failed' ? 'pending' : 'failed')}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant={item.isPunchListItem ? 'secondary' : 'ghost'}
          className="h-7 w-7 p-0 ml-1"
          onClick={handleTogglePunchList}
          title="Flag for punch list"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
