/**
 * LayoutPreview - 2D map preview of generated panel layout
 * Shows site boundary, exclusion zones, and panel rows
 */

import { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Site } from '@/lib/types/site';
import type { LayoutParameters, ModuleInput } from '@/lib/types/layout';
import { generatePanelLayout } from '@/lib/layout';

interface LayoutPreviewProps {
  site: Site;
  module: ModuleInput;
  parameters: LayoutParameters;
}

// Colors for different elements
const COLORS = {
  boundary: '#3b82f6', // blue
  exclusion: '#ef4444', // red
  panelRow: '#22c55e', // green
  panelRowFill: 'rgba(34, 197, 94, 0.3)',
};

export function LayoutPreview({ site, module, parameters }: LayoutPreviewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);

  // Generate layout when parameters change
  const layout = useMemo(() => {
    if (!module.wattage || !module.lengthMm || !module.widthMm) {
      return null;
    }
    try {
      return generatePanelLayout(site, module, parameters);
    } catch (error) {
      console.error('Layout generation error:', error);
      return null;
    }
  }, [site, module, parameters]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Calculate center from site centroid or first boundary
    let center: [number, number] = [0, 0];
    if (site.centroid) {
      center = [site.centroid.latitude, site.centroid.longitude];
    } else if (site.boundaries.length > 0 && site.boundaries[0].coordinates.length > 0) {
      const coords = site.boundaries[0].coordinates;
      const avgLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
      const avgLng = coords.reduce((sum, c) => sum + c.lng, 0) / coords.length;
      center = [avgLat, avgLng];
    }

    const map = L.map(mapRef.current, {
      center,
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    // Add satellite imagery
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
      }
    ).addTo(map);

    // Create layer group for dynamic content
    layersRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Cleanup
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layersRef.current = null;
    };
  }, [site.centroid, site.boundaries]);

  // Update layers when site or layout changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;

    // Clear existing layers
    layers.clearLayers();

    // Add site boundaries
    const allBounds: L.LatLngBounds[] = [];

    site.boundaries.forEach((boundary) => {
      const coords: L.LatLngExpression[] = boundary.coordinates.map((c) => [
        c.lat,
        c.lng,
      ]);

      if (coords.length > 0) {
        const polygon = L.polygon(coords, {
          color: COLORS.boundary,
          weight: 2,
          fillOpacity: 0.1,
          fillColor: COLORS.boundary,
        });
        layers.addLayer(polygon);
        allBounds.push(polygon.getBounds());
      }
    });

    // Add exclusion zones
    site.exclusionZones.forEach((zone) => {
      const coords: L.LatLngExpression[] = zone.coordinates.map((c) => [
        c.lat,
        c.lng,
      ]);

      if (coords.length > 0) {
        const polygon = L.polygon(coords, {
          color: COLORS.exclusion,
          weight: 1,
          fillOpacity: 0.3,
          fillColor: COLORS.exclusion,
        });
        layers.addLayer(polygon);
      }
    });

    // Add panel rows from layout
    if (layout && layout.rows.length > 0) {
      layout.rows.forEach((row) => {
        const line = L.polyline(
          [
            [row.startCoord.lat, row.startCoord.lng],
            [row.endCoord.lat, row.endCoord.lng],
          ],
          {
            color: COLORS.panelRow,
            weight: 3,
            opacity: 0.8,
          }
        );
        layers.addLayer(line);
      });
    }

    // Fit bounds if we have any
    if (allBounds.length > 0) {
      const combinedBounds = allBounds.reduce((acc, bounds) => acc.extend(bounds));
      map.fitBounds(combinedBounds, { padding: [20, 20] });
    }
  }, [site, layout]);

  return (
    <div className="relative w-full h-full min-h-[200px] rounded-lg overflow-hidden border">
      <div ref={mapRef} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded-md p-2 text-xs space-y-1 z-[1000]">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: COLORS.boundary }}
          />
          <span>Boundary</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: COLORS.exclusion }}
          />
          <span>Exclusions</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: COLORS.panelRow }}
          />
          <span>Panel Rows ({layout?.rows.length ?? 0})</span>
        </div>
      </div>

      {/* Stats overlay */}
      {layout && (
        <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm rounded-md p-2 text-xs z-[1000]">
          <div className="font-medium text-primary">
            {layout.summary.totalPanels.toLocaleString()} panels
          </div>
          <div className="text-muted-foreground">
            {layout.summary.dcCapacityMw.toFixed(2)} MW DC
          </div>
        </div>
      )}

      {/* No layout message */}
      {!layout && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-[1000]">
          <div className="text-sm text-muted-foreground">
            Enter module specs to preview layout
          </div>
        </div>
      )}
    </div>
  );
}
