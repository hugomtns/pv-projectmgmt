import { useState, useEffect, useRef, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { MapContainer, TileLayer, Marker, Rectangle, useMap, useMapEvents } from 'react-leaflet';
import { LatLng } from 'leaflet';
import { Search, Loader2, MapPin, Satellite, Map } from 'lucide-react';
import type { GPSCoordinates } from '@/lib/types';
import {
  DEFAULT_LEAFLET_ICON,
  DEFAULT_GROUND_SIZE,
  DEFAULT_MAP_CENTER,
  calculateBounds,
  type NominatimResult,
} from '@/lib/geo-utils';
import 'leaflet/dist/leaflet.css';

interface LocationMapSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCoordinates?: GPSCoordinates;
  initialGroundSize?: number;
  onConfirm: (coordinates: GPSCoordinates, groundSizeMeters: number) => void;
}

// Component to handle map center updates
function MapCenterUpdater({ center }: { center: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// Component to handle marker drag
function DraggableMarker({
  position,
  onPositionChange
}: {
  position: LatLng;
  onPositionChange: (pos: LatLng) => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          onPositionChange(marker.getLatLng());
        }
      },
    }),
    [onPositionChange]
  );

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={DEFAULT_LEAFLET_ICON}
    />
  );
}

// Component to handle map clicks for pin placement
function MapClickHandler({ onMapClick }: { onMapClick: (latlng: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export function LocationMapSheet({
  open,
  onOpenChange,
  initialCoordinates,
  initialGroundSize = DEFAULT_GROUND_SIZE,
  onConfirm,
}: LocationMapSheetProps) {
  // Default to a generic location if no initial coordinates
  const defaultCenter = new LatLng(
    initialCoordinates?.latitude ?? DEFAULT_MAP_CENTER.latitude,
    initialCoordinates?.longitude ?? DEFAULT_MAP_CENTER.longitude
  );

  const [markerPosition, setMarkerPosition] = useState<LatLng>(defaultCenter);
  const [groundSize, setGroundSize] = useState(initialGroundSize);
  const [useSatellite, setUseSatellite] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when sheet opens with new initial values
  useEffect(() => {
    if (open) {
      setMarkerPosition(new LatLng(
        initialCoordinates?.latitude ?? DEFAULT_MAP_CENTER.latitude,
        initialCoordinates?.longitude ?? DEFAULT_MAP_CENTER.longitude
      ));
      setGroundSize(initialGroundSize);
    }
  }, [open, initialCoordinates, initialGroundSize]);

  // Debounced address search
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (searchQuery.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data: NominatimResult[] = await response.json();
        setSearchResults(data);
        setShowResults(true);
      } catch (error) {
        console.error('Geocoding error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery]);

  const handleSearchResultClick = (result: NominatimResult) => {
    const newPosition = new LatLng(parseFloat(result.lat), parseFloat(result.lon));
    setMarkerPosition(newPosition);
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
  };

  const handleConfirm = () => {
    onConfirm(
      { latitude: markerPosition.lat, longitude: markerPosition.lng },
      groundSize
    );
    onOpenChange(false);
  };

  const rectangleBounds = calculateBounds(markerPosition, groundSize);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[75vh] flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Select Project Location
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 flex flex-col gap-4 py-4 min-h-0">
          {/* Search bar */}
          <div className="relative shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for an address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {showResults && searchResults.length > 0 && (
              <div className="absolute z-[1000] w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-accent text-sm border-b last:border-b-0"
                    onClick={() => handleSearchResultClick(result)}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span className="line-clamp-2">{result.display_name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Ground size slider */}
            <div className="flex-1 flex items-center gap-3">
              <Label className="shrink-0 text-sm">Ground Size:</Label>
              <Slider
                value={[groundSize]}
                onValueChange={(values: number[]) => setGroundSize(values[0])}
                min={50}
                max={500}
                step={10}
                className="flex-1"
              />
              <span className="text-sm font-medium w-16 text-right">{groundSize}m</span>
            </div>

            {/* Map type toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUseSatellite(!useSatellite)}
              className="shrink-0"
            >
              {useSatellite ? (
                <>
                  <Map className="h-4 w-4 mr-2" />
                  Street
                </>
              ) : (
                <>
                  <Satellite className="h-4 w-4 mr-2" />
                  Satellite
                </>
              )}
            </Button>
          </div>

          {/* Map container */}
          <div className="flex-1 rounded-lg overflow-hidden border min-h-0">
            <MapContainer
              center={markerPosition}
              zoom={17}
              className="h-full w-full"
              scrollWheelZoom={true}
            >
              {useSatellite ? (
                <TileLayer
                  attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
              ) : (
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              )}

              <MapCenterUpdater center={markerPosition} />
              <MapClickHandler onMapClick={setMarkerPosition} />
              <DraggableMarker
                position={markerPosition}
                onPositionChange={setMarkerPosition}
              />

              {/* Rectangle showing ground plane area */}
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

          {/* Coordinates display */}
          <div className="text-sm text-muted-foreground shrink-0">
            Selected: {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
          </div>
        </div>

        <SheetFooter className="shrink-0 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm Location
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
