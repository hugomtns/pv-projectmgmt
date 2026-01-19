/**
 * CommentPanelBase - Unified comment panel component
 *
 * Provides a consistent tabbed interface for comments across
 * designs and documents with configurable rendering.
 */

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MessageSquare, Check, X, ListTodo } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { MentionInput } from '@/components/mentions/MentionInput';
import { MentionText } from '@/components/mentions/MentionText';

// Generic comment interface - minimum required fields
export interface BaseComment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
  resolved: boolean;
  mentions?: string[];
  linkedTaskId?: string;
}

export interface TabConfig {
  value: string;
  label: string;
  icon: ReactNode;
  emptyTitle: string;
  emptyHint: string;
}

export interface CommentPanelBaseProps<T extends BaseComment> {
  // Comments data
  anchoredComments: T[];
  generalComments: T[];

  // Tab configuration
  anchoredTab: TabConfig;
  generalTab: TabConfig;

  // Rendering
  renderAnchoredHeader?: (comment: T) => ReactNode;
  renderCommentMeta?: (comment: T) => ReactNode;

  // Actions
  onCommentClick?: (comment: T) => void;
  onResolve: (commentId: string, currentlyResolved: boolean) => void;
  onDelete: (commentId: string) => void;
  onAddComment: (text: string, mentions?: string[]) => Promise<unknown>;
  /** Callback to create a task from a comment */
  onCreateTask?: (comment: T) => void;

  // Highlighting
  isHighlighted?: (comment: T) => boolean;
  highlightedCommentId?: string | null;

  // Permissions
  canComment: boolean;
  canModify: (comment: T) => boolean;
  canDelete: (comment: T) => boolean;

  // Styling
  className?: string;
  showDeleteConfirm?: boolean;

  // Initial tab (from notification navigation)
  initialTab?: string;
}

export function CommentPanelBase<T extends BaseComment>({
  anchoredComments,
  generalComments,
  anchoredTab,
  generalTab,
  renderAnchoredHeader,
  renderCommentMeta,
  onCommentClick,
  onResolve,
  onDelete,
  onAddComment,
  onCreateTask,
  isHighlighted,
  highlightedCommentId,
  canComment,
  canModify,
  canDelete,
  className,
  initialTab,
}: CommentPanelBaseProps<T>) {
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentMentions, setNewCommentMentions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Use initialTab if provided, otherwise default to anchored tab
  const [activeTab, setActiveTab] = useState(initialTab ?? anchoredTab.value);
  const commentRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  // Track if we've successfully handled the initial highlight
  const hasHandledHighlight = useRef(false);

  // Auto-switch tab and scroll to highlighted comment
  useEffect(() => {
    if (!highlightedCommentId) {
      hasHandledHighlight.current = false;
      return;
    }

    // Check which tab the comment is in
    const inAnchored = anchoredComments.some(c => c.id === highlightedCommentId);
    const inGeneral = generalComments.some(c => c.id === highlightedCommentId);

    // If comments haven't loaded yet (comment not found in either array), wait for next render
    if (!inAnchored && !inGeneral) {
      return;
    }

    // Switch to the correct tab
    if (inAnchored) {
      setActiveTab(anchoredTab.value);
    } else if (inGeneral) {
      setActiveTab(generalTab.value);
    }

    // Only scroll once we've found and switched to the correct tab
    if (!hasHandledHighlight.current) {
      hasHandledHighlight.current = true;
      // Scroll to comment after tab switch (give time for tab content to render)
      setTimeout(() => {
        const element = commentRefsMap.current.get(highlightedCommentId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
  }, [highlightedCommentId, anchoredComments, generalComments, anchoredTab.value, generalTab.value]);

  const handleAddComment = async () => {
    if (!newCommentText.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddComment(newCommentText.trim(), newCommentMentions.length > 0 ? newCommentMentions : undefined);
      setNewCommentText('');
      setNewCommentMentions([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTextChange = (text: string, mentions: string[]) => {
    setNewCommentText(text);
    setNewCommentMentions(mentions);
  };

  const renderComment = (comment: T, isAnchored: boolean) => {
    const highlighted = isHighlighted?.(comment) || comment.id === highlightedCommentId;

    return (
      <div
        key={comment.id}
        ref={(el) => {
          if (el) {
            commentRefsMap.current.set(comment.id, el);
          } else {
            commentRefsMap.current.delete(comment.id);
          }
        }}
        className={cn(
          'p-3 rounded-lg border transition-all duration-300',
          'border-border bg-card',
          comment.resolved && 'opacity-60',
          isAnchored && 'border-l-4 border-l-primary/50',
          highlighted && 'border-primary bg-primary/5 ring-2 ring-primary/30',
          onCommentClick && 'cursor-pointer hover:bg-muted/50'
        )}
        onClick={() => onCommentClick?.(comment)}
      >
        {/* Anchored comment header (element info, location info, etc.) */}
        {isAnchored && renderAnchoredHeader?.(comment)}

        {/* Author and resolved badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-sm font-medium truncate">{comment.author}</span>
            {renderCommentMeta?.(comment)}
          </div>
          {comment.resolved && (
            <Badge variant="secondary" className="shrink-0">
              Resolved
            </Badge>
          )}
        </div>

        {/* Comment text */}
        <div className="text-sm mb-2">
          <MentionText text={comment.text} />
        </div>

        {/* Task created indicator */}
        {comment.linkedTaskId && (
          <div className="text-xs text-primary flex items-center gap-1 mb-2">
            <ListTodo className="h-3 w-3" />
            Task created
          </div>
        )}

        {/* Timestamp and actions */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{new Date(comment.createdAt).toLocaleString()}</span>

          <div className="flex gap-1">
            {/* Create Task button */}
            {onCreateTask && !comment.linkedTaskId && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateTask(comment);
                      }}
                    >
                      <ListTodo className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Create task from comment</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {canModify(comment) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onResolve(comment.id, comment.resolved);
                }}
              >
                {comment.resolved ? (
                  <X className="h-3 w-3" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </Button>
            )}
            {canDelete(comment) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(comment.id);
                }}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEmptyState = (tab: TabConfig) => (
    <div className="text-center py-8 text-muted-foreground text-sm">
      {tab.emptyTitle}
      <br />
      <span className="text-xs">{tab.emptyHint}</span>
    </div>
  );

  return (
    <div className={cn('flex flex-col h-full bg-muted/30 border-l border-border w-96', className)}>
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Comments</h3>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value={anchoredTab.value} className="gap-2">
              {anchoredTab.icon}
              {anchoredTab.label} ({anchoredComments.length})
            </TabsTrigger>
            <TabsTrigger value={generalTab.value} className="gap-2">
              {generalTab.icon}
              {generalTab.label} ({generalComments.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={anchoredTab.value} className="flex-1 overflow-auto px-4 pb-4 mt-4 space-y-2">
          {anchoredComments.length === 0
            ? renderEmptyState(anchoredTab)
            : anchoredComments.map((c) => renderComment(c, true))}
        </TabsContent>

        <TabsContent value={generalTab.value} className="flex-1 overflow-auto px-4 pb-4 mt-4 space-y-2">
          {generalComments.length === 0
            ? renderEmptyState(generalTab)
            : generalComments.map((c) => renderComment(c, false))}
        </TabsContent>
      </Tabs>

      {/* Add comment form */}
      {canComment && (
        <div className="p-4 border-t border-border bg-background">
          <div className="space-y-2">
            <div
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleAddComment();
                }
              }}
            >
              <MentionInput
                value={newCommentText}
                onChange={handleTextChange}
                placeholder="Add a comment... (use @ to mention someone)"
                minHeight="80px"
              />
            </div>
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
    </div>
  );
}
