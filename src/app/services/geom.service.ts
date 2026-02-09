import { Injectable } from '@angular/core';
import * as turf from '@turf/turf';
import { Position, Polygon as turfPolygon } from 'geojson';
import { Feature } from 'ol';
import { Coordinate } from 'ol/coordinate';
import { Geometry, Polygon } from 'ol/geom';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import { FeatureProperties, IntersectionResult, OLGeometry, PolygonEdge } from '../models/geometry';
import { FeatureService } from './feature.service';

@Injectable({
  providedIn: 'root',
})
export class GeomService {
  private tolerance = 0.001;
  private TurfPolygon!: turfPolygon;

  originalFeature!: Feature;
  originalFeatureProperties!: FeatureProperties;

  constructor(private featureService: FeatureService) {}

  //$Function: Check Point is effectively on line
  isEffectivelyOnLine(point: Coordinate, edge: PolygonEdge): boolean {
    const distance = turf.pointToLineDistance(turf.point(point), edge.feature);
    return distance <= this.tolerance;
  }

  // .................................................................................................................
  //.............. This function will identify which point gets cut the which edge of the polygon and rearrange the as
  //$.............. and oder the first intersecting point with first edge and second intersecting point with second edge

  lineIntersectionEdgeID(
    polyEdges: PolygonEdge[],
    splitLine: GeoJSON.LineString,
    firstIntersection: Coordinate | null,
    secondIntersection: Coordinate | null,
  ): IntersectionResult {
    const result: IntersectionResult = {
      firstIntEdgeID: null,
      secondIntEdgeID: null,
      firstIntersection: null,
      secondIntersection: null,
    };

    if (!firstIntersection || !secondIntersection) {
      console.error('Intersection points not defined');
      return result;
    }

    const firstIntEdge = polyEdges.find((edge) =>
      this.isEffectivelyOnLine(firstIntersection, edge),
    );
    const secondIntEdge = polyEdges.find((edge) =>
      this.isEffectivelyOnLine(secondIntersection, edge),
    );

    if (!firstIntEdge || !secondIntEdge) {
      console.error('Intersection points not found on edges (within tolerance).');
      return result; // Or throw an error if you prefer
    }

    result.firstIntEdgeID = firstIntEdge.ID;
    result.secondIntEdgeID = secondIntEdge.ID;
    result.firstIntersection = firstIntersection;
    result.secondIntersection = secondIntersection;

    return result;
  }

  //$ helpper Function:  Push the points into the Poly-corrected
  // this will makesure to get first or last point and insert as coordinates into poly
  pushPolyPoint(poly: Coordinate[], pointType: 'start' | 'end', edge: PolygonEdge): void {
    const coord = pointType === 'start' ? edge.start : edge.end;
    poly.push([...coord]); // Clone to prevent reference issues
  }

  /**
   * Generate the first cut polygon. It starts with the second coordinate (index 1)
   * of the second intersection edge and then appends subsequent edges until wrapping back.
   */

  //! Function: Generare Polygon 01 -diiferend edges
  generatePolyDE1(
    edges: PolygonEdge[],
    firstIntEdgeID: number,
    secondIntEdgeID: number,
  ): Coordinate[] {
    // ... (Validation code remains the same)

    const poly: Coordinate[] = [];
    const totalEdges: number = edges.length;

    const getEdge = (id: number): PolygonEdge => edges[id]; // Simplified

    let currentEdgeID = secondIntEdgeID;

    while (true) {
      const edge = getEdge(currentEdgeID);
      const nextEdgeID = (currentEdgeID + 1) % totalEdges;

      if (nextEdgeID === firstIntEdgeID) {
        this.pushPolyPoint(poly, 'end', edge);
        break;
      }

      this.pushPolyPoint(poly, 'end', edge);
      currentEdgeID = nextEdgeID;
    }

    return poly;
  }

  //! Function: Generare Polygon 02  Deifferenet Edges

  generatePolyDE2(
    edges: PolygonEdge[],
    firstIntEdgeID: number,
    secondIntEdgeID: number,
  ): Coordinate[] {
    // ... (Validation code remains the same)

    const poly: Coordinate[] = [];
    const totalEdges: number = edges.length;

    const getEdge = (id: number): PolygonEdge => edges[id]; // Simplified

    let currentEdgeID = secondIntEdgeID;

    while (true) {
      const edge = getEdge(currentEdgeID);
      const nextEdgeID = (currentEdgeID - 1 + totalEdges) % totalEdges;

      if (nextEdgeID === firstIntEdgeID) {
        this.pushPolyPoint(poly, 'start', edge);
        break;
      }

      this.pushPolyPoint(poly, 'start', edge);
      currentEdgeID = nextEdgeID;
    }

    return poly;
  }

  // Case 02 event
  //! Function: Generare Polygon 01 -Same edges
  generatePolySE1(
    edges: PolygonEdge[],
    firstIntEdgeID: number,
    secondIntEdgeID: number,
  ): Coordinate[] {
    return this.generatePolyDE1(edges, firstIntEdgeID, secondIntEdgeID); // Same logic
  }

  /**
   * Generate an array of coordinates representing a segment of a line.
   * This method uses startPoint and endPoint to determine the segment.
   */

  //! Functiion : Generate line segement string array
  generateLineSegment(
    startPoint: Coordinate,
    endPoint: Coordinate,
    lineString: GeoJSON.LineString,
  ): Coordinate[] {
    const turfLine = turf.lineString(lineString.coordinates);
    const snappedStart = turf.nearestPointOnLine(turfLine, turf.point(startPoint));
    const snappedEnd = turf.nearestPointOnLine(turfLine, turf.point(endPoint));

    try {
      let sliced = turf.lineSlice(snappedStart, snappedEnd, turfLine);

      // 1. Check if the sliced line's direction matches the original cutting line
      const slicedStart = sliced.geometry.coordinates[0];
      const slicedEnd = sliced.geometry.coordinates[sliced.geometry.coordinates.length - 1];

      const originalLine = turf.lineString([startPoint, endPoint]); // Original cutting line
      const slicedLine = turf.lineString([slicedStart, slicedEnd]);

      const directionMatch =
        turf.booleanClockwise(originalLine) === turf.booleanClockwise(slicedLine);

      // 2. Reverse the sliced line if the directions don't match
      if (!directionMatch) {
        sliced.geometry.coordinates.reverse();
      }

      return sliced.geometry.coordinates;
    } catch (error) {
      console.error('Error slicing line:', error);
      return [];
    }
  }

  //$ helper function checking the point is valid or not
  isValidPoint(coord: Position): boolean {
    return (
      Array.isArray(coord) &&
      coord.length === 2 &&
      typeof coord[0] === 'number' &&
      typeof coord[1] === 'number'
    );
  }

  //$ Helper function to check the coordinates are equal or not
  coordinatesEqual(a: Position, b: Position): boolean {
    return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
  }

  //! Functio to merge the polygon and array

  Poligolized(
    polygonCoords: Coordinate[],
    lineSegmentCoords: Coordinate[],
    startPoint: Coordinate,
  ): Coordinate[] {
    if (!polygonCoords?.length || !lineSegmentCoords?.length) {
      console.error('Invalid input coordinates for Poligolized'); // More specific message
      return []; // Return empty or throw, consistent error handling is important.
    }

    const combinedCoords = [...polygonCoords, ...lineSegmentCoords];
    combinedCoords.push(startPoint);

    return combinedCoords;
  }

  //$ Helper methods for remove the duplicate coordinates
  private removeDuplicateCoordinates(coords: Coordinate[]): Coordinate[] {
    return coords.filter(
      (coord, index, self) => index === self.findIndex((c) => this.coordinatesEqual(c, coord)),
    );
  }

  //$ Get the area of polygon
  public getArea(feature: Feature) {
    const polygon = feature.getGeometry() as Polygon;
    const coordinates = polygon.getCoordinates();

    // Check if coordinates are in geographic coordinates (approximation)
    const isGeographic =
      Math.abs(coordinates[0][0][0]) <= 180 && Math.abs(coordinates[0][0][1]) <= 90;

    if (isGeographic) {
      const geoJsonPolygon = turf.polygon(coordinates); // Use turf.polygon()
      return turf.area(geoJsonPolygon); // Turf.js for geographic
      // Or, for less accuracy: return getArea(polygon); // Spherical
    } else {
      return polygon.getArea(); // Direct calculation for projected
    }
  }

  public transformFeature(feature: Feature): OLGeometry {
    const geometry = feature.getGeometry();
    let olGeometry: OLGeometry;

    if (geometry instanceof Polygon) {
      const polygon = geometry as Polygon;
      olGeometry = {
        type: 'Polygon',
        coordinates: polygon.getCoordinates(),
      };
    } else if (geometry instanceof LineString) {
      const lineString = geometry as LineString;
      olGeometry = {
        type: 'LineString',
        coordinates: lineString.getCoordinates(),
      };
    } else if (geometry instanceof Point) {
      const point = geometry as Point;
      olGeometry = {
        type: 'Point',
        coordinates: point.getCoordinates(),
      };
    } else {
      // Handle other geometry types as needed
      console.error('Geometry type not supported for transformation');
      return { type: 'Point', coordinates: [0, 0] }; // Return a default Point
    }

    return olGeometry; // Return the olGeometry object directly
  }
  newOLFeature(featureGeom: OLGeometry, featureProperty: FeatureProperties) {
    let geometry: Geometry;

    if (featureGeom.type === 'Point') {
      geometry = new Point(featureGeom.coordinates);
    } else if (featureGeom.type === 'LineString') {
      geometry = new LineString(featureGeom.coordinates);
    } else if (featureGeom.type === 'Polygon') {
      geometry = new Polygon(featureGeom.coordinates);
    } else {
      console.error('Unsupported geometry type:', featureGeom.type);
      return;
    }

    const olFeature = new Feature({
      geometry: geometry,
      ...featureProperty, // Set all properties from featureProperty
    });

    return olFeature;
  }

  public toTurfPolygonFeature(olPolygon: Polygon): GeoJSON.Feature<GeoJSON.Polygon> | null {
    try {
      const coordinates = olPolygon.getCoordinates();
      // Ensure the structure is [ [ [number, number], [number, number], ... ] ]
      if (coordinates.length > 0 && Array.isArray(coordinates[0])) {
        // Create a Turf.js polygon
        return turf.polygon(coordinates);
      } else {
        console.error('Invalid coordinates structure for OpenLayers Polygon:', coordinates);
        return null;
      }
    } catch (error) {
      console.error('Error converting OpenLayers Polygon to Turf.js Polygon:', error);
      return null;
    }
  }
}
