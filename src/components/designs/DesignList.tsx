import { useState, useMemo } from 'react';
import { useDesignStore } from '@/stores/designStore';
import { useUserStore } from '@/stores/userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { DesignCard } from './DesignCard';
import { CreateDesignDialog } from './CreateDesignDialog';
import { DesignFilterBar, type DesignFilters } from './DesignFilterBar';
import { DesignSortSelect, type DesignSort } from './DesignSortSelect';
import { DesignSearchInput } from './DesignSearchInput';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface DesignListProps {
    projectId: string;
}

export function DesignList({ projectId }: DesignListProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const allDesigns = useDesignStore((state) => state.designs);
    const designs = allDesigns.filter(d => d.projectId === projectId);

    // Filter and sort state
    const [filters, setFilters] = useState<DesignFilters>({
        statuses: [],
        types: [],
        search: '',
    });
    const [sort, setSort] = useState<DesignSort>({
        field: 'updatedAt',
        direction: 'desc',
    });

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

    // Apply filters and sorting
    const filteredAndSortedDesigns = useMemo(() => {
        let result = designs;

        // Filter by status
        if (filters.statuses.length > 0) {
            result = result.filter(d => filters.statuses.includes(d.status));
        }

        // Filter by type
        if (filters.types.length > 0) {
            result = result.filter(d => {
                const isGenerated = !!d.generatedLayout;
                if (filters.types.includes('generated') && isGenerated) return true;
                if (filters.types.includes('uploaded') && !isGenerated && d.currentVersionId) return true;
                return false;
            });
        }

        // Search by name
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            result = result.filter(d => d.name.toLowerCase().includes(searchLower));
        }

        // Sort
        result = [...result].sort((a, b) => {
            const dir = sort.direction === 'asc' ? 1 : -1;
            switch (sort.field) {
                case 'name':
                    return a.name.localeCompare(b.name) * dir;
                case 'createdAt':
                case 'updatedAt':
                    return (new Date(a[sort.field]).getTime() - new Date(b[sort.field]).getTime()) * dir;
                case 'status': {
                    const statusOrder = ['draft', 'review', 'approved', 'rejected'];
                    return (statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)) * dir;
                }
                default:
                    return 0;
            }
        });

        return result;
    }, [designs, filters, sort]);

    const handleSearchChange = (search: string) => {
        setFilters(prev => ({ ...prev, search }));
    };

    const hasActiveFilters = filters.statuses.length > 0 || filters.types.length > 0 || filters.search !== '';

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Designs</h3>
                <div className="flex items-center gap-2">
                    <DesignSearchInput
                        value={filters.search}
                        onChange={handleSearchChange}
                    />
                    <DesignFilterBar
                        designs={designs}
                        filters={filters}
                        onFiltersChange={setFilters}
                    />
                    <DesignSortSelect
                        sort={sort}
                        onSortChange={setSort}
                    />
                    {canCreate && (
                        <Button size="sm" onClick={() => setIsDialogOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add Design
                        </Button>
                    )}
                </div>
            </div>

            {designs.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                    No designs yet. Click "Add Design" to get started.
                </div>
            ) : filteredAndSortedDesigns.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                    {hasActiveFilters
                        ? 'No designs match the current filters.'
                        : 'No designs found.'}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAndSortedDesigns.map((design) => (
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
