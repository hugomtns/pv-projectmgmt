import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export interface DesignSort {
    field: 'name' | 'createdAt' | 'updatedAt' | 'status';
    direction: 'asc' | 'desc';
}

interface DesignSortSelectProps {
    sort: DesignSort;
    onSortChange: (sort: DesignSort) => void;
}

const SORT_OPTIONS: { value: string; label: string; field: DesignSort['field']; direction: DesignSort['direction'] }[] = [
    { value: 'updatedAt-desc', label: 'Last Updated', field: 'updatedAt', direction: 'desc' },
    { value: 'updatedAt-asc', label: 'Oldest Updated', field: 'updatedAt', direction: 'asc' },
    { value: 'createdAt-desc', label: 'Newest Created', field: 'createdAt', direction: 'desc' },
    { value: 'createdAt-asc', label: 'Oldest Created', field: 'createdAt', direction: 'asc' },
    { value: 'name-asc', label: 'Name (A-Z)', field: 'name', direction: 'asc' },
    { value: 'name-desc', label: 'Name (Z-A)', field: 'name', direction: 'desc' },
    { value: 'status-asc', label: 'Status', field: 'status', direction: 'asc' },
];

export function DesignSortSelect({ sort, onSortChange }: DesignSortSelectProps) {
    const currentValue = `${sort.field}-${sort.direction}`;

    const handleValueChange = (value: string) => {
        const option = SORT_OPTIONS.find((opt) => opt.value === value);
        if (option) {
            onSortChange({ field: option.field, direction: option.direction });
        }
    };

    return (
        <Select value={currentValue} onValueChange={handleValueChange}>
            <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
                {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
