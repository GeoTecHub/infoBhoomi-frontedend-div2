export const LandTabPermissions = {
  L_ADMIN_INFO: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  L_LAND_OVERVIEW: [12, 13, 14, 15, 16, 17, 18],
  L_UTILITY_INFO: [19, 20, 21, 22, 23, 24],
  L_LAND_TENURE: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 39],
  L_ASSES_TAX_INFO: [47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60],
  // New LADM fields
  L_PHYSICAL_ENV: [43, 44, 45, 46, 47],
  L_ZONING_INFO: [48, 49, 50, 51, 52, 53, 54, 55],
  L_VALUATION: [56, 57, 58],
};

export const BuildingsTabPermissions = {
  B_ADMIN_INFO: [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 155, 156, 157, 158],
  B_BUILDING_OVERVIEW: [115, 116, 117, 118, 119, 120, 121],
  B_UTILITY_INFO: [122, 123, 124, 125, 126, 127, 128, 129, 130],
  B_ASSES_TAX_INFO: [131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 159, 160, 161],
  B_RESIDENT_INFO: [145, 146, 147, 148, 149],
};

export const Token = {
  TOKEN: typeof window !== 'undefined' ? localStorage.getItem('Token') : null,
};
