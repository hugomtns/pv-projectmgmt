import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAdminLogStore } from '@/stores/adminLogStore';
import type { AdminLogAction } from '@/lib/types/adminLog';
import type { EntityType } from '@/lib/types/permission';

const ACTION_COLORS: Record<AdminLogAction, string> = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  projects: 'Project',
  workflows: 'Workflow',
  tasks: 'Task',
  comments: 'Comment',
  user_management: 'User Management',
  documents: 'Document',
  designs: 'Design',
  financials: 'Financial',
  components: 'Component',
  boqs: 'BOQ',
};

function formatDetails(details: Record<string, unknown>): string {
  if (!details || Object.keys(details).length === 0) return '-';

  const entries = Object.entries(details)
    .filter(([key]) => key !== 'updates') // Skip large nested objects
    .slice(0, 3); // Limit to first 3 entries

  return entries
    .map(([key, value]) => {
      if (typeof value === 'object') return `${key}: {...}`;
      return `${key}: ${value}`;
    })
    .join(', ');
}

export function AdminLogTable() {
  const entries = useAdminLogStore((state) => state.entries);
  const totalCount = useAdminLogStore((state) => state.totalCount);
  const isLoading = useAdminLogStore((state) => state.isLoading);
  const pageSize = useAdminLogStore((state) => state.pageSize);
  const currentPage = useAdminLogStore((state) => state.currentPage);
  const setPage = useAdminLogStore((state) => state.setPage);

  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          No log entries found
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Actions taken in the application will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[150px]">User</TableHead>
              <TableHead className="w-[100px]">Action</TableHead>
              <TableHead className="w-[140px]">Entity Type</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-mono text-sm">
                  {format(new Date(entry.timestamp), 'MMM d, yyyy HH:mm:ss')}
                </TableCell>
                <TableCell>{entry.userName}</TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={ACTION_COLORS[entry.action]}
                  >
                    {entry.action}
                  </Badge>
                </TableCell>
                <TableCell>
                  {ENTITY_TYPE_LABELS[entry.entityType] || entry.entityType}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {entry.entityName || entry.entityId}
                </TableCell>
                <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                  {formatDetails(entry.details)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-muted-foreground">
          Showing {startIndex} to {endIndex} of {totalCount} entries
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
