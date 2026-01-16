import { useState, useEffect, useRef } from 'react';
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
import { InspectionPhotoGallery } from './InspectionPhotoGallery';
import { Check, X, Minus, Camera, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
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
  const addItemPhoto = useInspectionStore((state) => state.addItemPhoto);
  const deleteItemPhoto = useInspectionStore((state) => state.deleteItemPhoto);
  const markPunchListResolved = useInspectionStore((state) => state.markPunchListResolved);

  const [result, setResult] = useState<InspectionItemResult>('pending');
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        await addItemPhoto(inspectionId, item.id, file);
      }
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    await deleteItemPhoto(inspectionId, item.id, photoId);
  };

  const handleTogglePunchList = () => {
    updateInspectionItem(inspectionId, item.id, { isPunchListItem: !item.isPunchListItem });
  };

  const handleResolvePunchList = () => {
    markPunchListResolved(inspectionId, item.id);
  };

  const hasChanges = notes !== item.notes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div>
            <DialogTitle className="pr-8">{item.title}</DialogTitle>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground">
                {INSPECTION_CATEGORY_LABELS[item.category]}
              </p>
              {item.required && (
                <Badge variant="secondary" className="text-xs">
                  Required
                </Badge>
              )}
            </div>
          </div>
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

          {/* Photos section */}
          <div className="space-y-2">
            <Label>Photos ({item.photos.length})</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />
            {item.photos.length === 0 ? (
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-6 text-center',
                  !disabled && 'cursor-pointer hover:bg-muted/50',
                  isUploading && 'opacity-50'
                )}
                onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <Loader2 className="w-8 h-8 mx-auto text-muted-foreground mb-2 animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                )}
                <p className="text-sm text-muted-foreground">
                  {isUploading ? 'Uploading...' : 'No photos attached'}
                </p>
                {!disabled && !isUploading && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Click to add photos
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <InspectionPhotoGallery
                  photos={item.photos}
                  onDelete={handleDeletePhoto}
                  disabled={disabled}
                />
                {!disabled && (
                  <div
                    className={cn(
                      'border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:bg-muted/50',
                      isUploading && 'opacity-50'
                    )}
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 mx-auto text-muted-foreground animate-spin" />
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Click to add more photos
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Punch list section */}
          <div className="space-y-2">
            <Label>Punch List</Label>
            {!item.isPunchListItem ? (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                onClick={handleTogglePunchList}
                disabled={disabled}
              >
                <AlertTriangle className="w-4 h-4" />
                Flag for Follow-up
              </Button>
            ) : item.punchListResolvedAt ? (
              <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    Resolved
                  </span>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  by {item.punchListResolvedBy}
                </p>
              </div>
            ) : (
              <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-md space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    Flagged for follow-up
                  </span>
                </div>
                {!disabled && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1 bg-green-600 hover:bg-green-700"
                      onClick={handleResolvePunchList}
                    >
                      <CheckCircle className="w-3 h-3" />
                      Mark Resolved
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={handleTogglePunchList}
                    >
                      Remove Flag
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
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
