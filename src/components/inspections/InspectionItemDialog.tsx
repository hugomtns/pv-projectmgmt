import { useState, useEffect } from 'react';
import { useInspectionStore } from '@/stores/inspectionStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Minus, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  INSPECTION_CATEGORY_LABELS,
  type InspectionItem,
  type InspectionItemResult,
} from '@/lib/types/inspection';

interface InspectionItemDialogProps {
  inspectionId: string;
  item: InspectionItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
}

const RESULT_OPTIONS: { result: InspectionItemResult; icon: typeof Check; label: string; color: string }[] = [
  { result: 'pass', icon: Check, label: 'Pass', color: 'bg-green-500 hover:bg-green-600' },
  { result: 'fail', icon: X, label: 'Fail', color: 'bg-red-500 hover:bg-red-600' },
  { result: 'na', icon: Minus, label: 'N/A', color: 'bg-gray-400 hover:bg-gray-500' },
];

export function InspectionItemDialog({
  inspectionId,
  item,
  open,
  onOpenChange,
  disabled,
}: InspectionItemDialogProps) {
  const updateInspectionItem = useInspectionStore((state) => state.updateInspectionItem);

  const [result, setResult] = useState<InspectionItemResult>('pending');
  const [notes, setNotes] = useState('');

  // Sync state when item changes
  useEffect(() => {
    if (item) {
      setResult(item.result);
      setNotes(item.notes);
    }
  }, [item]);

  if (!item) return null;

  const handleSave = () => {
    updateInspectionItem(inspectionId, item.id, { result, notes });
    onOpenChange(false);
  };

  const handleResultChange = (newResult: InspectionItemResult) => {
    setResult(newResult);
    // Auto-save result changes immediately
    updateInspectionItem(inspectionId, item.id, { result: newResult });
  };

  const hasChanges = notes !== item.notes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-start gap-2">
            <DialogTitle className="flex-1">{item.title}</DialogTitle>
            {item.required && (
              <Badge variant="secondary" className="shrink-0">
                Required
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {INSPECTION_CATEGORY_LABELS[item.category]}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Description */}
          {item.description && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              {item.description}
            </div>
          )}

          {/* Result selection */}
          <div className="space-y-2">
            <Label>Result</Label>
            <div className="flex gap-2">
              {RESULT_OPTIONS.map(({ result: r, icon: Icon, label, color }) => (
                <Button
                  key={r}
                  variant={result === r ? 'default' : 'outline'}
                  className={cn(
                    'flex-1 gap-2',
                    result === r && color
                  )}
                  onClick={() => handleResultChange(r)}
                  disabled={disabled}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this item..."
              rows={4}
              disabled={disabled}
            />
          </div>

          {/* Photos section - placeholder for Story 6 */}
          <div className="space-y-2">
            <Label>Photos</Label>
            {item.photos.length === 0 ? (
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Camera className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No photos attached
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Photo capture coming soon
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {item.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="aspect-square bg-muted rounded-md flex items-center justify-center"
                  >
                    <Camera className="w-6 h-6 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Punch list indicator */}
          {item.isPunchListItem && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-md">
              <Badge variant="outline" className="border-orange-500 text-orange-600">
                Punch List
              </Badge>
              <span className="text-sm text-orange-700 dark:text-orange-300">
                This item requires follow-up
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {hasChanges ? 'Cancel' : 'Close'}
          </Button>
          {hasChanges && !disabled && (
            <Button onClick={handleSave}>
              Save Notes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
