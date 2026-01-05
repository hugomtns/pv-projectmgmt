import { Card } from '@/components/ui/card';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { FileText } from 'lucide-react';
import { formatFileSize } from './utils/fileConversion';
import type { Document } from '@/lib/types/document';

interface DocumentCardProps {
  document: Document;
  onClick?: () => void;
}

export function DocumentCard({ document, onClick }: DocumentCardProps) {
  const formattedDate = new Date(document.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Handle missing fields for documents created before migration
  const fileSize = document.fileSize || 0;
  const uploadedBy = document.uploadedBy || document.createdBy || 'Unknown';

  return (
    <Card
      className="p-4 hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Thumbnail Placeholder */}
        <div className="aspect-[4/3] bg-muted rounded-md flex items-center justify-center">
          <FileText className="h-12 w-12 text-muted-foreground" />
        </div>

        {/* Document Info */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm line-clamp-2 flex-1" title={document.name}>
              {document.name}
            </h3>
            <DocumentStatusBadge status={document.status} />
          </div>

          {/* Description */}
          {document.description && (
            <p className="text-xs text-muted-foreground line-clamp-2" title={document.description}>
              {document.description}
            </p>
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatFileSize(fileSize)}</span>
            <span>{formattedDate}</span>
          </div>

          {/* Uploader */}
          <div className="text-xs text-muted-foreground">
            by {uploadedBy}
          </div>
        </div>
      </div>
    </Card>
  );
}
