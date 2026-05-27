/**
 * Frontend upload limits.
 *
 * Mirrors the backend rules in `user/upload_limits.py`. Used for UX pre-checks
 * so users get instant feedback instead of waiting for an upload to fail at
 * the server. The backend remains the security boundary — never trust these
 * values alone.
 *
 * Categories:
 *   - server-backed FileFields (image, sketch_ref, admin_source, etc.)
 *     match the backend `UPLOAD_LIMITS` keys 1:1.
 *   - "shapefile_zip" is browser-only — the import flow parses the ZIP in JS
 *     and POSTs GeoJSON, so the server never sees the .zip. The cap here is
 *     a memory-safety guard for the browser tab, not a server limit.
 */

const MB = 1024 * 1024;

export type UploadCategory =
  | 'image'
  | 'sketch_ref'
  | 'admin_source'
  | 'spatial_source'
  | 'message'
  | 'raster'
  | 'shapefile_zip';

export interface UploadRule {
  maxSizeMB: number;
  allowedExtensions: string[]; // lowercase, includes leading dot
  description: string;
}

export const UPLOAD_LIMITS: Record<UploadCategory, UploadRule> = {
  image: {
    maxSizeMB: 10,
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    description: 'image',
  },
  sketch_ref: {
    maxSizeMB: 15,
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.dwg', '.dxf'],
    description: 'sketch reference',
  },
  admin_source: {
    maxSizeMB: 25,
    allowedExtensions: ['.pdf'],
    description: 'administrative source document',
  },
  spatial_source: {
    maxSizeMB: 50,
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.geojson', '.kml'],
    description: 'spatial source document',
  },
  message: {
    maxSizeMB: 10,
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.xlsx'],
    description: 'message attachment',
  },
  raster: {
    maxSizeMB: 100,
    allowedExtensions: ['.tif', '.tiff', '.geotiff'],
    description: 'raster dataset',
  },
  // Browser-only category — shapefile ZIP is parsed client-side, never uploaded.
  // 200 MB ceiling reflects what shp.js + ArrayBuffer can decode without OOMing
  // a typical browser tab. Bump cautiously.
  shapefile_zip: {
    maxSizeMB: 200,
    allowedExtensions: ['.zip'],
    description: 'shapefile ZIP archive',
  },
};

/** Returns the file's lowercased extension including the dot ("" if none). */
function getExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx).toLowerCase() : '';
}

export interface UploadValidationResult {
  ok: boolean;
  /** Human-readable error message when ok is false. */
  error?: string;
}

/**
 * Validate a File against a category's rules. Returns an object so the caller
 * can surface a user-facing message without try/catch noise.
 *
 *   const result = validateFile(file, 'admin_source');
 *   if (!result.ok) this.notificationService.showError(result.error!);
 */
export function validateFile(file: File, category: UploadCategory): UploadValidationResult {
  const rule = UPLOAD_LIMITS[category];
  if (!rule) {
    return { ok: false, error: `Unknown upload category: ${category}` };
  }

  // Size check
  const maxBytes = rule.maxSizeMB * MB;
  if (file.size > maxBytes) {
    const sizeMB = (file.size / MB).toFixed(1);
    return {
      ok: false,
      error: `${rule.description} is too large (${sizeMB} MB). Maximum allowed: ${rule.maxSizeMB} MB.`,
    };
  }

  // Extension check
  const ext = getExtension(file.name);
  if (rule.allowedExtensions.length && !rule.allowedExtensions.includes(ext)) {
    return {
      ok: false,
      error: `${rule.description} has unsupported file type '${ext || '(none)'}'. Allowed: ${rule.allowedExtensions.join(', ')}.`,
    };
  }

  return { ok: true };
}

/** Convenience for HTML <input accept="..."> attributes. */
export function acceptString(category: UploadCategory): string {
  return UPLOAD_LIMITS[category].allowedExtensions.join(',');
}
