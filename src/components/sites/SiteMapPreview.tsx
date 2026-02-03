import { lazy, Suspense, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import type { Site, ExclusionZoneType } from '@/lib/types';
import { squareMetersToAcres } from '@/lib/kml/parser';
import { EXCLUSION_ZONE_LABELS } from '@/lib/types/site';
import { getTrafficLightColor } from '@/lib/types/siteScorecard';
import {
  SCORECARD_TRAFFIC_LIGHT_COLORS,
  SCORECARD_TRAFFIC_LIGHT_LABELS,
} from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Mountain, Map, Box, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const SiteTerrainView = lazy(() =>
  import('./SiteTerrainView').then((m) => ({ default: m.SiteTerrainView }))
);

interface SiteMapPreviewProps {
  site: Site;
}

// Colors for different exclusion zone types
const EXCLUSION_COLORS: Record<ExclusionZoneType, string> = {
  wetland: '#3b82f6', // blue
  setback: '#f59e0b', // amber
  easement: '#8b5cf6', // purple
  slope: '#ef4444', // red
  flood_zone: '#06b6d4', // cyan
  tree_cover: '#22c55e', // green
  structure: '#ec4899', // pink
  water_body: '#0ea5e9', // sky blue
  other: '#6b7280', // gray
};

// Type for layer visibility state
type LayerVisibility = {
  boundaries: boolean;
} & Record<ExclusionZoneType, boolean>;

// Create initial visibility state with all layers visible
const createInitialVisibility = (): LayerVisibility => ({
  boundaries: true,
  wetland: true,
  setback: true,
  easement: true,
  slope: true,
  flood_zone: true,
  tree_cover: true,
  structure: true,
  water_body: true,
  other: true,
});

export function SiteMapPreview({ site }: SiteMapPreviewProps) {
  const hasElevation = site.elevationRange != null;
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [visibility, setVisibility] = useState<LayerVisibility>(createInitialVisibility);

  const exclusionTypesInSite = useMemo(() => {
    const types = new Set(site.exclusionZones.map(ez => ez.type));
    return Array.from(types) as ExclusionZoneType[];
  }, [site.exclusionZones]);

  const toggleLayer = (layer: keyof LayerVisibility) => {
    setVisibility(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  const showAllLayers = () => {
    setVisibility(createInitialVisibility());
  };

  const hideAllExclusions = () => {
    setVisibility({
      boundaries: true,
      wetland: false,
      setback: false,
      easement: false,
      slope: false,
      flood_zone: false,
      tree_cover: false,
      structure: false,
      water_body: false,
      other: false,
    });
  };

  const hasHiddenExclusions = exclusionTypesInSite.some(type => !visibility[type]);

  const bounds = useMemo(() => {
    const allCoords: Array<[number, number]> = [];

    site.boundaries.forEach((b) => {
      b.coordinates.forEach((c) => {
        allCoords.push([c.lat, c.lng]);
      });
    });

    site.exclusionZones.forEach((ez) => {
      ez.coordinates.forEach((c) => {
        allCoords.push([c.lat, c.lng]);
      });
    });

    if (allCoords.length === 0) {
      if (site.centroid) {
        return new LatLngBounds(
          [site.centroid.latitude - 0.01, site.centroid.longitude - 0.01],
          [site.centroid.latitude + 0.01, site.centroid.longitude + 0.01]
        );
      }
      return new LatLngBounds([37.77, -122.42], [37.78, -122.41]);
    }

    return new LatLngBounds(allCoords);
  }, [site]);

  const boundaryPolygons = useMemo(() => {
    return site.boundaries.map((b) => ({
      id: b.id,
      name: b.name,
      positions: b.coordinates.map((c) => [c.lat, c.lng] as [number, number]),
      area: b.area,
    }));
  }, [site.boundaries]);

  const exclusionPolygons = useMemo(() => {
    return site.exclusionZones.map((ez) => ({
      id: ez.id,
      name: ez.name,
      type: ez.type,
      positions: ez.coordinates.map((c) => [c.lat, c.lng] as [number, number]),
      area: ez.area,
      description: ez.description,
    }));
  }, [site.exclusionZones]);

  const is3D = viewMode === '3d' && hasElevation;

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border relative">
      {/* Canvas area — either Leaflet 2D or Three.js 3D */}
      {is3D ? (
        <Suspense
          fallback={
            <div className="h-full w-full flex items-center justify-center bg-slate-900 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading 3D view...
            </div>
          }
        >
          <SiteTerrainView site={site} visibility={visibility} />
        </Suspense>
      ) : (
        <MapContainer bounds={bounds} className="h-full w-full" scrollWheelZoom={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />

          {/* Render site boundaries */}
          {visibility.boundaries && boundaryPolygons.map((poly) => (
            <Polygon
              key={poly.id}
              positions={poly.positions}
              pathOptions={{
                color: '#22c55e',
                weight: 3,
                fillOpacity: 0,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-medium">{poly.name}</div>
                  <div className="text-muted-foreground">Site Boundary</div>
                  {poly.area && (
                    <div className="mt-1">
                      {squareMetersToAcres(poly.area).toFixed(2)} acres
                    </div>
                  )}
                  {site.elevationRange && (
                    <div className="mt-1 text-muted-foreground">
                      Elevation: {site.elevationRange.min.toFixed(0)}&ndash;{site.elevationRange.max.toFixed(0)}m
                      (avg {site.elevationRange.avg.toFixed(1)}m)
                    </div>
                  )}
                </div>
              </Popup>
            </Polygon>
          ))}

          {/* Render exclusion zones (filtered by visibility) */}
          {exclusionPolygons
            .filter((poly) => visibility[poly.type])
            .map((poly) => (
            <Polygon
              key={poly.id}
              positions={poly.positions}
              pathOptions={{
                color: EXCLUSION_COLORS[poly.type] || EXCLUSION_COLORS.other,
                weight: 2,
                fillColor: EXCLUSION_COLORS[poly.type] || EXCLUSION_COLORS.other,
                fillOpacity: 0.15,
                dashArray: '5, 5',
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-medium">{poly.name}</div>
                  <div className="text-muted-foreground">
                    {EXCLUSION_ZONE_LABELS[poly.type]} (Exclusion Zone)
                  </div>
                  {poly.area && (
                    <div className="mt-1">
                      {squareMetersToAcres(poly.area).toFixed(2)} acres
                    </div>
                  )}
                  {poly.description && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {poly.description}
                    </div>
                  )}
                </div>
              </Popup>
            </Polygon>
          ))}
        </MapContainer>
      )}

      {/* === Shared overlays — always rendered regardless of view mode === */}

      {/* View mode toggle (only when elevation data available) */}
      {hasElevation && (
        <div className="absolute top-[80px] left-[10px] z-[1000]">
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5 shadow-lg"
            onClick={() => setViewMode(is3D ? '2d' : '3d')}
          >
            {is3D ? (
              <><Map className="h-3.5 w-3.5" /> 2D Map</>
            ) : (
              <><Box className="h-3.5 w-3.5" /> 3D Terrain</>
            )}
          </Button>
        </div>
      )}

      {/* Layers panel */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur rounded-lg p-3 text-xs z-[1000] shadow-lg border max-w-[200px]">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Layers</div>
          {exclusionTypesInSite.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-xs"
              onClick={hasHiddenExclusions ? showAllLayers : hideAllExclusions}
              title={hasHiddenExclusions ? 'Show all layers' : 'Hide exclusions'}
            >
              {hasHiddenExclusions ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>

        <label className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1">
          <Checkbox
            checked={visibility.boundaries}
            onCheckedChange={() => toggleLayer('boundaries')}
            className="h-3.5 w-3.5"
          />
          <div className="w-4 h-3 rounded bg-green-500/40 border-2 border-green-500 shrink-0" />
          <span className={!visibility.boundaries ? 'text-muted-foreground line-through' : ''}>
            Site Boundary
          </span>
        </label>

        {exclusionTypesInSite.length > 0 && (
          <>
            <div className="border-t my-1.5" />
            <div className="text-muted-foreground mb-1">Exclusion Zones:</div>
            {exclusionTypesInSite.map((type) => (
              <label key={type} className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1">
                <Checkbox
                  checked={visibility[type]}
                  onCheckedChange={() => toggleLayer(type)}
                  className="h-3.5 w-3.5"
                />
                <div
                  className="w-4 h-3 rounded border shrink-0"
                  style={{
                    backgroundColor: EXCLUSION_COLORS[type] + '66',
                    borderColor: EXCLUSION_COLORS[type],
                    borderStyle: 'dashed',
                  }}
                />
                <span className={!visibility[type] ? 'text-muted-foreground line-through' : ''}>
                  {EXCLUSION_ZONE_LABELS[type]}
                </span>
              </label>
            ))}
          </>
        )}
      </div>

      {/* Site info overlay */}
      <div className="absolute top-4 right-4 bg-background/90 backdrop-blur rounded-lg p-3 text-xs z-[1000] shadow-lg border">
        <div className="font-medium">{site.name}</div>
        {site.totalArea != null && site.totalArea > 0 && (
          <div className="text-muted-foreground mt-1">
            Total: {squareMetersToAcres(site.totalArea).toFixed(1)} acres
          </div>
        )}
        {site.usableArea != null && (
          <div className={
            site.usableArea === 0
              ? 'text-red-500'
              : site.usableArea !== site.totalArea
                ? 'text-green-600'
                : 'text-muted-foreground'
          }>
            Usable: {squareMetersToAcres(site.usableArea).toFixed(1)} acres
            {site.usableArea === 0 && ' (highly constrained)'}
          </div>
        )}
        {/* Scorecard score */}
        {site.scorecard?.compositeScore != null && (() => {
          const trafficLight = getTrafficLightColor(site.scorecard.compositeScore);
          const color = trafficLight ? SCORECARD_TRAFFIC_LIGHT_COLORS[trafficLight] : undefined;
          const label = trafficLight ? SCORECARD_TRAFFIC_LIGHT_LABELS[trafficLight] : '';
          return (
            <div className="mt-1 flex items-center gap-1.5" style={{ color }}>
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              Score: {site.scorecard.compositeScore}/100 ({label})
            </div>
          );
        })()}
        {site.elevationRange && (
          <div className="text-muted-foreground mt-1 flex items-center gap-1">
            <Mountain className="h-3 w-3" />
            {site.elevationRange.min.toFixed(0)}&ndash;{site.elevationRange.max.toFixed(0)}m
          </div>
        )}
        {site.centroid && (
          <div className="text-muted-foreground mt-1">
            {site.centroid.latitude.toFixed(5)}, {site.centroid.longitude.toFixed(5)}
          </div>
        )}
      </div>
    </div>
  );
}
