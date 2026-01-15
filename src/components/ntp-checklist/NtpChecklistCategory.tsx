import { useState } from 'react';
import type { NtpChecklistItem, NtpCategory } from '@/lib/types';
import { NTP_CATEGORY_LABELS } from '@/lib/types';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NtpChecklistItem as NtpChecklistItemComponent } from './NtpChecklistItem';
import {
  ChevronDown,
  ChevronRight,
  MapPin,
  FileCheck,
  Zap,
  Leaf,
  Handshake,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NtpChecklistCategoryProps {
  category: NtpCategory;
  items: NtpChecklistItem[];
  onToggleStatus: (itemId: string) => void;
  onItemClick: (item: NtpChecklistItem) => void;
  defaultOpen?: boolean;
  canModify?: boolean;
}

const CATEGORY_ICONS: Record<NtpCategory, React.ReactNode> = {
  site_control: <MapPin className="h-4 w-4" />,
  permitting: <FileCheck className="h-4 w-4" />,
  grid: <Zap className="h-4 w-4" />,
  environmental: <Leaf className="h-4 w-4" />,
  commercial: <Handshake className="h-4 w-4" />,
  financial: <DollarSign className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<NtpCategory, string> = {
  site_control: 'text-blue-500',
  permitting: 'text-purple-500',
  grid: 'text-yellow-500',
  environmental: 'text-green-500',
  commercial: 'text-orange-500',
  financial: 'text-emerald-500',
};

export function NtpChecklistCategory({
  category,
  items,
  onToggleStatus,
  onItemClick,
  defaultOpen = true,
  canModify = false,
}: NtpChecklistCategoryProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const completedCount = items.filter((item) => item.status === 'complete').length;
  const requiredCount = items.filter((item) => item.required).length;
  const requiredCompleteCount = items.filter(
    (item) => item.required && item.status === 'complete'
  ).length;

  const allRequiredComplete = requiredCount > 0 && requiredCompleteCount === requiredCount;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start h-auto py-3 px-4',
            allRequiredComplete && 'bg-green-50 dark:bg-green-950/20'
          )}
        >
          <div className="flex items-center gap-3 w-full">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )}
            <span className={cn('shrink-0', CATEGORY_COLORS[category])}>
              {CATEGORY_ICONS[category]}
            </span>
            <span className="font-semibold">{NTP_CATEGORY_LABELS[category]}</span>
            <div className="flex items-center gap-2 ml-auto">
              {allRequiredComplete && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
              <Badge variant="secondary" className="ml-auto">
                {completedCount} / {items.length}
              </Badge>
            </div>
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 pl-11 pr-4 pb-4">
          {items.map((item) => (
            <NtpChecklistItemComponent
              key={item.id}
              item={item}
              onToggleStatus={() => onToggleStatus(item.id)}
              onClick={() => onItemClick(item)}
              canModify={canModify}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
