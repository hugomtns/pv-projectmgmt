import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { InspectionItem } from './InspectionItem';
import { INSPECTION_CATEGORY_LABELS } from '@/lib/types/inspection';
import type { InspectionItem as InspectionItemType, InspectionCategory as InspectionCategoryType, InspectionItemResult } from '@/lib/types/inspection';

interface InspectionCategoryProps {
  category: InspectionCategoryType;
  items: InspectionItemType[];
  onItemResultChange: (itemId: string, result: InspectionItemResult) => void;
  onItemClick?: (item: InspectionItemType) => void;
  disabled?: boolean;
  defaultExpanded?: boolean;
}

export function InspectionCategory({
  category,
  items,
  onItemResultChange,
  onItemClick,
  disabled,
  defaultExpanded = true,
}: InspectionCategoryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const completedCount = items.filter((i) => i.result !== 'pending').length;
  const totalCount = items.length;
  const allComplete = completedCount === totalCount;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Category header */}
      <button
        className={cn(
          'w-full flex items-center gap-2 px-4 py-3 text-left bg-muted/50 hover:bg-muted transition-colors',
          allComplete && 'bg-green-50 dark:bg-green-950/20'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <span className="font-medium text-sm flex-1">
          {INSPECTION_CATEGORY_LABELS[category]}
        </span>
        <span className={cn(
          'text-xs',
          allComplete ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
        )}>
          {completedCount}/{totalCount}
        </span>
      </button>

      {/* Category items */}
      {isExpanded && (
        <div className="p-2 space-y-2">
          {items.map((item) => (
            <InspectionItem
              key={item.id}
              item={item}
              onResultChange={(result) => onItemResultChange(item.id, result)}
              onClick={onItemClick ? () => onItemClick(item) : undefined}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}
