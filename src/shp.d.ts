// src/shpjs.d.ts
declare module 'shpjs' {
  // You can be more specific if you know the types shpjs returns.
  // For a quick fix, 'any' will work and suppress the error.
  export function parseZip(buffer: ArrayBuffer, options?: any): Promise<any | any[]>; // GeoJSON FeatureCollection or array of them
  export function getShapeFile(buffer: ArrayBuffer, options?: any): Promise<any>;
  export function getDbfFile(buffer: ArrayBuffer, options?: any): Promise<any>;
  // Add other functions from shpjs if you use them
  // e.g., export function combine(parts: Array<{shp: any, dbf: any}>): any;
}
