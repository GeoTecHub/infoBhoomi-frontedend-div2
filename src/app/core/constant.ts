export const LandTabPermissions = {
  L_ADMIN_INFO: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  L_LAND_OVERVIEW: [12, 13, 14, 15, 16, 17, 18],
  L_UTILITY_INFO: [19, 20, 21, 22, 23, 24],
  L_LAND_TENURE: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 39],
  L_ASSES_TAX_INFO: [47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60],
};

export const BuildingsTabPermissions = {
  B_ADMIN_INFO: [],
  B_BUILDING_OVERVIEW: [],
};

export const Token = {
  TOKEN: typeof window !== 'undefined' ? localStorage.getItem('Token') : null,
};
