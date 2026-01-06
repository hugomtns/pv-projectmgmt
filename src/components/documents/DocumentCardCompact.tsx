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

interface DocumentCardCompactProps {
  document: Document;
  onClick?: () => void;
  onDelete?: (documentId: string) => void;
}

export function DocumentCardCompact({ document, onClick, onDelete }: DocumentCardCompactProps) {
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
    <div
      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer relative"
      onClick={onClick}
    >
      {/* Small icon */}
      <FileText className="h-6 w-6 text-muted-foreground flex-shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-sm truncate" title={document.name}>
              {document.name}
            </h3>
            <DocumentStatusBadge status={document.status} />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatFileSize(fileSize)}</span>
            <span className="text-muted-foreground/50">•</span>
            <span>{formattedDate}</span>
            <span className="text-muted-foreground/50">•</span>
            <span>by {uploadedBy}</span>
          </div>
        </div>
      </div>

      {/* Three-dot menu */}
      {canDelete && (
        <div className="flex-shrink-0">
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
    </div>
  );
}
