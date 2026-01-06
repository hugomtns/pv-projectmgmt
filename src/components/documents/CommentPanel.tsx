import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useDocumentStore } from '@/stores/documentStore';
import { useUserStore } from '@/stores/userStore';
import { getDocumentPermissions } from '@/lib/permissions/documentPermissions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MapPin, MessageSquare, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DocumentComment } from '@/lib/types';

interface CommentPanelProps {
  /** Document ID */
  documentId: string;
  /** Current version ID */
  versionId: string;
  /** ID of highlighted comment */
  highlightedCommentId?: string;
  /** Callback when location comment is clicked */
  onLocationCommentClick: (commentId: string, page: number) => void;
}

/**
 * CommentPanel - Sidebar for viewing and managing document comments
 * Displays both document-level and location-based comments
 */
export function CommentPanel({
  documentId,
  versionId,
  highlightedCommentId,
  onLocationCommentClick,
}: CommentPanelProps) {
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const highlightedCommentRef = useRef<HTMLDivElement>(null);

  const addComment = useDocumentStore((state) => state.addComment);
  const resolveComment = useDocumentStore((state) => state.resolveComment);
  const deleteComment = useDocumentStore((state) => state.deleteComment);

  const currentUser = useUserStore((state) => state.currentUser);
  const permissionOverrides = useUserStore((state) => state.permissionOverrides);
  const roles = useUserStore((state) => state.roles);

  // Get permissions
  const permissions = getDocumentPermissions(
    currentUser,
    documentId,
    permissionOverrides,
    roles
  );

  // Auto-scroll to highlighted comment
  useEffect(() => {
    if (highlightedCommentId && highlightedCommentRef.current) {
      highlightedCommentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [highlightedCommentId]);

  // Fetch comments from IndexedDB
  const comments = useLiveQuery(
    () =>
      db.documentComments
        .where('documentId')
        .equals(documentId)
        .toArray(),
    [documentId]
  );

  // Fetch all versions to get version numbers
  const versions = useLiveQuery(
    () =>
      db.documentVersions
        .where('documentId')
        .equals(documentId)
        .toArray(),
    [documentId]
  );

  // Create version ID to version number map
  const versionMap = new Map(versions?.map(v => [v.id, v.versionNumber]) || []);

  const filteredComments = comments || [];

  // Group comments by type
  const documentComments = filteredComments.filter((c: DocumentComment) => c.type === 'document');
  const locationComments = filteredComments.filter((c: DocumentComment) => c.type === 'location');

  const handleAddComment = async () => {
    if (!newCommentText.trim()) return;

    setIsSubmitting(true);
    try {
      await addComment(documentId, versionId, newCommentText.trim());
      setNewCommentText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveToggle = async (commentId: string, currentlyResolved: boolean) => {
    if (currentlyResolved) {
      // Unresolve - update in IndexedDB directly
      await db.documentComments.update(commentId, { resolved: false });
    } else {
      await resolveComment(commentId);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    setCommentToDelete(commentId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (commentToDelete) {
      await deleteComment(commentToDelete);
      setCommentToDelete(null);
    }
  };

  const renderComment = (comment: DocumentComment) => {
    const isHighlighted = comment.id === highlightedCommentId;
    const canModify = permissions.update;
    const commentVersionNumber = versionMap.get(comment.versionId);

    return (
      <div
        key={comment.id}
        ref={comment.id === highlightedCommentId ? highlightedCommentRef : null}
        className={cn(
          'p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50',
          isHighlighted
            ? 'border-primary bg-primary/5'
            : 'border-border bg-card',
          comment.resolved && 'opacity-60'
        )}
        onClick={() => {
          if (comment.type === 'location' && comment.location) {
            onLocationCommentClick(comment.id, comment.location.page);
          }
        }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {comment.type === 'location' && comment.location && (
              <MapPin className="h-3.5 w-3.5 text-destructive shrink-0" />
            )}
            {comment.type === 'document' && (
              <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
            <span className="text-sm font-medium truncate">{comment.author}</span>
            {commentVersionNumber && (
              <Badge variant="outline" className="shrink-0 text-xs">
                v{commentVersionNumber}
              </Badge>
            )}
          </div>
          {comment.resolved && (
            <Badge variant="secondary" className="shrink-0">
              Resolved
            </Badge>
          )}
        </div>

        {comment.type === 'location' && comment.location && (
          <div className="text-xs text-muted-foreground mb-2">
            Page {comment.location.page}
          </div>
        )}

        <p className="text-sm mb-2 whitespace-pre-wrap">{comment.text}</p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{new Date(comment.createdAt).toLocaleString()}</span>

          {canModify && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResolveToggle(comment.id, comment.resolved);
                }}
              >
                {comment.resolved ? (
                  <X className="h-3 w-3" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteComment(comment.id);
                }}
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-muted/30 border-l border-border">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Comments</h3>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Location Comments */}
        {locationComments.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location Comments ({locationComments.length})
            </h4>
            <div className="space-y-2">
              {locationComments.map(renderComment)}
            </div>
          </div>
        )}

        {/* Document Comments */}
        {documentComments.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Document Comments ({documentComments.length})
            </h4>
            <div className="space-y-2">
              {documentComments.map(renderComment)}
            </div>
          </div>
        )}

        {/* Empty state */}
        {filteredComments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No comments yet. Add one below.
          </div>
        )}
      </div>

      {/* Add comment form */}
      {permissions.update && (
        <div className="p-4 border-t border-border bg-background">
          <div className="space-y-2">
            <Textarea
              placeholder="Add a document comment..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleAddComment();
                }
              }}
              className="min-h-[80px] resize-none"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                Ctrl+Enter to submit
              </span>
              <Button
                onClick={handleAddComment}
                disabled={!newCommentText.trim() || isSubmitting}
                size="sm"
              >
                {isSubmitting ? 'Adding...' : 'Add Comment'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleConfirmDelete}
        title="Delete this comment?"
        description="This action cannot be undone. The comment will be permanently deleted."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
