import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID, signal } from '@angular/core';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import {
  ACCURACY_LEVEL_DISPLAY,
  BOUNDARY_TYPE_DISPLAY,
  LAND_USE_DISPLAY,
  LandParcelInfo,
  PARCEL_STATUS_DISPLAY,
  PARCEL_TYPE_DISPLAY,
  ParcelStatus,
  RIGHT_TYPE_DISPLAY,
  SOIL_TYPE_DISPLAY,
  SURVEY_METHOD_DISPLAY,
  TENURE_TYPE_DISPLAY,
  ZONING_CATEGORY_DISPLAY,
} from '../../../models/land-parcel.model';
import { MapService } from '../../../services/map.service';
import { MultiPolygon, Polygon } from 'ol/geom';
import { getArea } from 'ol/sphere';
/** Two extents [minX,minY,maxX,maxY] overlap when they share area. */
const extentsIntersect = (a: number[], b: number[]) =>
  a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];

export interface LandParcelReportData {
  parcel: LandParcelInfo;
  featureId: string | number | null;
  layerId: number | null;
}

type ReportTab = 'overview' | 'spatial' | 'land' | 'zoning' | 'valuation' | 'rrr' | 'metadata';

interface SketchParcel {
  id: string;
  isSelected: boolean;
  points: string;
  fill: string;
  stroke: string;
  textX: number;
  textY: number;
  idLine: string;
  areaLine: string;
}

interface SketchDim {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  labelX: number;
  labelY: number;
  text: string;
  vertical: boolean;
}

interface ParcelSketch {
  svgW: number;
  svgH: number;
  parcels: SketchParcel[];
  scaleBarX: number;
  scaleBarY: number;
  scaleBarW: number;
  scaleBarLabel: string;
  northX: number;
  northY: number;
  hasRoad: boolean;
  roadX: number;
  roadY: number;
  roadW: number;
  roadH: number;
  dimEW: SketchDim;
  dimNS: SketchDim;
}

export interface AdjRow {
  id: string;
  landUse: string;
  areaM2: number;
  areaAcres: string;
  direction: string;
}

@Component({
  selector: 'app-land-parcel-report',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, CdkDrag, CdkDragHandle],
  templateUrl: './land-parcel-report.component.html',
  styleUrls: ['./land-parcel-report.component.css'],
})
export class LandParcelReportComponent {
  activeTab = signal<ReportTab>('overview');

  readonly tabs: { id: ReportTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'info' },
    { id: 'spatial', label: 'Spatial', icon: 'straighten' },
    { id: 'land', label: 'Land & Physical', icon: 'landscape' },
    { id: 'zoning', label: 'Zoning', icon: 'domain' },
    { id: 'valuation', label: 'Valuation', icon: 'monetization_on' },
    { id: 'rrr', label: 'Rights & RRR', icon: 'gavel' },
    { id: 'metadata', label: 'Metadata', icon: 'fact_check' },
  ];

  // Display maps
  readonly LAND_USE_DISPLAY = LAND_USE_DISPLAY;
  readonly TENURE_TYPE_DISPLAY = TENURE_TYPE_DISPLAY;
  readonly PARCEL_TYPE_DISPLAY = PARCEL_TYPE_DISPLAY;
  readonly PARCEL_STATUS_DISPLAY = PARCEL_STATUS_DISPLAY;
  readonly BOUNDARY_TYPE_DISPLAY = BOUNDARY_TYPE_DISPLAY;
  readonly SOIL_TYPE_DISPLAY = SOIL_TYPE_DISPLAY;
  readonly ZONING_CATEGORY_DISPLAY = ZONING_CATEGORY_DISPLAY;
  readonly ACCURACY_LEVEL_DISPLAY = ACCURACY_LEVEL_DISPLAY;
  readonly SURVEY_METHOD_DISPLAY = SURVEY_METHOD_DISPLAY;
  readonly RIGHT_TYPE_DISPLAY = RIGHT_TYPE_DISPLAY;

  // Sketch state
  sketchData = signal<ParcelSketch | null>(null);
  sketchBuilding = signal(false);
  sketchError = signal<string | null>(null);
  adjRows = signal<AdjRow[]>([]);
  private sketchBuilt = false;

  private readonly LU_FILL: Record<string, string> = {
    Residential: '#b2dfdb',
    Commercial: '#fff59d',
    Industrial: '#ffccbc',
    Agricultural: '#c8e6c9',
    'Mixed Use': '#e1bee7',
    Vacant: '#eeeeee',
  };

  private readonly LU_STROKE: Record<string, string> = {
    Residential: '#00796b',
    Commercial: '#f9a825',
    Industrial: '#bf360c',
    Agricultural: '#388e3c',
    'Mixed Use': '#7b1fa2',
    Vacant: '#9e9e9e',
  };

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: LandParcelReportData,
    public dialogRef: MatDialogRef<LandParcelReportComponent>,
    @Inject(PLATFORM_ID) private platformId: object,
    private mapService: MapService,
  ) {}

  get parcel(): LandParcelInfo {
    return this.data.parcel;
  }

  get generatedAt(): string {
    return new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  setActiveTab(tab: ReportTab): void {
    this.activeTab.set(tab);
    if (tab === 'spatial' && !this.sketchBuilt) {
      this.sketchBuilt = true;
      this.buildSketch();
    }
  }

  formatAreaAcres(m2: number): string {
    if (!m2) return '—';
    const acres = m2 / 4046.856;
    if (acres >= 0.01) return `${acres.toFixed(3)} ac`;
    return `${m2.toFixed(0)} m²`;
  }

  getStatusClass(status: ParcelStatus | string): string {
    switch (status) {
      case ParcelStatus.ACTIVE:
      case 'ACTIVE':
        return 'lpr-badge--active';
      case ParcelStatus.PENDING:
      case 'PENDING':
        return 'lpr-badge--pending';
      case ParcelStatus.SUSPENDED:
      case 'SUSPENDED':
        return 'lpr-badge--suspended';
      case ParcelStatus.HISTORIC:
      case 'HISTORIC':
        return 'lpr-badge--historic';
      default:
        return 'lpr-badge--pending';
    }
  }

  formatArea(m2: number): string {
    if (!m2) return '—';
    if (m2 >= 10000) return `${(m2 / 10000).toFixed(4)} ha`;
    return `${m2.toLocaleString('en-GB', { maximumFractionDigits: 2 })} m²`;
  }

  formatAreaM2(m2: number): string {
    if (!m2) return '—';
    return `${m2.toLocaleString('en-GB', { maximumFractionDigits: 2 })} m²`;
  }

  formatCurrency(val: number): string {
    if (!val) return '—';
    return val.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatCoord(val: number): string {
    if (!val) return '—';
    return val.toFixed(6);
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  printReport(): void {
    window.print();
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  // ── Cadastral Sketch Builder ──────────────────────────────────────────────

  private buildSketch(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.sketchError.set('Map not available in server-side rendering.');
      return;
    }
    if (!this.data.layerId) {
      this.sketchError.set('No layer ID available for this parcel.');
      return;
    }

    this.sketchBuilding.set(true);
    this.sketchError.set(null);

    const layer = this.mapService.findLayerByNumericId(this.data.layerId);
    if (!layer?.getSource()) {
      this.sketchError.set(
        'Parcel layer not found on map. Ensure the land layer is visible and loaded.',
      );
      this.sketchBuilding.set(false);
      return;
    }

    const source = layer.getSource()!;
    const allFeatures = source.getFeatures();

    if (!allFeatures.length) {
      this.sketchError.set('No features loaded in parcel layer.');
      this.sketchBuilding.set(false);
      return;
    }

    const targetId = String(this.data.featureId);
    const selected = allFeatures.find(
      (f) =>
        String(f.getId()) === targetId ||
        String(f.get('su_id_id')) === targetId ||
        String(f.get('su_id')) === targetId ||
        String(f.get('feature_Id')) === targetId,
    );

    if (!selected) {
      this.sketchError.set(
        `Selected parcel (ID: ${targetId}) geometry not found in the loaded layer.`,
      );
      this.sketchBuilding.set(false);
      return;
    }

    const selGeom = selected.getGeometry();
    if (!(selGeom instanceof Polygon || selGeom instanceof MultiPolygon)) {
      this.sketchError.set('Parcel geometry is not a polygon type.');
      this.sketchBuilding.set(false);
      return;
    }

    const selExtent = selGeom.getExtent(); // [minX, minY, maxX, maxY] in EPSG:3857
    const BUFFER = 50; // ~50 m buffer in EPSG:3857 units
    const buffExt: [number, number, number, number] = [
      selExtent[0] - BUFFER,
      selExtent[1] - BUFFER,
      selExtent[2] + BUFFER,
      selExtent[3] + BUFFER,
    ];

    const neighbours = allFeatures.filter((f) => {
      if (f === selected) return false;
      const g = f.getGeometry();
      if (!g) return false;
      return extentsIntersect(g.getExtent(), buffExt);
    });

    // ── SVG layout constants ───────────────────────────────────────────────
    const SVG_W = 590;
    const SVG_H = 440;
    const MARG = 48;

    const extW = buffExt[2] - buffExt[0];
    const extH = buffExt[3] - buffExt[1];
    const scale = Math.min((SVG_W - 2 * MARG) / extW, (SVG_H - 2 * MARG) / extH);

    // Center the drawing within the SVG canvas
    const oX = MARG + ((SVG_W - 2 * MARG) - extW * scale) / 2;
    const oY = MARG + ((SVG_H - 2 * MARG) - extH * scale) / 2;

    const toX = (x: number) => oX + (x - buffExt[0]) * scale;
    const toY = (y: number) => SVG_H - oY - (y - buffExt[1]) * scale; // Y-axis flip

    // Polygon → SVG points string
    const geomPoints = (geom: Polygon | MultiPolygon): string => {
      let coords: number[][];
      if (geom instanceof Polygon) {
        const ring = geom.getLinearRing(0);
        if (!ring) return '';
        coords = ring.getCoordinates() as number[][];
      } else {
        // Pick the largest sub-polygon
        let best: Polygon | null = null;
        let bestA = 0;
        for (let i = 0; i < geom.getPolygons().length; i++) {
          const p = geom.getPolygon(i);
          const a = getArea(p, { projection: 'EPSG:3857' });
          if (a > bestA) {
            bestA = a;
            best = p;
          }
        }
        if (!best) return '';
        const ring = best.getLinearRing(0);
        if (!ring) return '';
        coords = ring.getCoordinates() as number[][];
      }
      return coords.map((c) => `${toX(c[0]).toFixed(1)},${toY(c[1]).toFixed(1)}`).join(' ');
    };

    // Approximate visual centroid (bounding-box centre)
    const geomCentroid = (geom: Polygon | MultiPolygon): [number, number] => {
      const e = geom.getExtent();
      return [toX((e[0] + e[2]) / 2), toY((e[1] + e[3]) / 2)];
    };

    // ── Selected parcel ────────────────────────────────────────────────────
    const selArea = getArea(selGeom, { projection: 'EPSG:3857' });
    const selPts = geomPoints(selGeom);
    const [selCx, selCy] = geomCentroid(selGeom);
    const selLabel = this.parcel.identification.parcelId || targetId;

    const parcels: SketchParcel[] = [
      {
        id: targetId,
        isSelected: true,
        points: selPts,
        fill: 'rgba(21,101,192,0.20)',
        stroke: '#1565c0',
        textX: selCx,
        textY: selCy,
        idLine: selLabel,
        areaLine: `${Math.round(selArea).toLocaleString()} m²  ·  ${this.formatAreaAcres(selArea)}`,
      },
    ];

    // ── Neighbours ────────────────────────────────────────────────────────
    const selCentreX = (selExtent[0] + selExtent[2]) / 2;
    const selCentreY = (selExtent[1] + selExtent[3]) / 2;
    const adjRowsArr: AdjRow[] = [];

    for (const f of neighbours) {
      const geom = f.getGeometry();
      if (!(geom instanceof Polygon || geom instanceof MultiPolygon)) continue;
      const pts = geomPoints(geom);
      if (!pts) continue;

      const [cx, cy] = geomCentroid(geom);
      const fArea = getArea(geom, { projection: 'EPSG:3857' });
      const fId = String(
        f.getId() ?? f.get('su_id_id') ?? f.get('su_id') ?? f.get('feature_Id') ?? '?',
      );
      const fLandUse =
        f.get('sl_land_type') ||
        f.get('land_type') ||
        f.get('land_use') ||
        f.get('landUse') ||
        '—';

      // Cardinal direction from selected centroid to this neighbour
      const ext = geom.getExtent();
      const nx = (ext[0] + ext[2]) / 2;
      const ny = (ext[1] + ext[3]) / 2;
      const angle = (Math.atan2(ny - selCentreY, nx - selCentreX) * 180) / Math.PI;
      const direction =
        angle >= -22.5 && angle < 22.5
          ? 'E'
          : angle >= 22.5 && angle < 67.5
            ? 'NE'
            : angle >= 67.5 && angle < 112.5
              ? 'N'
              : angle >= 112.5 && angle < 157.5
                ? 'NW'
                : angle >= 157.5 || angle < -157.5
                  ? 'W'
                  : angle >= -157.5 && angle < -112.5
                    ? 'SW'
                    : angle >= -112.5 && angle < -67.5
                      ? 'S'
                      : 'SE';

      parcels.push({
        id: fId,
        isSelected: false,
        points: pts,
        fill: this.LU_FILL[fLandUse] ?? '#e0e0e0',
        stroke: this.LU_STROKE[fLandUse] ?? '#757575',
        textX: cx,
        textY: cy,
        idLine: fId,
        areaLine: `${Math.round(fArea).toLocaleString()} m²`,
      });

      adjRowsArr.push({
        id: fId,
        landUse: fLandUse,
        areaM2: Math.round(fArea),
        areaAcres: this.formatAreaAcres(fArea),
        direction,
      });
    }

    // ── Scale bar ──────────────────────────────────────────────────────────
    const targetM = ((SVG_W - 2 * MARG) * 0.22) / scale;
    const mag = Math.pow(10, Math.floor(Math.log10(Math.max(targetM, 1))));
    const candidates = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500];
    let sbMeters = mag;
    for (const c of candidates) {
      const v = c * (mag < 1 ? 1 : mag < 10 ? 1 : mag < 100 ? 10 : 100);
      if (v <= targetM * 1.4) sbMeters = v;
    }
    sbMeters = Math.max(1, sbMeters);
    const scaleBarW = sbMeters * scale;
    const scaleBarX = MARG;
    const scaleBarY = SVG_H - 12;
    const scaleBarLabel = sbMeters >= 1000 ? `${sbMeters / 1000} km` : `${sbMeters} m`;

    // ── Dimension lines (bounding box of selected parcel) ──────────────────
    const sxMin = toX(selExtent[0]);
    const sxMax = toX(selExtent[2]);
    const syTop = toY(selExtent[3]); // smaller Y in SVG = top
    const syBot = toY(selExtent[1]); // larger Y in SVG = bottom
    const ewM = Math.round(selExtent[2] - selExtent[0]);
    const nsM = Math.round(selExtent[3] - selExtent[1]);

    const dimEW: SketchDim = {
      x1: sxMin,
      y1: syTop - 13,
      x2: sxMax,
      y2: syTop - 13,
      labelX: (sxMin + sxMax) / 2,
      labelY: syTop - 18,
      text: `${ewM} m (E–W)`,
      vertical: false,
    };
    const dimNS: SketchDim = {
      x1: sxMax + 13,
      y1: syTop,
      x2: sxMax + 13,
      y2: syBot,
      labelX: sxMax + 22,
      labelY: (syTop + syBot) / 2,
      text: `${nsM} m (N–S)`,
      vertical: true,
    };

    // ── Road strip ─────────────────────────────────────────────────────────
    const hasRoad = this.parcel.physical.accessRoad === true;
    const roadH = 9;
    const roadY = syBot + 3;
    const roadX = sxMin - 4;
    const roadW = sxMax - sxMin + 8;

    // ── North arrow position (top-right corner) ────────────────────────────
    const northX = SVG_W - 30;
    const northY = 30;

    this.sketchData.set({
      svgW: SVG_W,
      svgH: SVG_H,
      parcels,
      scaleBarX,
      scaleBarY,
      scaleBarW,
      scaleBarLabel,
      northX,
      northY,
      hasRoad,
      roadX,
      roadY,
      roadW,
      roadH,
      dimEW,
      dimNS,
    });

    this.adjRows.set(adjRowsArr);
    this.sketchBuilding.set(false);
  }
}
