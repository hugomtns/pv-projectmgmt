import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as turf from '@turf/turf';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import type {
  Site,
  KMLParseResult,
  SiteBoundary,
  SiteExclusionZone,
  ScorecardCategory,
  ScorecardRating,
  SiteScorecard,
  SiteComment,
} from '@/lib/types';
import {
  createEmptyScorecard,
  calculateCompositeScore,
} from '@/lib/types/siteScorecard';
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
  console.log('[calculateUsableArea] Starting calculation:', {
    boundaryCount: boundaries.length,
    exclusionCount: exclusionZones.length,
    totalArea,
    exclusionTypes: exclusionZones.map(ez => ez.type),
  });

  if (boundaries.length === 0 || exclusionZones.length === 0) {
    console.log('[calculateUsableArea] No exclusions - returning full area');
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

    if (boundaryPolygons.length === 0) {
      console.log('[calculateUsableArea] No valid boundary polygons');
      return totalArea;
    }

    // Union all boundaries into one (may result in Polygon or MultiPolygon)
    let boundaryUnion: Feature<Polygon | MultiPolygon> = boundaryPolygons[0];
    for (let i = 1; i < boundaryPolygons.length; i++) {
      const result = turf.union(turf.featureCollection([boundaryUnion, boundaryPolygons[i]]));
      if (result) boundaryUnion = result;
    }

    const boundaryUnionArea = turf.area(boundaryUnion);
    console.log('[calculateUsableArea] Boundary union area:', boundaryUnionArea);

    // Build exclusion polygons and union them (to handle overlaps)
    const exclusionPolygons: Feature<Polygon>[] = [];
    const exclusionDetails: Array<{ name: string; type: string; area: number }> = [];

    for (const ez of exclusionZones) {
      if (ez.coordinates.length < 4) continue;

      try {
        const coords = ez.coordinates.map(c => [c.lng, c.lat]);
        // Ensure polygon is closed
        if (coords[0][0] !== coords[coords.length - 1][0] ||
            coords[0][1] !== coords[coords.length - 1][1]) {
          coords.push(coords[0]);
        }
        const poly = turf.polygon([coords]);
        exclusionPolygons.push(poly);
        exclusionDetails.push({
          name: ez.name,
          type: ez.type,
          area: turf.area(poly),
        });
      } catch {
        // Skip invalid polygons
      }
    }

    if (exclusionPolygons.length === 0) {
      console.log('[calculateUsableArea] No valid exclusion polygons');
      return totalArea;
    }

    console.log('[calculateUsableArea] Exclusion details:', exclusionDetails);

    // Union all exclusion zones to handle overlaps
    let exclusionUnion: Feature<Polygon | MultiPolygon> = exclusionPolygons[0];
    for (let i = 1; i < exclusionPolygons.length; i++) {
      try {
        const result = turf.union(turf.featureCollection([exclusionUnion, exclusionPolygons[i]]));
        if (result) exclusionUnion = result;
      } catch {
        // Skip if union fails
      }
    }

    const rawExclusionArea = exclusionDetails.reduce((sum, d) => sum + d.area, 0);
    const mergedExclusionArea = turf.area(exclusionUnion);
    const overlapArea = rawExclusionArea - mergedExclusionArea;

    // Clip the merged exclusion to the boundary
    const clippedExclusion = turf.intersect(turf.featureCollection([boundaryUnion, exclusionUnion]));
    const clippedExclusionArea = clippedExclusion ? turf.area(clippedExclusion) : 0;
    const outsideBoundaryArea = mergedExclusionArea - clippedExclusionArea;

    const usableArea = Math.max(0, totalArea - clippedExclusionArea);
    const usablePercent = totalArea > 0 ? ((usableArea / totalArea) * 100).toFixed(1) : 0;

    console.log('[calculateUsableArea] Calculation breakdown:', {
      step1_totalBoundaryArea: totalArea,
      step2_rawExclusionArea: rawExclusionArea,
      step3_mergedExclusionArea: mergedExclusionArea,
      step4_exclusionOverlapRemoved: overlapArea,
      step5_clippedToSiteBoundary: clippedExclusionArea,
      step6_exclusionOutsideBoundary: outsideBoundaryArea,
      step7_finalUsableArea: usableArea,
      usablePercent: `${usablePercent}%`,
    });

    return usableArea;
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

  // Scorecard actions
  initializeScorecard: (siteId: string) => void;
  updateCategoryScore: (
    siteId: string,
    category: ScorecardCategory,
    rating: ScorecardRating,
    notes?: string
  ) => void;

  // Comment actions
  addSiteComment: (siteId: string, content: string) => string | undefined;
  updateSiteComment: (siteId: string, commentId: string, content: string) => void;
  deleteSiteComment: (siteId: string, commentId: string) => void;
  getSiteComments: (siteId: string) => SiteComment[];

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

      initializeScorecard: (siteId) => {
        const site = get().getSiteById(siteId);
        if (!site) {
          toast.error('Site not found');
          return;
        }

        if (site.scorecard) {
          // Scorecard already exists, no need to initialize
          return;
        }

        // Calculate usable area percentage
        const usableAreaPercent =
          site.totalArea && site.totalArea > 0
            ? Math.round((site.usableArea || site.totalArea) / site.totalArea * 100)
            : 100;

        const scorecard = createEmptyScorecard(usableAreaPercent);
        get().updateSite(siteId, { scorecard });
      },

      updateCategoryScore: (siteId, category, rating, notes) => {
        const site = get().getSiteById(siteId);
        if (!site) {
          toast.error('Site not found');
          return;
        }

        // Initialize scorecard if it doesn't exist
        if (!site.scorecard) {
          get().initializeScorecard(siteId);
        }

        // Re-fetch site after potential initialization
        const updatedSite = get().getSiteById(siteId);
        if (!updatedSite?.scorecard) {
          toast.error('Failed to initialize scorecard');
          return;
        }

        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;
        const now = new Date().toISOString();

        // Build updated scorecard
        const updatedScorecard: SiteScorecard = {
          ...updatedSite.scorecard,
          categories: {
            ...updatedSite.scorecard.categories,
            [category]: {
              rating,
              notes: notes || updatedSite.scorecard.categories[category].notes,
              updatedAt: now,
              updatedBy: currentUser?.id,
            },
          },
          updatedAt: now,
        };

        // Recalculate composite score
        updatedScorecard.compositeScore = calculateCompositeScore(updatedScorecard);

        get().updateSite(siteId, { scorecard: updatedScorecard });
      },

      addSiteComment: (siteId, content) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to add comments');
          return;
        }

        const site = get().sites.find((s) => s.id === siteId);
        if (!site) {
          toast.error('Site not found');
          return;
        }

        const now = new Date().toISOString();
        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;

        // Parse @mentions from content
        const mentionRegex = /@([a-zA-Z]+\.[a-zA-Z]+)/g;
        const mentions: string[] = [];
        let match;
        while ((match = mentionRegex.exec(content)) !== null) {
          // Convert mention format to user ID lookup
          const mentionName = match[1].toLowerCase();
          const users = userState.users;
          const mentionedUser = users.find(
            (u) => `${u.firstName.toLowerCase()}.${u.lastName.toLowerCase()}` === mentionName
          );
          if (mentionedUser && !mentions.includes(mentionedUser.id)) {
            mentions.push(mentionedUser.id);
          }
        }

        const newComment: SiteComment = {
          id: crypto.randomUUID(),
          siteId,
          content,
          createdBy: userFullName,
          creatorId: currentUser.id,
          createdAt: now,
          updatedAt: now,
          mentions: mentions.length > 0 ? mentions : undefined,
        };

        set((state) => ({
          sites: state.sites.map((s) =>
            s.id === siteId
              ? {
                  ...s,
                  comments: [...(s.comments || []), newComment],
                  updatedAt: now,
                }
              : s
          ),
        }));

        // TODO: Trigger notifications for mentioned users
        // This would integrate with notificationService.notifyMention()

        return newComment.id;
      },

      updateSiteComment: (siteId, commentId, content) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to update comments');
          return;
        }

        const site = get().sites.find((s) => s.id === siteId);
        if (!site) {
          toast.error('Site not found');
          return;
        }

        const comment = site.comments?.find((c) => c.id === commentId);
        if (!comment) {
          toast.error('Comment not found');
          return;
        }

        // Only comment creator or admin can edit
        const isAdmin = currentUser.roleId === 'role-admin';
        if (comment.creatorId !== currentUser.id && !isAdmin) {
          toast.error('You can only edit your own comments');
          return;
        }

        const now = new Date().toISOString();

        // Re-parse @mentions from updated content
        const mentionRegex = /@([a-zA-Z]+\.[a-zA-Z]+)/g;
        const mentions: string[] = [];
        let match;
        while ((match = mentionRegex.exec(content)) !== null) {
          const mentionName = match[1].toLowerCase();
          const users = userState.users;
          const mentionedUser = users.find(
            (u) => `${u.firstName.toLowerCase()}.${u.lastName.toLowerCase()}` === mentionName
          );
          if (mentionedUser && !mentions.includes(mentionedUser.id)) {
            mentions.push(mentionedUser.id);
          }
        }

        set((state) => ({
          sites: state.sites.map((s) =>
            s.id === siteId
              ? {
                  ...s,
                  comments: s.comments?.map((c) =>
                    c.id === commentId
                      ? {
                          ...c,
                          content,
                          updatedAt: now,
                          mentions: mentions.length > 0 ? mentions : undefined,
                        }
                      : c
                  ),
                  updatedAt: now,
                }
              : s
          ),
        }));

        toast.success('Comment updated');
      },

      deleteSiteComment: (siteId, commentId) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to delete comments');
          return;
        }

        const site = get().sites.find((s) => s.id === siteId);
        if (!site) {
          toast.error('Site not found');
          return;
        }

        const comment = site.comments?.find((c) => c.id === commentId);
        if (!comment) {
          toast.error('Comment not found');
          return;
        }

        // Only comment creator or admin can delete
        const isAdmin = currentUser.roleId === 'role-admin';
        if (comment.creatorId !== currentUser.id && !isAdmin) {
          toast.error('You can only delete your own comments');
          return;
        }

        set((state) => ({
          sites: state.sites.map((s) =>
            s.id === siteId
              ? {
                  ...s,
                  comments: s.comments?.filter((c) => c.id !== commentId),
                  updatedAt: new Date().toISOString(),
                }
              : s
          ),
        }));

        toast.success('Comment deleted');
      },

      getSiteComments: (siteId) => {
        const site = get().sites.find((s) => s.id === siteId);
        return site?.comments || [];
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
