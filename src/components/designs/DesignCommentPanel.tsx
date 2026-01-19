/**
 * DesignCommentPanel - Comment panel for 3D design viewer
 *
 * Uses CommentPanelBase for consistent UI, with design-specific
 * rendering for element comments (panels, inverters, etc.).
 */

import { useMemo, useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useDesignStore } from '@/stores/designStore';
import { useUserStore } from '@/stores/userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CommentPanelBase } from '@/components/shared/CommentPanelBase';
import { DocumentCommentToTaskDialog } from '@/components/comments/DocumentCommentToTaskDialog';
import { MessageSquare, Box, Cpu, MapPin } from 'lucide-react';
import type { DesignComment } from '@/lib/types';

interface DesignCommentPanelProps {
  designId: string;
  versionId: string;
  onJumpToElement?: (elementType: string, elementId: string) => void;
  highlightedElementKey?: string | null;
  /** Explicit comment ID to highlight (from notification navigation) - overrides element-based highlighting */
  explicitHighlightCommentId?: string | null;
  /** Initial tab to show ('element' or 'general') - from notification navigation */
  initialTab?: 'element' | 'general';
}

export function DesignCommentPanel({
  designId,
  versionId,
  onJumpToElement,
  highlightedElementKey,
  explicitHighlightCommentId,
  initialTab,
}: DesignCommentPanelProps) {
  const designs = useDesignStore((state) => state.designs);
  const addComment = useDesignStore((state) => state.addComment);
  const updateComment = useDesignStore((state) => state.updateComment);
  const resolveComment = useDesignStore((state) => state.resolveComment);
  const deleteComment = useDesignStore((state) => state.deleteComment);

  const currentUser = useUserStore((state) => state.currentUser);
  const permissionOverrides = useUserStore((state) => state.permissionOverrides);
  const roles = useUserStore((state) => state.roles);

  // Dialog state
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<DesignComment | null>(null);

  // Get design's project ID
  const design = designs.find((d) => d.id === designId);
  const projectId = design?.projectId;

  // Fetch comments from IndexedDB
  const comments = useLiveQuery(
    () =>
      db.designComments
        .where('designId')
        .equals(designId)
        .toArray(),
    [designId]
  );

  // Permissions
  const permissions = currentUser
    ? resolvePermissions(currentUser, 'designs', designId, permissionOverrides, roles)
    : { update: false, delete: false };

  const canComment = !!currentUser;

  // Filter and sort comments for current version
  const filteredComments = useMemo(() => {
    return (comments || [])
      .filter((c) => c.versionId === versionId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [comments, versionId]);

  // Group comments by type
  const { elementComments, generalComments } = useMemo(() => {
    const element: DesignComment[] = [];
    const general: DesignComment[] = [];

    for (const comment of filteredComments) {
      if (comment.type === 'element' && comment.elementAnchor) {
        element.push(comment);
      } else {
        general.push(comment);
      }
    }

    return { elementComments: element, generalComments: general };
  }, [filteredComments]);

  // Check if user is creator of comment
  const isCreatorOf = useCallback(
    (comment: DesignComment) => {
      if (!currentUser) return false;
      return comment.author === `${currentUser.firstName} ${currentUser.lastName}`;
    },
    [currentUser]
  );

  // Get element type icon
  const getElementIcon = (type: string) => {
    switch (type) {
      case 'panel':
        return <Box className="h-3 w-3" />;
      case 'inverter':
      case 'transformer':
      case 'combiner':
        return <Cpu className="h-3 w-3" />;
      default:
        return <Box className="h-3 w-3" />;
    }
  };

  // Check if comment's element matches highlighted key
  const isHighlighted = useCallback(
    (comment: DesignComment) => {
      if (!highlightedElementKey || !comment.elementAnchor) return false;
      const key = `${comment.elementAnchor.elementType}:${comment.elementAnchor.elementId}`;
      return key === highlightedElementKey;
    },
    [highlightedElementKey]
  );

  // Find highlighted comment ID for scroll
  // Use explicit ID from notification if provided, otherwise compute from element key
  const highlightedCommentId = useMemo(() => {
    // Explicit comment ID takes priority (from notification navigation)
    if (explicitHighlightCommentId) return explicitHighlightCommentId;

    // Otherwise, compute from element key (from 3D badge click)
    if (!highlightedElementKey) return null;
    const match = elementComments.find((c) => {
      if (!c.elementAnchor) return false;
      const key = `${c.elementAnchor.elementType}:${c.elementAnchor.elementId}`;
      return key === highlightedElementKey;
    });
    return match?.id ?? null;
  }, [explicitHighlightCommentId, highlightedElementKey, elementComments]);

  // Handle creating task from comment
  const handleCreateTask = useCallback((comment: DesignComment) => {
    setSelectedComment(comment);
    setTaskDialogOpen(true);
  }, []);

  // Handle task created - link comment to task
  const handleTaskCreated = useCallback(
    async (taskId: string) => {
      if (selectedComment) {
        await updateComment(selectedComment.id, { linkedTaskId: taskId });
      }
    },
    [selectedComment, updateComment]
  );

  // Render element anchor header
  const renderAnchoredHeader = (comment: DesignComment) => {
    if (!comment.elementAnchor) return null;

    return (
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
        <Badge variant="outline" className="gap-1 text-xs">
          {getElementIcon(comment.elementAnchor.elementType)}
          {comment.elementAnchor.elementType.charAt(0).toUpperCase() +
            comment.elementAnchor.elementType.slice(1)}
        </Badge>
        <span className="text-xs text-muted-foreground flex-1">
          {comment.elementAnchor.elementLabel}
        </span>
        {onJumpToElement && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            title="Jump to element in 3D view"
            onClick={(e) => {
              e.stopPropagation();
              onJumpToElement(
                comment.elementAnchor!.elementType,
                comment.elementAnchor!.elementId
              );
            }}
          >
            <MapPin className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
      <CommentPanelBase
        anchoredComments={elementComments}
        generalComments={generalComments}
        anchoredTab={{
          value: 'element',
          label: 'Elements',
          icon: <Box className="h-4 w-4" />,
          emptyTitle: 'No element comments yet.',
          emptyHint: 'Click elements in the 3D view to add comments.',
        }}
        generalTab={{
          value: 'general',
          label: 'General',
          icon: <MessageSquare className="h-4 w-4" />,
          emptyTitle: 'No general comments yet.',
          emptyHint: 'Add one below.',
        }}
        renderAnchoredHeader={renderAnchoredHeader}
        onResolve={(id) => resolveComment(id)}
        onDelete={(id) => deleteComment(id)}
        onAddComment={(text, mentions) => addComment(designId, versionId, text, undefined, mentions)}
        onCreateTask={handleCreateTask}
        isHighlighted={isHighlighted}
        highlightedCommentId={highlightedCommentId}
        canComment={canComment}
        canModify={(comment) => permissions.update || isCreatorOf(comment)}
        canDelete={(comment) => permissions.delete || isCreatorOf(comment)}
        initialTab={initialTab}
      />

      {/* Comment to Task Dialog */}
      {selectedComment && (
        <DocumentCommentToTaskDialog
          open={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          comment={selectedComment}
          defaultProjectId={projectId}
          onTaskCreated={handleTaskCreated}
        />
      )}
    </>
  );
}
