/**
 * Inspection Templates
 *
 * Predefined checklist items for each inspection type.
 * These templates are instantiated when creating a new inspection.
 */

import type { InspectionType, InspectionCategory, InspectionItemTemplate } from '@/lib/types';

// Pre-Construction Inspection - 22 items
const PRE_CONSTRUCTION_ITEMS: InspectionItemTemplate[] = [
  // Site Preparation
  { title: 'Site boundaries verified', description: 'Confirm site boundaries match survey and land documents', category: 'site_preparation', result: 'pending', required: true },
  { title: 'Site cleared and graded', description: 'Vegetation cleared, site graded to design specifications', category: 'site_preparation', result: 'pending', required: true },
  { title: 'Erosion controls installed', description: 'Silt fencing, sediment basins, and erosion controls in place', category: 'site_preparation', result: 'pending', required: true },
  { title: 'Access roads established', description: 'Construction access roads in place and passable', category: 'site_preparation', result: 'pending', required: true },
  { title: 'Staging area prepared', description: 'Equipment and material staging area cleared and accessible', category: 'site_preparation', result: 'pending', required: false },

  // Structural
  { title: 'Foundation layout staked', description: 'Pile/post locations marked per engineering drawings', category: 'structural', result: 'pending', required: true },
  { title: 'Soil conditions verified', description: 'Geotechnical conditions match design assumptions', category: 'structural', result: 'pending', required: true },
  { title: 'Equipment pads ready', description: 'Inverter/transformer pad locations prepared', category: 'structural', result: 'pending', required: true },

  // Electrical
  { title: 'Conduit routes marked', description: 'Underground conduit paths marked and cleared', category: 'electrical', result: 'pending', required: true },
  { title: 'Grounding plan verified', description: 'Grounding electrode locations identified', category: 'electrical', result: 'pending', required: true },
  { title: 'Utility interconnection point confirmed', description: 'POI location and requirements verified with utility', category: 'electrical', result: 'pending', required: true },

  // Safety
  { title: 'Safety equipment staged', description: 'PPE, first aid, fire extinguishers available on site', category: 'safety', result: 'pending', required: true },
  { title: 'Emergency contacts posted', description: 'Emergency numbers and contacts displayed', category: 'safety', result: 'pending', required: true },
  { title: 'Site security measures', description: 'Fencing, gates, and security measures in place', category: 'safety', result: 'pending', required: true },
  { title: 'Environmental protections', description: 'Spill kits and environmental protections available', category: 'safety', result: 'pending', required: false },

  // Documentation
  { title: 'Building permits posted', description: 'Required permits displayed at job site', category: 'documentation', result: 'pending', required: true },
  { title: 'Approved drawings on site', description: 'Current approved construction drawings available', category: 'documentation', result: 'pending', required: true },
  { title: 'Safety plan available', description: 'Site safety plan accessible to all workers', category: 'documentation', result: 'pending', required: true },
  { title: 'Utility contact information', description: 'Utility company contacts and dig-safe clearance', category: 'documentation', result: 'pending', required: true },
  { title: 'Environmental permits', description: 'Environmental permits and compliance documents on site', category: 'documentation', result: 'pending', required: false },
  { title: 'Insurance certificates', description: 'Contractor insurance certificates on file', category: 'documentation', result: 'pending', required: false },
  { title: 'Material submittals approved', description: 'Equipment and material submittals approved', category: 'documentation', result: 'pending', required: true },
];

// Progress Inspection - 25 items
const PROGRESS_ITEMS: InspectionItemTemplate[] = [
  // Site Preparation
  { title: 'Erosion controls maintained', description: 'Erosion and sediment controls functioning properly', category: 'site_preparation', result: 'pending', required: true },
  { title: 'Site drainage adequate', description: 'Stormwater management functioning, no ponding', category: 'site_preparation', result: 'pending', required: true },
  { title: 'Access roads maintained', description: 'Construction roads in good condition', category: 'site_preparation', result: 'pending', required: false },

  // Structural
  { title: 'Piles/posts installed correctly', description: 'Foundation piles driven to spec depth and plumb', category: 'structural', result: 'pending', required: true },
  { title: 'Racking torque verified', description: 'Structural connections torqued per manufacturer specs', category: 'structural', result: 'pending', required: true },
  { title: 'Tracker alignment checked', description: 'Single-axis trackers aligned and level (if applicable)', category: 'structural', result: 'pending', required: false },
  { title: 'Grounding of structure', description: 'Racking properly grounded per NEC requirements', category: 'structural', result: 'pending', required: true },

  // Electrical
  { title: 'DC wiring properly routed', description: 'Module wiring secured, protected, and properly routed', category: 'electrical', result: 'pending', required: true },
  { title: 'Combiner boxes installed', description: 'String combiner boxes mounted and wired correctly', category: 'electrical', result: 'pending', required: true },
  { title: 'Wire management adequate', description: 'All wiring secured with clips, no exposed conductors', category: 'electrical', result: 'pending', required: true },
  { title: 'Junction boxes weatherproof', description: 'All junction boxes properly sealed', category: 'electrical', result: 'pending', required: true },

  // Modules
  { title: 'Modules installed per layout', description: 'Module placement matches design layout drawings', category: 'modules', result: 'pending', required: true },
  { title: 'Module clamps secured', description: 'All mid and end clamps properly torqued', category: 'modules', result: 'pending', required: true },
  { title: 'Module connectors secured', description: 'MC4 connections properly engaged and clicked', category: 'modules', result: 'pending', required: true },
  { title: 'No visible module damage', description: 'No cracked glass, damaged frames, or visible defects', category: 'modules', result: 'pending', required: true },
  { title: 'Module labels visible', description: 'Serial numbers and labels accessible for documentation', category: 'modules', result: 'pending', required: false },

  // Inverters
  { title: 'Inverters properly mounted', description: 'Inverters mounted level with adequate ventilation', category: 'inverters', result: 'pending', required: true },
  { title: 'DC input wiring complete', description: 'String inputs properly terminated at inverter', category: 'inverters', result: 'pending', required: true },
  { title: 'AC output wiring complete', description: 'Inverter AC output properly connected', category: 'inverters', result: 'pending', required: true },

  // Safety
  { title: 'Fall protection in use', description: 'Workers using proper fall protection when required', category: 'safety', result: 'pending', required: true },
  { title: 'Electrical safety observed', description: 'Proper lockout/tagout procedures followed', category: 'safety', result: 'pending', required: true },
  { title: 'PPE compliance', description: 'All workers wearing appropriate PPE', category: 'safety', result: 'pending', required: true },
  { title: 'Housekeeping adequate', description: 'Site clean, materials organized, no trip hazards', category: 'safety', result: 'pending', required: false },

  // Documentation
  { title: 'Daily logs maintained', description: 'Construction daily logs up to date', category: 'documentation', result: 'pending', required: true },
  { title: 'RFIs addressed', description: 'Open RFIs reviewed and addressed', category: 'documentation', result: 'pending', required: false },
];

// Commissioning Inspection - 28 items
const COMMISSIONING_ITEMS: InspectionItemTemplate[] = [
  // Electrical
  { title: 'String Voc measurements', description: 'Open circuit voltage measured for all strings within spec', category: 'electrical', result: 'pending', required: true },
  { title: 'String Isc measurements', description: 'Short circuit current measured for sample strings', category: 'electrical', result: 'pending', required: true },
  { title: 'Insulation resistance test', description: 'Megger test on DC circuits >1MΩ', category: 'electrical', result: 'pending', required: true },
  { title: 'Ground continuity verified', description: 'Equipment grounding continuity confirmed <25Ω', category: 'electrical', result: 'pending', required: true },
  { title: 'Ground fault detection test', description: 'Ground fault detection system operational', category: 'electrical', result: 'pending', required: true },
  { title: 'Arc fault detection test', description: 'Arc fault detection system operational (if equipped)', category: 'electrical', result: 'pending', required: false },
  { title: 'Rapid shutdown test', description: 'Rapid shutdown system functions per NEC 690.12', category: 'electrical', result: 'pending', required: true },
  { title: 'AC disconnect operation', description: 'Main AC disconnect operates properly', category: 'electrical', result: 'pending', required: true },

  // Modules
  { title: 'Visual inspection complete', description: 'All modules inspected for visible damage', category: 'modules', result: 'pending', required: true },
  { title: 'IR thermography performed', description: 'Thermal scan completed, no hotspots identified', category: 'modules', result: 'pending', required: false },
  { title: 'Module serial numbers recorded', description: 'All module serial numbers documented', category: 'modules', result: 'pending', required: true },
  { title: 'String mapping complete', description: 'String to combiner mapping documented', category: 'modules', result: 'pending', required: true },

  // Inverters
  { title: 'Inverter communication established', description: 'Monitoring system communicating with all inverters', category: 'inverters', result: 'pending', required: true },
  { title: 'Firmware version current', description: 'Inverter firmware updated to latest approved version', category: 'inverters', result: 'pending', required: true },
  { title: 'Grid settings configured', description: 'Utility required grid parameters programmed', category: 'inverters', result: 'pending', required: true },
  { title: 'Inverter startup successful', description: 'Inverters start and sync to grid without errors', category: 'inverters', result: 'pending', required: true },
  { title: 'Power production verified', description: 'System producing expected power for conditions', category: 'inverters', result: 'pending', required: true },
  { title: 'Inverter alarm review', description: 'All inverter alarms reviewed and cleared', category: 'inverters', result: 'pending', required: true },

  // Safety
  { title: 'Arc flash labels installed', description: 'Arc flash warning labels on all electrical equipment', category: 'safety', result: 'pending', required: true },
  { title: 'Disconnect labels complete', description: 'All disconnects properly labeled', category: 'safety', result: 'pending', required: true },
  { title: 'Emergency shutoff accessible', description: 'Emergency stop accessible and clearly marked', category: 'safety', result: 'pending', required: true },
  { title: 'Warning signs posted', description: 'Required electrical warning signs in place', category: 'safety', result: 'pending', required: true },

  // Documentation
  { title: 'As-built drawings provided', description: 'Final as-built drawings submitted and accurate', category: 'documentation', result: 'pending', required: true },
  { title: 'O&M manuals delivered', description: 'Operation and maintenance manuals provided', category: 'documentation', result: 'pending', required: true },
  { title: 'Warranty documents provided', description: 'Equipment warranties registered and documented', category: 'documentation', result: 'pending', required: true },
  { title: 'Test reports complete', description: 'All commissioning test reports documented', category: 'documentation', result: 'pending', required: true },
  { title: 'Training completed', description: 'Owner/operator training completed and documented', category: 'documentation', result: 'pending', required: true },
  { title: 'Utility approval received', description: 'Permission to operate received from utility', category: 'documentation', result: 'pending', required: true },
];

// Annual O&M Inspection - 24 items
const ANNUAL_OM_ITEMS: InspectionItemTemplate[] = [
  // Site Preparation
  { title: 'Vegetation management', description: 'Vegetation controlled, no shading of modules', category: 'site_preparation', result: 'pending', required: true },
  { title: 'Drainage functioning', description: 'Stormwater drainage clear and functioning', category: 'site_preparation', result: 'pending', required: true },
  { title: 'Perimeter security intact', description: 'Fencing and security measures in good condition', category: 'site_preparation', result: 'pending', required: true },
  { title: 'Access roads passable', description: 'Site access roads maintained', category: 'site_preparation', result: 'pending', required: false },

  // Structural
  { title: 'Racking corrosion check', description: 'No significant corrosion on racking components', category: 'structural', result: 'pending', required: true },
  { title: 'Fastener integrity', description: 'Bolts and fasteners tight, no missing hardware', category: 'structural', result: 'pending', required: true },
  { title: 'Tracker operation', description: 'Tracking system operating correctly (if applicable)', category: 'structural', result: 'pending', required: false },
  { title: 'Foundation condition', description: 'Piles/foundations stable, no heaving or settling', category: 'structural', result: 'pending', required: true },

  // Electrical
  { title: 'Connection integrity', description: 'Spot check electrical connections for tightness', category: 'electrical', result: 'pending', required: true },
  { title: 'Grounding system test', description: 'Ground resistance within acceptable limits', category: 'electrical', result: 'pending', required: true },
  { title: 'Combiner fuse check', description: 'Combiner box fuses inspected and functional', category: 'electrical', result: 'pending', required: true },
  { title: 'Cable condition', description: 'No visible cable damage or degradation', category: 'electrical', result: 'pending', required: true },

  // Modules
  { title: 'Module soiling assessment', description: 'Soiling levels acceptable, cleaning if needed', category: 'modules', result: 'pending', required: true },
  { title: 'Module physical condition', description: 'No cracked glass, delamination, or frame damage', category: 'modules', result: 'pending', required: true },
  { title: 'Hotspot inspection', description: 'IR scan for hotspots, none detected', category: 'modules', result: 'pending', required: true },
  { title: 'Junction box condition', description: 'Module junction boxes intact, no burn marks', category: 'modules', result: 'pending', required: true },

  // Inverters
  { title: 'Inverter performance review', description: 'Production data reviewed, performing as expected', category: 'inverters', result: 'pending', required: true },
  { title: 'Inverter filters cleaned', description: 'Air filters cleaned or replaced', category: 'inverters', result: 'pending', required: true },
  { title: 'Cooling system functional', description: 'Fans operating, ventilation adequate', category: 'inverters', result: 'pending', required: true },
  { title: 'Error log review', description: 'Inverter error logs reviewed and addressed', category: 'inverters', result: 'pending', required: true },

  // Safety
  { title: 'Safety equipment present', description: 'First aid, fire extinguisher available and current', category: 'safety', result: 'pending', required: true },
  { title: 'Labels legible', description: 'Warning labels and signs still legible', category: 'safety', result: 'pending', required: true },

  // Documentation
  { title: 'Maintenance logs updated', description: 'O&M logs current and complete', category: 'documentation', result: 'pending', required: true },
  { title: 'Performance report generated', description: 'Annual performance report prepared', category: 'documentation', result: 'pending', required: true },
];

/**
 * All inspection templates organized by type
 */
export const INSPECTION_TEMPLATES: Record<InspectionType, InspectionItemTemplate[]> = {
  pre_construction: PRE_CONSTRUCTION_ITEMS,
  progress: PROGRESS_ITEMS,
  commissioning: COMMISSIONING_ITEMS,
  annual_om: ANNUAL_OM_ITEMS,
};

/**
 * Get template items for a specific inspection type
 */
export function getTemplateItems(type: InspectionType): InspectionItemTemplate[] {
  return INSPECTION_TEMPLATES[type];
}

/**
 * Get template items grouped by category
 */
export function getTemplateItemsByCategory(
  type: InspectionType
): Record<InspectionCategory, InspectionItemTemplate[]> {
  const items = INSPECTION_TEMPLATES[type];
  const grouped: Partial<Record<InspectionCategory, InspectionItemTemplate[]>> = {};

  for (const item of items) {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category]!.push(item);
  }

  return grouped as Record<InspectionCategory, InspectionItemTemplate[]>;
}

/**
 * Get item counts for a template type
 */
export function getTemplateItemCounts(type: InspectionType): {
  total: number;
  required: number;
  optional: number;
} {
  const items = INSPECTION_TEMPLATES[type];
  const required = items.filter((i) => i.required).length;
  return {
    total: items.length,
    required,
    optional: items.length - required,
  };
}
