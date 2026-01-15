import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Site, KMLParseResult } from '@/lib/types';
import { useUserStore } from './userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { logAdminAction } from '@/lib/adminLogger';
import { toast } from 'sonner';

interface SiteState {
  // State
  sites: Site[];

  // Actions
  addSite: (
    site: Omit<Site, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'creatorId'>
  ) => string | undefined;
  updateSite: (id: string, updates: Partial<Site>) => void;
  deleteSite: (id: string) => void;

  // KML import convenience method
  createSiteFromKML: (
    projectId: string,
    name: string,
    description: string,
    kmlFileName: string,
    kmlFileSize: number,
    parseResult: KMLParseResult
  ) => string | undefined;

  // Design linking
  linkSiteToDesign: (siteId: string, designId: string) => void;
  unlinkSiteFromDesign: (siteId: string) => void;

  // Helpers
  getSitesByProject: (projectId: string) => Site[];
  getSiteById: (id: string) => Site | undefined;
}

export const useSiteStore = create<SiteState>()(
  persist(
    (set, get) => ({
      sites: [],

      addSite: (siteData) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to create sites');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'sites',
          undefined,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.create) {
          toast.error('Permission denied: You do not have permission to create sites');
          return;
        }

        const now = new Date().toISOString();
        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;

        const newSite: Site = {
          ...siteData,
          id: crypto.randomUUID(),
          createdBy: userFullName,
          creatorId: currentUser.id,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          sites: [...state.sites, newSite],
        }));

        logAdminAction('create', 'sites', newSite.id, siteData.name, {
          projectId: siteData.projectId,
          boundaryCount: siteData.boundaries.length,
          exclusionCount: siteData.exclusionZones.length,
        });

        toast.success('Site created successfully');
        return newSite.id;
      },

      updateSite: (id, updates) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to update sites');
          return;
        }

        const site = get().sites.find((s) => s.id === id);
        if (!site) {
          toast.error('Site not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'sites',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        const isSystemAdmin = currentUser.roleId === 'role-admin';
        const isCreator = site.creatorId === currentUser.id;

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to update sites');
          return;
        }

        if (!isSystemAdmin && !isCreator) {
          toast.error('Permission denied: You can only edit sites you created');
          return;
        }

        set((state) => ({
          sites: state.sites.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
          ),
        }));

        logAdminAction('update', 'sites', id, site.name, {
          updatedFields: Object.keys(updates),
        });

        toast.success('Site updated');
      },

      deleteSite: (id) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to delete sites');
          return;
        }

        const site = get().sites.find((s) => s.id === id);
        if (!site) {
          toast.error('Site not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'sites',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        const isSystemAdmin = currentUser.roleId === 'role-admin';
        const isCreator = site.creatorId === currentUser.id;

        if (!permissions.delete) {
          toast.error('Permission denied: You do not have permission to delete sites');
          return;
        }

        if (!isSystemAdmin && !isCreator) {
          toast.error('Permission denied: You can only delete sites you created');
          return;
        }

        set((state) => ({
          sites: state.sites.filter((s) => s.id !== id),
        }));

        logAdminAction('delete', 'sites', id, site.name);

        toast.success('Site deleted');
      },

      createSiteFromKML: (
        projectId,
        name,
        description,
        kmlFileName,
        kmlFileSize,
        parseResult
      ) => {
        const { boundaries, exclusionZones, centroid, totalArea } = parseResult;

        // Calculate usable area (total - exclusions)
        const exclusionArea = exclusionZones.reduce((sum, ez) => sum + (ez.area || 0), 0);
        const usableArea = (totalArea || 0) - exclusionArea;

        console.log('[createSiteFromKML] Calculation:', {
          totalArea,
          exclusionCount: exclusionZones.length,
          exclusionArea,
          usableArea,
          sampleExclusionAreas: exclusionZones.slice(0, 3).map(ez => ez.area),
        });

        return get().addSite({
          projectId,
          name,
          description,
          kmlFileName,
          kmlFileSize,
          boundaries,
          exclusionZones,
          centroid,
          totalArea,
          usableArea: Math.max(0, usableArea),
        });
      },

      linkSiteToDesign: (siteId, designId) => {
        get().updateSite(siteId, { linkedDesignId: designId });
      },

      unlinkSiteFromDesign: (siteId) => {
        get().updateSite(siteId, { linkedDesignId: undefined });
      },

      getSitesByProject: (projectId) => {
        return get().sites.filter((s) => s.projectId === projectId);
      },

      getSiteById: (id) => {
        return get().sites.find((s) => s.id === id);
      },
    }),
    { name: 'site-storage' }
  )
);
