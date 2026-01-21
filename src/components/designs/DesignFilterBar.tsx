import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { Design } from '@/lib/types';

export interface DesignFilters {
    statuses: Design['status'][];
    types: ('uploaded' | 'generated')[];
    search: string;
}

interface DesignFilterBarProps {
    designs: Design[];
    filters: DesignFilters;
    onFiltersChange: (filters: DesignFilters) => void;
}

const STATUS_LABELS: Record<Design['status'], string> = {
    draft: 'Draft',
    review: 'Review',
    approved: 'Approved',
    rejected: 'Rejected',
};

const STATUS_ORDER: Design['status'][] = ['draft', 'review', 'approved', 'rejected'];

export function DesignFilterBar({ designs, filters, onFiltersChange }: DesignFilterBarProps) {
    // Calculate counts for each status
    const statusCounts = new Map<Design['status'], number>();
    STATUS_ORDER.forEach((status) => statusCounts.set(status, 0));

    let uploadedCount = 0;
    let generatedCount = 0;

    designs.forEach((design) => {
        statusCounts.set(design.status, (statusCounts.get(design.status) || 0) + 1);
        if (design.generatedLayout) {
            generatedCount++;
        } else if (design.currentVersionId) {
            uploadedCount++;
        }
    });

    const handleStatusToggle = (status: Design['status']) => {
        const newStatuses = filters.statuses.includes(status)
            ? filters.statuses.filter((s) => s !== status)
            : [...filters.statuses, status];
        onFiltersChange({ ...filters, statuses: newStatuses });
    };

    const handleTypeToggle = (type: 'uploaded' | 'generated') => {
        const newTypes = filters.types.includes(type)
            ? filters.types.filter((t) => t !== type)
            : [...filters.types, type];
        onFiltersChange({ ...filters, types: newTypes });
    };

    const activeFilterCount = filters.statuses.length + filters.types.length;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                    Filter
                    {activeFilterCount > 0 && (
                        <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                            {activeFilterCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
                <div className="space-y-4">
                    <div>
                        <h4 className="font-medium text-sm mb-3">Status</h4>
                        <div className="space-y-2">
                            {STATUS_ORDER.map((status) => (
                                <div key={status} className="flex items-center justify-between space-x-2">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`status-${status}`}
                                            checked={filters.statuses.includes(status)}
                                            onCheckedChange={() => handleStatusToggle(status)}
                                        />
                                        <label
                                            htmlFor={`status-${status}`}
                                            className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                            {STATUS_LABELS[status]}
                                        </label>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {statusCounts.get(status) || 0}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-medium text-sm mb-3">Type</h4>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between space-x-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="type-uploaded"
                                        checked={filters.types.includes('uploaded')}
                                        onCheckedChange={() => handleTypeToggle('uploaded')}
                                    />
                                    <label
                                        htmlFor="type-uploaded"
                                        className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                        Uploaded DXF
                                    </label>
                                </div>
                                <span className="text-xs text-muted-foreground">{uploadedCount}</span>
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="type-generated"
                                        checked={filters.types.includes('generated')}
                                        onCheckedChange={() => handleTypeToggle('generated')}
                                    />
                                    <label
                                        htmlFor="type-generated"
                                        className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                        Auto-generated
                                    </label>
                                </div>
                                <span className="text-xs text-muted-foreground">{generatedCount}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
