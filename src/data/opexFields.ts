// OPEX fields structured with categories and field names
// Adapted from pvfinance

export interface OpexCategory {
  title: string;
  fields: string[];
}

export const OPEX_FIELDS: OpexCategory[] = [
  {
    title: "Operations & Maintenance",
    fields: [
      "O&M contract (preventive & corrective maintenance)",
      "Panel cleaning",
      "Vegetation management",
      "Spare parts & consumables",
    ],
  },
  {
    title: "Asset Management",
    fields: [
      "Asset management services",
      "Performance monitoring & reporting",
    ],
  },
  {
    title: "Insurance",
    fields: [
      "Insurance (all-risk, liability, business interruption)",
    ],
  },
  {
    title: "Land & Property",
    fields: [
      "Land lease",
      "Property taxes & fees",
    ],
  },
  {
    title: "Monitoring & Control",
    fields: [
      "SCADA & monitoring systems",
      "Remote monitoring services",
    ],
  },
  {
    title: "Security",
    fields: [
      "Security services & CCTV",
    ],
  },
  {
    title: "Grid Connection",
    fields: [
      "Grid connection & network fees",
      "Metering services",
    ],
  },
  {
    title: "Utilities & Services",
    fields: [
      "Site utilities (water, electricity, internet)",
    ],
  },
  {
    title: "Compliance & Professional Services",
    fields: [
      "Environmental compliance & permits",
      "Professional fees (legal, audit, consulting)",
    ],
  },
];

// Flatten all fields for easy searching
export const ALL_OPEX_FIELDS = OPEX_FIELDS.flatMap(category => category.fields);

// Get category for an OPEX field name
export function getOpexItemCategory(fieldName: string): string {
  for (const category of OPEX_FIELDS) {
    if (category.fields.includes(fieldName)) {
      return category.title;
    }
  }
  return "Uncategorized";
}
