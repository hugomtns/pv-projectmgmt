/**
 * CommentPanel - Comment panel for document viewer
 *
 * Uses CommentPanelBase for consistent UI, with document-specific
 * rendering for location comments (page, highlight color, etc.).
 */

import { useMemo, useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useDocumentStore } from '@/stores/documentStore';
import { useUserStore } from '@/stores/userStore';
import { getDocumentPermissions } from '@/lib/permissions/documentPermissions';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CommentPanelBase } from '@/components/shared/CommentPanelBase';
import { MapPin, MessageSquare, Highlighter } from 'lucide-react';
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

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
  const versionMap = useMemo(
    () => new Map(versions?.map((v) => [v.id, v.versionNumber]) || []),
    [versions]
  );

  const filteredComments = comments || [];

  // Group comments by type
  const { locationComments, documentComments } = useMemo(() => {
    const location: DocumentComment[] = [];
    const document: DocumentComment[] = [];

    for (const comment of filteredComments) {
      if (comment.type === 'location') {
        location.push(comment);
      } else {
        document.push(comment);
      }
    }

    return { locationComments: location, documentComments: document };
  }, [filteredComments]);

  // Handle delete with confirmation
  const handleDeleteRequest = useCallback((commentId: string) => {
    setCommentToDelete(commentId);
    setDeleteConfirmOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (commentToDelete) {
      await deleteComment(commentToDelete);
      setCommentToDelete(null);
    }
  }, [commentToDelete, deleteComment]);

  // Handle resolve toggle
  const handleResolve = useCallback(
    async (commentId: string, currentlyResolved: boolean) => {
      if (currentlyResolved) {
        // Unresolve - update in IndexedDB directly
        await db.documentComments.update(commentId, { resolved: false });
      } else {
        await resolveComment(commentId);
      }
    },
    [resolveComment]
  );

  // Handle comment click for navigation
  const handleCommentClick = useCallback(
    (comment: DocumentComment) => {
      if (comment.type === 'location' && comment.location) {
        onLocationCommentClick(comment.id, comment.location.page, comment.versionId);
      } else if (comment.type === 'document') {
        // For document-level comments, pass 0 to indicate no page navigation
        onLocationCommentClick(comment.id, 0, comment.versionId);
      }
    },
    [onLocationCommentClick]
  );

  // Render location anchor header
  const renderAnchoredHeader = useCallback(
    (comment: DocumentComment) => {
      if (!comment.location) return null;

      return (
        <div className="flex items-center gap-2 mb-2">
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
          <span className="text-xs text-muted-foreground">
            Page {comment.location.page}
          </span>
        </div>
      );
    },
    []
  );

  // Render version badge
  const renderCommentMeta = useCallback(
    (comment: DocumentComment) => {
      const versionNumber = versionMap.get(comment.versionId);
      if (!versionNumber) return null;

      return (
        <Badge
          variant={comment.versionId === selectedVersionId ? 'default' : 'outline'}
          className="shrink-0 text-xs"
        >
          v{versionNumber}
        </Badge>
      );
    },
    [versionMap, selectedVersionId]
  );

  return (
    <>
      <CommentPanelBase
        anchoredComments={locationComments}
        generalComments={documentComments}
        anchoredTab={{
          value: 'location',
          label: 'Location',
          icon: <MapPin className="h-4 w-4" />,
          emptyTitle: 'No location comments yet.',
          emptyHint: 'Click on the document to add pinned comments.',
        }}
        generalTab={{
          value: 'document',
          label: 'Document',
          icon: <MessageSquare className="h-4 w-4" />,
          emptyTitle: 'No document comments yet.',
          emptyHint: 'Add one below.',
        }}
        renderAnchoredHeader={renderAnchoredHeader}
        renderCommentMeta={renderCommentMeta}
        onCommentClick={handleCommentClick}
        onResolve={handleResolve}
        onDelete={handleDeleteRequest}
        onAddComment={(text) => addComment(documentId, selectedVersionId, text)}
        highlightedCommentId={highlightedCommentId}
        canComment={permissions.update}
        canModify={() => permissions.update}
        canDelete={() => permissions.update}
      />

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
    </>
  );
}
