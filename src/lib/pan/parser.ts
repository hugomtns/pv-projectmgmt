/**
 * PAN File Parser - Parses PVsyst module parameter files
 *
 * PAN files are text-based configuration files used by PVsyst software
 * to define PV module characteristics. Format is key=value pairs with
 * nested sections denoted by "PVObject_=" and "End of PVObject" markers.
 */

import type { ModuleSpecs } from '@/lib/types/component';

export interface ParsedPANData {
  manufacturer: string;
  model: string;
  specs: Partial<ModuleSpecs>;
}

// Cell technology mapping from PVsyst codes to our internal types
const TECHNOL_MAP: Record<string, string> = {
  'mtSiMono': 'mono-Si',
  'mtSiPoly': 'poly-Si',
  'mtSiThin': 'thin-film',
  'mtCdTe': 'thin-film',
  'mtCIS': 'thin-film',
  'mtCIGS': 'thin-film',
  'mtHIT': 'HJT',
  'mtaSi': 'thin-film',
};

/**
 * Parse a PAN file content and extract module data
 */
export function parsePANFile(content: string): ParsedPANData {
  const lines = content.split(/\r?\n/);
  const data: Record<string, string> = {};

  // Track section context for proper field extraction
  let inCommercialSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Track section boundaries
    if (trimmed.includes('PVObject_Commercial')) {
      inCommercialSection = true;
      continue;
    }
    if (trimmed === 'End of PVObject pvCommercial') {
      inCommercialSection = false;
      continue;
    }

    // Skip non-data lines
    if (!trimmed || trimmed.startsWith('End of') || trimmed.startsWith('Str_') ||
        trimmed.startsWith('Remarks') || trimmed.includes('PVObject_=')) {
      continue;
    }

    // Parse key=value pairs
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();

      // Prefix commercial section keys to distinguish them
      if (inCommercialSection) {
        data[`Commercial_${key}`] = value;
      } else {
        data[key] = value;
      }
    }
  }

  // Extract manufacturer and model
  const manufacturer = data['Commercial_Manufacturer'] || 'Unknown';
  const model = data['Commercial_Model'] || 'Unknown';

  // Parse numeric values with safe conversion
  const parseNum = (key: string): number | undefined => {
    const val = data[key];
    if (val === undefined) return undefined;
    const num = parseFloat(val);
    return isNaN(num) ? undefined : num;
  };

  // Get raw values from PAN file
  const heightM = parseNum('Commercial_Height'); // meters
  const widthM = parseNum('Commercial_Width');   // meters
  const depthM = parseNum('Commercial_Depth');   // meters
  const weight = parseNum('Commercial_Weight');  // kg
  const pNom = parseNum('PNom');                 // Wp
  const voc = parseNum('Voc');                   // V
  const isc = parseNum('Isc');                   // A
  const vmp = parseNum('Vmp');                   // V
  const imp = parseNum('Imp');                   // A
  const nCelS = parseNum('NCelS');               // cell count
  const muISC = parseNum('muISC');               // mA/°C
  const muPmpReq = parseNum('muPmpReq');         // %/°C
  const muVocSpec = parseNum('muVocSpec');       // mV/°C (if available)
  const technol = data['Technol'];

  // Convert dimensions from meters to mm
  const lengthMm = heightM !== undefined ? Math.round(heightM * 1000) : undefined;
  const widthMm = widthM !== undefined ? Math.round(widthM * 1000) : undefined;
  const thicknessMm = depthM !== undefined ? Math.round(depthM * 1000) : undefined;

  // Calculate efficiency: (Pmax / Area) / 10 → %
  // Area in m², Pmax in Wp, result in %
  let efficiency: number | undefined;
  if (pNom !== undefined && heightM !== undefined && widthM !== undefined) {
    const areaM2 = heightM * widthM;
    if (areaM2 > 0) {
      efficiency = Math.round((pNom / areaM2 / 10) * 10) / 10; // Round to 1 decimal
    }
  }

  // Convert temperature coefficients
  // muISC is in mA/°C, need to convert to %/°C: (muISC / (Isc * 1000)) * 100
  let tempCoeffIsc: number | undefined;
  if (muISC !== undefined && isc !== undefined && isc > 0) {
    tempCoeffIsc = Math.round((muISC / (isc * 1000)) * 100 * 100) / 100;
  }

  // muVocSpec is in mV/°C, convert to %/°C: (muVocSpec / (Voc * 1000)) * 100
  let tempCoeffVoc: number | undefined;
  if (muVocSpec !== undefined && voc !== undefined && voc > 0) {
    tempCoeffVoc = Math.round((muVocSpec / (voc * 1000)) * 100 * 100) / 100;
  }

  // Map cell technology
  const cellType = technol ? TECHNOL_MAP[technol] : undefined;

  // Build specs object with only defined values
  const specs: Partial<ModuleSpecs> = {};

  if (lengthMm !== undefined) specs.length = lengthMm;
  if (widthMm !== undefined) specs.width = widthMm;
  if (thicknessMm !== undefined) specs.thickness = thicknessMm;
  if (weight !== undefined) specs.weight = weight;
  if (pNom !== undefined) specs.powerRating = pNom;
  if (voc !== undefined) specs.voc = voc;
  if (isc !== undefined) specs.isc = isc;
  if (vmp !== undefined) specs.vmp = vmp;
  if (imp !== undefined) specs.imp = imp;
  if (efficiency !== undefined) specs.efficiency = efficiency;
  if (cellType !== undefined) specs.cellType = cellType;
  if (nCelS !== undefined) specs.cellCount = nCelS;
  if (muPmpReq !== undefined) specs.tempCoeffPmax = muPmpReq;
  if (tempCoeffVoc !== undefined) specs.tempCoeffVoc = tempCoeffVoc;
  if (tempCoeffIsc !== undefined) specs.tempCoeffIsc = tempCoeffIsc;

  return {
    manufacturer,
    model,
    specs,
  };
}

/**
 * Validate that a file is a valid PAN file
 */
export function isPANFile(content: string): boolean {
  return content.includes('PVObject_=pvModule') ||
         content.includes('PVObject_Commercial');
}
