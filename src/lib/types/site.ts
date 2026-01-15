/**
 * Site Management Types
 *
 * Sites represent geographic/land data for solar projects,
 * containing boundaries and exclusion zones parsed from KML/KMZ files.
 */

export interface SiteBoundary {
  id: string;
  name: string;
  coordinates: Array<{ lat: number; lng: number }>;
  area?: number; // Area in square meters
}

export type ExclusionZoneType =
  | 'wetland'
  | 'setback'
  | 'easement'
  | 'slope'
  | 'flood_zone'
  | 'other';

export interface SiteExclusionZone {
  id: string;
  name: string;
  type: ExclusionZoneType;
  coordinates: Array<{ lat: number; lng: number }>;
  area?: number; // Area in square meters
  description?: string;
}

export interface Site {
  id: string;
  projectId: string;
  name: string;
  description: string;
  createdBy: string; // User's full name
  creatorId: string; // User ID for permission checks
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp

  // KML source file info
  kmlFileName?: string;
  kmlFileSize?: number;

  // Parsed KML data
  boundaries: SiteBoundary[];
  exclusionZones: SiteExclusionZone[];

  // Computed site metrics
  centroid?: { latitude: number; longitude: number };
  totalArea?: number; // Total boundary area in square meters
  usableArea?: number; // Total minus exclusions

  // Optional link to design
  linkedDesignId?: string;
}

export interface KMLParseResult {
  boundaries: SiteBoundary[];
  exclusionZones: SiteExclusionZone[];
  centroid?: { latitude: number; longitude: number };
  totalArea?: number;
}

export const EXCLUSION_ZONE_LABELS: Record<ExclusionZoneType, string> = {
  wetland: 'Wetland',
  setback: 'Setback',
  easement: 'Easement',
  slope: 'Steep Slope',
  flood_zone: 'Flood Zone',
  other: 'Other',
};
