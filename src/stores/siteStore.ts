import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as turf from '@turf/turf';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import type { Site, KMLParseResult, SiteBoundary, SiteExclusionZone } from '@/lib/types';
import { useUserStore } from './userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { logAdminAction } from '@/lib/adminLogger';
import { toast } from 'sonner';

/**
 * Calculate usable area by clipping exclusion zones to boundary
 * and subtracting only the overlapping portions
 */
function calculateUsableArea(
  boundaries: SiteBoundary[],
  exclusionZones: SiteExclusionZone[],
  totalArea: number
): number {
  if (boundaries.length === 0 || exclusionZones.length === 0) {
    return totalArea;
  }

  try {
    // Create boundary polygon(s)
    const boundaryPolygons = boundaries
      .filter(b => b.coordinates.length >= 4)
      .map(b => {
        const coords = b.coordinates.map(c => [c.lng, c.lat]);
        // Ensure polygon is closed
        if (coords[0][0] !== coords[coords.length - 1][0] ||
            coords[0][1] !== coords[coords.length - 1][1]) {
          coords.push(coords[0]);
        }
        return turf.polygon([coords]);
      });

    if (boundaryPolygons.length === 0) return totalArea;

    // Union all boundaries into one (may result in Polygon or MultiPolygon)
    let boundaryUnion: Feature<Polygon | MultiPolygon> = boundaryPolygons[0];
    for (let i = 1; i < boundaryPolygons.length; i++) {
      const result = turf.union(turf.featureCollection([boundaryUnion, boundaryPolygons[i]]));
      if (result) boundaryUnion = result;
    }

    // Calculate exclusion area that's INSIDE the boundary
    let clippedExclusionArea = 0;

    for (const ez of exclusionZones) {
      if (ez.coordinates.length < 4) continue;

      try {
        const coords = ez.coordinates.map(c => [c.lng, c.lat]);
        // Ensure polygon is closed
        if (coords[0][0] !== coords[coords.length - 1][0] ||
            coords[0][1] !== coords[coords.length - 1][1]) {
          coords.push(coords[0]);
        }

        const exclusionPoly = turf.polygon([coords]);
        const clipped = turf.intersect(turf.featureCollection([boundaryUnion, exclusionPoly]));

        if (clipped) {
          // Area in square meters
          clippedExclusionArea += turf.area(clipped);
        }
      } catch {
        // Skip invalid polygons
      }
    }

    console.log('[calculateUsableArea] Clipped exclusion area:', {
      originalExclusionArea: exclusionZones.reduce((sum, ez) => sum + (ez.area || 0), 0),
      clippedExclusionArea,
      totalArea,
    });

    return Math.max(0, totalArea - clippedExclusionArea);
  } catch (error) {
    console.error('[calculateUsableArea] Error:', error);
    // Fallback to simple calculation
    const exclusionArea = exclusionZones.reduce((sum, ez) => sum + (ez.area || 0), 0);
    return Math.max(0, totalArea - exclusionArea);
  }
}

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

        // Calculate usable area using proper polygon intersection
        // This clips exclusion zones to the boundary so areas outside don't count
        const usableArea = calculateUsableArea(boundaries, exclusionZones, totalArea || 0);

        console.log('[createSiteFromKML] Calculation:', {
          totalArea,
          exclusionCount: exclusionZones.length,
          usableArea,
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
          usableArea,
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
