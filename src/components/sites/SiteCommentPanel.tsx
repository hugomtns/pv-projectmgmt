import { useState } from 'react';
import { useSiteStore } from '@/stores/siteStore';
import { useUserStore } from '@/stores/userStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { Send, MoreVertical, Pencil, Trash2, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { SiteComment } from '@/lib/types';

interface SiteCommentPanelProps {
  siteId: string;
}

export function SiteCommentPanel({ siteId }: SiteCommentPanelProps) {
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const comments = useSiteStore((state) => state.getSiteComments(siteId));
  const addComment = useSiteStore((state) => state.addSiteComment);
  const updateComment = useSiteStore((state) => state.updateSiteComment);
  const deleteComment = useSiteStore((state) => state.deleteSiteComment);

  const currentUser = useUserStore((state) => state.currentUser);

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addComment(siteId, newComment.trim());
    setNewComment('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleStartEdit = (comment: SiteComment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editContent.trim()) return;
    updateComment(siteId, editingId, editContent.trim());
    setEditingId(null);
    setEditContent('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleConfirmDelete = () => {
    if (!deleteId) return;
    deleteComment(siteId, deleteId);
    setDeleteId(null);
  };

  // Sort comments by date, newest first
  const sortedComments = [...comments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="flex flex-col h-full">
      {/* Comment input */}
      <div className="p-4 border-b space-y-2">
        <Textarea
          placeholder="Add a comment... (use @firstname.lastname to mention)"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[80px] resize-none"
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            Ctrl+Enter to submit
          </span>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!newComment.trim() || !currentUser}
          >
            <Send className="h-4 w-4 mr-1" />
            Comment
          </Button>
        </div>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto">
        {sortedComments.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <div className="divide-y">
            {sortedComments.map((comment) => {
              const isOwner = currentUser?.id === comment.creatorId;
              const isAdmin = currentUser?.roleId === 'role-admin';
              const canEdit = isOwner || isAdmin;
              const isEditing = editingId === comment.id;

              return (
                <div key={comment.id} className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {comment.createdBy}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt), {
                            addSuffix: true,
                          })}
                          {comment.updatedAt !== comment.createdAt && (
                            <span className="ml-1">(edited)</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {canEdit && !isEditing && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
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
                  </div>

                  {/* Content */}
                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[60px] resize-none"
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
                          disabled={!editContent.trim()}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">
                      {formatMentions(comment.content)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

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

// Helper to highlight @mentions in comment text
function formatMentions(text: string): React.ReactNode {
  const mentionRegex = /@([a-zA-Z]+\.[a-zA-Z]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Add highlighted mention
    parts.push(
      <span
        key={match.index}
        className="text-primary font-medium bg-primary/10 px-0.5 rounded"
      >
        {match[0]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
