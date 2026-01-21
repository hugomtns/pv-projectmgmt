/**
 * GeneratedLayoutViewer - Renders a generated layout in the design viewer
 * Shows 2D map with panel rows and layout statistics
 */

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSiteStore } from '@/stores/siteStore';
import { squareMetersToAcres } from '@/lib/kml/parser';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Grid3X3, Zap, Ruler, Percent, Layers } from 'lucide-react';
import type { GeneratedLayout } from '@/lib/types/layout';

interface GeneratedLayoutViewerProps {
  layout: GeneratedLayout;
}

// Colors for map elements
const COLORS = {
  boundary: '#3b82f6',
  exclusion: '#ef4444',
  panelRow: '#22c55e',
};

export function GeneratedLayoutViewer({ layout }: GeneratedLayoutViewerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Get the source site
  const site = useSiteStore((state) =>
    state.sites.find((s) => s.id === layout.siteId)
  );

  // Initialize and update map
  useEffect(() => {
    if (!mapRef.current || !site) return;

    // Clean up existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Calculate center
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
      zoomControl: true,
    });

    // Add satellite imagery
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    ).addTo(map);

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
        });
        polygon.addTo(map);
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
        L.polygon(coords, {
          color: COLORS.exclusion,
          weight: 1,
          fillOpacity: 0.3,
        }).addTo(map);
      }
    });

    // Add panel rows
    layout.rows.forEach((row) => {
      L.polyline(
        [
          [row.startCoord.lat, row.startCoord.lng],
          [row.endCoord.lat, row.endCoord.lng],
        ],
        {
          color: COLORS.panelRow,
          weight: 4,
          opacity: 0.9,
        }
      ).addTo(map);
    });

    // Fit bounds
    if (allBounds.length > 0) {
      const combinedBounds = allBounds.reduce((acc, bounds) => acc.extend(bounds));
      map.fitBounds(combinedBounds, { padding: [30, 30] });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [site, layout]);

  const usableAcres = squareMetersToAcres(layout.summary.coveredAreaSqm);

  return (
    <div className="h-full flex flex-col">
      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000]">
          <div className="text-xs font-medium mb-2">Legend</div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5" style={{ backgroundColor: COLORS.boundary }} />
              <span>Site Boundary</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: COLORS.exclusion, opacity: 0.5 }} />
              <span>Exclusion Zones</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1" style={{ backgroundColor: COLORS.panelRow }} />
              <span>Panel Rows ({layout.rows.length})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="border-t bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="secondary" className="gap-1">
            <Zap className="h-3 w-3" />
            Generated Layout
          </Badge>
          {site && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              from {site.name}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard
            icon={<Grid3X3 className="h-4 w-4" />}
            label="Panels"
            value={layout.summary.totalPanels.toLocaleString()}
          />
          <StatCard
            icon={<Zap className="h-4 w-4" />}
            label="DC Capacity"
            value={`${layout.summary.dcCapacityMw.toFixed(2)} MW`}
            highlight
          />
          <StatCard
            icon={<Layers className="h-4 w-4" />}
            label="Rows"
            value={layout.summary.totalRows.toLocaleString()}
          />
          <StatCard
            icon={<Percent className="h-4 w-4" />}
            label="GCR"
            value={layout.summary.actualGcr.toFixed(2)}
          />
          <StatCard
            icon={<Ruler className="h-4 w-4" />}
            label="Coverage"
            value={`${usableAcres.toFixed(1)} ac`}
          />
          <StatCard
            icon={<Zap className="h-4 w-4" />}
            label="Density"
            value={`${usableAcres > 0 ? (layout.summary.dcCapacityKw / usableAcres).toFixed(0) : 0} kW/ac`}
          />
        </div>

        {/* Module info */}
        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Module:</span>{' '}
          {layout.module.name} ({layout.module.wattage}W, {layout.module.lengthMm}×{layout.module.widthMm}mm)
          <span className="mx-2">•</span>
          <span className="font-medium text-foreground">Tilt:</span> {layout.parameters.tiltAngle}°
          <span className="mx-2">•</span>
          <span className="font-medium text-foreground">Azimuth:</span> {layout.parameters.azimuth}°
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}

function StatCard({ icon, label, value, highlight }: StatCardProps) {
  return (
    <Card className={highlight ? 'border-primary/50 bg-primary/5' : ''}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <div className={`text-lg font-semibold ${highlight ? 'text-primary' : ''}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
