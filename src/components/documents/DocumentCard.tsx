import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { FileText, MoreVertical, Trash2, Lock, Unlock } from 'lucide-react';
import { formatFileSize } from './utils/fileConversion';
import { useUserStore } from '@/stores/userStore';
import { useDocumentStore } from '@/stores/documentStore';
import { getDocumentPermissions } from '@/lib/permissions/documentPermissions';
import type { Document } from '@/lib/types/document';

interface DocumentCardProps {
  document: Document;
  onClick?: () => void;
  onDelete?: (documentId: string) => void;
}

export function DocumentCard({ document, onClick, onDelete }: DocumentCardProps) {
  const currentUser = useUserStore((state) => state.currentUser);
  const roles = useUserStore((state) => state.roles);
  const permissionOverrides = useUserStore((state) => state.permissionOverrides);
  const lockDocument = useDocumentStore((state) => state.lockDocument);
  const unlockDocument = useDocumentStore((state) => state.unlockDocument);

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

  // Determine if user can lock/unlock
  const canManageLock = (() => {
    if (!currentUser) return false;

    const permissions = getDocumentPermissions(
      currentUser,
      document.id,
      permissionOverrides,
      roles
    );

    if (!permissions.update) return false;

    if (document.isLocked) {
      const isAdmin = currentUser.roleId === 'role-admin';
      const isLocker = document.lockedByUserId === currentUser.id;
      return isAdmin || isLocker;
    }

    return true;
  })();

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(document.id);
  };

  const handleLockToggle = async () => {
    if (document.isLocked) {
      await unlockDocument(document.id);
    } else {
      await lockDocument(document.id);
    }
  };

  return (
    <Card
      className="p-4 hover:bg-accent/50 transition-colors cursor-pointer relative"
      onClick={onClick}
    >
      {/* Three-dot menu (top-right corner) */}
      {(canManageLock || canDelete) && (
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
              {canManageLock && (
                <>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLockToggle();
                    }}
                    className="cursor-pointer"
                  >
                    {document.isLocked ? (
                      <>
                        <Unlock className="h-4 w-4" />
                        Unlock
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        Lock
                      </>
                    )}
                  </DropdownMenuItem>
                  {canDelete && <DropdownMenuSeparator />}
                </>
              )}

              {canDelete && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
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
            <div className="flex items-center gap-1 flex-shrink-0">
              <DocumentStatusBadge status={document.status} />
              {document.isLocked && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Locked
                </Badge>
              )}
            </div>
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
