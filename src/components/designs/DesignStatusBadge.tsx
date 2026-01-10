import { Badge } from '@/components/ui/badge';
import type { Design } from '@/lib/types';

const statusConfig: Record<
  Design['status'],
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  review: { label: 'In Review', variant: 'default' },
  approved: { label: 'Approved', variant: 'outline' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

interface DesignStatusBadgeProps {
  status: Design['status'];
  className?: string;
}

export function DesignStatusBadge({ status, className }: DesignStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
