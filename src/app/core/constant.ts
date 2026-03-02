// Section-level permission IDs for the Land info panel.
// Each value is the representative permission ID for that section.
// Used to gate visibility (can_view) and editability (can_edit) of each section.
export const LandSectionPermissions = {
  IDENTIFICATION: 1, // Administrative Information (IDs 1–12)
  SPATIAL: 13, // Land Overview (IDs 13–18)
  PHYSICAL: 43, // Physical Environment (IDs 43–47)
  ZONING: 48, // Zoning Information (IDs 48–55)
  RRR: 59, // Rights, Restrictions, Responsibilities
  VALUATION: 24, // Assessment & Tax Information (IDs 24–37, 56–58)
  RELATIONSHIPS: 60, // Relationships
  METADATA: 61, // Metadata
};

// Section-level permission IDs for the Building info panel.
export const BuildingSectionPermissions = {
  SUMMARY: 101, // Administrative Information (IDs 101–114, 155–158)
  SPATIAL: 115, // Building Overview (IDs 115–121)
  RRR: 162, // Rights, Restrictions, Responsibilities
  UNITS: 145, // Resident/Unit Information (IDs 145–149)
  PHYSICAL: 157, // Physical Attributes (IDs 157–158)
  UTILITIES: 122, // Utility Network Information (IDs 122–130)
  RELATIONSHIPS: 163, // Relationships & Topology
  METADATA: 164, // Metadata & Quality
};

// Legacy field-level permission ID groups (kept for backward compatibility)
export const LandTabPermissions = {
  L_ADMIN_INFO: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  L_LAND_OVERVIEW: [12, 13, 14, 16, 17, 18],
  L_UTILITY_INFO: [19, 20, 21, 22, 23],
  L_ASSESSMENT_INFO: [24, 25, 26, 27, 28, 29, 30, 31, 32, 56, 57, 58],
  L_TAX_INFO: [33, 34, 35, 36, 37],
  L_PHYSICAL_ENV: [43, 44, 45, 46, 47],
  L_ZONING_INFO: [48, 49, 50, 51, 52, 53, 54, 55],
  L_RRR: [59],
  L_RELATIONSHIPS: [60],
  L_METADATA: [61],
};

export const BuildingsTabPermissions = {
  B_ADMIN_INFO: [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 155, 156, 157, 158],
  B_BUILDING_OVERVIEW: [115, 116, 117, 118, 119, 120, 121],
  B_UTILITY_INFO: [122, 123, 124, 125, 126, 127, 128, 129, 130],
  B_ASSESSMENT_INFO: [131, 132, 133, 134, 135, 136, 137, 138, 139, 159, 160, 161],
  B_TAX_INFO: [140, 141, 142, 143, 144],
  B_RESIDENT_INFO: [145, 146, 147, 148, 149],
  B_RRR: [162],
  B_RELATIONSHIPS: [163],
  B_METADATA: [164],
};

export const Token = {
  TOKEN: typeof window !== 'undefined' ? localStorage.getItem('Token') : null,
};
