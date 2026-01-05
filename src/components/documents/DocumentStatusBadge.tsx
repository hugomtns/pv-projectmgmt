import { Badge } from '@/components/ui/badge';
import type { DocumentStatus } from '@/lib/types/document';

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
}

const statusConfig: Record<DocumentStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: {
    label: 'Draft',
    variant: 'secondary',
  },
  in_review: {
    label: 'In Review',
    variant: 'default',
  },
  approved: {
    label: 'Approved',
    variant: 'outline',
  },
  changes_requested: {
    label: 'Changes Requested',
    variant: 'destructive',
  },
};

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}
