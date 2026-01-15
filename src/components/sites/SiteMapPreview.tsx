import { useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import type { Site, ExclusionZoneType } from '@/lib/types';
import { squareMetersToAcres } from '@/lib/kml/parser';
import { EXCLUSION_ZONE_LABELS } from '@/lib/types/site';
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
  other: '#6b7280', // gray
};

export function SiteMapPreview({ site }: SiteMapPreviewProps) {
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
        {boundaryPolygons.map((poly) => (
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

        {/* Render exclusion zones */}
        {exclusionPolygons.map((poly) => (
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

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur rounded-lg p-3 text-xs space-y-1.5 z-[1000] shadow-lg border">
        <div className="font-medium mb-2">Legend</div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 rounded bg-green-500/40 border-2 border-green-500" />
          <span>Site Boundary</span>
        </div>
        {exclusionPolygons.length > 0 && (
          <>
            <div className="border-t my-1.5" />
            <div className="text-muted-foreground mb-1">Exclusion Zones:</div>
            {/* Only show legend items for exclusion types that exist */}
            {Array.from(new Set(exclusionPolygons.map((p) => p.type))).map((type) => (
              <div key={type} className="flex items-center gap-2">
                <div
                  className="w-4 h-3 rounded border"
                  style={{
                    backgroundColor: EXCLUSION_COLORS[type] + '66',
                    borderColor: EXCLUSION_COLORS[type],
                    borderStyle: 'dashed',
                  }}
                />
                <span>{EXCLUSION_ZONE_LABELS[type]}</span>
              </div>
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
        {site.centroid && (
          <div className="text-muted-foreground mt-1">
            {site.centroid.latitude.toFixed(5)}, {site.centroid.longitude.toFixed(5)}
          </div>
        )}
      </div>
    </div>
  );
}
