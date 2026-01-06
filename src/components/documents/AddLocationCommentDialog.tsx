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
import { Textarea } from '@/components/ui/textarea';

interface AddLocationCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (comment: string) => void | Promise<void>;
  pageNumber: number;
}

export function AddLocationCommentDialog({
  open,
  onOpenChange,
  onSubmit,
  pageNumber,
}: AddLocationCommentDialogProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!comment.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(comment.trim());
      handleClose();
    } catch (err) {
      setError('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setComment('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Location Comment</DialogTitle>
          <DialogDescription>
            Add a comment at this location on page {pageNumber}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Comment</label>
            <Textarea
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                setError(''); // Clear error on input
              }}
              placeholder="Enter your comment..."
              className={error ? 'border-destructive' : ''}
              disabled={isSubmitting}
              rows={4}
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
