import { useState } from 'react';
import { useSiteStore } from '@/stores/siteStore';
import { useUserStore } from '@/stores/userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { SiteCard } from './SiteCard';
import { CreateSiteDialog } from './CreateSiteDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface SiteListProps {
  projectId: string;
}

export function SiteList({ projectId }: SiteListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const allSites = useSiteStore((state) => state.sites);
  const sites = allSites.filter((s) => s.projectId === projectId);

  const currentUser = useUserStore((state) => state.currentUser);
  const permissionOverrides = useUserStore((state) => state.permissionOverrides);
  const roles = useUserStore((state) => state.roles);

  // Permission check for creating sites
  const canCreate = currentUser
    ? resolvePermissions(currentUser, 'sites', undefined, permissionOverrides, roles)
        .create
    : false;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Sites</h3>
        {canCreate && (
          <Button size="sm" onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Site
          </Button>
        )}
      </div>

      {sites.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
          No sites yet. Upload a KML file to add site boundaries.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => (
            <SiteCard key={site.id} site={site} />
          ))}
        </div>
      )}

      {canCreate && (
        <CreateSiteDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          projectId={projectId}
        />
      )}
    </div>
  );
}
