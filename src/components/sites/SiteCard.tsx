import { useState } from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar, User, MoreVertical, Trash2, MapPin, Layers } from 'lucide-react';
import type { Site } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { useSiteStore } from '@/stores/siteStore';
import { useUserStore } from '@/stores/userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { squareMetersToAcres } from '@/lib/kml/parser';
import { SiteMapPreview } from './SiteMapPreview';

interface SiteCardProps {
  site: Site;
}

export function SiteCard({ site }: SiteCardProps) {
  const deleteSite = useSiteStore((state) => state.deleteSite);
  const currentUser = useUserStore((state) => state.currentUser);
  const permissionOverrides = useUserStore((state) => state.permissionOverrides);
  const roles = useUserStore((state) => state.roles);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMapDialog, setShowMapDialog] = useState(false);

  // Check delete permission (owner or admin)
  const isAdmin = currentUser?.roleId === 'role-admin';
  const isCreator = currentUser?.id === site.creatorId;
  const canDelete =
    currentUser &&
    (isAdmin || isCreator) &&
    resolvePermissions(currentUser, 'sites', site.id, permissionOverrides, roles).delete;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    deleteSite(site.id);
    setShowDeleteDialog(false);
  };

  const totalAcres = site.totalArea != null && site.totalArea > 0
    ? squareMetersToAcres(site.totalArea).toFixed(1)
    : '0';
  const usableAcres = site.usableArea != null
    ? squareMetersToAcres(site.usableArea).toFixed(1)
    : totalAcres;

  return (
    <>
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow group h-full flex flex-col"
        onClick={() => setShowMapDialog(true)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2 flex-1">
              {site.name}
            </CardTitle>
            <div className="flex items-center gap-1 shrink-0">
              <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                {site.boundaries.length} {site.boundaries.length === 1 ? 'boundary' : 'boundaries'}
              </Badge>
              {canDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={handleDeleteClick}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 pb-3 space-y-2">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {site.description || 'No description provided.'}
          </p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{totalAcres} acres total</span>
            </div>
            <div className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              <span>{usableAcres} acres usable</span>
            </div>
          </div>

          {site.exclusionZones.length > 0 && (
            <div className="text-xs text-amber-600">
              {site.exclusionZones.length} exclusion zone
              {site.exclusionZones.length !== 1 ? 's' : ''}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-0 text-xs text-muted-foreground border-t bg-muted/20 p-3 mt-auto">
          <div className="flex items-center justify-between w-full">
            <div
              className="flex items-center gap-1.5"
              title={`Created by ${site.createdBy}`}
            >
              <User className="h-3 w-3" />
              <span className="truncate max-w-[100px]">{site.createdBy}</span>
            </div>
            <div
              className="flex items-center gap-1.5"
              title={`Updated ${new Date(site.updatedAt).toLocaleDateString()}`}
            >
              <Calendar className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(site.updatedAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Site</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{site.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Map preview dialog */}
      <Dialog open={showMapDialog} onOpenChange={setShowMapDialog}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {site.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <SiteMapPreview site={site} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
