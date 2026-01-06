import { useState } from 'react';
import { DocumentCard } from './DocumentCard';
import { DocumentCardCompact } from './DocumentCardCompact';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useDocumentStore } from '@/stores/documentStore';
import type { Document } from '@/lib/types/document';
import { Search } from 'lucide-react';

interface DocumentListProps {
  documents: Document[];
  onDocumentClick?: (documentId: string) => void;
  showSearch?: boolean;
  variant?: 'default' | 'compact';
}

export function DocumentList({ documents, onDocumentClick, showSearch = false, variant = 'default' }: DocumentListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  const deleteDocument = useDocumentStore((state) => state.deleteDocument);

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

  const handleDeleteClick = (documentId: string) => {
    const doc = documents.find((d) => d.id === documentId);
    if (doc) {
      setDocumentToDelete(doc);
      setDeleteConfirmOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (documentToDelete) {
      await deleteDocument(documentToDelete.id);
      setDocumentToDelete(null);
    }
  };

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
      ) : variant === 'compact' ? (
        <div className="flex flex-col gap-2">
          {filteredDocuments.map((doc) => (
            <DocumentCardCompact
              key={doc.id}
              document={doc}
              onClick={() => onDocumentClick?.(doc.id)}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onClick={() => onDocumentClick?.(doc.id)}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleConfirmDelete}
        title={`Delete "${documentToDelete?.name}"?`}
        description="This action cannot be undone. The document and all its versions, comments, and annotations will be permanently deleted."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
