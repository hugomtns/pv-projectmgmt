import { useState } from 'react';
import { DocumentCard } from './DocumentCard';
import { Input } from '@/components/ui/input';
import type { Document } from '@/lib/types/document';
import { Search } from 'lucide-react';

interface DocumentListProps {
  documents: Document[];
  onDocumentClick?: (documentId: string) => void;
  showSearch?: boolean;
}

export function DocumentList({ documents, onDocumentClick, showSearch = false }: DocumentListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter documents based on search query
  const filteredDocuments = searchQuery
    ? documents.filter((doc) => {
        const query = searchQuery.toLowerCase();
        return (
          doc.name.toLowerCase().includes(query) ||
          doc.description?.toLowerCase().includes(query)
        );
      })
    : documents;

  if (documents.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
        No documents yet. Upload your first document to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showSearch && documents.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {filteredDocuments.length === 0 && searchQuery ? (
        <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
          No documents found matching "{searchQuery}"
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onClick={() => onDocumentClick?.(doc.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
