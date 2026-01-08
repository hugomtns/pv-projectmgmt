import { useDesignStore } from '@/stores/designStore';
import { useUserStore } from '@/stores/userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, CheckCircle, XCircle, Send } from 'lucide-react';

interface DesignWorkflowActionsProps {
    designId: string;
    currentStatus: import('@/lib/types').Design['status'];
}

export function DesignWorkflowActions({ designId, currentStatus }: DesignWorkflowActionsProps) {
    const updateDesign = useDesignStore((state) => state.updateDesign);
    const designs = useDesignStore((state) => state.designs);
    const userState = useUserStore();
    const currentUser = userState.currentUser;

    const design = designs.find(d => d.id === designId);

    if (!currentUser || !design) return null;

    // Permissions logic
    const permissions = resolvePermissions(
        currentUser,
        'designs',
        designId,
        userState.permissionOverrides,
        userState.roles
    );

    const canEdit = permissions.update || design.creatorId === currentUser.id;

    // Simple workflow logic for now
    // Draft -> Review -> Approved/Rejected

    const handleStatusChange = (newStatus: import('@/lib/types').Design['status']) => {
        updateDesign(designId, { status: newStatus });
    };

    if (!canEdit) {
        // View-only users can't change status
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    Actions
                    <ChevronDown className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {currentStatus === 'draft' && (
                    <DropdownMenuItem onClick={() => handleStatusChange('review')}>
                        <Send className="mr-2 h-4 w-4 text-blue-500" />
                        Submit for Review
                    </DropdownMenuItem>
                )}

                {currentStatus === 'review' && (
                    <>
                        <DropdownMenuItem onClick={() => handleStatusChange('approved')}>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                            Approve Design
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange('rejected')}>
                            <XCircle className="mr-2 h-4 w-4 text-red-500" />
                            Reject Design
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange('draft')}>
                            <Send className="mr-2 h-4 w-4 text-muted-foreground" />
                            Revert to Draft
                        </DropdownMenuItem>
                    </>
                )}

                {(currentStatus === 'approved' || currentStatus === 'rejected') && (
                    <DropdownMenuItem onClick={() => handleStatusChange('draft')}>
                        <Send className="mr-2 h-4 w-4" />
                        Revert to Draft
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
