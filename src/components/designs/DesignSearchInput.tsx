import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface DesignSearchInputProps {
    value: string;
    onChange: (value: string) => void;
}

export function DesignSearchInput({ value, onChange }: DesignSearchInputProps) {
    const [localValue, setLocalValue] = useState(value);

    // Debounce search input
    useEffect(() => {
        const timeout = setTimeout(() => {
            onChange(localValue);
        }, 300);

        return () => clearTimeout(timeout);
    }, [localValue, onChange]);

    // Sync with external changes
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleClear = () => {
        setLocalValue('');
        onChange('');
    };

    return (
        <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Search designs..."
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                className="pl-8 pr-8 h-9 w-[200px]"
            />
            {localValue && (
                <button
                    onClick={handleClear}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                >
                    ×
                </button>
            )}
        </div>
    );
}
