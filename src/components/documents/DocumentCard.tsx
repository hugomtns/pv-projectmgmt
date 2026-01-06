import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { FileText, MoreVertical, Trash2 } from 'lucide-react';
import { formatFileSize } from './utils/fileConversion';
import { useUserStore } from '@/stores/userStore';
import type { Document } from '@/lib/types/document';

interface DocumentCardProps {
  document: Document;
  onClick?: () => void;
  onDelete?: (documentId: string) => void;
}

export function DocumentCard({ document, onClick, onDelete }: DocumentCardProps) {
  const currentUser = useUserStore((state) => state.currentUser);
  const roles = useUserStore((state) => state.roles);

  const formattedDate = new Date(document.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Handle missing fields for documents created before migration
  const fileSize = document.fileSize || 0;
  const uploadedBy = document.uploadedBy || document.createdBy || 'Unknown';

  // Determine if user can delete this document
  const canDelete = (() => {
    if (!currentUser) return false;

    // Check if user is admin
    const userRole = roles.find(r => r.id === currentUser.roleId);
    const isAdmin = userRole?.name === 'Admin' || currentUser.roleId === 'role-admin';

    // Admins can delete any document
    if (isAdmin) return true;

    // Check if user is the document owner
    const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;
    const isOwner = document.uploadedBy === userFullName || document.createdBy === userFullName;

    // Owners can delete their own documents, but not if they're approved
    if (isOwner && document.status !== 'approved') return true;

    return false;
  })();

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(document.id);
  };

  return (
    <Card
      className="p-4 hover:bg-accent/50 transition-colors cursor-pointer relative"
      onClick={onClick}
    >
      {/* Three-dot menu (top-right corner) */}
      {canDelete && (
        <div className="absolute top-2 right-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-accent"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
                onClick={handleDeleteClick}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

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
