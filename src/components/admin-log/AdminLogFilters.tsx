import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { useAdminLogStore } from '@/stores/adminLogStore';
import { useUserStore } from '@/stores/userStore';
import type { AdminLogAction } from '@/lib/types/adminLog';
import type { EntityType } from '@/lib/types/permission';

const ALL_VALUE = '__all__';

const ACTION_OPTIONS: { value: AdminLogAction; label: string }[] = [
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
];

const ENTITY_TYPE_OPTIONS: { value: EntityType; label: string }[] = [
  { value: 'projects', label: 'Projects' },
  { value: 'workflows', label: 'Workflows' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'comments', label: 'Comments' },
  { value: 'user_management', label: 'User Management' },
  { value: 'documents', label: 'Documents' },
  { value: 'designs', label: 'Designs' },
  { value: 'financials', label: 'Financials' },
  { value: 'components', label: 'Components' },
  { value: 'boqs', label: 'BOQs' },
];

export function AdminLogFilters() {
  const filters = useAdminLogStore((state) => state.filters);
  const setFilters = useAdminLogStore((state) => state.setFilters);
  const clearFilters = useAdminLogStore((state) => state.clearFilters);
  const users = useUserStore((state) => state.users);

  const hasActiveFilters =
    filters.userId ||
    filters.action ||
    filters.entityType ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className="flex gap-2 items-center flex-wrap">
      {/* User Filter */}
      <Select
        value={filters.userId || ALL_VALUE}
        onValueChange={(value) =>
          setFilters({ userId: value === ALL_VALUE ? undefined : value })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Users" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>All Users</SelectItem>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.firstName} {user.lastName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Action Filter */}
      <Select
        value={filters.action || ALL_VALUE}
        onValueChange={(value) =>
          setFilters({
            action: value === ALL_VALUE ? undefined : (value as AdminLogAction),
          })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All Actions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>All Actions</SelectItem>
          {ACTION_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Entity Type Filter */}
      <Select
        value={filters.entityType || ALL_VALUE}
        onValueChange={(value) =>
          setFilters({
            entityType: value === ALL_VALUE ? undefined : (value as EntityType),
          })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Entity Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>All Entity Types</SelectItem>
          {ENTITY_TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date From */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[140px] justify-start">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.dateFrom
              ? format(new Date(filters.dateFrom), 'MMM d, yyyy')
              : 'From Date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
            onSelect={(date) =>
              setFilters({ dateFrom: date?.toISOString().split('T')[0] })
            }
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Date To */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[140px] justify-start">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.dateTo
              ? format(new Date(filters.dateTo), 'MMM d, yyyy')
              : 'To Date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
            onSelect={(date) =>
              setFilters({ dateTo: date?.toISOString().split('T')[0] })
            }
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
