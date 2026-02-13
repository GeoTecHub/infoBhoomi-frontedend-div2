import { Injectable } from '@angular/core';
import * as turf from '@turf/turf';
import type { LineString as TurfLineString } from 'geojson';
import { Feature, Position } from 'geojson';
import { Polygon } from 'ol/geom';
import LineString from 'ol/geom/LineString';
import { BehaviorSubject } from 'rxjs';
import { NotificationService } from './notifications.service';

// Tolerance for coordinate comparison in EPSG:4326 degrees.
// 1e-7 degrees ≈ 1.1 cm at the equator — tight enough for land parcels,
// but loose enough to absorb floating-point drift from EPSG:3857→4326
// projection transforms and Turf.js intersection computations.
const COORD_TOLERANCE = 1e-7;

// Tolerance for the triangle-inequality betweenness check (in kilometers),
// matching the unit returned by turf.distance().
const DISTANCE_TOLERANCE_KM = 1e-4; // ~10 cm — absorbs FP error in distance sums

interface SplitResult {
  poly1: Position[][];
  poly2: Position[][];
}

interface InsertionPoint {
  index: number;
  point: Position;
}

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
   * @returns An object with the two resulting polygon coordinate arrays, or null if the split fails.
   */
  public splitOperation(
    lineForService: LineString,
    polygonForService: Polygon,
  ): SplitResult | null {
    if (!lineForService || !polygonForService) {
      return null;
    }

    const lineCoords = lineForService.getCoordinates();
    const polyCoords = polygonForService.getCoordinates();

    if (polyCoords.length > 1) {
      this.notificationService.showError('Splitting polygons with holes is not supported.');
      return null;
    }

    if (!lineCoords || lineCoords.length < 2) {
      return null;
    }

    if (!polyCoords || !polyCoords[0] || polyCoords[0].length < 4) {
      return null;
    }

    try {
      const cutterLine = turf.lineString(lineForService.getCoordinates());
      const targetPolygon = turf.polygon(polygonForService.getCoordinates());

      // 1. Find intersection points
      const intersections = turf.lineIntersect(cutterLine, targetPolygon);

      if (intersections.features.length < 2) {
        return null;
      }

      // Get intersection points ordered along the cutting line
      const intersectionPoints = intersections.features.map((f) => f.geometry.coordinates);
      const sortedPoints = this.sortPointsAlongLine(intersectionPoints, cutterLine);

      if (sortedPoints.length < 2) {
        return null;
      }

      // Select the correct pair of intersection points for splitting.
      // The cutting line may extend beyond the polygon (the caller extends it
      // for robustness), producing 4+ intersections (enter/exit/enter/exit).
      // We pick the consecutive pair whose midpoint lies inside the polygon,
      // i.e. the segment that truly crosses the polygon interior.
      const splitPair = this.selectSplitPair(sortedPoints, targetPolygon);
      if (!splitPair) {
        return null;
      }
      const { startPoint, endPoint } = splitPair;

      // 2. Get the cutting segment between the selected intersection points
      const cutterSegment = turf.lineSlice(
        turf.point(startPoint),
        turf.point(endPoint),
        cutterLine,
      );

      // 3. Get polygon exterior ring and split it at intersection points
      const ring = targetPolygon.geometry.coordinates[0];
      const splitResult = this.splitRingAtPoints(ring, startPoint, endPoint);

      if (!splitResult) {
        return null;
      }

      let { segment1, segment2 } = splitResult;
      const cutterCoords = cutterSegment.geometry.coordinates;

      segment1[0] = startPoint;
      segment1[segment1.length - 1] = endPoint;

      segment2[0] = endPoint;
      segment2[segment2.length - 1] = startPoint;

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

      // Clean the rings of any consecutive duplicates
      poly1Ring = this.cleanRing(poly1Ring);
      poly2Ring = this.cleanRing(poly2Ring);

      if (
        !this.validateRingConstruction(poly1Ring, cutterCoords) ||
        !this.validateRingConstruction(poly2Ring, cutterCoords)
      ) {
        return null;
      }

      // 5. Ensure rings are properly closed
      this.ensureRingClosed(poly1Ring);
      this.ensureRingClosed(poly2Ring);

      // 6. Validate minimum ring requirements
      if (poly1Ring.length < 4 || poly2Ring.length < 4) {
        return null;
      }

      // 7. Ensure counter-clockwise orientation (GeoJSON spec for exterior rings)
      const orientedPoly1Ring = this.ensureCounterClockwise(poly1Ring);
      const orientedPoly2Ring = this.ensureCounterClockwise(poly2Ring);

      // 8. Create and validate final polygons
      try {
        const newPoly1 = turf.polygon([orientedPoly1Ring]);
        const newPoly2 = turf.polygon([orientedPoly2Ring]);

        const kinks1 = turf.kinks(newPoly1);
        const kinks2 = turf.kinks(newPoly2);

        if (kinks1.features.length > 0 || kinks2.features.length > 0) {
          return null;
        }

        // Both polygons should have positive area
        const area1 = turf.area(newPoly1);
        const area2 = turf.area(newPoly2);

        if (area1 <= 0 || area2 <= 0) {
          return null;
        }

        this.splitStatusSubject.next(true);
        return {
          poly1: newPoly1.geometry.coordinates,
          poly2: newPoly2.geometry.coordinates,
        };
      } catch {
        return null;
      }
    } catch (error) {
      this.notificationService.showError('An unexpected error occurred during the split.');
      return null;
    }
  }

  /** Resets the split status so subscribers don't receive stale `true` values. */
  public resetSplitStatus(): void {
    this.splitStatusSubject.next(false);
  }

  /**
   * Removes consecutive duplicate points from a ring.
   * Uses the unified COORD_TOLERANCE (degrees) for Euclidean comparison.
   */
  private cleanRing(ring: Position[]): Position[] {
    if (ring.length < 2) {
      return ring;
    }

    const cleanedRing: Position[] = [ring[0]];
    for (let i = 1; i < ring.length; i++) {
      if (!this.pointsEqual(ring[i - 1], ring[i])) {
        cleanedRing.push(ring[i]);
      }
    }
    return cleanedRing;
  }

  /**
   * Validates that a constructed ring's start and end connect to the cutter line endpoints.
   */
  private validateRingConstruction(segment: Position[], cutterCoords: Position[]): boolean {
    const segStart = segment[0];
    const segEnd = segment[segment.length - 1];
    const cutterStart = cutterCoords[0];
    const cutterEnd = cutterCoords[cutterCoords.length - 1];

    const startConnected =
      this.pointsEqual(segEnd, cutterStart) || this.pointsEqual(segEnd, cutterEnd);
    const endConnected =
      this.pointsEqual(segStart, cutterStart) || this.pointsEqual(segStart, cutterEnd);

    return startConnected && endConnected;
  }

  /** Compares two positions using the unified COORD_TOLERANCE. */
  private pointsEqual(p1: Position, p2: Position): boolean {
    return Math.abs(p1[0] - p2[0]) < COORD_TOLERANCE && Math.abs(p1[1] - p2[1]) < COORD_TOLERANCE;
  }

  /** Sorts intersection points by their distance from the start of the cutting line. */
  private sortPointsAlongLine(points: Position[], line: Feature<TurfLineString>): Position[] {
    return points.sort((a, b) => {
      const distA = turf.distance(turf.point(line.geometry.coordinates[0]), turf.point(a));
      const distB = turf.distance(turf.point(line.geometry.coordinates[0]), turf.point(b));
      return distA - distB;
    });
  }

  /**
   * From a sorted list of intersection points, selects the consecutive pair
   * that represents the user's intended cut across the polygon interior.
   *
   * The cutting line may be extended far beyond the polygon, producing 4+
   * intersections where extension segments briefly cross the boundary.
   * We collect ALL consecutive pairs whose midpoint is inside the polygon,
   * then pick the one with the greatest distance between its two points —
   * that is the real cut, not a short extension-boundary crossing.
   */
  private selectSplitPair(
    sortedPoints: Position[],
    polygon: ReturnType<typeof turf.polygon>,
  ): { startPoint: Position; endPoint: Position } | null {
    if (sortedPoints.length === 2) {
      return { startPoint: sortedPoints[0], endPoint: sortedPoints[1] };
    }

    // Collect all consecutive pairs whose midpoint lies inside the polygon.
    let bestPair: { startPoint: Position; endPoint: Position } | null = null;
    let bestDist = -1;

    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const a = sortedPoints[i];
      const b = sortedPoints[i + 1];
      const mid = turf.point([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);

      if (turf.booleanPointInPolygon(mid, polygon)) {
        const dist = turf.distance(turf.point(a), turf.point(b));
        if (dist > bestDist) {
          bestDist = dist;
          bestPair = { startPoint: a, endPoint: b };
        }
      }
    }

    return bestPair;
  }

  /**
   * Splits a polygon exterior ring at two intersection points into two segments.
   * Handles the case where both points fall on the same edge by storing
   * insertions in an array instead of a map keyed by edge index.
   */
  private splitRingAtPoints(
    ring: Position[],
    startPoint: Position,
    endPoint: Position,
  ): { segment1: Position[]; segment2: Position[] } | null {
    const startInsertInfo = this.findInsertionPoint(ring, startPoint);
    const endInsertInfo = this.findInsertionPoint(ring, endPoint);

    if (!startInsertInfo || !endInsertInfo) {
      return null;
    }

    // Collect all insertions per edge index to handle the same-edge case.
    const insertionsByEdge = new Map<number, InsertionPoint[]>();

    for (const info of [startInsertInfo, endInsertInfo]) {
      const existing = insertionsByEdge.get(info.index) ?? [];
      existing.push(info);
      insertionsByEdge.set(info.index, existing);
    }

    // When two points are on the same edge, order them by distance from the
    // edge start vertex so they are inserted in the correct sequence.
    for (const [edgeIndex, points] of insertionsByEdge) {
      if (points.length > 1) {
        const edgeStart = ring[edgeIndex];
        points.sort((a, b) => {
          const dA = Math.hypot(a.point[0] - edgeStart[0], a.point[1] - edgeStart[1]);
          const dB = Math.hypot(b.point[0] - edgeStart[0], b.point[1] - edgeStart[1]);
          return dA - dB;
        });
        insertionsByEdge.set(edgeIndex, points);
      }
    }

    // Rebuild the ring (without closing point), inserting split points.
    const fullRing: Position[] = [];
    const workingRing = ring.slice(0, -1);

    for (let i = 0; i < workingRing.length; i++) {
      fullRing.push(workingRing[i]);
      const inserts = insertionsByEdge.get(i);
      if (inserts) {
        for (const ins of inserts) {
          fullRing.push(ins.point);
        }
      }
    }

    // Find the indices of the split points in the rebuilt ring.
    const newStartIndex = fullRing.findIndex((p) => this.pointsEqual(p, startPoint));
    const newEndIndex = fullRing.findIndex((p) => this.pointsEqual(p, endPoint));

    if (newStartIndex === -1 || newEndIndex === -1) {
      return null;
    }

    let segment1: Position[];
    let segment2: Position[];

    if (newStartIndex < newEndIndex) {
      segment1 = fullRing.slice(newStartIndex, newEndIndex + 1);
      segment2 = [...fullRing.slice(newEndIndex), ...fullRing.slice(0, newStartIndex + 1)];
    } else {
      segment1 = [...fullRing.slice(newStartIndex), ...fullRing.slice(0, newEndIndex + 1)];
      segment2 = fullRing.slice(newEndIndex, newStartIndex + 1);
    }

    return { segment1, segment2 };
  }

  /**
   * Finds the edge on which an intersection point lies and returns its
   * insertion index.
   *
   * Strategy (in order):
   *  1. Check if the point coincides with a ring vertex — if so, no
   *     insertion is needed; return that vertex's preceding edge index.
   *  2. Test each edge with booleanPointOnLine + triangle-inequality
   *     betweenness check.
   *  3. Fallback: find the edge closest to the point (handles FP drift
   *     from projection transforms that pushes the point slightly off-edge).
   */
  private findInsertionPoint(ring: Position[], point: Position): InsertionPoint | null {
    const pointFeature = turf.point(point);

    // 1. Check if the point is at an existing ring vertex.
    //    If so, return the index of the preceding edge so the point is
    //    "already inserted" at that position in the ring.
    for (let i = 0; i < ring.length - 1; i++) {
      if (this.pointsEqual(ring[i], point)) {
        // Point matches vertex i — use the edge ending at i (i.e. edge i-1),
        // but since the point already exists, return index i with the exact
        // vertex coords so the insertion becomes a no-op duplicate that
        // cleanRing will remove.
        return { index: Math.max(0, i - 1), point: ring[i] };
      }
    }

    // 2. Standard edge check: booleanPointOnLine + betweenness.
    for (let i = 0; i < ring.length - 1; i++) {
      const p1 = ring[i];
      const p2 = ring[i + 1];

      const line = turf.lineString([p1, p2]);

      if (turf.booleanPointOnLine(pointFeature, line, { epsilon: COORD_TOLERANCE })) {
        const distP1ToPoint = turf.distance(turf.point(p1), pointFeature);
        const distP2ToPoint = turf.distance(turf.point(p2), pointFeature);
        const distP1ToP2 = turf.distance(turf.point(p1), turf.point(p2));

        if (Math.abs(distP1ToPoint + distP2ToPoint - distP1ToP2) < DISTANCE_TOLERANCE_KM) {
          return { index: i, point: point };
        }
      }
    }

    // 3. Fallback: find the nearest edge using point-to-line-segment distance.
    //    This handles cases where FP drift from coordinate transforms pushes
    //    the intersection point slightly off the exact edge.
    let bestEdge = -1;
    let bestDist = Infinity;

    for (let i = 0; i < ring.length - 1; i++) {
      const edgeLine = turf.lineString([ring[i], ring[i + 1]]);
      const dist = turf.pointToLineDistance(pointFeature, edgeLine);
      if (dist < bestDist) {
        bestDist = dist;
        bestEdge = i;
      }
    }

    // Accept the nearest edge if the point is within ~1 meter of it.
    if (bestEdge !== -1 && bestDist < 0.001) {
      return { index: bestEdge, point: point };
    }

    return null;
  }

  /** Ensures a ring is properly closed (first point === last point). */
  private ensureRingClosed(ring: Position[]): void {
    if (ring.length > 0) {
      const first = ring[0];
      const last = ring[ring.length - 1];

      if (!this.pointsEqual(first, last)) {
        ring.push([first[0], first[1]]);
      } else {
        // Ensure exact value equality for Turf.js
        ring[ring.length - 1] = [first[0], first[1]];
      }
    }
  }

  /**
   * Ensures a ring follows counter-clockwise winding (GeoJSON RFC 7946 exterior ring).
   *
   * Uses the shoelace formula: for lon/lat coordinates (X=lon, Y=lat) the
   * formula sum((x_{i+1} - x_i) * (y_{i+1} + y_i)) yields a positive value
   * for clockwise winding, so we reverse when positive.
   */
  private ensureCounterClockwise(ring: Position[]): Position[] {
    let area = 0;
    const n = ring.length - 1; // Exclude the closing point

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
    }

    if (area > 0) {
      const reversed = [...ring].reverse();
      reversed[reversed.length - 1] = [reversed[0][0], reversed[0][1]];
      return reversed;
    }

    ring[ring.length - 1] = [ring[0][0], ring[0][1]];
    return ring;
  }
}
