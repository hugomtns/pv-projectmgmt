import { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search, X, Loader2, Map, FileText } from 'lucide-react';
import { LocationMapSheet } from './LocationMapSheet';
import { MapContainer, TileLayer, Marker, Rectangle } from 'react-leaflet';
import { LatLng, LatLngBounds, Icon } from 'leaflet';
import type { GPSCoordinates } from '@/lib/types';

// Fix for default marker icon in react-leaflet
const defaultIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Calculate rectangle bounds from center and size in meters
function calculateBounds(center: LatLng, sizeMeters: number): LatLngBounds {
  const metersPerDegreeLat = 111139;
  const metersPerDegreeLon = 111139 * Math.cos(center.lat * Math.PI / 180);
  const halfSizeLat = (sizeMeters / 2) / metersPerDegreeLat;
  const halfSizeLon = (sizeMeters / 2) / metersPerDegreeLon;
  return new LatLngBounds(
    [center.lat - halfSizeLat, center.lng - halfSizeLon],
    [center.lat + halfSizeLat, center.lng + halfSizeLon]
  );
}

interface LocationPickerProps {
  value?: GPSCoordinates;
  onChange: (coordinates: GPSCoordinates | undefined) => void;
  groundSize?: number;
  onGroundSizeChange?: (size: number) => void;
  /** If true, coordinates were extracted from DXF file */
  extractedFromFile?: boolean;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

/**
 * LocationPicker - Address search with geocoding using OpenStreetMap Nominatim
 * Users can search for an address and select from results to get GPS coordinates
 * Includes "Select on Map" button for precise location with interactive map
 * Shows inline map preview when coordinates are set (e.g., extracted from DXF)
 */
export function LocationPicker({ value, onChange, groundSize = 400, onGroundSizeChange, extractedFromFile }: LocationPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [mapSheetOpen, setMapSheetOpen] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoized map position and bounds
  const mapPosition = useMemo(() => {
    if (!value) return null;
    return new LatLng(value.latitude, value.longitude);
  }, [value]);

  const rectangleBounds = useMemo(() => {
    if (!mapPosition) return null;
    return calculateBounds(mapPosition, groundSize);
  }, [mapPosition, groundSize]);

  // Close results dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (query.length < 3) {
      setResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Using OpenStreetMap Nominatim API (free, no API key required)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
          {
            headers: {
              'Accept-Language': 'en',
            },
          }
        );
        const data: NominatimResult[] = await response.json();
        setResults(data);
        setShowResults(true);
      } catch (error) {
        console.error('Geocoding error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [query]);

  const handleSelectResult = (result: NominatimResult) => {
    const coordinates: GPSCoordinates = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    };
    onChange(coordinates);
    setSelectedAddress(result.display_name);
    setQuery('');
    setShowResults(false);
    setResults([]);
  };

  const handleClear = () => {
    onChange(undefined);
    setSelectedAddress('');
    setQuery('');
    setResults([]);
  };

  const handleMapConfirm = (coordinates: GPSCoordinates, newGroundSize: number) => {
    onChange(coordinates);
    setSelectedAddress(`${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`);
    onGroundSizeChange?.(newGroundSize);
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      {/* When coordinates exist (either from search or DXF extraction) */}
      {value ? (
        <div className="space-y-2">
          {/* Location info header */}
          <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
            {extractedFromFile ? (
              <FileText className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            ) : (
              <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              {selectedAddress ? (
                <>
                  <p className="text-sm font-medium truncate">{selectedAddress.split(',')[0]}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedAddress.split(',').slice(1).join(',')}
                  </p>
                </>
              ) : (
                <p className="text-sm font-medium">
                  {extractedFromFile ? 'Extracted from DXF' : 'Location set'}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Inline map preview */}
          {mapPosition && rectangleBounds && (
            <div
              className="h-32 rounded-md overflow-hidden border cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
              onClick={() => setMapSheetOpen(true)}
            >
              <MapContainer
                center={mapPosition}
                zoom={15}
                className="h-full w-full"
                scrollWheelZoom={false}
                dragging={false}
                zoomControl={false}
                attributionControl={false}
              >
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
                <Marker position={mapPosition} icon={defaultIcon} />
                <Rectangle
                  bounds={rectangleBounds}
                  pathOptions={{
                    color: '#3b82f6',
                    weight: 2,
                    fillColor: '#3b82f6',
                    fillOpacity: 0.15,
                  }}
                />
              </MapContainer>
            </div>
          )}

          {/* Adjust on map button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setMapSheetOpen(true)}
          >
            <Map className="h-4 w-4 mr-2" />
            Adjust Location
          </Button>

          {/* Ground size display */}
          <p className="text-xs text-muted-foreground text-center">
            Ground area: {groundSize}m × {groundSize}m
          </p>
        </div>
      ) : (
        /* No coordinates - show search input */
        <>
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for an address..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => results.length > 0 && setShowResults(true)}
                className="pl-9 pr-9"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {showResults && results.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                {results.map((result) => (
                  <button
                    key={result.place_id}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-accent text-sm border-b last:border-b-0"
                    onClick={() => handleSelectResult(result)}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span className="line-clamp-2">{result.display_name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showResults && query.length >= 3 && results.length === 0 && !isSearching && (
              <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-3 text-sm text-muted-foreground">
                No results found for "{query}"
              </div>
            )}
          </div>

          {/* Select on Map button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setMapSheetOpen(true)}
          >
            <Map className="h-4 w-4 mr-2" />
            Select on Map
          </Button>
        </>
      )}

      {/* Map Sheet for full editing */}
      <LocationMapSheet
        open={mapSheetOpen}
        onOpenChange={setMapSheetOpen}
        initialCoordinates={value}
        initialGroundSize={groundSize}
        onConfirm={handleMapConfirm}
      />
    </div>
  );
}
