/**
 * OND File Parser - Parses PVsyst inverter parameter files
 *
 * OND files are text-based configuration files used by PVsyst software
 * to define inverter characteristics. Format is key=value pairs with
 * nested sections denoted by "PVObject_=" and "End of PVObject" markers.
 */

import type { InverterSpecs } from '@/lib/types/component';

export interface ParsedONDData {
  manufacturer: string;
  model: string;
  specs: Partial<InverterSpecs>;
}

/**
 * Parse an OND file content and extract inverter data
 */
export function parseONDFile(content: string): ParsedONDData {
  const lines = content.split(/\r?\n/);
  const data: Record<string, string> = {};

  // Track section context for proper field extraction
  let inCommercialSection = false;
  let inConverterSection = false;

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
    if (trimmed === 'Converter=TConverter') {
      inConverterSection = true;
      continue;
    }
    if (trimmed === 'End of TConverter') {
      inConverterSection = false;
      continue;
    }

    // Skip non-data lines
    if (!trimmed || trimmed.startsWith('End of') || trimmed.startsWith('Point_') ||
        trimmed.includes('PVObject_=') || trimmed.includes('TCubicProfile')) {
      continue;
    }

    // Parse key=value pairs
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();

      // Prefix section keys to distinguish them
      if (inCommercialSection) {
        data[`Commercial_${key}`] = value;
      } else if (inConverterSection) {
        data[`Converter_${key}`] = value;
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

  // Get raw values from OND file
  // Physical dimensions (in meters, convert to mm)
  const heightM = parseNum('Commercial_Height');
  const widthM = parseNum('Commercial_Width');
  const depthM = parseNum('Commercial_Depth');
  const weight = parseNum('Commercial_Weight');

  // DC specs
  const pMaxDC = parseNum('Converter_PMaxDC');       // kW
  const vAbsMax = parseNum('Converter_VAbsMax');     // V - max DC voltage
  const vMppMin = parseNum('Converter_VMppMin');     // V
  const vMppMax = parseNum('Converter_VMPPMax');     // V
  const iMaxDC = parseNum('Converter_IMaxDC');       // A

  // AC specs
  const pMaxOUT = parseNum('Converter_PMaxOUT');     // kW - AC output
  const vOutConv = parseNum('Converter_VOutConv');   // V - AC voltage
  const iMaxAC = parseNum('Converter_IMaxAC');       // A

  // Performance
  const efficMax = parseNum('Converter_EfficMax');   // %
  const efficEuro = parseNum('Converter_EfficEuro'); // %

  // MPPT
  const nbMPPT = parseNum('NbMPPT');
  const nbInputs = parseNum('NbInputs');

  // Inverter type from MonoTri field
  const monoTri = data['Converter_MonoTri'];

  // Convert dimensions from meters to mm
  // Note: In OND files, Height is typically the vertical dimension
  // We map: Height→length, Width→width, Depth→height (depth becomes inverter cabinet height)
  const lengthMm = heightM !== undefined ? Math.round(heightM * 1000) : undefined;
  const widthMm = widthM !== undefined ? Math.round(widthM * 1000) : undefined;
  const heightMm = depthM !== undefined ? Math.round(depthM * 1000) : undefined;

  // Determine inverter type
  let inverterType: string | undefined;
  if (monoTri === 'Mono') {
    inverterType = 'string';
  } else if (monoTri === 'Tri') {
    inverterType = 'central';
  }

  // Calculate strings per MPPT if we have inputs and MPPT count
  let stringsPerMppt: number | undefined;
  if (nbInputs !== undefined && nbMPPT !== undefined && nbMPPT > 0) {
    stringsPerMppt = Math.round(nbInputs / nbMPPT);
  }

  // Build specs object with only defined values
  const specs: Partial<InverterSpecs> = {};

  if (lengthMm !== undefined) specs.length = lengthMm;
  if (widthMm !== undefined) specs.width = widthMm;
  if (heightMm !== undefined) specs.height = heightMm;
  if (weight !== undefined) specs.weight = weight;

  // DC Input
  if (pMaxDC !== undefined) specs.maxDcPower = pMaxDC;
  if (vAbsMax !== undefined) specs.maxDcVoltage = vAbsMax;
  if (vMppMin !== undefined) specs.mpptVoltageMin = vMppMin;
  if (vMppMax !== undefined) specs.mpptVoltageMax = vMppMax;
  if (iMaxDC !== undefined) specs.maxDcCurrent = iMaxDC;
  if (nbMPPT !== undefined) specs.mpptCount = nbMPPT;
  if (stringsPerMppt !== undefined) specs.stringsPerMppt = stringsPerMppt;

  // AC Output
  if (pMaxOUT !== undefined) specs.acPowerRating = pMaxOUT;
  if (vOutConv !== undefined) specs.acVoltage = vOutConv;
  if (iMaxAC !== undefined) specs.maxAcCurrent = iMaxAC;

  // Performance
  if (efficMax !== undefined) specs.maxEfficiency = efficMax;
  if (efficEuro !== undefined) specs.euroEfficiency = efficEuro;
  if (inverterType !== undefined) specs.inverterType = inverterType;

  return {
    manufacturer,
    model,
    specs,
  };
}

/**
 * Validate that a file is a valid OND file
 */
export function isONDFile(content: string): boolean {
  return content.includes('PVObject_=pvGInverter') ||
         (content.includes('PVObject_Commercial') && content.includes('TConverter'));
}
