/**
 * Maintenance Task Templates
 *
 * Standard maintenance task templates organized by category.
 * Used to populate maintenance schedules and work orders.
 */

import type { MaintenanceCategory } from '@/lib/types/maintenance';

export interface MaintenanceTaskTemplateItem {
  title: string;
  description: string;
  category: MaintenanceCategory;
  required: boolean;
  estimatedMinutes?: number;
}

export const MAINTENANCE_TASK_TEMPLATES: Record<MaintenanceCategory, MaintenanceTaskTemplateItem[]> = {
  inspection: [
    {
      title: 'Visual Module Inspection',
      description: 'Check for cracks, discoloration, hot spots, and physical damage on PV modules',
      category: 'inspection',
      required: true,
      estimatedMinutes: 30,
    },
    {
      title: 'Inverter Status Check',
      description: 'Verify inverter display, LED indicators, and error codes',
      category: 'inspection',
      required: true,
      estimatedMinutes: 15,
    },
    {
      title: 'Mounting Structure Inspection',
      description: 'Check racking, bolts, and structural components for corrosion or damage',
      category: 'inspection',
      required: true,
      estimatedMinutes: 20,
    },
    {
      title: 'Combiner Box Inspection',
      description: 'Inspect combiner boxes for damage, proper closure, and water ingress',
      category: 'inspection',
      required: true,
      estimatedMinutes: 15,
    },
    {
      title: 'Wiring and Conduit Check',
      description: 'Inspect exposed wiring and conduit for damage, animal intrusion, or degradation',
      category: 'inspection',
      required: true,
      estimatedMinutes: 20,
    },
    {
      title: 'Transformer Inspection',
      description: 'Check transformer oil levels, gauges, and cooling system',
      category: 'inspection',
      required: false,
      estimatedMinutes: 20,
    },
  ],

  cleaning: [
    {
      title: 'Module Cleaning',
      description: 'Clean PV module surfaces using appropriate cleaning solution and equipment',
      category: 'cleaning',
      required: true,
      estimatedMinutes: 120,
    },
    {
      title: 'Inverter Vents/Filters',
      description: 'Clean inverter air vents and replace filters if applicable',
      category: 'cleaning',
      required: true,
      estimatedMinutes: 15,
    },
    {
      title: 'Clean Weather Station',
      description: 'Clean pyranometer, temperature sensors, and other monitoring equipment',
      category: 'cleaning',
      required: false,
      estimatedMinutes: 15,
    },
  ],

  electrical: [
    {
      title: 'DC String Voltage Check',
      description: 'Measure and record DC string voltages at combiner boxes',
      category: 'electrical',
      required: true,
      estimatedMinutes: 30,
    },
    {
      title: 'AC Voltage/Current Check',
      description: 'Measure and record AC output voltage and current at inverters',
      category: 'electrical',
      required: true,
      estimatedMinutes: 20,
    },
    {
      title: 'Ground Fault Check',
      description: 'Test ground fault protection devices and measure ground resistance',
      category: 'electrical',
      required: true,
      estimatedMinutes: 20,
    },
    {
      title: 'Thermal Imaging',
      description: 'Perform infrared thermal scan of electrical connections and modules',
      category: 'electrical',
      required: false,
      estimatedMinutes: 60,
    },
    {
      title: 'Torque Check on Connections',
      description: 'Verify proper torque on critical electrical connections',
      category: 'electrical',
      required: true,
      estimatedMinutes: 30,
    },
    {
      title: 'I-V Curve Testing',
      description: 'Perform I-V curve analysis on representative strings',
      category: 'electrical',
      required: false,
      estimatedMinutes: 60,
    },
  ],

  mechanical: [
    {
      title: 'Tracker Motor Inspection',
      description: 'Check tracker motors, drives, and limit switches for proper operation',
      category: 'mechanical',
      required: true,
      estimatedMinutes: 30,
    },
    {
      title: 'Tracker Lubrication',
      description: 'Apply lubricant to tracker bearings and moving parts per manufacturer specs',
      category: 'mechanical',
      required: true,
      estimatedMinutes: 45,
    },
    {
      title: 'Damper Inspection',
      description: 'Check tracker dampers for proper function and fluid levels',
      category: 'mechanical',
      required: false,
      estimatedMinutes: 20,
    },
    {
      title: 'Bolt/Fastener Torque Check',
      description: 'Verify torque on structural bolts and fasteners',
      category: 'mechanical',
      required: true,
      estimatedMinutes: 30,
    },
  ],

  vegetation: [
    {
      title: 'Vegetation Management',
      description: 'Clear vegetation beneath and around PV arrays per site requirements',
      category: 'vegetation',
      required: true,
      estimatedMinutes: 120,
    },
    {
      title: 'Herbicide Application',
      description: 'Apply approved herbicide to control vegetation growth (if permitted)',
      category: 'vegetation',
      required: false,
      estimatedMinutes: 60,
    },
    {
      title: 'Fence Line Clearing',
      description: 'Clear vegetation from perimeter fence and access roads',
      category: 'vegetation',
      required: true,
      estimatedMinutes: 60,
    },
  ],

  monitoring: [
    {
      title: 'Data Logger Check',
      description: 'Verify data logger operation, communication, and data quality',
      category: 'monitoring',
      required: true,
      estimatedMinutes: 15,
    },
    {
      title: 'Weather Station Calibration',
      description: 'Calibrate or verify calibration of weather monitoring equipment',
      category: 'monitoring',
      required: false,
      estimatedMinutes: 30,
    },
    {
      title: 'Revenue Meter Verification',
      description: 'Compare revenue meter readings with inverter production data',
      category: 'monitoring',
      required: true,
      estimatedMinutes: 15,
    },
    {
      title: 'Communication Systems Test',
      description: 'Test SCADA, remote monitoring, and communication links',
      category: 'monitoring',
      required: true,
      estimatedMinutes: 15,
    },
  ],

  replacement: [
    {
      title: 'Fuse Replacement',
      description: 'Replace blown or degraded fuses in combiner boxes',
      category: 'replacement',
      required: false,
      estimatedMinutes: 15,
    },
    {
      title: 'SPD Replacement',
      description: 'Replace surge protection devices showing degradation',
      category: 'replacement',
      required: false,
      estimatedMinutes: 20,
    },
    {
      title: 'Filter Replacement',
      description: 'Replace air filters in inverters and enclosures',
      category: 'replacement',
      required: false,
      estimatedMinutes: 15,
    },
    {
      title: 'Module Replacement',
      description: 'Replace damaged or underperforming modules',
      category: 'replacement',
      required: false,
      estimatedMinutes: 60,
    },
  ],
};

// Pre-built schedule templates for common maintenance scenarios
export const PRESET_SCHEDULES = [
  {
    name: 'Quarterly Inspection',
    category: 'inspection' as MaintenanceCategory,
    recurrence: 'quarterly' as const,
    tasks: [
      'Visual Module Inspection',
      'Inverter Status Check',
      'Mounting Structure Inspection',
      'Combiner Box Inspection',
      'Wiring and Conduit Check',
    ],
  },
  {
    name: 'Semi-Annual Module Cleaning',
    category: 'cleaning' as MaintenanceCategory,
    recurrence: 'semi_annual' as const,
    tasks: [
      'Module Cleaning',
      'Inverter Vents/Filters',
      'Clean Weather Station',
    ],
  },
  {
    name: 'Annual Electrical Testing',
    category: 'electrical' as MaintenanceCategory,
    recurrence: 'annual' as const,
    tasks: [
      'DC String Voltage Check',
      'AC Voltage/Current Check',
      'Ground Fault Check',
      'Thermal Imaging',
      'Torque Check on Connections',
      'I-V Curve Testing',
    ],
  },
  {
    name: 'Monthly Tracker Maintenance',
    category: 'mechanical' as MaintenanceCategory,
    recurrence: 'monthly' as const,
    tasks: [
      'Tracker Motor Inspection',
      'Tracker Lubrication',
      'Damper Inspection',
    ],
  },
  {
    name: 'Monthly Vegetation Control',
    category: 'vegetation' as MaintenanceCategory,
    recurrence: 'monthly' as const,
    tasks: [
      'Vegetation Management',
      'Fence Line Clearing',
    ],
  },
  {
    name: 'Weekly Monitoring Check',
    category: 'monitoring' as MaintenanceCategory,
    recurrence: 'weekly' as const,
    tasks: [
      'Data Logger Check',
      'Revenue Meter Verification',
      'Communication Systems Test',
    ],
  },
] as const;

// Helper to get tasks for a preset schedule
export function getTasksForPreset(presetName: string): MaintenanceTaskTemplateItem[] {
  const preset = PRESET_SCHEDULES.find((p) => p.name === presetName);
  if (!preset) return [];

  const categoryTasks = MAINTENANCE_TASK_TEMPLATES[preset.category];
  return categoryTasks.filter((task) => (preset.tasks as readonly string[]).includes(task.title));
}

// Get all unique task titles for search/autocomplete
export function getAllTaskTitles(): string[] {
  const titles: string[] = [];
  for (const category of Object.values(MAINTENANCE_TASK_TEMPLATES)) {
    for (const task of category) {
      titles.push(task.title);
    }
  }
  return titles;
}
