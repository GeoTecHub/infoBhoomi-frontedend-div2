import { Coordinate } from 'ol/coordinate';
import * as turf from '@turf/turf';
import { feature, lineString } from '@turf/helpers';
import { Feature } from 'ol';
import VectorSource from 'ol/source/Vector';

export type Coordinate_ = [number, number] | [number, number, number];

export interface PolygonEdge {
  start: Coordinate;
  end: Coordinate;
  ID: number;
  feature?: any; // Optional if you need Turf features
}

export interface IntersectionResult {
  firstIntEdgeID: number | null;
  secondIntEdgeID: number | null;
  firstIntersection: Coordinate | null;
  secondIntersection: Coordinate | null;
}

export interface EdgeTraversalState {
  currentEdgeID: number;
  iterations: number;
  firstIntEdgeReached: boolean;
  firstIntEdgeValidated: boolean;
}

// Geometry Interfaces (from geometryModels)
export interface PolygonEdge {
  start: Coordinate;
  end: Coordinate;
  ID: number;
  feature?: any;
}

export interface IntersectionResult {
  firstIntEdgeID: number | null;
  secondIntEdgeID: number | null;
  firstIntersection: Coordinate | null;
  secondIntersection: Coordinate | null;
}

export interface EdgeTraversalState {
  currentEdgeID: number;
  iterations: number;
  firstIntEdgeReached: boolean;
  firstIntEdgeValidated: boolean;
}

// OLGeometry (Union of Geometry Types)
export interface InfoPoint {
  type: 'Point';
  coordinates: Coordinate;
}

export interface InfoLineString {
  type: 'LineString';
  coordinates: Coordinate[];
}

export interface InfoPolygon {
  type: 'Polygon';
  coordinates: Coordinate[][];
}

export interface InfoMultiPolygon {
  type: 'MultiPolygon';
  coordinates: Coordinate[][][];
}

export type OLGeometry = InfoPoint | InfoLineString | InfoPolygon | InfoMultiPolygon;

// FeatureData Interface
export interface FeatureProperties {
  user_id: number; //x
  layer_id: number | string | null;
  feature_Id: any; //x
  area: number;
  length: number;
  parent_uuid: string[] | null; //x
  // status: true; //x
  uuid: string;
  ref_id: number | null;
  gnd_id?: number | null | string; //x
  // --- >> NEW: Properties specific to imported points from CSV/Text << ---
  original_point_id?: string | number | null; // To store the 'Pt_ID' from the file
  original_x_coord?: number | null; // To store the original X from the file
  original_y_coord?: number | null; // To store the original Y from the Z
  original_z_coord?: number | null; // To store the original Z from the file
  original_code?: string | null; // To store the original 'Code' from the file
  // --- >> ----------------------------------------------------------- << ---

  // You can add other common properties here if needed by most features
  // e.g., name, description, creation_date, last_modified_date

  // Allow other arbitrary properties (use with caution, prefer defined properties)
  [key: string]: any;
  isUpdateOnly?: boolean;
}

export interface FeatureData {
  geometry: OLGeometry;
  properties: FeatureProperties;
}

export interface DrawEndData {
  feature: Feature;
  geometry: GeoJSON.Geometry; // Use appropriate GeoJSON type
  source: VectorSource;
  coordinates: Coordinate | Coordinate[] | Coordinate[][] | Coordinate[][][];
}
