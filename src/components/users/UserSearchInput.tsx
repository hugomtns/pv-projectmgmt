import { useUserFilterStore } from '@/stores/userFilterStore';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';

export function UserSearchInput() {
  const search = useUserFilterStore((state) => state.filters.search);
  const setSearch = useUserFilterStore((state) => state.setSearch);
  const [localValue, setLocalValue] = useState(search);

  // Debounce search input
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(localValue);
    }, 300);

    return () => clearTimeout(timeout);
  }, [localValue, setSearch]);

  // Sync with external changes
  useEffect(() => {
    setLocalValue(search);
  }, [search]);

  const handleClear = () => {
    setLocalValue('');
    setSearch('');
  };

  return (
    <div className="relative flex-1">
      <Input
        placeholder="Search by name or email..."
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="pr-8"
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
