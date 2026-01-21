import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Calendar, User, MoreVertical, Trash2, FileUp, Sparkles } from 'lucide-react';
import type { Design } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { useDesignStore } from '@/stores/designStore';
import { useUserStore } from '@/stores/userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';

interface DesignCardProps {
    design: Design;
}

export function DesignCard({ design }: DesignCardProps) {
    const navigate = useNavigate();
    const deleteDesign = useDesignStore((state) => state.deleteDesign);
    const currentUser = useUserStore((state) => state.currentUser);
    const permissionOverrides = useUserStore((state) => state.permissionOverrides);
    const roles = useUserStore((state) => state.roles);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // Check delete permission (owner or admin)
    const canDelete = currentUser ? resolvePermissions(
        currentUser,
        'designs',
        design.creatorId,
        permissionOverrides,
        roles
    ).delete : false;

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDeleteDialog(true);
    };

    const handleConfirmDelete = async () => {
        await deleteDesign(design.id);
        setShowDeleteDialog(false);
    };

    const getStatusColor = (status: Design['status']) => {
        switch (status) {
            case 'approved':
                return 'bg-green-500/10 text-green-700 hover:bg-green-500/20';
            case 'review':
                return 'bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20';
            default:
                return 'bg-slate-500/10 text-slate-700 hover:bg-slate-500/20';
        }
    };

    return (
    <>
        <Card
            className="cursor-pointer hover:shadow-md transition-shadow group h-full flex flex-col"
            onClick={() => navigate(`/designs/${design.id}`)}
        >
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2 flex-1">
                        {design.name}
                    </CardTitle>
                    <div className="flex items-center gap-1 shrink-0">
                        {design.generatedLayout ? (
                            <Badge variant="outline" className="gap-1">
                                <Sparkles className="h-3 w-3" />
                                Auto
                            </Badge>
                        ) : design.currentVersionId ? (
                            <Badge variant="outline" className="gap-1">
                                <FileUp className="h-3 w-3" />
                                DXF
                            </Badge>
                        ) : null}
                        <Badge variant="secondary" className={getStatusColor(design.status)}>
                            {design.status.replace('_', ' ')}
                        </Badge>
                        {canDelete && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        onClick={handleDeleteClick}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 pb-3">
                <p className="text-sm text-muted-foreground line-clamp-3">
                    {design.description || 'No description provided.'}
                </p>
            </CardContent>

            <CardFooter className="pt-0 text-xs text-muted-foreground border-t bg-muted/20 p-3 mt-auto">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5" title={`Created by ${design.createdBy}`}>
                        <User className="h-3 w-3" />
                        <span className="truncate max-w-[100px]">{design.createdBy}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title={`Updated ${new Date(design.updatedAt).toLocaleDateString()}`}>
                        <Calendar className="h-3 w-3" />
                        <span>{formatDistanceToNow(new Date(design.updatedAt), { addSuffix: true })}</span>
                    </div>
                </div>
            </CardFooter>
        </Card>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Design</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete "{design.name}"? This action cannot be undone.
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
    </>
    );
}
