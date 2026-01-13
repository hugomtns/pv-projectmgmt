import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search, X, Loader2 } from 'lucide-react';
import type { GPSCoordinates } from '@/lib/types';

interface LocationPickerProps {
  value?: GPSCoordinates;
  onChange: (coordinates: GPSCoordinates | undefined) => void;
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
 */
export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="space-y-2" ref={containerRef}>
      {value && selectedAddress ? (
        <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
          <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedAddress.split(',')[0]}</p>
            <p className="text-xs text-muted-foreground truncate">
              {selectedAddress.split(',').slice(1).join(',')}
            </p>
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
      ) : (
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
      )}
    </div>
  );
}
