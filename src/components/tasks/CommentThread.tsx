/**
 * CommentThread - Display and add comments with @mention support
 *
 * Uses currentUser as author and MentionInput for @mentions.
 * Supports converting comments to tasks.
 */

import { useState } from 'react';
import { ListTodo, User } from 'lucide-react';
import type { Comment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUserStore } from '@/stores/userStore';
import { MentionInput } from '@/components/mentions/MentionInput';
import { MentionText } from '@/components/mentions/MentionText';
import { CommentToTaskDialog } from './CommentToTaskDialog';

interface CommentThreadProps {
  comments: Comment[];
  onAddComment: (text: string, mentions?: string[]) => void;
  projectId?: string;
  stageId?: string;
  taskId?: string;  // The task these comments belong to
}

export function CommentThread({
  comments,
  onAddComment,
  projectId,
  stageId,
  taskId,
}: CommentThreadProps) {
  const currentUser = useUserStore((state) => state.currentUser);
  const users = useUserStore((state) => state.users);

  const [text, setText] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);

  const handleTextChange = (newText: string, mentionedUserIds: string[]) => {
    setText(newText);
    setMentions(mentionedUserIds);
  };

  const handleSubmit = () => {
    if (!currentUser) return;
    if (!text.trim()) return;

    onAddComment(text.trim(), mentions.length > 0 ? mentions : undefined);
    setText('');
    setMentions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCreateTask = (comment: Comment) => {
    setSelectedComment(comment);
    setTaskDialogOpen(true);
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

  // Get author display name
  const getAuthorName = (comment: Comment) => {
    if (comment.authorId) {
      const user = users.find((u) => u.id === comment.authorId);
      if (user) {
        return `${user.firstName} ${user.lastName}`;
      }
    }
    return comment.author;
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Comments ({comments.length})</div>

      {/* Comment list */}
      {comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="group rounded-lg bg-muted/50 p-3 space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  {getAuthorName(comment)}
                </span>
                <div className="flex items-center gap-2">
                  {/* Create Task button */}
                  {projectId && stageId && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleCreateTask(comment)}
                        >
                          <ListTodo className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Create task from comment</TooltipContent>
                    </Tooltip>
                  )}
                  <span className="text-muted-foreground">
                    {formatTimestamp(comment.createdAt)}
                  </span>
                </div>
              </div>
              <div className="text-sm text-foreground">
                <MentionText text={comment.text} />
              </div>
              {comment.linkedTaskId && (
                <div className="text-xs text-primary flex items-center gap-1">
                  <ListTodo className="h-3 w-3" />
                  Task created
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
          No comments yet
        </div>
      )}

      {/* Add comment form */}
      {currentUser ? (
        <div className="space-y-2 pt-2 border-t">
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
        <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
          Log in to add comments
        </div>
      )}

      {/* Comment to Task Dialog */}
      {selectedComment && projectId && stageId && (
        <CommentToTaskDialog
          open={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          comment={selectedComment}
          projectId={projectId}
          stageId={stageId}
          taskId={taskId}
        />
      )}
    </div>
  );
}
