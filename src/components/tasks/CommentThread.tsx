import { useState } from 'react';
import type { Comment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CommentThreadProps {
  comments: Comment[];
  onAddComment: (author: string, text: string) => void;
}

export function CommentThread({ comments, onAddComment }: CommentThreadProps) {
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (!author.trim() || !text.trim()) return;

    onAddComment(author.trim(), text.trim());
    setText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
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

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">
        Comments ({comments.length})
      </div>

      {/* Comment list */}
      {comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-lg bg-muted/50 p-3 space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{comment.author}</span>
                <span className="text-muted-foreground">
                  {formatTimestamp(comment.createdAt)}
                </span>
              </div>
              <div className="text-sm text-foreground whitespace-pre-wrap">
                {comment.text}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
          No comments yet
        </div>
      )}

      {/* Add comment form */}
      <div className="space-y-2 pt-2 border-t">
        <Input
          placeholder="Your name"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="text-sm"
        />
        <textarea
          placeholder="Add a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyPress}
          className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background resize-none"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!author.trim() || !text.trim()}
          >
            Add Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
