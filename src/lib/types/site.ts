/**
 * Site Management Types
 *
 * Sites represent geographic/land data for solar projects,
 * containing boundaries and exclusion zones parsed from KML/KMZ files.
 */

import type { SiteScorecard } from './siteScorecard';
import type { SiteComment } from './siteComment';

/** A single coordinate point with optional elevation (meters above sea level) */
export interface SiteCoordinate {
  lat: number;
  lng: number;
  elevation?: number;
}

export interface SiteBoundary {
  id: string;
  name: string;
  coordinates: SiteCoordinate[];
  area?: number; // Area in square meters
}

export type ExclusionZoneType =
  | 'wetland'
  | 'setback'
  | 'easement'
  | 'slope'
  | 'flood_zone'
  | 'tree_cover'
  | 'structure'
  | 'water_body'
  | 'other';

export interface SiteExclusionZone {
  id: string;
  name: string;
  type: ExclusionZoneType;
  coordinates: SiteCoordinate[];
  area?: number; // Area in square meters
  description?: string;
}

export interface SiteImportMetadata {
  source: 'kml' | 'kmz' | 'pvsdz';
  prospectVersion?: string;    // e.g. "3.4.1" (PVSDZ only)
  prospectProjectId?: string;  // PVcase project ID (PVSDZ only)
  prospectExportDate?: string; // ISO timestamp (PVSDZ only)
}

export interface ElevationRange {
  min: number;
  max: number;
  avg: number;
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

  // Source file info (generic)
  sourceFileName?: string;
  sourceFileSize?: number;
  importMetadata?: SiteImportMetadata;

  // Legacy KML fields (backwards compat)
  kmlFileName?: string;
  kmlFileSize?: number;

  // Parsed site data
  boundaries: SiteBoundary[];
  exclusionZones: SiteExclusionZone[];

  // Computed site metrics
  centroid?: { latitude: number; longitude: number };
  totalArea?: number; // Total boundary area in square meters
  usableArea?: number; // Total minus exclusions
  elevationRange?: ElevationRange;

  // Optional link to design
  linkedDesignId?: string;

  // Site selection scorecard
  scorecard?: SiteScorecard;

  // Comments
  comments?: SiteComment[];
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
  tree_cover: 'Tree Cover',
  structure: 'Structure',
  water_body: 'Water Body',
  other: 'Other',
};
