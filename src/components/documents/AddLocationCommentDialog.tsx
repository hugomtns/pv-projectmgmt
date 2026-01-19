import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import type { HighlightColor } from '@/lib/types/document';
import { HIGHLIGHT_COLORS, HIGHLIGHT_COLOR_NAMES } from './constants/highlightConstants';
import { MentionInput } from '@/components/mentions/MentionInput';

interface AddLocationCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (comment: string, highlightColor?: HighlightColor, mentions?: string[]) => void | Promise<void>;
  pageNumber: number;
  isHighlight?: boolean;
  highlightColor?: HighlightColor;
}

export function AddLocationCommentDialog({
  open,
  onOpenChange,
  onSubmit,
  pageNumber,
  isHighlight = false,
  highlightColor = 'yellow',
}: AddLocationCommentDialogProps) {
  const [comment, setComment] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<HighlightColor>(highlightColor);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleTextChange = (text: string, mentionedUserIds: string[]) => {
    setComment(text);
    setMentions(mentionedUserIds);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!comment.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const mentionsToPass = mentions.length > 0 ? mentions : undefined;
      if (isHighlight) {
        await onSubmit(comment.trim(), selectedColor, mentionsToPass);
      } else {
        await onSubmit(comment.trim(), undefined, mentionsToPass);
      }
      handleClose();
    } catch (err) {
      setError('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setComment('');
    setMentions([]);
    setSelectedColor(highlightColor);
    setError('');
    onOpenChange(false);
  };

  const colorOptions: HighlightColor[] = ['yellow', 'green', 'blue', 'pink', 'orange'];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isHighlight ? 'Add Highlight Comment' : 'Add Location Comment'}
          </DialogTitle>
          <DialogDescription>
            {isHighlight
              ? `Add a comment to this highlighted area on page ${pageNumber}`
              : `Add a comment at this location on page ${pageNumber}`
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Color picker - only shown for highlights */}
          {isHighlight && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Highlight Color</label>
              <div className="flex gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className="relative w-10 h-10 rounded border-2 transition-all hover:scale-110"
                    style={{
                      backgroundColor: HIGHLIGHT_COLORS[color],
                      borderColor: selectedColor === color ? '#000' : '#d1d5db',
                    }}
                    title={HIGHLIGHT_COLOR_NAMES[color]}
                    disabled={isSubmitting}
                  >
                    {selectedColor === color && (
                      <Check className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Comment input with @mentions */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Comment</label>
            <MentionInput
              value={comment}
              onChange={handleTextChange}
              placeholder="Enter your comment... (use @ to mention someone)"
              className={error ? 'border-destructive' : ''}
              disabled={isSubmitting}
              minHeight="100px"
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !comment.trim()}>
              {isSubmitting ? 'Adding...' : 'Add Comment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
