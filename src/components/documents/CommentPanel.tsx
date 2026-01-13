import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useDocumentStore } from '@/stores/documentStore';
import { useUserStore } from '@/stores/userStore';
import { getDocumentPermissions } from '@/lib/permissions/documentPermissions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MapPin, MessageSquare, Check, X, Highlighter } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DocumentComment } from '@/lib/types';
import { isHighlightComment } from '@/lib/types/document';
import { HIGHLIGHT_COLORS, HIGHLIGHT_COLOR_NAMES } from './constants/highlightConstants';

interface CommentPanelProps {
  /** Document ID */
  documentId: string;
  /** Selected (viewed) version ID */
  selectedVersionId: string;
  /** ID of highlighted comment */
  highlightedCommentId?: string;
  /** Callback when location comment is clicked */
  onLocationCommentClick: (commentId: string, page: number, versionId: string) => void;
}

/**
 * CommentPanel - Sidebar for viewing and managing document comments
 * Displays both document-level and location-based comments
 */
export function CommentPanel({
  documentId,
  selectedVersionId,
  highlightedCommentId,
  onLocationCommentClick,
}: CommentPanelProps) {
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'location' | 'document'>('location');
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

  // Auto-switch tab and scroll to highlighted comment
  useEffect(() => {
    if (!highlightedCommentId) return;

    // Find the comment to determine which tab it's in
    const comment = filteredComments.find(c => c.id === highlightedCommentId);
    if (comment) {
      // Switch to the appropriate tab
      setActiveTab(comment.type === 'location' ? 'location' : 'document');

      // Small delay to allow tab switch to render
      setTimeout(() => {
        if (highlightedCommentRef.current) {
          highlightedCommentRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, 100);
    }
  }, [highlightedCommentId, filteredComments]);

  const handleAddComment = async () => {
    if (!newCommentText.trim()) return;

    setIsSubmitting(true);
    try {
      await addComment(documentId, selectedVersionId, newCommentText.trim());
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
            onLocationCommentClick(comment.id, comment.location.page, comment.versionId);
          } else if (comment.type === 'document') {
            // For document-level comments, pass 0 to indicate no page navigation
            onLocationCommentClick(comment.id, 0, comment.versionId);
          }
        }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {comment.type === 'location' && comment.location && (
              <>
                {isHighlightComment(comment) ? (
                  <Highlighter className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                ) : (
                  <MapPin className="h-3.5 w-3.5 text-destructive shrink-0" />
                )}
                {/* Color indicator for highlights */}
                {isHighlightComment(comment) && comment.location.highlightColor && (
                  <div
                    className="w-3 h-3 rounded border border-border shrink-0"
                    style={{ backgroundColor: HIGHLIGHT_COLORS[comment.location.highlightColor] }}
                    title={HIGHLIGHT_COLOR_NAMES[comment.location.highlightColor]}
                  />
                )}
              </>
            )}
            {comment.type === 'document' && (
              <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
            <span className="text-sm font-medium truncate">{comment.author}</span>
            {commentVersionNumber && (
              <Badge
                variant={comment.versionId === selectedVersionId ? "default" : "outline"}
                className="shrink-0 text-xs"
              >
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'location' | 'document')} className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="location" className="gap-2">
              <MapPin className="h-4 w-4" />
              Location ({locationComments.length})
            </TabsTrigger>
            <TabsTrigger value="document" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Document ({documentComments.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="location" className="flex-1 overflow-auto px-4 pb-4 mt-4 space-y-2">
          {locationComments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No location comments yet.
              <br />
              <span className="text-xs">Click on the document to add pinned comments.</span>
            </div>
          ) : (
            locationComments.map(renderComment)
          )}
        </TabsContent>

        <TabsContent value="document" className="flex-1 overflow-auto px-4 pb-4 mt-4 space-y-2">
          {documentComments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No document comments yet.
              <br />
              <span className="text-xs">Add one below.</span>
            </div>
          ) : (
            documentComments.map(renderComment)
          )}
        </TabsContent>
      </Tabs>

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
