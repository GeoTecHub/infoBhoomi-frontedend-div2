import { HttpClient, HttpEventType } from '@angular/common/http';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  FeatureCollection,
  Feature as GeoJsonFeature,
  GeoJsonProperties,
  Geometry,
  Point,
} from 'geojson';
import OLFeature from 'ol/Feature'; // OpenLayers Feature
import OLGeoJSON from 'ol/format/GeoJSON'; // OpenLayers GeoJSON format
import { Geometry as OLGeometry } from 'ol/geom'; // OpenLayers Geometry
import { transformExtent } from 'ol/proj'; // OL projection utils
import VectorSource from 'ol/source/Vector';
import proj4 from 'proj4';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { APIsService } from '../../../../services/api.service';
import { FeatureService } from '../../../../services/feature.service';
import { LayerService } from '../../../../services/layer.service';
import { MapService } from '../../../../services/map.service';

import { MatDialogRef } from '@angular/material/dialog';
import WebGLTileLayer from 'ol/layer/WebGLTile.js';
import GeoTIFF, { default as GeoTIFFSource } from 'ol/source/GeoTIFF';
import { v4 as uuidv4 } from 'uuid';

import { fromUrl } from 'geotiff';
import { Map as OLMap } from 'ol';
import * as Papa from 'papaparse'; // If using papaparse
type ShpJSOutput =
  | FeatureCollection<Geometry, GeoJsonProperties>
  | FeatureCollection<Geometry, GeoJsonProperties>[];

import { CommonModule } from '@angular/common'; // For *ngIf etc.
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style'; // For labeling

import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogModule,
} from '@angular/material/dialog';

import { NotificationService } from '../../../../services/notifications.service';
import { CustomButtonsComponent } from '../../custom-buttons/custom-buttons.component';

import { register } from 'ol/proj/proj4';

// Import parsing libraries
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // <<<<====== ADD THIS LINE
import { kml } from '@tmcw/togeojson'; // For KML
import { fromArrayBuffer } from 'geotiff'; // For GeoTIFF
import { LineString as OLLineString, Point as OLPoint, Polygon as OLPolygon } from 'ol/geom';
import TileLayer from 'ol/layer/Tile';
import * as shp from 'shpjs'; // For Shapefiles (zip)
import { DrawService } from '../../../../services/draw.service';
import { UserService } from '../../../../services/user.service';

// CRITICAL: Ensure proj4 knows about the projections in your dropdown.
// This is necessary for the reprojection to work.
proj4.defs(
  'EPSG:5235',
  '+proj=tmerc +lat_0=7 +lon_0=80.77 +k=0.9993 +x_0=500000 +y_0=500000 +ellps=GRS80 +datum=GDA94 +units=m +no_defs',
);
proj4.defs('EPSG:32644', '+proj=utm +zone=44 +datum=WGS84 +units=m +no_defs');
register(proj4); // Register all defined projections with OpenLayers
// ======================================================================

// Define an enum for file types for better management
enum FileType {
  GeoJSON = 'geojson',
  KML = 'kml',
  SHP = 'shp', // We'll expect a ZIP for SHP
  GeoTIFF = 'tif',
  TXT = 'txt',
  Unsupported = 'unsupported',
}

@Component({
  selector: 'app-import-data',
  standalone: true, // Assuming standalone
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatDialogClose,
    MatDialogActions,
    MatDialogContent,
    MatDialogModule,
    MatIconModule,
    FormsModule,
    CustomButtonsComponent,
  ],
  templateUrl: './import-data.component.html',
  styleUrl: './import-data.component.css',
})
export class ImportDataComponent implements OnDestroy {
  isLoading: boolean = false;
  selectedFile: File | null = null;
  selectedFileName: string = '';
  currentFileType: FileType = FileType.Unsupported;
  isWrongFileType: boolean = false;
  private isProcessing = false;
  private currentOperation: 'geotiff' | 'vector' | null = null;
  private cancelToken = new Subject<void>();

  private currentTiffLayer: TileLayer<GeoTIFFSource> | WebGLTileLayer | null = null;

  sourceCrsUserInput: string = '';
  detectedSourceCrs: string | null = null;
  readonly TARGET_CRS_FOR_OL_FEATURES = 'EPSG:4326'; // Store OL Features in WGS84
  private userToken = localStorage.getItem('Token');
  private olGeoJsonFormat = new OLGeoJSON(); // For converting GeoJSON to OL Features

  processedGeoJsonData: FeatureCollection<Geometry, GeoJsonProperties> | null = null; // To store converted GeoJSON from KML/SHP or original GeoJSON
  processedGeoTiffData: GeoTIFF | null = null; // To store parsed GeoTIFF object
  processedGeoTiffBlob: Blob | null = null; // Store the original Blob for GeoTIFFSource

  dataSetName: string = '';
  enableAdditionalInputs: boolean = false;

  // Helper to map extensions to our FileType enum
  private extensionToFileType: { [key: string]: FileType } = {
    geojson: FileType.GeoJSON, // Standard GeoJSON
    json: FileType.GeoJSON, // JSON files (assuming GeoJSON)
    kml: FileType.KML, // Google Earth KML
    shp: FileType.SHP, // Direct shapefile
    zip: FileType.SHP, // ZIP archive (assuming shapefile bundle)
    tif: FileType.GeoTIFF, // GeoTIFF raster
    tiff: FileType.GeoTIFF, // GeoTIFF raster (alternative extension)
    txt: FileType.TXT, // Text/CSV files
  };

  private userId = ''; // Use consistent naming

  private destroy$ = new Subject<void>(); // Standard way to signal component destruction
  private uploadSubscription: Subscription | null = null; // To hold the HTTP subscription

  // Properties to get X/Y column names from user (if not fixed)
  csvXColumn: string = 'longitude'; // Default, user can change
  csvYColumn: string = 'latitude'; // Default, user can change
  csvDataAsFeatures: GeoJsonFeature<Geometry, GeoJsonProperties>[] = []; // Store parsed CSV data as GeoJSON features

  // import API endpointG
  private readonly IMPORT_RASTER_DATA = this.apiService.IMPORT_RASTER_DATA;

  constructor(
    private http: HttpClient,
    private apiService: APIsService,
    private notificationService: NotificationService,
    private layerService: LayerService, // For layer metadata (e.g., assigning color) & registering new layers
    private featureService: FeatureService, // For staging new features
    private mapService: MapService, // For adding OL layers to the map
    public dialogRef: MatDialogRef<ImportDataComponent>,
    private userService: UserService,
    private drawService: DrawService,
  ) {
    this.userService.user$.pipe(takeUntil(this.destroy$)).subscribe((user: any) => {
      if (user) {
        this.userId = user.user_id || '';
      }
    });
  }

  async onFileSelected(event: Event): Promise<void> {
    this.resetFileState(); // Call at the beginning

    const input = event.target as HTMLInputElement;

    console.log(input.files);

    if (!input.files || input.files.length === 0) return;

    this.selectedFile = input.files[0];
    this.selectedFileName = this.selectedFile.name;
    const fileExt = this.selectedFileName.split('.').pop()?.toLowerCase() || '';
    this.isWrongFileType = false;
    this.currentFileType = this.extensionToFileType[fileExt] || FileType.Unsupported;

    if (this.currentFileType === FileType.Unsupported) {
      this.notificationService.showError('Unsupported file type.');
      return;
    }

    this.isLoading = true;
    try {
      switch (this.currentFileType) {
        case FileType.GeoJSON:
          const geojson = await this.parseGeoJSON(this.selectedFile!);
          this.detectedSourceCrs = this.getGeoJsonCRS(geojson) || 'EPSG:4326';
          this.processedGeoJsonData = geojson;
          break;
        case FileType.KML:
          this.processedGeoJsonData = await this.parseKML(this.selectedFile!);
          this.detectedSourceCrs = 'EPSG:4326';
          this.notificationService.showInfo(`KML "${this.selectedFileName}" parsed to GeoJSON.`);

          break;
        case FileType.SHP:
          this.processedGeoJsonData = await this.parseShapefile(this.selectedFile!);
          this.notificationService.showInfo(
            `Shapefile (from ZIP) "${this.selectedFileName}" parsed to GeoJSON.`,
          );
          this.detectedSourceCrs = 'EPSG:4326'; // Assuming WGS84 for now if shpjs doesn't provide easy CRS
          break;
        case FileType.GeoTIFF:
          this.processedGeoTiffData = await this.parseGeoTIFFObject(this.selectedFile!);
          this.processedGeoTiffBlob = this.selectedFile; // Keep blob for GeoTIFFSource
          this.detectedSourceCrs = await this.getGeoTiffCRS(this.processedGeoTiffData);
          break;
        case FileType.TXT:
          this.processedGeoJsonData = await this.parseCSVToGeoJson(this.selectedFile!);
          this.detectedSourceCrs = 'EPSG:4326'; // Assume standard Lat/Lon for text files unless user specifies otherwise
          break;
      }
      // --- >> NEW LOGIC: Pre-fill the dropdown for the user << ---
      if (this.processedGeoJsonData || this.processedGeoTiffData) {
        this.sourceCrsUserInput = this.detectedSourceCrs || 'EPSG:4326';
        this.notificationService.showInfo(
          `File parsed. Please verify the Source Projection is correct.`,
        );
      }

      this.notificationService.showInfo(
        `File "${this.selectedFileName}" parsed. Detected CRS: ${this.detectedSourceCrs || 'Defaulting/Unknown'}`,
      );
    } catch (error: any) {
      console.error('Error parsing file:', error);
      this.notificationService.showError(
        `Error parsing ${this.selectedFileName}: ${error.message || 'Unknown error'}`,
      );
      this.resetFileState();
    } finally {
      this.isLoading = false;
    }
  }

  // --- >> NEW: CSV Parsing Method - (Pt_ID, X, Y, Z, Code) << ---
  // Import Papa Parse at the top of your file
  // import * as Papa from 'papaparse';

  private async parseCSVToGeoJson(
    file: File,
  ): Promise<FeatureCollection<Geometry, GeoJsonProperties>> {
    console.log('[ImportData] Starting CSV/TXT parsing...');

    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No CSV/TXT file provided for parsing.'));
        return;
      }

      const reader = new FileReader();

      reader.onload = (event: any) => {
        try {
          const textContent = event.target.result as string;

          if (!textContent || textContent.trim() === '') {
            reject(new Error('File is empty or contains no data.'));
            return;
          }

          // Use Papa Parse for robust CSV parsing
          const parseResult = Papa.parse<string[]>(textContent, {
            header: false, // We'll handle headers manually for flexibility
            skipEmptyLines: true,
            dynamicTyping: false, // Keep as strings initially for better control
            delimitersToGuess: [',', '\t', ';', '|'], // Common delimiters
          });

          if (parseResult.errors && parseResult.errors.length > 0) {
            console.warn('[ImportData] CSV parsing warnings:', parseResult.errors);
            parseResult.errors.forEach((error) => {
              if (error.type === 'Delimiter') {
                console.warn(`Row ${error.row}: ${error.message}`);
              }
            });
          }

          const rows = parseResult.data as string[][];
          if (!rows || rows.length === 0) {
            reject(new Error('No data rows found in the file.'));
            return;
          }

          // Try to detect if first row is headers
          const firstRow = rows[0];
          const hasHeaders = this.detectCSVHeaders(firstRow);

          let dataStartIndex = hasHeaders ? 1 : 0;
          let headers: string[] = [];

          if (hasHeaders) {
            headers = firstRow.map((h) => h.toLowerCase().trim());
            console.log('[ImportData] Detected headers:', headers);
          }

          // Find coordinate columns
          const coordColumns = this.findCoordinateColumns(headers, hasHeaders);

          if (!coordColumns.xIndex || !coordColumns.yIndex) {
            // If we can't auto-detect, fall back to user-specified or default columns
            const fallbackResult = this.getFallbackCoordinateColumns(headers, hasHeaders);
            coordColumns.xIndex = fallbackResult.xIndex;
            coordColumns.yIndex = fallbackResult.yIndex;
          }

          if (coordColumns.xIndex === -1 || coordColumns.yIndex === -1) {
            reject(
              new Error(
                `Cannot determine coordinate columns. Expected columns like 'x', 'y', 'longitude', 'latitude', 'easting', 'northing' or use default positions 1,2.`,
              ),
            );
            return;
          }

          const features: GeoJsonFeature<Point, GeoJsonProperties>[] = [];
          let validFeatures = 0;
          let skippedRows = 0;

          // Process data rows
          for (let i = dataStartIndex; i < rows.length; i++) {
            const row = rows[i];
            const rowNumber = i + 1; // 1-based for user display

            if (!row || row.length === 0) {
              skippedRows++;
              continue;
            }

            // Ensure we have enough columns
            if (row.length <= Math.max(coordColumns.xIndex, coordColumns.yIndex)) {
              console.warn(
                `[ImportData] Row ${rowNumber}: Not enough columns. Expected at least ${Math.max(coordColumns.xIndex, coordColumns.yIndex) + 1}, got ${row.length}`,
              );
              skippedRows++;
              continue;
            }

            // Extract coordinates
            const xVal = parseFloat(row[coordColumns.xIndex].trim());
            const yVal = parseFloat(row[coordColumns.yIndex].trim());

            // Validate coordinates
            if (isNaN(xVal) || isNaN(yVal)) {
              console.warn(
                `[ImportData] Row ${rowNumber}: Invalid coordinates (${row[coordColumns.xIndex]}, ${row[coordColumns.yIndex]})`,
              );
              skippedRows++;
              continue;
            }

            // Basic coordinate bounds validation (optional - adjust as needed)
            if (Math.abs(xVal) > 180 && Math.abs(yVal) > 90) {
              // Might be projected coordinates - that's okay
            } else if (Math.abs(xVal) > 180 || Math.abs(yVal) > 90) {
              console.warn(
                `[ImportData] Row ${rowNumber}: Suspicious coordinates (${xVal}, ${yVal}) - outside normal lat/lon bounds`,
              );
            }

            // Build properties object
            const properties: GeoJsonProperties = {};

            // Add all columns as properties
            row.forEach((value, index) => {
              let propName: string;

              if (hasHeaders && headers[index]) {
                propName = headers[index];
              } else {
                propName = `column_${index}`;
              }

              // Store original values
              properties[propName] = value;

              // Try to convert numbers
              const numVal = parseFloat(value);
              if (!isNaN(numVal) && isFinite(numVal)) {
                properties[`${propName}_numeric`] = numVal;
              }
            });

            // Add coordinate metadata
            properties['original_x_coord'] = xVal;
            properties['original_y_coord'] = yVal;
            properties['row_number'] = rowNumber;

            // Handle optional Z coordinate if detected
            let coordinates: [number, number] | [number, number, number] = [xVal, yVal];
            if (coordColumns.zIndex !== -1 && row.length > coordColumns.zIndex) {
              const zVal = parseFloat(row[coordColumns.zIndex].trim());
              if (!isNaN(zVal)) {
                coordinates = [xVal, yVal, zVal];
                properties['original_z_coord'] = zVal;
              }
            }

            features.push({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: coordinates,
              },
              properties: properties,
            });

            validFeatures++;
          }

          if (validFeatures === 0) {
            reject(
              new Error(
                `No valid features could be parsed. Skipped ${skippedRows} rows due to invalid data.`,
              ),
            );
            return;
          }

          console.log(
            `[ImportData] CSV parsed successfully. Valid features: ${validFeatures}, Skipped rows: ${skippedRows}`,
          );

          if (skippedRows > 0) {
            this.notificationService?.showWarning(
              `Parsed ${validFeatures} features, skipped ${skippedRows} invalid rows.`,
            );
          }

          resolve({
            type: 'FeatureCollection',
            features: features,
          });
        } catch (error: any) {
          console.error('[ImportData] Error parsing CSV/TXT content:', error);
          reject(new Error(`Failed to parse CSV/TXT file: ${error.message || 'Unknown error'}`));
        }
      };

      reader.onerror = (error) => {
        console.error('[ImportData] FileReader error for CSV/TXT:', error);
        reject(new Error('Error reading CSV/TXT file.'));
      };

      reader.readAsText(file);
    });
  }

  // Helper method to detect if first row contains headers
  private detectCSVHeaders(firstRow: string[]): boolean {
    if (!firstRow || firstRow.length === 0) return false;

    // Check if first row contains non-numeric values that look like headers
    const numericValues = firstRow.filter((cell) => !isNaN(parseFloat(cell.trim())));
    const hasNonNumeric = numericValues.length < firstRow.length * 0.5; // Less than 50% numeric

    // Common header patterns
    const headerPatterns =
      /^(id|name|x|y|z|lat|lon|latitude|longitude|easting|northing|point|code|desc|elevation)/i;
    const hasHeaderPatterns = firstRow.some((cell) => headerPatterns.test(cell.trim()));

    return hasNonNumeric || hasHeaderPatterns;
  }

  // Helper method to find coordinate columns
  private findCoordinateColumns(
    headers: string[],
    hasHeaders: boolean,
  ): { xIndex: number; yIndex: number; zIndex: number } {
    let xIndex = -1;
    let yIndex = -1;
    let zIndex = -1;

    if (hasHeaders) {
      // Look for coordinate column names
      headers.forEach((header, index) => {
        const h = header.toLowerCase().trim();

        // X/Longitude/Easting patterns
        if (
          xIndex === -1 &&
          (h === 'x' ||
            h === 'longitude' ||
            h === 'lon' ||
            h === 'long' ||
            h === 'easting' ||
            h === 'east' ||
            h.includes('x_coord'))
        ) {
          xIndex = index;
        }

        // Y/Latitude/Northing patterns
        if (
          yIndex === -1 &&
          (h === 'y' ||
            h === 'latitude' ||
            h === 'lat' ||
            h === 'northing' ||
            h === 'north' ||
            h.includes('y_coord'))
        ) {
          yIndex = index;
        }

        // Z/Elevation patterns
        if (
          zIndex === -1 &&
          (h === 'z' ||
            h === 'elevation' ||
            h === 'height' ||
            h === 'elev' ||
            h.includes('z_coord'))
        ) {
          zIndex = index;
        }
      });
    }

    return { xIndex, yIndex, zIndex };
  }

  // Helper method for fallback coordinate detection
  private getFallbackCoordinateColumns(
    headers: string[],
    hasHeaders: boolean,
  ): { xIndex: number; yIndex: number } {
    // Use user-specified columns if available, otherwise default positions
    let xIndex = -1;
    let yIndex = -1;

    if (hasHeaders) {
      // Try to find columns matching user-specified names
      const xColName = this.csvXColumn.toLowerCase();
      const yColName = this.csvYColumn.toLowerCase();

      xIndex = headers.findIndex((h) => h.toLowerCase() === xColName);
      yIndex = headers.findIndex((h) => h.toLowerCase() === yColName);
    }

    // Fall back to default positions (assuming 0=ID, 1=X, 2=Y)
    if (xIndex === -1) xIndex = 1;
    if (yIndex === -1) yIndex = 2;

    return { xIndex, yIndex };
  }

  private async parseGeoJSON(file: File): Promise<FeatureCollection<Geometry, GeoJsonProperties>> {
    console.log('[ImportData] Starting GeoJSON parsing...');
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No GeoJSON file provided for parsing.'));
        return;
      }

      const reader = new FileReader();

      reader.onload = (event: any) => {
        try {
          const content = event.target.result;

          // Check if content is empty
          if (!content || content.trim() === '') {
            reject(new Error('GeoJSON file is empty.'));
            return;
          }

          const parsedData = JSON.parse(content);

          // Validate basic structure
          if (!parsedData || typeof parsedData !== 'object') {
            reject(new Error('Invalid GeoJSON: Root element must be an object.'));
            return;
          }

          if (!parsedData.type) {
            reject(new Error('Invalid GeoJSON: Missing "type" property.'));
            return;
          }

          let featureCollection: FeatureCollection<Geometry, GeoJsonProperties>;

          switch (parsedData.type) {
            case 'FeatureCollection':
              // Validate FeatureCollection structure
              if (!Array.isArray(parsedData.features)) {
                reject(
                  new Error('Invalid GeoJSON FeatureCollection: "features" must be an array.'),
                );
                return;
              }
              featureCollection = parsedData as FeatureCollection<Geometry, GeoJsonProperties>;
              break;

            case 'Feature':
              // Convert single Feature to FeatureCollection
              if (!parsedData.geometry) {
                reject(new Error('Invalid GeoJSON Feature: Missing "geometry" property.'));
                return;
              }
              featureCollection = {
                type: 'FeatureCollection',
                features: [parsedData as GeoJsonFeature<Geometry, GeoJsonProperties>],
              };
              console.log('[ImportData] Converted single Feature to FeatureCollection');
              break;

            case 'Point':
            case 'LineString':
            case 'Polygon':
            case 'MultiPoint':
            case 'MultiLineString':
            case 'MultiPolygon':
            case 'GeometryCollection':
              // Convert Geometry to Feature in FeatureCollection
              featureCollection = {
                type: 'FeatureCollection',
                features: [
                  {
                    type: 'Feature',
                    geometry: parsedData as Geometry,
                    properties: {},
                  },
                ],
              };
              console.log('[ImportData] Converted Geometry to FeatureCollection');
              break;

            default:
              reject(
                new Error(
                  `Unsupported GeoJSON type: "${parsedData.type}". Expected FeatureCollection, Feature, or Geometry.`,
                ),
              );
              return;
          }

          // Final validation
          if (!featureCollection.features || featureCollection.features.length === 0) {
            reject(new Error('GeoJSON contains no features.'));
            return;
          }

          // Optional: Validate each feature
          const invalidFeatures = featureCollection.features.filter((feature, index) => {
            if (!feature.type || feature.type !== 'Feature') {
              console.warn(
                `[ImportData] Feature at index ${index} has invalid type: ${feature.type}`,
              );
              return true;
            }
            if (!feature.geometry) {
              console.warn(`[ImportData] Feature at index ${index} is missing geometry`);
              return true;
            }
            return false;
          });

          if (invalidFeatures.length > 0) {
            console.warn(
              `[ImportData] Found ${invalidFeatures.length} invalid features out of ${featureCollection.features.length}`,
            );
            this.notificationService?.showWarning(
              `Found ${invalidFeatures.length} invalid features that will be skipped.`,
            );
          }

          console.log(
            `[ImportData] GeoJSON parsed successfully. Features found: ${featureCollection.features.length}`,
          );
          resolve(featureCollection);
        } catch (error: any) {
          console.error('[ImportData] Error parsing GeoJSON file:', error);

          // Provide more specific error messages
          if (error instanceof SyntaxError) {
            reject(new Error(`Invalid JSON syntax in GeoJSON file: ${error.message}`));
          } else {
            reject(
              new Error(
                `Failed to parse GeoJSON file: ${error.message || 'Unknown parsing error'}`,
              ),
            );
          }
        }
      };

      reader.onerror = (error) => {
        console.error('[ImportData] FileReader error while reading GeoJSON:', error);
        reject(new Error('Error reading GeoJSON file.'));
      };

      reader.readAsText(file);
    });
  }

  // --- CRS Detection Helpers ---
  private getGeoJsonCRS(geojson: any): string | null {
    if (geojson && geojson.crs && geojson.crs.properties && geojson.crs.properties.name) {
      // e.g., "urn:ogc:def:crs:EPSG::4326" -> "EPSG:4326"
      const name = geojson.crs.properties.name;
      if (name.includes('EPSG')) {
        return name.substring(name.lastIndexOf('EPSG'));
      }
      return name; // Or handle other CRS name formats
    }
    return null;
  }

  private async parseKML(file: File): Promise<FeatureCollection<Geometry, GeoJsonProperties>> {
    console.log('[ImportData] Starting KML parsing...');

    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No KML file provided for parsing.'));
        return;
      }

      const reader = new FileReader();

      reader.onload = (event: any) => {
        try {
          const kmlString = event.target.result as string;

          if (!kmlString || kmlString.trim() === '') {
            reject(new Error('KML file content is empty or could not be read.'));
            return;
          }

          // Parse XML
          const dom = new DOMParser().parseFromString(kmlString, 'text/xml');

          // Check for parser errors (important for invalid XML)
          const parserErrors = dom.getElementsByTagName('parsererror');
          if (parserErrors.length > 0) {
            const errorMessage = parserErrors[0].textContent || 'Unknown XML parsing error';
            reject(new Error(`Invalid KML XML structure: ${errorMessage}`));
            return;
          }

          // Check if it's actually a KML document
          if (!dom.getElementsByTagName('kml').length && !dom.getElementsByTagName('KML').length) {
            reject(
              new Error(
                'File does not appear to be a valid KML document. Missing <kml> root element.',
              ),
            );
            return;
          }

          // Convert KML DOM to GeoJSON using @tmcw/togeojson or similar library
          // Make sure you have: import { kml } from '@tmcw/togeojson';
          const geojson = kml(dom) as FeatureCollection<Geometry, GeoJsonProperties>;

          if (!geojson) {
            reject(new Error('KML conversion returned null or undefined result.'));
            return;
          }

          if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
            if (geojson.features.length === 0) {
              console.warn('[ImportData] KML parsed successfully but contains no features');
              this.notificationService?.showWarning('KML file contains no geographic features.');
            }

            console.log(
              '[ImportData] KML parsed successfully to GeoJSON. Features found:',
              geojson.features.length,
            );
            resolve(geojson);
          } else {
            console.error(
              '[ImportData] KML to GeoJSON conversion did not return a valid FeatureCollection:',
              geojson,
            );
            reject(
              new Error(
                'Could not convert KML to GeoJSON. The KML might be empty, invalid, or contain unsupported elements.',
              ),
            );
          }
        } catch (error: any) {
          console.error('[ImportData] Error parsing KML file:', error);
          reject(
            new Error(`Failed to parse KML file: ${error.message || 'Unknown parsing error'}`),
          );
        }
      };

      reader.onerror = (error) => {
        console.error('[ImportData] FileReader error while reading KML:', error);
        reject(new Error('Error reading KML file.'));
      };

      reader.readAsText(file);
    });
  }

  private async parseShapefile(
    file: File,
  ): Promise<FeatureCollection<Geometry, GeoJsonProperties>> {
    console.log('[ImportData] Starting Shapefile (ZIP) parsing...');
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No SHP (ZIP) file provided for parsing.'));
        return;
      }
      if (!file.name.toLowerCase().endsWith('.zip')) {
        reject(new Error('Shapefiles must be uploaded as a .zip archive.'));
        return;
      }

      const reader = new FileReader();

      reader.onload = async (event: any) => {
        try {
          const arrayBuffer = event.target.result as ArrayBuffer;
          if (!arrayBuffer || arrayBuffer.byteLength === 0) {
            reject(new Error('ZIP file content is empty or could not be read.'));
            return;
          }

          // shp.parseZip returns a GeoJSON FeatureCollection or an array of them
          const parsedData: ShpJSOutput = await shp.parseZip(arrayBuffer);

          let featureCollection: FeatureCollection<Geometry, GeoJsonProperties> | null = null;

          if (Array.isArray(parsedData)) {
            // If shpjs returns an array (multiple shapefiles in the zip)
            if (parsedData.length > 0) {
              featureCollection = parsedData[0];

              if (parsedData.length > 1) {
                console.warn(
                  `[ImportData] Multiple shapefiles found in ZIP, using the first one. Total found: ${parsedData.length}`,
                );
                this.notificationService.showWarning(
                  `Multiple shapefiles in ZIP; using the first one.`,
                );
              }
            } else {
              reject(new Error('ZIP archive parsed but contained no recognizable shapefile data.'));
              return;
            }
          } else if (parsedData && parsedData.type === 'FeatureCollection') {
            // If shpjs returns a single FeatureCollection object
            featureCollection = parsedData;
          }

          if (
            featureCollection &&
            featureCollection.type === 'FeatureCollection' &&
            Array.isArray(featureCollection.features)
          ) {
            console.log(
              '[ImportData] Shapefile (ZIP) parsed successfully to GeoJSON. Features found:',
              featureCollection.features.length,
            );

            this.detectedSourceCrs = 'EPSG:4326'; // Or null to force user input
            resolve(featureCollection);
          } else {
            console.error(
              '[ImportData] Parsed Shapefile data is not a valid FeatureCollection or has no features:',
              featureCollection,
            );
            reject(new Error('Parsed Shapefile from ZIP is invalid or contains no features.'));
          }
        } catch (error: any) {
          console.error('[ImportData] Error during Shapefile (ZIP) parsing:', error);
          reject(
            new Error(
              `Failed to parse Shapefile from ZIP: ${error.message || 'Unknown parsing error'}`,
            ),
          );
        }
      };

      reader.onerror = (error) => {
        console.error('[ImportData] FileReader error while reading SHP (ZIP):', error);
        reject(new Error('Error reading SHP (ZIP) file.'));
      };

      reader.readAsArrayBuffer(file); // shpjs expects an ArrayBuffer for ZIP
    });
  }

  // Helper to parse CRS name (similar to getGeoJsonCRS)

  private resetFileState(): void {
    this.selectedFile = null;
    this.selectedFileName = '';
    this.currentFileType = FileType.Unsupported;
    this.processedGeoJsonData = null;
    this.processedGeoTiffData = null;
    this.enableAdditionalInputs = false;
    this.detectedSourceCrs = null;
    this.sourceCrsUserInput = ''; // Clear user input as well
    this.isLoading = false; // Ensure loading is false

    // const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    // if (fileInput) {
    //   fileInput.value = '';
    // }
  }

  private async getGeoTiffCRS(tiff: any): Promise<string | null> {
    if (!tiff) return null;
    try {
      const image = await tiff.getImage(0);
      const geoKeys = await image.getGeoKeys();
      if (geoKeys) {
        // Check for common EPSG code keys
        // Refer to GeoTIFF specification for key codes:
        // http://geotiff.maptools.org/spec/geotiff6.html#6.3.3.1 - Geographic CS Type Codes
        // http://geotiff.maptools.org/spec/geotiff6.html#6.3.2.1 - Projected CS Type Codes
        if (geoKeys.ProjectedCSTypeGeoKey) {
          return `EPSG:${geoKeys.ProjectedCSTypeGeoKey}`;
        }
        if (geoKeys.GeographicTypeGeoKey) {
          return `EPSG:${geoKeys.GeographicTypeGeoKey}`;
        }
        // TODO: Could add more complex WKT parsing here if necessary
        console.warn('GeoTIFF CRS found but not as a direct EPSG key:', geoKeys);
      }
    } catch (e) {
      console.error('Error getting GeoTIFF CRS', e);
    }
    return null;
  }

  private async parseGeoTIFFObject(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event: any) => {
        try {
          const arrayBuffer = event.target.result;
          const tiff = await fromArrayBuffer(arrayBuffer);
          resolve(tiff);
        } catch (error) {
          console.error('Error parsing GeoTIFF:', error);
          reject(new Error('Failed to parse GeoTIFF file'));
        }
      };
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(new Error('Error reading GeoTIFF file'));
      };
      reader.readAsArrayBuffer(file);
    });
  }

  async importData(): Promise<void> {
    if (this.isLoading) return;

    // Give priority to the user's dropdown selection. Fall back to auto-detection if dropdown is untouched.
    const finalSourceCrs = this.sourceCrsUserInput.trim() || this.detectedSourceCrs;
    const olMap = this.mapService.getMapInstance();

    if (!olMap) {
      this.notificationService.showError('Map is not available.');
      return;
    }
    if (!finalSourceCrs) {
      this.notificationService.showError(
        'Could not determine the source projection. Please select one from the dropdown.',
      );
      return;
    }

    this.isLoading = true;

    try {
      if (this.currentFileType === FileType.GeoTIFF) {
        await this.handleGeoTiffImport(olMap, finalSourceCrs);
      } else if (this.processedGeoJsonData) {
        const activeDrawingLayerId = this.layerService.getSelectedCurrentLayerIdForDrawing();
        if (activeDrawingLayerId === null) {
          throw new Error('Please select an active layer in the main panel to import data into.');
        }
        await this.handleVectorDataImport(olMap, finalSourceCrs, activeDrawingLayerId);
      } else {
        throw new Error('No data has been processed for import.');
      }

      this.notificationService.showSuccess(`"${this.dataSetName}" imported successfully!`);
      this.dialogRef.close({ success: true });
    } catch (error: any) {
      this.notificationService.showError(`Import failed: ${error.message || 'Unknown error'}`);
    } finally {
      this.isLoading = false;
    }
  }

  private async handleVectorDataImport(
    olMap: OLMap,
    sourceCrs: string,
    targetLayerId: number | string,
  ): Promise<void> {
    if (!this.processedGeoJsonData) {
      throw new Error('Vector data is not available for processing.');
    }

    this.notificationService.showInfo(
      `Importing vector data with source projection ${sourceCrs}...`,
    );

    // --- 1. Get the target layer from the map ---
    const targetOlVectorLayer = this.mapService.findLayerByNumericId(targetLayerId);
    if (!targetOlVectorLayer) {
      throw new Error(`Target layer with ID ${targetLayerId} not found on the map.`);
    }
    const targetOlVectorSource = targetOlVectorLayer.getSource();
    if (!targetOlVectorSource) {
      throw new Error(`Target layer ${targetLayerId} does not have a valid source.`);
    }

    // --- 2. Read GeoJSON and Reproject Features in ONE STEP ---
    // OpenLayers' GeoJSON format reader can transform coordinates on the fly.
    const mapProjectionCode = olMap.getView().getProjection().getCode();
    let olFeatures: OLFeature<OLGeometry>[];

    try {
      olFeatures = this.olGeoJsonFormat.readFeatures(this.processedGeoJsonData, {
        // The projection of the SOURCE file (what the user selected in the dropdown).
        dataProjection: sourceCrs,
        // The projection we want the features to be in to display correctly on our map.
        featureProjection: mapProjectionCode,
      });
    } catch (readError: any) {
      throw new Error(
        `Failed to read/reproject features. Ensure the selected Source Projection is correct. Error: ${readError.message}`,
      );
    }

    if (!olFeatures || olFeatures.length === 0) {
      this.notificationService.showWarning('No features were converted from the imported file.');
      return;
    }

    // --- 3. Add Features to the Map and Stage for Saving ---
    targetOlVectorSource.addFeatures(olFeatures);
    this.notificationService.showSuccess(`${olFeatures.length} features added to the map.`);

    // --- 4. Stage each feature for saving to the backend ---
    // Note: The `olFeature` geometries are now in the map's projection (`EPSG:3857`).
    // Your `featureService` must handle reprojecting them to your backend's required format (e.g., EPSG:4326) upon saving.
    olFeatures.forEach((olFeature) => {
      olFeature.set('layer_id', targetLayerId);
      olFeature.set('uuid', uuidv4());
      olFeature.set('feature_Id', olFeature.get('uuid'));

      const geometry = olFeature.getGeometry();
      let gndId: string | number | null = null;

      if (geometry instanceof OLPolygon) {
        gndId = this.drawService.findParentGndFeature(geometry);
      } else if (geometry instanceof OLPoint) {
        gndId = this.drawService.findParentGndFeatureForPoint(geometry);
      } else if (geometry instanceof OLLineString) {
        gndId = this.drawService.findParentGndFeatureForLine(geometry);
      }

      if (gndId !== null && gndId !== undefined) {
        olFeature.set('gnd_id', gndId);
      }

      const featureData = this.featureService.convertFeatureToFeatureData(
        olFeature,
        null,
        gndId?.toString() ?? null,
      );
      if (featureData) {
        this.featureService.stageAddition(featureData, featureData);
      }
    });

    // --- ZOOM TO IMPORTED DATA ---
    // Create a temporary, in-memory source with ONLY the new features to get their precise extent.
    const tempSourceForExtent = new VectorSource({ features: olFeatures });
    const newFeaturesExtent = tempSourceForExtent.getExtent();

    // Check if the extent is valid before fitting
    if (newFeaturesExtent && newFeaturesExtent.every(isFinite)) {
      olMap.getView().fit(newFeaturesExtent, {
        duration: 1000,
        padding: [100, 100, 100, 100], // More padding
        maxZoom: 18,
      });
    } else {
      console.warn(
        'Could not calculate a valid extent for the imported features. Skipping auto-zoom.',
      );
      this.notificationService.showWarning('Could not auto-zoom to imported data.');
    }
  }

  private resetProcessingState(): void {
    this.isProcessing = false;
    this.isLoading = false;
    this.currentOperation = null;
  }

  cancelCurrentOperation(): void {
    if (this.isProcessing) {
      this.cancelToken.next();
      this.cancelToken.complete(); // Complete the old one
      this.cancelToken = new Subject<void>(); // Recreate for next time
      this.notificationService.showInfo('Operation cancelled');
      this.resetProcessingState();
    }
  }

  private async handleGeoTiffImport(olMap: OLMap, finalSourceCrs: string): Promise<void> {
    try {
      if (!this.processedGeoTiffBlob) throw new Error('GeoTIFF file not processed.');

      this.notificationService.showInfo(`Importing GeoTIFF "${this.dataSetName}"...`);

      const tempSourceForExtent = new GeoTIFF({
        sources: [{ blob: this.processedGeoTiffBlob }],
        projection: finalSourceCrs,
      });

      const viewInfo = await tempSourceForExtent.getView();
      if (!viewInfo?.extent?.every(isFinite)) {
        throw new Error('Could not read a valid extent from the GeoTIFF file.');
      }

      // The extent of the data in its native projection
      const nativeExtent = viewInfo.extent;
      // The extent of the data transformed into the map's projection
      const extentInMapProj = transformExtent(
        nativeExtent,
        viewInfo.projection,
        olMap.getView().getProjection(),
      );

      const geoTiffSource = new GeoTIFF({
        sources: [{ blob: this.processedGeoTiffBlob }],
        projection: finalSourceCrs,
        convertToRGB: true,
      });

      const geoTiffLayer = new WebGLTileLayer({
        source: geoTiffSource,
        properties: {
          // A good place to add a name for future reference
          layerName: this.dataSetName,
          style: {
            // The 'band' operator retrieves the value of a raster band.
            // 'band: 1' gets the first band (or red channel if RGB).
            // We check if this value is equal to our no-data value (e.g., 0).
            color: [
              'case', // Start a conditional "case" statement
              ['==', ['band', 1], 0], // The condition: if band 1 value is 0...
              [0, 0, 0, 0], // ...then use this color (transparent RGBA)
              'color', // ...otherwise, use the original pixel 'color'.
            ],
          },
        },
        extent: extentInMapProj,
      });

      // DO NOT store the layer on `this.currentTiffLayer`.
      // this.currentTiffLayer = geoTiffLayer; // <<< REMOVE THIS LINE

      olMap.addLayer(geoTiffLayer);
      this.notificationService.showSuccess(`GeoTIFF layer "${this.dataSetName}" added to map.`);

      // The Promise-based zoom logic is excellent and can remain.
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          geoTiffSource.un('change', onChange);
          reject(new Error('Timeout waiting for GeoTIFF source to become ready for zooming.'));
        }, 15000); // 15 second timeout

        const onChange = async () => {
          if (geoTiffSource.getState() === 'ready') {
            clearTimeout(timeout);
            geoTiffSource.un('change', onChange);
            try {
              const viewInfo = await geoTiffSource.getView();
              if (viewInfo?.extent?.every(isFinite)) {
                const extentInMapProj = transformExtent(
                  viewInfo.extent,
                  viewInfo.projection,
                  olMap.getView().getProjection(),
                );
                olMap.getView().fit(extentInMapProj, { duration: 1000, padding: [50, 50, 50, 50] });
                resolve();
              } else {
                this.notificationService.showWarning('Could not auto-zoom to GeoTIFF.');
                resolve(); // Still resolve, as the layer was added.
              }
            } catch (error) {
              reject(error);
            }
          } else if (geoTiffSource.getState() === 'error') {
            clearTimeout(timeout);
            geoTiffSource.un('change', onChange);
            reject(new Error('The GeoTIFF source encountered an error during loading.'));
          }
        };
        geoTiffSource.on('change', onChange);
      });
    } catch (error: any) {
      this.notificationService.showError(`Failed to import GeoTIFF: ${error.message}`);
      throw error;
    }
  }

  async detectProjection() {
    const tiff = await fromUrl('assets/your-geotiff.tif');
    const image = await tiff.getImage();
    const projection = image.getGeoKeys().ProjectedCSTypeGeoKey;
    console.log('EPSG Code:', projection);
  }

  private createPointLabelStyle(labelText: string): Style {
    return new Style({
      image: new CircleStyle({
        radius: 5,
        fill: new Fill({ color: 'rgba(58, 18, 214, 0.94)' }), // Red circle
        stroke: new Stroke({ color: 'white', width: 2 }),
      }),
      text: new Text({
        text: labelText,
        offsetY: -15, // Position label above the point
        fill: new Fill({ color: '#333' }),
        stroke: new Stroke({ color: '#FFFFFF', width: 3 }), // Halo for readability
        font: 'bold 12px Arial, sans-serif',
      }),
    });
  }

  private handleGeoTiffFileUpload(sourceCrs: string | null): Promise<void> {
    if (!this.selectedFile) {
      this.notificationService.showError('No GeoTIFF file selected for upload.');
      return Promise.reject(new Error('No GeoTIFF file for upload.'));
    }

    const formData = new FormData();
    formData.append('file_path', this.selectedFile, this.selectedFileName);
    formData.append('datasetName', this.dataSetName);
    formData.append('username', this.userId!);
    formData.append('capture_date', ''); // Empty string as value, or add proper date value
    if (sourceCrs) formData.append('crs', sourceCrs);

    const geotiffUploadUrl = this.apiService.IMPORT_RASTER_DATA;
    if (!geotiffUploadUrl) {
      /* ... */ return Promise.reject(new Error('GeoTIFF upload URL not configured.'));
    }

    this.notificationService.showInfo('Uploading GeoTIFF to server...');
    // No need to set isLoading here again if importData manages it globally

    // Unsubscribe from previous if any
    this.uploadSubscription?.unsubscribe();

    return new Promise((resolve, reject) => {
      this.apiService
        .importRasterData(formData)
        .pipe(takeUntil(this.cancelToken)) // Allow cancellation
        .subscribe({
          next: (event: any) => {
            if (
              event.type === HttpEventType.Response &&
              (event.status === 200 || event.status === 201)
            ) {
              // Update progress (optional)
              this.notificationService.showSuccess(
                `GeoTIFF "${this.dataSetName}" uploaded successfully.`,
              );
              resolve();
            }
          },
          error: (err) => {
            this.isLoading = false;
            console.error('Upload failed:', err);
            this.notificationService.showError(err.error?.error || 'Failed to upload GeoTIFF');
            reject(err);
          },
        });
    });
  }

  private reprojectGeoJson(
    geojson: FeatureCollection<Geometry, GeoJsonProperties>,
    sourceCrs: string,
    targetCrs: string,
  ): FeatureCollection<Geometry, GeoJsonProperties> {
    try {
      // Register the source CRS if not already known by proj4
      if (!proj4.defs(sourceCrs)) {
        // You might need to add CRS definitions here or fetch them
        console.warn(`CRS ${sourceCrs} not defined in proj4. Attempting to transform anyway.`);
      }

      const transformedFeatures = geojson.features.map((feature) => {
        const transformedGeometry = this.transformGeometry(feature.geometry, sourceCrs, targetCrs);
        return {
          ...feature,
          geometry: transformedGeometry,
        };
      });

      return {
        ...geojson,
        features: transformedFeatures,
      };
    } catch (error) {
      console.error('Error reprojecting GeoJSON:', error);
      throw new Error('Failed to reproject data. Check the source CRS is correct.');
    }
  }

  private transformGeometry(geometry: Geometry, sourceCrs: string, targetCrs: string): Geometry {
    // Handle different geometry types (Point, LineString, Polygon, etc.)
    switch (geometry.type) {
      case 'Point':
        const [x, y] = proj4(sourceCrs, targetCrs, geometry.coordinates);
        return {
          ...geometry,
          coordinates: [x, y],
        };
      case 'LineString':
      case 'MultiPoint':
        return {
          ...geometry,
          coordinates: geometry.coordinates.map((coord) => proj4(sourceCrs, targetCrs, coord)),
        };
      case 'Polygon':
      case 'MultiLineString':
        return {
          ...geometry,
          coordinates: geometry.coordinates.map((ring) =>
            ring.map((coord) => proj4(sourceCrs, targetCrs, coord)),
          ),
        };
      case 'MultiPolygon':
        return {
          ...geometry,
          coordinates: geometry.coordinates.map((polygon) =>
            polygon.map((ring) => ring.map((coord) => proj4(sourceCrs, targetCrs, coord))),
          ),
        };
      default:
        console.warn(`Unsupported geometry type for reprojection: ${geometry.type}`);
        return geometry;
    }
  }

  cancelImport(): void {
    this.resetFileState();
    this.dialogRef.close();
  }
  ngOnDestroy(): void {
    this.processedGeoJsonData = null;
    this.processedGeoTiffBlob = null;

    // 4. Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();

    if (this.uploadSubscription) {
      this.uploadSubscription.unsubscribe();
    }
  }
}
