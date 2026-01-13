import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useDesignStore } from '@/stores/designStore';
import { useUserStore } from '@/stores/userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MessageSquare, Check, X, Box, Cpu, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DesignComment } from '@/lib/types';

interface DesignCommentPanelProps {
    designId: string;
    versionId: string;
    onJumpToElement?: (elementType: string, elementId: string) => void;
    highlightedElementKey?: string | null;
}

export function DesignCommentPanel({
    designId,
    versionId,
    onJumpToElement,
    highlightedElementKey,
}: DesignCommentPanelProps) {
    const [newCommentText, setNewCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'element' | 'general'>('element');
    const commentRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

    const addComment = useDesignStore((state) => state.addComment);
    const resolveComment = useDesignStore((state) => state.resolveComment);
    const deleteComment = useDesignStore((state) => state.deleteComment);

    const currentUser = useUserStore((state) => state.currentUser);
    const permissionOverrides = useUserStore((state) => state.permissionOverrides);
    const roles = useUserStore((state) => state.roles);

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
    const permissions = currentUser ? resolvePermissions(
        currentUser,
        'designs',
        designId,
        permissionOverrides,
        roles
    ) : { update: false, delete: false };

    const canComment = !!currentUser; // Basic assumption: logged in users can comment if they can see it

    // Current user helper
    const isCreatorOf = (comment: DesignComment) => {
        if (!currentUser) return false;
        return comment.author === `${currentUser.firstName} ${currentUser.lastName}`;
    };

    const filteredComments = (comments || []).filter(c => c.versionId === versionId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Group comments by type
    const { designComments, elementComments } = useMemo(() => {
        const design: DesignComment[] = [];
        const element: DesignComment[] = [];

        for (const comment of filteredComments) {
            if (comment.type === 'element' && comment.elementAnchor) {
                element.push(comment);
            } else {
                design.push(comment);
            }
        }

        return { designComments: design, elementComments: element };
    }, [filteredComments]);

    // Auto-switch to element tab and scroll when highlight changes
    useEffect(() => {
        if (!highlightedElementKey) return;

        // Switch to element tab
        setActiveTab('element');

        // Find the first comment that matches the highlighted element
        const matchingComment = elementComments.find((c) => {
            if (!c.elementAnchor) return false;
            const key = `${c.elementAnchor.elementType}:${c.elementAnchor.elementId}`;
            return key === highlightedElementKey;
        });

        if (matchingComment) {
            // Small delay to allow tab switch to render
            setTimeout(() => {
                const element = commentRefsMap.current.get(matchingComment.id);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    }, [highlightedElementKey, elementComments]);

    // Helper to get element key for a comment
    const getCommentElementKey = useCallback((comment: DesignComment) => {
        if (!comment.elementAnchor) return null;
        return `${comment.elementAnchor.elementType}:${comment.elementAnchor.elementId}`;
    }, []);

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

    const handleAddComment = async () => {
        if (!newCommentText.trim()) return;

        setIsSubmitting(true);
        try {
            await addComment(designId, versionId, newCommentText.trim());
            setNewCommentText('');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderComment = (comment: DesignComment) => {
        const canDelete = permissions.delete || isCreatorOf(comment);
        const canResolve = permissions.update || isCreatorOf(comment);
        const isElementComment = comment.type === 'element' && comment.elementAnchor;
        const commentKey = getCommentElementKey(comment);
        const isHighlighted = commentKey && commentKey === highlightedElementKey;

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
                    isElementComment && 'border-l-4 border-l-primary/50',
                    isHighlighted && 'border-primary bg-primary/5 ring-2 ring-primary/30'
                )}
            >
                {/* Element anchor info */}
                {isElementComment && comment.elementAnchor && (
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
                )}

                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-sm font-medium truncate">{comment.author}</span>
                    </div>
                    {comment.resolved && (
                        <Badge variant="secondary" className="shrink-0">
                            Resolved
                        </Badge>
                    )}
                </div>

                <p className="text-sm mb-2 whitespace-pre-wrap">{comment.text}</p>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(comment.createdAt).toLocaleString()}</span>

                    <div className="flex gap-1">
                        {canResolve && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    resolveComment(comment.id);
                                }}
                            >
                                {comment.resolved ? (
                                    <X className="h-3 w-3" />
                                ) : (
                                    <Check className="h-3 w-3" />
                                )}
                            </Button>
                        )}
                        {canDelete && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteComment(comment.id);
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

    return (
        <div className="flex flex-col h-full bg-muted/30 border-l border-border w-96">
            <div className="p-4 border-b border-border">
                <h3 className="font-semibold">Comments</h3>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'element' | 'general')} className="flex-1 flex flex-col min-h-0">
                <div className="px-4 pt-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="element" className="gap-2">
                            <Box className="h-4 w-4" />
                            Elements ({elementComments.length})
                        </TabsTrigger>
                        <TabsTrigger value="general" className="gap-2">
                            <MessageSquare className="h-4 w-4" />
                            General ({designComments.length})
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="element" className="flex-1 overflow-auto px-4 pb-4 mt-4 space-y-2">
                    {elementComments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No element comments yet.
                            <br />
                            <span className="text-xs">Click elements in the 3D view to add comments.</span>
                        </div>
                    ) : (
                        elementComments.map(renderComment)
                    )}
                </TabsContent>

                <TabsContent value="general" className="flex-1 overflow-auto px-4 pb-4 mt-4 space-y-2">
                    {designComments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No general comments yet.
                            <br />
                            <span className="text-xs">Add one below.</span>
                        </div>
                    ) : (
                        designComments.map(renderComment)
                    )}
                </TabsContent>
            </Tabs>

            {/* Add comment form */}
            {canComment && (
                <div className="p-4 border-t border-border bg-background">
                    <div className="space-y-2">
                        <Textarea
                            placeholder="Add a comment..."
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
        </div>
    );
}
