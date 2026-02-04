/**
 * Lightweight WGS 84 → UTM forward projection.
 *
 * Implements the standard Transverse Mercator series expansion using
 * the WGS 84 ellipsoid.  Only the forward direction (geographic → UTM)
 * is provided — that's all we need to map lat/lng coordinates into a
 * GeoTIFF raster's pixel space.
 */

export interface UTMCoord {
  easting: number;
  northing: number;
  zone: number;
  hemisphere: 'N' | 'S';
}

// WGS 84 ellipsoid
const a = 6378137.0; // semi-major axis (m)
const f = 1 / 298.257223563; // flattening
const e2 = 2 * f - f * f; // first eccentricity squared
const e_prime2 = e2 / (1 - e2); // second eccentricity squared
const k0 = 0.9996; // UTM scale factor
const E0 = 500_000; // false easting (m)

/** Determine the standard UTM zone number from a longitude. */
export function utmZoneFromLng(lng: number): number {
  return Math.floor((lng + 180) / 6) + 1;
}

/**
 * Forward projection: WGS 84 (lat, lng in degrees) → UTM (easting, northing in metres).
 *
 * @param lat  Latitude in degrees (positive north)
 * @param lng  Longitude in degrees (positive east)
 * @param zone UTM zone number (1–60)
 */
export function latLngToUTM(lat: number, lng: number, zone: number): UTMCoord {
  const hemisphere: 'N' | 'S' = lat >= 0 ? 'N' : 'S';
  const N0 = hemisphere === 'N' ? 0 : 10_000_000; // false northing

  const latRad = (lat * Math.PI) / 180;
  const centralMeridian = (zone - 1) * 6 - 180 + 3;
  const dlng = ((lng - centralMeridian) * Math.PI) / 180; // difference in radians

  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const tanLat = Math.tan(latRad);

  const N = a / Math.sqrt(1 - e2 * sinLat * sinLat); // radius of curvature in prime vertical
  const T = tanLat * tanLat;
  const C = e_prime2 * cosLat * cosLat;
  const A = dlng * cosLat;

  // Meridional arc length (M) — Helmert series
  const e4 = e2 * e2;
  const e6 = e4 * e2;
  const M =
    a *
    ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * latRad -
      ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * latRad) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * latRad) -
      ((35 * e6) / 3072) * Math.sin(6 * latRad));

  const A2 = A * A;
  const A3 = A2 * A;
  const A4 = A3 * A;
  const A5 = A4 * A;
  const A6 = A5 * A;

  const easting =
    E0 +
    k0 *
      N *
      (A +
        ((1 - T + C) * A3) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * e_prime2) * A5) / 120);

  const northing =
    N0 +
    k0 *
      (M +
        N *
          tanLat *
          (A2 / 2 +
            ((5 - T + 9 * C + 4 * C * C) * A4) / 24 +
            ((61 - 58 * T + T * T + 600 * C - 330 * e_prime2) * A6) / 720));

  return { easting, northing, zone, hemisphere };
}
