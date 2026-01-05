import { DocumentCard } from './DocumentCard';
import type { Document } from '@/lib/types/document';

interface DocumentListProps {
  documents: Document[];
  onDocumentClick?: (documentId: string) => void;
}

export function DocumentList({ documents, onDocumentClick }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
        No documents yet. Upload your first document to get started.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onClick={() => onDocumentClick?.(doc.id)}
        />
      ))}
    </div>
  );
}
