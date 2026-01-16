import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Minus, Circle, Camera, MessageSquare } from 'lucide-react';
import type { InspectionItem as InspectionItemType, InspectionItemResult } from '@/lib/types/inspection';

interface InspectionItemProps {
  item: InspectionItemType;
  onResultChange: (result: InspectionItemResult) => void;
  onClick?: () => void;
  disabled?: boolean;
}

const RESULT_BUTTONS: { result: InspectionItemResult; icon: typeof Check; label: string }[] = [
  { result: 'pass', icon: Check, label: 'Pass' },
  { result: 'fail', icon: X, label: 'Fail' },
  { result: 'na', icon: Minus, label: 'N/A' },
];

export function InspectionItem({ item, onResultChange, onClick, disabled }: InspectionItemProps) {
  const hasNotes = item.notes.trim().length > 0;
  const hasPhotos = item.photos.length > 0;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border bg-card',
        item.isPunchListItem && 'border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20',
        onClick && 'cursor-pointer hover:bg-accent/50'
      )}
      onClick={onClick}
    >
      {/* Result indicator */}
      <div className="mt-0.5">
        {item.result === 'pass' && (
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}
        {item.result === 'fail' && (
          <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </div>
        )}
        {item.result === 'na' && (
          <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center">
            <Minus className="w-4 h-4 text-white" />
          </div>
        )}
        {item.result === 'pending' && (
          <Circle className="w-6 h-6 text-muted-foreground/30" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <span className="font-medium text-sm">{item.title}</span>
          {item.required && (
            <Badge variant="secondary" className="text-xs shrink-0">
              Required
            </Badge>
          )}
          {item.isPunchListItem && (
            <Badge variant="outline" className="text-xs shrink-0 border-orange-500 text-orange-600">
              Punch List
            </Badge>
          )}
        </div>
        {item.description && (
          <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
        )}

        {/* Indicators for notes/photos */}
        {(hasNotes || hasPhotos) && (
          <div className="flex items-center gap-2 mt-1.5">
            {hasPhotos && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Camera className="w-3 h-3" />
                {item.photos.length}
              </span>
            )}
            {hasNotes && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="w-3 h-3" />
                Note
              </span>
            )}
          </div>
        )}
      </div>

      {/* Result toggle buttons */}
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {RESULT_BUTTONS.map(({ result, icon: Icon, label }) => (
          <Button
            key={result}
            variant={item.result === result ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-8 w-8 p-0',
              item.result === result && result === 'pass' && 'bg-green-500 hover:bg-green-600',
              item.result === result && result === 'fail' && 'bg-red-500 hover:bg-red-600',
              item.result === result && result === 'na' && 'bg-gray-400 hover:bg-gray-500'
            )}
            onClick={() => onResultChange(result)}
            disabled={disabled}
            title={label}
          >
            <Icon className="w-4 h-4" />
          </Button>
        ))}
      </div>
    </div>
  );
}
