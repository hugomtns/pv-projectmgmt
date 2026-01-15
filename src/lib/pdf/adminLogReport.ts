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

function formatDetails(details: Record<string, unknown>): string {
  if (!details || Object.keys(details).length === 0) return '-';

  const entries = Object.entries(details)
    .filter(([key]) => key !== 'updates')
    .slice(0, 2);

  return entries
    .map(([key, value]) => {
      if (typeof value === 'object') return `${key}: {...}`;
      const strValue = String(value);
      return `${key}: ${strValue.length > 20 ? strValue.substring(0, 20) + '...' : strValue}`;
    })
    .join('; ');
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
