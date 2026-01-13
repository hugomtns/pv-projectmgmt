/**
 * ElementCommentDialog - Dialog for adding comments to design elements
 *
 * Opens when a user clicks an element in comment mode.
 * Shows element info and allows adding a new comment.
 */

import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, CheckCircle2 } from 'lucide-react';
import { useDesignStore } from '@/stores/designStore';
import type { ElementAnchor, DesignComment } from '@/lib/types';
import { toast } from 'sonner';

interface ElementCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elementAnchor: ElementAnchor;
  designId: string;
  versionId: string;
  onCommentAdded?: () => void;
}

export function ElementCommentDialog({
  open,
  onOpenChange,
  elementAnchor,
  designId,
  versionId,
  onCommentAdded,
}: ElementCommentDialogProps) {
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingComments, setExistingComments] = useState<DesignComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addComment = useDesignStore((state) => state.addComment);
  const getElementComments = useDesignStore((state) => state.getElementComments);
  const resolveComment = useDesignStore((state) => state.resolveComment);

  // Load existing comments for this element
  useEffect(() => {
    if (!open) return;

    const loadComments = async () => {
      setIsLoading(true);
      try {
        const comments = await getElementComments(
          designId,
          versionId,
          elementAnchor.elementType,
          elementAnchor.elementId
        );
        setExistingComments(comments);
      } catch (e) {
        console.error('Failed to load element comments:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadComments();
  }, [open, designId, versionId, elementAnchor, getElementComments]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setCommentText('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    try {
      const commentId = await addComment(designId, versionId, commentText, elementAnchor);
      if (commentId) {
        toast.success('Comment added');
        setCommentText('');
        // Refresh comments
        const comments = await getElementComments(
          designId,
          versionId,
          elementAnchor.elementType,
          elementAnchor.elementId
        );
        setExistingComments(comments);
        onCommentAdded?.();
      }
    } catch (e) {
      console.error('Failed to add comment:', e);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async (commentId: string) => {
    try {
      const success = await resolveComment(commentId);
      if (success) {
        // Refresh comments
        const comments = await getElementComments(
          designId,
          versionId,
          elementAnchor.elementType,
          elementAnchor.elementId
        );
        setExistingComments(comments);
      }
    } catch (e) {
      console.error('Failed to resolve comment:', e);
    }
  };

  // Get element type display name
  const elementTypeName = elementAnchor.elementType.charAt(0).toUpperCase() + elementAnchor.elementType.slice(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Element Comment
          </DialogTitle>
          <DialogDescription>
            Add a comment for this {elementAnchor.elementType}
          </DialogDescription>
        </DialogHeader>

        {/* Element Info */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
          <Badge variant="outline">{elementTypeName}</Badge>
          <span className="text-sm font-medium">{elementAnchor.elementLabel}</span>
        </div>

        {/* Existing Comments */}
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : existingComments.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <div className="text-sm font-medium text-muted-foreground">
              Existing Comments ({existingComments.length})
            </div>
            {existingComments.map((comment) => (
              <div
                key={comment.id}
                className={`p-2 rounded border text-sm ${
                  comment.resolved ? 'bg-muted/30 border-muted' : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-xs">{comment.author}</span>
                      {comment.resolved && (
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Resolved
                        </Badge>
                      )}
                    </div>
                    <p className={comment.resolved ? 'text-muted-foreground' : ''}>
                      {comment.text}
                    </p>
                  </div>
                  {!comment.resolved && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => handleResolve(comment.id)}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* New Comment Input */}
        <div className="space-y-2">
          <Textarea
            placeholder="Enter your comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="min-h-[80px]"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !commentText.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Adding...
              </>
            ) : (
              'Add Comment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
