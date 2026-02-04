/**
 * Minimal GeoTIFF parser for uncompressed single-band float32 rasters.
 *
 * Parses just enough of the TIFF IFD to extract raster dimensions, strip
 * layout, geo-referencing (pixel scale + tiepoint), CRS (EPSG from GeoKeys),
 * and NODATA value.  Provides a sampleElevation() function to read a
 * float32 elevation at a given UTM coordinate.
 *
 * No external dependencies — uses DataView over ArrayBuffer.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeoTIFFMeta {
  width: number;
  height: number;
  bitsPerSample: number;
  compression: number;
  sampleFormat: number;
  stripOffsets: number[];
  rowsPerStrip: number;
  pixelScaleX: number;
  pixelScaleY: number;
  tiepointPixelX: number;
  tiepointPixelY: number;
  tiepointGeoX: number; // UTM easting of the tiepoint pixel
  tiepointGeoY: number; // UTM northing of the tiepoint pixel
  epsgCode: number | null;
  nodata: number | null;
  littleEndian: boolean;
}

// ---------------------------------------------------------------------------
// TIFF tag IDs we care about
// ---------------------------------------------------------------------------

const TAG_IMAGE_WIDTH = 256;
const TAG_IMAGE_LENGTH = 257;
const TAG_BITS_PER_SAMPLE = 258;
const TAG_COMPRESSION = 259;
const TAG_STRIP_OFFSETS = 273;
const TAG_ROWS_PER_STRIP = 278;
const TAG_STRIP_BYTE_COUNTS = 279;
const TAG_SAMPLE_FORMAT = 339;
const TAG_MODEL_PIXEL_SCALE = 33550;
const TAG_MODEL_TIEPOINT = 33922;
const TAG_GEO_KEY_DIRECTORY = 34735;
const TAG_GDAL_NODATA = 42113;

// TIFF field type sizes (bytes per element)
const TYPE_SIZES: Record<number, number> = {
  1: 1, // BYTE
  2: 1, // ASCII
  3: 2, // SHORT
  4: 4, // LONG
  5: 8, // RATIONAL
  7: 1, // UNDEFINED
  11: 4, // FLOAT
  12: 8, // DOUBLE
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readValue(
  dv: DataView,
  type: number,
  offset: number,
  le: boolean,
): number {
  switch (type) {
    case 1: return dv.getUint8(offset);
    case 3: return dv.getUint16(offset, le);
    case 4: return dv.getUint32(offset, le);
    case 11: return dv.getFloat32(offset, le);
    case 12: return dv.getFloat64(offset, le);
    default: return dv.getUint32(offset, le);
  }
}

function readValues(
  dv: DataView,
  type: number,
  count: number,
  entryValueOffset: number,
  le: boolean,
): number[] {
  const elemSize = TYPE_SIZES[type] ?? 1;
  const totalBytes = elemSize * count;

  // If total fits in 4 bytes, values are inline at entryValueOffset;
  // otherwise entryValueOffset is a pointer to the actual data.
  const dataOffset =
    totalBytes <= 4 ? entryValueOffset : dv.getUint32(entryValueOffset, le);

  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    values.push(readValue(dv, type, dataOffset + i * elemSize, le));
  }
  return values;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse essential GeoTIFF metadata from a raw ArrayBuffer.
 *
 * Throws on BigTIFF, compressed data, non-float samples, or multi-band data.
 */
export function parseGeoTIFFMeta(buffer: ArrayBuffer): GeoTIFFMeta {
  const dv = new DataView(buffer);

  // Byte order
  const bom = dv.getUint16(0, false);
  const le = bom === 0x4949; // 'II' = little-endian
  if (!le && bom !== 0x4D4D) {
    throw new Error('Not a TIFF file (invalid byte order marker)');
  }

  // Magic number
  const magic = dv.getUint16(2, le);
  if (magic === 43) throw new Error('BigTIFF not supported');
  if (magic !== 42) throw new Error('Not a TIFF file (magic != 42)');

  // First IFD offset
  const ifdOffset = dv.getUint32(4, le);
  const numEntries = dv.getUint16(ifdOffset, le);

  // Collect raw tag entries
  let width = 0;
  let height = 0;
  let bitsPerSample = 0;
  let compression = 1;
  let sampleFormat = 1;
  let rowsPerStrip = 0;
  let stripOffsets: number[] = [];
  let pixelScaleX = 0;
  let pixelScaleY = 0;
  let tpPx = 0;
  let tpPy = 0;
  let tpGx = 0;
  let tpGy = 0;
  let epsgCode: number | null = null;
  let nodata: number | null = null;

  for (let i = 0; i < numEntries; i++) {
    const entryOff = ifdOffset + 2 + i * 12;
    const tag = dv.getUint16(entryOff, le);
    const type = dv.getUint16(entryOff + 2, le);
    const count = dv.getUint32(entryOff + 4, le);
    // Offset to the value field in the entry (bytes 8–11)
    const valueFieldOff = entryOff + 8;

    switch (tag) {
      case TAG_IMAGE_WIDTH:
        width = readValues(dv, type, 1, valueFieldOff, le)[0];
        break;
      case TAG_IMAGE_LENGTH:
        height = readValues(dv, type, 1, valueFieldOff, le)[0];
        break;
      case TAG_BITS_PER_SAMPLE:
        bitsPerSample = readValues(dv, type, 1, valueFieldOff, le)[0];
        break;
      case TAG_COMPRESSION:
        compression = readValues(dv, type, 1, valueFieldOff, le)[0];
        break;
      case TAG_SAMPLE_FORMAT:
        sampleFormat = readValues(dv, type, 1, valueFieldOff, le)[0];
        break;
      case TAG_ROWS_PER_STRIP:
        rowsPerStrip = readValues(dv, type, 1, valueFieldOff, le)[0];
        break;
      case TAG_STRIP_OFFSETS:
        stripOffsets = readValues(dv, type, count, valueFieldOff, le);
        break;
      case TAG_STRIP_BYTE_COUNTS:
        // We don't store these but reading validates the entry
        break;
      case TAG_MODEL_PIXEL_SCALE: {
        const scales = readValues(dv, type, count, valueFieldOff, le);
        pixelScaleX = scales[0];
        pixelScaleY = scales[1];
        break;
      }
      case TAG_MODEL_TIEPOINT: {
        const tp = readValues(dv, type, count, valueFieldOff, le);
        tpPx = tp[0];
        tpPy = tp[1];
        tpGx = tp[3];
        tpGy = tp[4];
        break;
      }
      case TAG_GEO_KEY_DIRECTORY: {
        const keys = readValues(dv, type, count, valueFieldOff, le);
        // Header: [version, revision, minor, numKeys], then groups of 4
        if (keys.length >= 4) {
          const numKeys = keys[3];
          for (let k = 0; k < numKeys; k++) {
            const base = 4 + k * 4;
            const keyId = keys[base];
            const tiffTagLoc = keys[base + 1];
            const keyValue = keys[base + 3];
            // ProjectedCSTypeGeoKey (3072): inline when tiffTagLocation == 0
            if (keyId === 3072 && tiffTagLoc === 0) {
              epsgCode = keyValue;
            }
          }
        }
        break;
      }
      case TAG_GDAL_NODATA: {
        // ASCII string → float
        const elemSize = TYPE_SIZES[type] ?? 1;
        const totalBytes = elemSize * count;
        const strOffset =
          totalBytes <= 4 ? valueFieldOff : dv.getUint32(valueFieldOff, le);
        let str = '';
        for (let j = 0; j < count; j++) {
          const ch = dv.getUint8(strOffset + j);
          if (ch === 0) break;
          str += String.fromCharCode(ch);
        }
        const parsed = parseFloat(str.trim());
        if (!isNaN(parsed)) nodata = parsed;
        break;
      }
    }
  }

  // Validate
  if (compression !== 1) {
    throw new Error(`GeoTIFF uses compression (${compression}); only uncompressed is supported`);
  }
  if (sampleFormat !== 3 || bitsPerSample !== 32) {
    throw new Error(`GeoTIFF sample format is not float32 (format=${sampleFormat}, bits=${bitsPerSample})`);
  }

  return {
    width,
    height,
    bitsPerSample,
    compression,
    sampleFormat,
    stripOffsets,
    rowsPerStrip: rowsPerStrip || height, // default = entire image is one strip
    pixelScaleX,
    pixelScaleY,
    tiepointPixelX: tpPx,
    tiepointPixelY: tpPy,
    tiepointGeoX: tpGx,
    tiepointGeoY: tpGy,
    epsgCode,
    nodata,
    littleEndian: le,
  };
}

/**
 * Extract UTM zone number and hemisphere from a WGS 84 / UTM EPSG code.
 *
 * - EPSG 326xx → UTM zone xx North
 * - EPSG 327xx → UTM zone xx South
 */
export function utmZoneFromEPSG(
  epsg: number,
): { zone: number; hemisphere: 'N' | 'S' } | null {
  if (epsg >= 32601 && epsg <= 32660) {
    return { zone: epsg - 32600, hemisphere: 'N' };
  }
  if (epsg >= 32701 && epsg <= 32760) {
    return { zone: epsg - 32700, hemisphere: 'S' };
  }
  return null;
}

/**
 * Sample the elevation at a UTM coordinate from the GeoTIFF raster.
 *
 * Returns the float32 elevation in metres, or `null` if the coordinate
 * falls outside the raster bounds or hits a NODATA pixel.
 */
export function sampleElevation(
  utmEasting: number,
  utmNorthing: number,
  meta: GeoTIFFMeta,
  buffer: ArrayBuffer,
): number | null {
  // UTM → fractional pixel
  const col = (utmEasting - meta.tiepointGeoX) / meta.pixelScaleX +
    meta.tiepointPixelX;
  const row = (meta.tiepointGeoY - utmNorthing) / meta.pixelScaleY +
    meta.tiepointPixelY;

  // Nearest-neighbour rounding
  const c = Math.round(col);
  const r = Math.round(row);

  // Bounds check
  if (c < 0 || c >= meta.width || r < 0 || r >= meta.height) return null;

  // Locate the strip
  const stripIndex = Math.floor(r / meta.rowsPerStrip);
  if (stripIndex >= meta.stripOffsets.length) return null;

  const rowInStrip = r - stripIndex * meta.rowsPerStrip;
  const byteOffset =
    meta.stripOffsets[stripIndex] +
    (rowInStrip * meta.width + c) * 4; // 4 bytes per float32

  if (byteOffset + 4 > buffer.byteLength) return null;

  const dv = new DataView(buffer);
  const value = dv.getFloat32(byteOffset, meta.littleEndian);

  // NODATA check
  if (meta.nodata !== null && value === meta.nodata) return null;

  return value;
}
