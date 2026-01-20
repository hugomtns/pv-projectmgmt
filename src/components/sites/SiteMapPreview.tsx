import { useMemo, useState } from 'react';
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
import { Eye, EyeOff } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

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
  // Layer visibility state
  const [visibility, setVisibility] = useState<LayerVisibility>(createInitialVisibility);

  // Get unique exclusion types present in this site
  const exclusionTypesInSite = useMemo(() => {
    const types = new Set(site.exclusionZones.map(ez => ez.type));
    return Array.from(types) as ExclusionZoneType[];
  }, [site.exclusionZones]);

  // Toggle a single layer's visibility
  const toggleLayer = (layer: keyof LayerVisibility) => {
    setVisibility(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  // Show all layers
  const showAllLayers = () => {
    setVisibility(createInitialVisibility());
  };

  // Hide all exclusion layers (keep boundaries visible)
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

  // Check if any exclusion layers are hidden
  const hasHiddenExclusions = exclusionTypesInSite.some(type => !visibility[type]);

  // Calculate map bounds from all coordinates
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
      // Default to centroid or fallback
      if (site.centroid) {
        return new LatLngBounds(
          [site.centroid.latitude - 0.01, site.centroid.longitude - 0.01],
          [site.centroid.latitude + 0.01, site.centroid.longitude + 0.01]
        );
      }
      // Fallback to a default location
      return new LatLngBounds([37.77, -122.42], [37.78, -122.41]);
    }

    return new LatLngBounds(allCoords);
  }, [site]);

  // Convert coordinates to Leaflet format
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

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border relative">
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

      {/* Legend with visibility toggles */}
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

        {/* Boundary layer toggle */}
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
            {/* Only show legend items for exclusion types that exist */}
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
        {site.centroid && (
          <div className="text-muted-foreground mt-1">
            {site.centroid.latitude.toFixed(5)}, {site.centroid.longitude.toFixed(5)}
          </div>
        )}
      </div>
    </div>
  );
}
