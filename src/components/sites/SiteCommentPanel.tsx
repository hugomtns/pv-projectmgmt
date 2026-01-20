/**
 * SiteCommentPanel - Comment thread for sites
 *
 * Reuses the same layout pattern and components as CommentThread
 * with form at bottom and scrollable comment list.
 */

import { useState } from 'react';
import { useSiteStore } from '@/stores/siteStore';
import { useUserStore } from '@/stores/userStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreVertical, Pencil, Trash2, User } from 'lucide-react';
import { MentionInput } from '@/components/mentions/MentionInput';
import { MentionText } from '@/components/mentions/MentionText';
import type { SiteComment } from '@/lib/types';

interface SiteCommentPanelProps {
  siteId: string;
}

// Stable empty array to avoid re-renders
const EMPTY_COMMENTS: SiteComment[] = [];

export function SiteCommentPanel({ siteId }: SiteCommentPanelProps) {
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Use direct selector with stable empty array fallback
  const siteComments = useSiteStore((state) =>
    state.sites.find((s) => s.id === siteId)?.comments
  );
  const comments = siteComments ?? EMPTY_COMMENTS;
  const addComment = useSiteStore((state) => state.addSiteComment);
  const updateComment = useSiteStore((state) => state.updateSiteComment);
  const deleteComment = useSiteStore((state) => state.deleteSiteComment);

  const currentUser = useUserStore((state) => state.currentUser);

  // MentionInput provides mentions but store parses them from text
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleTextChange = (newText: string, _mentions: string[]) => {
    setText(newText);
  };

  const handleSubmit = () => {
    if (!currentUser || !text.trim()) return;
    addComment(siteId, text.trim());
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleStartEdit = (comment: SiteComment) => {
    setEditingId(comment.id);
    setEditText(comment.content);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleEditTextChange = (newText: string, _mentions: string[]) => {
    setEditText(newText);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editText.trim()) return;
    updateComment(siteId, editingId, editText.trim());
    setEditingId(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleConfirmDelete = () => {
    if (!deleteId) return;
    deleteComment(siteId, deleteId);
    setDeleteId(null);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  // Sort comments by date, oldest first (natural reading order)
  const sortedComments = [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div className="flex flex-col h-full">
      {/* Comments list - scrollable area */}
      <div className="flex-1 overflow-y-auto p-4">
        {sortedComments.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
            No comments yet
          </div>
        ) : (
          <div className="space-y-3">
            {sortedComments.map((comment) => {
              const isOwner = currentUser?.id === comment.creatorId;
              const isAdmin = currentUser?.roleId === 'role-admin';
              const canModify = isOwner || isAdmin;
              const isEditing = editingId === comment.id;

              return (
                <div
                  key={comment.id}
                  className="group rounded-lg bg-muted/50 p-3 space-y-2"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">
                      {comment.createdBy}
                    </span>
                    <div className="flex items-center gap-2">
                      {canModify && !isEditing && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleStartEdit(comment)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteId(comment.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <span className="text-muted-foreground">
                        {formatTimestamp(comment.createdAt)}
                        {comment.updatedAt !== comment.createdAt && ' (edited)'}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  {isEditing ? (
                    <div className="space-y-2">
                      <MentionInput
                        value={editText}
                        onChange={handleEditTextChange}
                        placeholder="Edit comment..."
                        minHeight="60px"
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={!editText.trim()}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-foreground">
                      <MentionText text={comment.content} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add comment form - fixed at bottom */}
      {currentUser ? (
        <div className="p-4 border-t space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            Commenting as {currentUser.firstName} {currentUser.lastName}
          </div>
          <div onKeyDown={handleKeyDown}>
            <MentionInput
              value={text}
              onChange={handleTextChange}
              placeholder="Add a comment... (use @ to mention someone)"
              minHeight="80px"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Press Ctrl+Enter to submit
            </span>
            <Button size="sm" onClick={handleSubmit} disabled={!text.trim()}>
              Add Comment
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 border-t">
          <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
            Log in to add comments
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
