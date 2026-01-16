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
  ntp_checklists: 'NTP Checklist',
  workflows: 'Workflow',
  tasks: 'Task',
  comments: 'Comment',
  user_management: 'User Management',
  documents: 'Document',
  designs: 'Design',
  financials: 'Financial',
  components: 'Component',
  boqs: 'BOQ',
  admin_logs: 'Admin Log',
  sites: 'Site',
  inspections: 'Inspection',
  equipment: 'Equipment',
  equipment_units: 'Equipment Unit',
  maintenance_schedules: 'Maintenance Schedule',
  work_orders: 'Work Order',
  performance_logs: 'Performance Log',
};

// Format file size to human readable
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Format status string to readable format
function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Generate human-readable description from action, entity type, and details
function formatDetailsText(
  _action: AdminLogAction,
  _entityType: EntityType,
  _entityName: string | undefined,
  details: Record<string, unknown>
): string[] {
  const lines: string[] = [];

  if (!details || Object.keys(details).length === 0) {
    return lines;
  }

  // Handle status changes (tasks, documents, designs)
  if (details.statusChange && typeof details.statusChange === 'object') {
    const sc = details.statusChange as { from?: string; to?: string };
    if (sc.from && sc.to) {
      lines.push(`Status: ${formatStatus(sc.from)} → ${formatStatus(sc.to)}`);
    }
  }

  // Handle updates object (from task/project updates)
  if (details.updates && typeof details.updates === 'object') {
    const updates = details.updates as Record<string, unknown>;

    if (updates.status && typeof updates.status === 'string') {
      lines.push(`Status changed to '${formatStatus(updates.status)}'`);
    }
    if (updates.name && typeof updates.name === 'string') {
      lines.push(`Name changed to '${updates.name}'`);
    }
    if (updates.title && typeof updates.title === 'string') {
      lines.push(`Title changed to '${updates.title}'`);
    }
    if (updates.owner && typeof updates.owner === 'string') {
      lines.push(`Owner changed to '${updates.owner}'`);
    }
    if (updates.priority !== undefined) {
      const priorityLabels = ['On Hold', 'Urgent', 'High', 'Medium', 'Low'];
      const priorityLabel = priorityLabels[updates.priority as number] || updates.priority;
      lines.push(`Priority changed to '${priorityLabel}'`);
    }
    if (updates.assignee && typeof updates.assignee === 'string') {
      lines.push(`Assigned to '${updates.assignee}'`);
    }
    if (updates.dueDate && typeof updates.dueDate === 'string') {
      lines.push(`Due date set to ${updates.dueDate}`);
    }
    if (updates.description !== undefined) {
      lines.push(`Description updated`);
    }
    if (updates.location && typeof updates.location === 'string') {
      lines.push(`Location changed to '${updates.location}'`);
    }
  }

  // Handle updated fields list
  if (details.updatedFields && Array.isArray(details.updatedFields)) {
    const fields = details.updatedFields as string[];
    if (fields.length > 0 && lines.length === 0) {
      lines.push(`Updated: ${fields.join(', ')}`);
    }
  }

  // Handle updated inputs (financial models)
  if (details.updatedInputs && Array.isArray(details.updatedInputs)) {
    const inputs = details.updatedInputs as string[];
    if (inputs.length > 0) {
      lines.push(`Updated inputs: ${inputs.join(', ')}`);
    }
  }

  // Handle version uploads
  if (details.versionNumber !== undefined) {
    lines.push(`Version ${details.versionNumber} uploaded`);
  }

  // Handle file size
  if (details.fileSize && typeof details.fileSize === 'number') {
    lines.push(`File size: ${formatFileSize(details.fileSize)}`);
  }

  // Handle location for projects
  if (details.location && typeof details.location === 'string') {
    lines.push(`Location: ${details.location}`);
  }

  // Handle priority for new projects
  if (details.priority !== undefined && !details.updates) {
    const priorityLabels = ['On Hold', 'Urgent', 'High', 'Medium', 'Low'];
    const priorityLabel = priorityLabels[details.priority as number] || details.priority;
    lines.push(`Priority: ${priorityLabel}`);
  }

  // Handle component creation
  if (details.type && details.manufacturer && details.model) {
    lines.push(`${details.type === 'module' ? 'Module' : 'Inverter'}: ${details.manufacturer} ${details.model}`);
  }

  // Handle stage/task context
  if (details.stageName && typeof details.stageName === 'string') {
    lines.push(`Stage: ${details.stageName}`);
  }

  // Handle group/role assignments
  if (details.groupName && typeof details.groupName === 'string') {
    lines.push(`Group: ${details.groupName}`);
  }
  if (details.roleName && typeof details.roleName === 'string') {
    lines.push(`Role: ${details.roleName}`);
  }

  // Handle NTP checklist actions
  if (details.action === 'initializeNtpChecklist' && typeof details.itemCount === 'number') {
    lines.push(`Initialized with ${details.itemCount} items`);
  }
  if (details.action === 'addNtpChecklistItem' && details.itemTitle) {
    lines.push(`Added: ${details.itemTitle}`);
  }
  if (details.action === 'deleteNtpChecklistItem' && details.itemTitle) {
    lines.push(`Removed: ${details.itemTitle}`);
  }
  if (details.action === 'updateNtpChecklistItem' || details.action === 'toggleNtpChecklistItemStatus') {
    if (details.itemTitle) {
      lines.push(`Item: ${details.itemTitle}`);
    }
  }

  return lines
}

function DetailsCell({
  action,
  entityType,
  entityName,
  details
}: {
  action: AdminLogAction;
  entityType: EntityType;
  entityName: string | undefined;
  details: Record<string, unknown>;
}) {
  const lines = formatDetailsText(action, entityType, entityName, details);

  if (lines.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <div className="text-sm space-y-0.5">
      {lines.map((line, index) => (
        <div key={index} className="text-muted-foreground">
          {line}
        </div>
      ))}
    </div>
  );
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
                <TableCell>
                  <DetailsCell
                    action={entry.action}
                    entityType={entry.entityType}
                    entityName={entry.entityName}
                    details={entry.details}
                  />
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
