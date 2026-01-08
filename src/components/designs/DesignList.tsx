import { useState } from 'react';
import { useDesignStore } from '@/stores/designStore';
import { useUserStore } from '@/stores/userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { DesignCard } from './DesignCard';
import { CreateDesignDialog } from './CreateDesignDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface DesignListProps {
    projectId: string;
}

export function DesignList({ projectId }: DesignListProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const allDesigns = useDesignStore((state) => state.designs);
    const designs = allDesigns.filter(d => d.projectId === projectId);

    const currentUser = useUserStore((state) => state.currentUser);
    const permissionOverrides = useUserStore((state) => state.permissionOverrides);
    const roles = useUserStore((state) => state.roles);

    // Permission check for creating designs
    const canCreate = currentUser ? resolvePermissions(
        currentUser,
        'designs',
        undefined,
        permissionOverrides,
        roles
    ).create : false;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Designs</h3>
                {canCreate && (
                    <Button size="sm" onClick={() => setIsDialogOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Design
                    </Button>
                )}
            </div>

            {designs.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                    No designs yet. Click "Add Design" to get started.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {designs.map((design) => (
                        <DesignCard key={design.id} design={design} />
                    ))}
                </div>
            )}

            {canCreate && (
                <CreateDesignDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    projectId={projectId}
                />
            )}
        </div>
    );
}
