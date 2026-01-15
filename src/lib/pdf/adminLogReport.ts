import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AdminLogEntry, AdminLogFilters } from '@/lib/types/adminLog';
import type { EntityType } from '@/lib/types/permission';

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

// Generate human-readable description from details
function formatDetails(details: Record<string, unknown>): string {
  if (!details || Object.keys(details).length === 0) return '-';

  const lines: string[] = [];

  // Handle status changes
  if (details.statusChange && typeof details.statusChange === 'object') {
    const sc = details.statusChange as { from?: string; to?: string };
    if (sc.from && sc.to) {
      lines.push(`Status: ${formatStatus(sc.from)} → ${formatStatus(sc.to)}`);
    }
  }

  // Handle updates object
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

  // Handle stage context
  if (details.stageName && typeof details.stageName === 'string') {
    lines.push(`Stage: ${details.stageName}`);
  }

  // Handle group/role
  if (details.groupName && typeof details.groupName === 'string') {
    lines.push(`Group: ${details.groupName}`);
  }
  if (details.roleName && typeof details.roleName === 'string') {
    lines.push(`Role: ${details.roleName}`);
  }

  return lines.length > 0 ? lines.join('\n') : '-';
}

function formatFilterSummary(filters: AdminLogFilters): string {
  const parts: string[] = [];

  if (filters.userId) parts.push(`User: ${filters.userId}`);
  if (filters.action) parts.push(`Action: ${filters.action}`);
  if (filters.entityType)
    parts.push(`Entity: ${ENTITY_TYPE_LABELS[filters.entityType]}`);
  if (filters.dateFrom) parts.push(`From: ${filters.dateFrom}`);
  if (filters.dateTo) parts.push(`To: ${filters.dateTo}`);

  return parts.length > 0 ? parts.join(' | ') : 'No filters applied';
}

export async function downloadAdminLogReport(
  entries: AdminLogEntry[],
  filters: AdminLogFilters,
  filename?: string
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Title
  doc.setFontSize(18);
  doc.text('Admin Activity Log', 14, 20);

  // Metadata
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
  doc.text(`Total Entries: ${entries.length} (max 1000)`, 14, 34);
  doc.text(`Filters: ${formatFilterSummary(filters)}`, 14, 40);

  // Table
  const headers = [
    'Timestamp',
    'User',
    'Action',
    'Entity Type',
    'Entity',
    'Details',
  ];

  const body = entries.map((entry) => [
    new Date(entry.timestamp).toLocaleString(),
    entry.userName,
    entry.action.toUpperCase(),
    ENTITY_TYPE_LABELS[entry.entityType] || entry.entityType,
    (entry.entityName || entry.entityId).substring(0, 30),
    formatDetails(entry.details),
  ]);

  autoTable(doc, {
    startY: 46,
    head: [headers],
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 66, 66] },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 35 },
      2: { cellWidth: 20 },
      3: { cellWidth: 35 },
      4: { cellWidth: 50 },
      5: { cellWidth: 'auto' },
    },
    didDrawPage: (data) => {
      // Footer with page numbers
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    },
  });

  // Download
  const blob = doc.output('blob');
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    filename || `Admin_Log_${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
