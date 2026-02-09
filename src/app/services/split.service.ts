/**
 * Need these packages:
 * npm install @turf/line-intersect
npm install @turf/point-on-line
npm install @turf/line-slice-along
npm install @turf/helpers
npm install @turf/meta
 * 
 * 
 */

import { Injectable } from '@angular/core';
import * as turf from '@turf/turf';
import type { LineString as TurfLineString } from 'geojson';
import { Feature, Position } from 'geojson';
import { Polygon } from 'ol/geom';
import LineString from 'ol/geom/LineString';
import { BehaviorSubject } from 'rxjs';
import { NotificationService } from './notifications.service';

const tolerance = 0.001; // Adjust this value as needed (e.g., 1 meter)
// Define the return type more accurately.
interface SplitResult {
  poly1: Position[][];
  poly2: Position[][];
}

interface RingSplitResult {
  segment1: Position[];
  segment2: Position[];
}

interface InsertionPoint {
  index: number;
  point: Position;
}

// type Coordinate = [number, number];
@Injectable({
  providedIn: 'root',
})
export class SplitService {
  private splitStatusSubject = new BehaviorSubject<boolean>(false);
  public splitStatus$ = this.splitStatusSubject.asObservable();

  constructor(private notificationService: NotificationService) {}

  /**
   * Performs the geometric split of a polygon by a line.
   *
   * @param lineForService - The OL LineString (in EPSG:4326) to use as the cutter.
   * @param polygonForService - The OL Polygon (in EPSG:4326) to be split.
   * @param startCoord - The explicit start coordinate of the split line.
   * @param endCoord - The explicit end coordinate of the split line.
   * @returns An object with the two resulting polygon coordinate arrays, or null if the split fails.
   */

  public splitOperation(
    lineForService: LineString,
    polygonForService: Polygon,
  ): SplitResult | null {
    // Validate inputs

    if (!lineForService || !polygonForService) {
      console.error('[SplitService] Invalid input geometries provided.');
      return null;
    }

    const lineCoords = lineForService.getCoordinates();

    // At the beginning of splitOperation
    const polyCoords = polygonForService.getCoordinates();
    if (polyCoords.length > 1) {
      console.error('[SplitService] Polygon with holes is not supported by this split operation.');
      this.notificationService.showError('Splitting polygons with holes is not supported.');
      return null;
    }

    if (!lineCoords || lineCoords.length < 2) {
      console.error('[SplitService] Invalid line geometry - insufficient coordinates.');
      return null;
    }

    if (!polyCoords || !polyCoords[0] || polyCoords[0].length < 4) {
      console.error('[SplitService] Invalid polygon geometry - insufficient coordinates.');
      return null;
    }

    try {
      console.log('[SplitService] Starting robust polygon split operation.');
      const cutterLine = turf.lineString(lineForService.getCoordinates());
      const targetPolygon = turf.polygon(polygonForService.getCoordinates());

      // 1. Find intersection points
      const intersections = turf.lineIntersect(cutterLine, targetPolygon);
      console.log(`[SplitService] Found ${intersections.features.length} intersection points.`);

      if (intersections.features.length < 2) {
        console.log('[SplitService] Insufficient intersection points found.');
        return null;
      }

      // Check for odd number of intersections (might indicate tangent touches)
      if (intersections.features.length % 2 !== 0) {
        console.warn(
          '[SplitService] Odd number of intersections detected - line may be tangent to polygon.',
        );
        return null;
      }

      // Get intersection points and ensure they're properly ordered along the cutting line
      const intersectionPoints = intersections.features.map((f) => f.geometry.coordinates);
      const sortedPoints = this.sortPointsAlongLine(intersectionPoints, cutterLine);

      if (sortedPoints.length < 2) {
        console.log('[SplitService] Could not establish proper intersection order.');
        return null;
      }

      const startPoint = sortedPoints[0];
      const endPoint = sortedPoints[sortedPoints.length - 1];

      // 2. Get the cutting segment between intersection points
      const cutterSegment = turf.lineSlice(
        turf.point(startPoint),
        turf.point(endPoint),
        cutterLine,
      );

      // 3. Get polygon exterior ring and split it at intersection points
      const ring = targetPolygon.geometry.coordinates[0];
      const splitResult = this.splitRingAtPoints(ring, startPoint, endPoint);

      if (!splitResult) {
        console.log('[SplitService] Failed to split polygon ring.');
        return null;
      }

      let { segment1, segment2 } = splitResult;
      const cutterCoords = cutterSegment.geometry.coordinates;

      segment1[0] = startPoint;
      segment1[segment1.length - 1] = endPoint;

      segment2[0] = endPoint;
      segment2[segment2.length - 1] = startPoint;
      //

      // 4. Build polygons by combining ring segments with cutter
      // Polygon 1: segment1 + reversed cutter
      let poly1Ring = [
        ...segment1,
        ...[...cutterCoords].reverse().slice(1, -1), // Exclude endpoints to avoid duplicates
      ];

      // Polygon 2: segment2 + cutter
      let poly2Ring = [
        ...segment2,
        ...cutterCoords.slice(1, -1), // Exclude endpoints to avoid duplicates
      ];

      // ==> THE FIX: Clean the rings of any consecutive duplicates <==
      poly1Ring = this.cleanRing(poly1Ring);
      poly2Ring = this.cleanRing(poly2Ring);

      const validPoly1 = this.validateRingConstruction(poly1Ring, cutterCoords, 'Poly1');
      const validPoly2 = this.validateRingConstruction(poly2Ring, cutterCoords, 'Poly2');
      if (!validPoly1 || !validPoly2) {
        console.log('[SplitService] Invalid ring construction detected.');
        return null;
      }

      // 5. Ensure rings are properly closed
      this.ensureRingClosed(poly1Ring);
      this.ensureRingClosed(poly2Ring);

      console.log('[SplitService] Poly1 ring length:', poly1Ring.length);
      console.log('[SplitService] Poly2 ring length:', poly2Ring.length);
      console.log(
        '[SplitService] Poly1 first/last:',
        poly1Ring[0],
        poly1Ring[poly1Ring.length - 1],
      );
      console.log(
        '[SplitService] Poly2 first/last:',
        poly2Ring[0],
        poly2Ring[poly2Ring.length - 1],
      );

      // 6. Validate minimum ring requirements
      if (poly1Ring.length < 4 || poly2Ring.length < 4) {
        console.log('[SplitService] Generated rings too small for valid polygons.');
        return null;
      }

      // 7. Check for and fix ring orientation (should be counter-clockwise)
      const orientedPoly1Ring = this.ensureCounterClockwise(poly1Ring);
      const orientedPoly2Ring = this.ensureCounterClockwise(poly2Ring);

      console.log(
        '[SplitService] After orientation - Poly1 first/last:',
        orientedPoly1Ring[0],
        orientedPoly1Ring[orientedPoly1Ring.length - 1],
      );
      console.log(
        '[SplitService] After orientation - Poly2 first/last:',
        orientedPoly2Ring[0],
        orientedPoly2Ring[orientedPoly2Ring.length - 1],
      );

      // 8. Create and validate final polygons
      try {
        const newPoly1 = turf.polygon([orientedPoly1Ring]);
        const newPoly2 = turf.polygon([orientedPoly2Ring]);

        const kinks1 = turf.kinks(newPoly1);
        const kinks2 = turf.kinks(newPoly2);

        if (kinks1.features.length > 0 || kinks2.features.length > 0) {
          console.error('[SplitService] Generated polygons have self-intersections.');
          console.error(
            'Poly1 kinks:',
            kinks1.features.length,
            'Poly2 kinks:',
            kinks2.features.length,
          );
          return null;
        }

        // Additional area check - both polygons should have positive area
        const area1 = turf.area(newPoly1);
        const area2 = turf.area(newPoly2);

        if (area1 <= 0 || area2 <= 0) {
          console.log('[SplitService] Generated polygons have invalid areas:', area1, area2);
          return null;
        }

        console.log('[SplitService] Split successful. Polygon areas:', area1, area2);

        this.splitStatusSubject.next(true); // Emit split even
        return {
          poly1: newPoly1.geometry.coordinates,
          poly2: newPoly2.geometry.coordinates,
        };
      } catch (creationError) {
        console.error('[SplitService] Failed to create valid polygons:', creationError);
        return null;
      }
    } catch (error) {
      console.error('[SplitService] Error during split operation:', error);
      this.notificationService.showError('An unexpected error occurred during the split.');
      return null;
    }
  }

  /**
   * Removes consecutive duplicate points from a ring.
   * @param ring The array of positions to clean.
   * @param tolerance The distance to consider points as duplicates.
   * @returns A new array with consecutive duplicates removed.
   */
  private cleanRing(ring: Position[], tolerance: number = 1e-9): Position[] {
    if (ring.length < 2) {
      return ring;
    }

    const cleanedRing: Position[] = [ring[0]];
    for (let i = 1; i < ring.length; i++) {
      const p1 = ring[i - 1];
      const p2 = ring[i];
      const distance = Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));

      if (distance > tolerance) {
        cleanedRing.push(p2);
      }
    }
    return cleanedRing;
  }

  // After building poly1Ring and poly2Ring, before closing them
  private validateRingConstruction(
    segment: Position[],
    cutterCoords: Position[],
    segmentName: string,
  ): boolean {
    const segStart = segment[0];
    const segEnd = segment[segment.length - 1];
    const cutterStart = cutterCoords[0];
    const cutterEnd = cutterCoords[cutterCoords.length - 1];

    const tolerance = 1;
    const startConnected =
      this.pointsEqual(segEnd, cutterStart, tolerance) ||
      this.pointsEqual(segEnd, cutterEnd, tolerance);
    const endConnected =
      this.pointsEqual(segStart, cutterStart, tolerance) ||
      this.pointsEqual(segStart, cutterEnd, tolerance);

    if (!startConnected || !endConnected) {
      console.warn(
        `[SplitService] ${segmentName} construction validation failed - improper connection to cutter.`,
      );
      return false;
    }

    return true;
  }

  private pointsEqual(p1: Position, p2: Position, tolerance: number = 1e-10): boolean {
    return Math.abs(p1[0] - p2[0]) < tolerance && Math.abs(p1[1] - p2[1]) < tolerance;
  }
  // Helper: Sort intersection points along the cutting line
  private sortPointsAlongLine(points: Position[], line: Feature<TurfLineString>): Position[] {
    return points.sort((a, b) => {
      const distA = turf.distance(turf.point(line.geometry.coordinates[0]), turf.point(a));
      const distB = turf.distance(turf.point(line.geometry.coordinates[0]), turf.point(b));
      return distA - distB;
    });
  }

  // Helper: Split polygon ring at two intersection points
  private splitRingAtPoints(
    ring: Position[],
    startPoint: Position,
    endPoint: Position,
  ): { segment1: Position[]; segment2: Position[] } | null {
    // Find the positions where we need to insert the intersection points
    const startInsertInfo = this.findInsertionPoint(ring, startPoint);
    const endInsertInfo = this.findInsertionPoint(ring, endPoint);

    // Ensure we have valid insertion info
    if (!startInsertInfo || !endInsertInfo) {
      console.error('[SplitService] Could not find insertion points on the polygon ring.');
      return null;
    }

    // Use a map to store points by their preceding vertex index for easy lookup.
    const insertionMap = new Map<number, Position>();
    insertionMap.set(startInsertInfo.index, startInsertInfo.point);
    insertionMap.set(endInsertInfo.index, endInsertInfo.point);

    // Create a working copy of the ring without the closing point
    const fullRing: Position[] = [];
    const workingRing = ring.slice(0, -1);

    // Rebuild the ring, inserting points as we go.
    for (let i = 0; i < workingRing.length; i++) {
      fullRing.push(workingRing[i]);
      if (insertionMap.has(i)) {
        fullRing.push(insertionMap.get(i)!);
      }
    }

    // Now find the indices in the newly constructed, stable ring.
    const newStartIndex = fullRing.findIndex((p) => this.pointsEqual(p, startPoint));
    const newEndIndex = fullRing.findIndex((p) => this.pointsEqual(p, endPoint));

    if (newStartIndex === -1 || newEndIndex === -1) {
      console.error('[SplitService] Failed to locate split points in the reconstructed ring.');
      return null;
    }

    // The rest of the slicing logic remains the same...
    let segment1: Position[];
    let segment2: Position[];

    if (newStartIndex < newEndIndex) {
      segment1 = fullRing.slice(newStartIndex, newEndIndex + 1);
      segment2 = [...fullRing.slice(newEndIndex), ...fullRing.slice(0, newStartIndex + 1)];
    } else {
      // Wraps around
      segment1 = [...fullRing.slice(newStartIndex), ...fullRing.slice(0, newEndIndex + 1)];
      segment2 = fullRing.slice(newEndIndex, newStartIndex + 1);
    }

    return { segment1, segment2 };

    //######

    // Insert points (insert the later index first to avoid index shifting)
    // const insertions = [startInsertInfo, endInsertInfo].sort((a, b) => b.index - a.index);

    // for (const insertion of insertions) {
    //   workingRing.splice(insertion.index + 1, 0, insertion.point);
    // }

    // // Find the new indices after insertion
    // const newStartIndex = workingRing.findIndex(p =>
    //   Math.abs(p[0] - startPoint[0]) < 1e-10 && Math.abs(p[1] - startPoint[1]) < 1e-10
    // );
    // const newEndIndex = workingRing.findIndex(p =>
    //   Math.abs(p[0] - endPoint[0]) < 1e-10 && Math.abs(p[1] - endPoint[1]) < 1e-10
    // );

    // if (newStartIndex === -1 || newEndIndex === -1) {
    //   return null;
    // }

    // // Create the two segments
    // // let segment1: Position[];
    // // let segment2: Position[];

    // if (newStartIndex < newEndIndex) {
    //   segment1 = workingRing.slice(newStartIndex, newEndIndex + 1);
    //   segment2 = [
    //     ...workingRing.slice(newEndIndex),
    //     ...workingRing.slice(0, newStartIndex + 1)
    //   ];
    // } else {
    //   segment1 = [
    //     ...workingRing.slice(newStartIndex),
    //     ...workingRing.slice(0, newEndIndex + 1)
    //   ];
    //   segment2 = workingRing.slice(newEndIndex, newStartIndex + 1);
    // }

    // return { segment1, segment2 };
  }

  // Helper: Find where to insert an intersection point on a polygon edge
  private findInsertionPoint(ring: Position[], point: Position): InsertionPoint | null {
    const tolerance = 1e-8;

    for (let i = 0; i < ring.length - 1; i++) {
      const p1 = ring[i];
      const p2 = ring[(i + 1) % (ring.length - 1)];

      // Check if point lies on the edge between p1 and p2
      const line = turf.lineString([p1, p2]);
      const pointFeature = turf.point(point);

      if (turf.booleanPointOnLine(pointFeature, line, { epsilon: tolerance })) {
        // Additional validation: ensure point is between p1 and p2
        const distP1ToPoint = turf.distance(turf.point(p1), pointFeature);
        const distP2ToPoint = turf.distance(turf.point(p2), pointFeature);
        const distP1ToP2 = turf.distance(turf.point(p1), turf.point(p2));

        // Point should be between p1 and p2 (with small tolerance for floating point)
        if (Math.abs(distP1ToPoint + distP2ToPoint - distP1ToP2) < tolerance) {
          return { index: i, point: point };
        }
      }
    }

    return null;
  }
  // Helper: Ensure ring is properly closed
  private ensureRingClosed(ring: Position[]): void {
    if (ring.length > 0) {
      const first = ring[0];
      const last = ring[ring.length - 1];

      // Check if first and last points are different
      if (Math.abs(first[0] - last[0]) > 1e-10 || Math.abs(first[1] - last[1]) > 1e-10) {
        ring.push([first[0], first[1]]);
      } else {
        // Even if they seem close, ensure exact equality for Turf.js
        ring[ring.length - 1] = [first[0], first[1]];
      }
    }
  }

  // Helper: Ensure ring is counter-clockwise (required by GeoJSON spec)
  private ensureCounterClockwise(ring: Position[]): Position[] {
    // Calculate signed area to determine orientation
    let area = 0;
    const n = ring.length - 1; // Exclude the closing point from calculation

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
    }

    // If area is positive, ring is clockwise, so reverse it
    if (area > 0) {
      const reversed = [...ring];
      reversed.reverse();
      // Ensure the closing point matches the first point after reversal
      reversed[reversed.length - 1] = [reversed[0][0], reversed[0][1]];
      return reversed;
    }

    // Ensure closing point is exactly equal to first point
    ring[ring.length - 1] = [ring[0][0], ring[0][1]];
    return ring;
  }
}
/**
 




// public splitOperation(splitLine: LineString, splitPoly: Polygon, startCoord: Position, endCoord: Position): SplitResult {
//   try {
//     // 1. Convert OL geometries to Turf.js format using the new helper imports.
//     const turfPolygon = polygon(splitPoly.getCoordinates());
//     const bufferedPolygon = turf.buffer(turfPolygon, tolerance, { units: 'kilometers' }); // Apply buffer



//     const turfLine = lineString(splitLine.getCoordinates());

//     // // 2. Find the intersection points.
//     // const intersections = lineIntersect(turfLine, bufferedPolygon!);

//     // if (intersections.features.length < 2) {
//     //   this.notificationService.showError(`Split failed: The line must cross the polygon in two distinct places. Found ${intersections.features.length} intersections.`);
//     //   return undefined;
//     // }

//     const intPoint1 = startCoord;
//     const intPoint2 = endCoord;
//     const polygonAsLine = lineString(turfPolygon.geometry.coordinates[0]);

//     // 3. Find the exact locations (distances) of the intersection points along the polygon's boundary.
//     const pointOnLineResult1 = pointOnLine(polygonAsLine, intPoint1);
//     const pointOnLineResult2 = pointOnLine(polygonAsLine, intPoint2);

//     if (pointOnLineResult1.properties.location === undefined || pointOnLineResult2.properties.location === undefined) {
//       throw new Error("Could not determine intersection location on polygon boundary.");
//     }

//     const loc1 = pointOnLineResult1.properties.location;
//     const loc2 = pointOnLineResult2.properties.location;

//     let poly1_segment_coords: Coordinate[];
//     let poly2_segment_coords: Coordinate[];

//     const lineCoordsForSlicing = turfLine.geometry.coordinates;
//     const totalLength = length(polygonAsLine);

//     // 4. Slice the polygon's boundary into two pieces based on the intersection locations.
//     if (loc1 < loc2) {
//       poly1_segment_coords = lineSliceAlong(polygonAsLine, loc1, loc2).geometry.coordinates;
//       poly2_segment_coords = lineSliceAlong(polygonAsLine, loc2, totalLength).geometry.coordinates.concat(
//                              lineSliceAlong(polygonAsLine, 0, loc1).geometry.coordinates
//                            );
//     } else {
//       poly1_segment_coords = lineSliceAlong(polygonAsLine, loc2, loc1).geometry.coordinates;
//       poly2_segment_coords = lineSliceAlong(polygonAsLine, loc1, totalLength).geometry.coordinates.concat(
//                              lineSliceAlong(polygonAsLine, 0, loc2).geometry.coordinates
//                            );
//     }

//     // 5. Stitch the pieces together with the split line to form the new polygons.
//     const finalPoly1Coords = [ ...poly1_segment_coords, ...lineCoordsForSlicing.slice().reverse(), poly1_segment_coords[0] ];
//     const finalPoly2Coords = [ ...poly2_segment_coords, ...lineCoordsForSlicing, poly2_segment_coords[0] ];

//     const poly1Result = polygon([finalPoly1Coords]);
//     const poly2Result = polygon([finalPoly2Coords]);

//     return {
//       poly1: poly1Result.geometry.coordinates, //WGS 84 coordinates
//       poly2: poly2Result.geometry.coordinates,// WGS 84 Coordinates 

//     };

//   } catch (error: any) {
//     console.error("An error occurred during the split operation:", error);
//     this.notificationService.showError(`Calculation error: ${error.message}`);
//     return undefined;
//   }
// }
//########


//Converting the openLayer features into GeoJSON objects
//  ;

//   // this will ensure that geoJSON objects are are not null
//   this.splitPolyGeoJSON = splitPoly ? format.writeGeometryObject(splitPoly) as GeoJSON.Polygon : null;
//   this.splitLineGeoJSON = splitLine ? format.writeGeometryObject(splitLine) as GeoJSON.LineString : null;



//   if (!this.splitPolyGeoJSON || !this.splitLineGeoJSON) {
//     console.error('Invalid splitPoly or splitLine');
//     return { poly1: [], poly2: [] }; // Return empty arrays to avoid errors
//   };

//   const exteriorRing = this.splitPolyGeoJSON.coordinates[0];
//   const isClosed = exteriorRing.length > 0 && this.geomService.coordinatesEqual(exteriorRing[0], exteriorRing[exteriorRing.length - 1]);
//   const cleanedRing = isClosed ? exteriorRing.slice(0, -1) : exteriorRing;

//   // ....... Create Array of Polygon Edges .....
//   // Reset the array before populating it.
//   this.PolyEdges = cleanedRing.map((coord, i) => ({
//     start: coord,
//     end: cleanedRing[(i + 1) % cleanedRing.length],
//     ID: i,
//     feature: turf.lineString([coord, cleanedRing[(i + 1) % cleanedRing.length]])
//   }));


//     // Add closing edge for unclosed polygons
//     if (!isClosed && cleanedRing.length > 0) {
//       this.PolyEdges.push({
//         start: cleanedRing[cleanedRing.length - 1],
//         end: cleanedRing[0],
//         ID: cleanedRing.length,
//         feature: turf.lineString([cleanedRing[cleanedRing.length - 1], cleanedRing[0]])
//       });
//     }



//   // ....... Find  the intersection  coordinates ......
//   const intersection = turf.lineIntersect(this.splitLineGeoJSON, this.splitPolyGeoJSON);

//     if (intersection.features.length >= 2) {
//     this.turfIntPt1 = intersection.features[0].geometry.coordinates;
//     this.turfIntPt2 = intersection.features[1].geometry.coordinates;

//      const result = this.geomService.lineIntersectionEdgeID(
//       this.PolyEdges,
//       this.splitLineGeoJSON,
//       this.turfIntPt1!,
//       this.turfIntPt2!
//     );


//   // 
//   if (result.firstIntersection && result.secondIntersection) {
//     this.turfIntPt1 = result.firstIntersection;
//     this.turfIntPt2 = result.secondIntersection;
//   } else {
//     console.error('Invalid intersection results from geometry service');
//     this.notificationService.showError('Invalid intersection results')
//     return undefined;
//   }

//   this.lineSegmentPoints = this.geomService.generateLineSegment(this.turfIntPt1, this.turfIntPt2, this.splitLineGeoJSON);

// } else {
//   console.error('Line does not intersect the polygon at two points.');
//   this.notificationService.showError('Line does not intersect')
//   return undefined
// }

//  let poly1: Coordinate[] = [];
//   let poly2: Coordinate[] = [];


//   const firstIntEdge = this.PolyEdges.find(edge => {
//     const distance = turf.pointToLineDistance(turf.point(this.turfIntPt1), edge.feature);
//     return distance <= tolerance;
//   });

//   const secondIntEdge = this.PolyEdges.find(edge => {
//     const distance = turf.pointToLineDistance(turf.point(this.turfIntPt2), edge.feature);
//     return distance <= tolerance;
//   });

//   if (!firstIntEdge || !secondIntEdge) {
//     console.error("Intersection points not found on edges (within tolerance).", this.turfIntPt1, this.turfIntPt2);
//   console.log("PolyEdges:", this.PolyEdges); // Log edges for debugging
//     return { poly1:  [], poly2:  [] };
//   }

//   if (firstIntEdge.ID !== secondIntEdge.ID) {
//     poly1 = this.geomService.generatePolyDE1(this.PolyEdges, firstIntEdge.ID, secondIntEdge.ID);
//     poly2 = this.geomService.generatePolyDE2(this.PolyEdges, firstIntEdge.ID, secondIntEdge.ID);
//   } else {
//     poly1 = this.geomService.generatePolySE1(this.PolyEdges, firstIntEdge.ID, secondIntEdge.ID);
//     poly2 = [...this.lineSegmentPoints];
//     poly2.push(poly2[0]);
//   }

//   const finalPoly1 = this.geomService.Poligolized(poly1, this.lineSegmentPoints, poly1[0]);
//   const finalPoly2 = this.geomService.Poligolized(poly2, this.lineSegmentPoints, poly2[0]);

//   return { poly1: finalPoly1, poly2: finalPoly2 };
// }
*/
