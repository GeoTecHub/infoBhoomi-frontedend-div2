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
    if (!isPlatformBrowser(this.platformId)) return;
    const printWin = window.open('', '_blank');
    if (!printWin) {
      // popup blocked — fallback to basic print
      window.print();
      return;
    }
    printWin.document.write(this.buildPrintHTML());
    printWin.document.close();
    setTimeout(() => {
      printWin.focus();
      printWin.print();
    }, 400);
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  // ── Print helpers ─────────────────────────────────────────────────────────

  /** Escape a value for safe embedding in HTML. Returns '—' for empty/null. */
  private esc(v: unknown): string {
    if (v === null || v === undefined) return '—';
    const s = String(v).trim();
    if (!s) return '—';
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Generate SVG markup string from the computed sketch data. */
  private buildSVGString(sketch: ParcelSketch): string {
    const nb = sketch.parcels
      .filter((p) => !p.isSelected)
      .map(
        (p) =>
          `<polygon points="${p.points}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="1.2" stroke-linejoin="round"/>`,
      )
      .join('\n');

    const sel = sketch.parcels
      .filter((p) => p.isSelected)
      .map(
        (p) =>
          `<polygon points="${p.points}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="2" stroke-linejoin="round"/>`,
      )
      .join('\n');

    const road = sketch.hasRoad
      ? `<rect x="${sketch.roadX}" y="${sketch.roadY}" width="${sketch.roadW}" height="${sketch.roadH}" fill="url(#skRoadHatch)" stroke="#9e9e9e" stroke-width="1"/>
         <text x="${(sketch.roadX + sketch.roadW / 2).toFixed(1)}" y="${(sketch.roadY + sketch.roadH + 10).toFixed(1)}" text-anchor="middle" font-size="8" fill="#757575" font-family="sans-serif">Road Access</text>`
      : '';

    const labels = sketch.parcels
      .map(
        (p) => `
        <text x="${p.textX.toFixed(1)}" y="${(p.textY - 5).toFixed(1)}" text-anchor="middle" dominant-baseline="middle"
              font-size="9" font-weight="700" fill="${p.isSelected ? '#0d3c7a' : '#37474f'}" font-family="monospace">${this.esc(p.idLine)}</text>
        <text x="${p.textX.toFixed(1)}" y="${(p.textY + 8).toFixed(1)}" text-anchor="middle" dominant-baseline="middle"
              font-size="8" fill="${p.isSelected ? '#1565c0' : '#546e7a'}" font-family="sans-serif">${this.esc(p.areaLine)}</text>`,
      )
      .join('\n');

    const hW = (sketch.scaleBarW / 2).toFixed(1);
    const sbR = (sketch.scaleBarX + sketch.scaleBarW).toFixed(1);
    const sbM = (sketch.scaleBarX + sketch.scaleBarW / 2).toFixed(1);
    const scaleBar = `
      <rect x="${sketch.scaleBarX}" y="${sketch.scaleBarY - 5}" width="${hW}" height="5" fill="#37474f"/>
      <rect x="${(sketch.scaleBarX + sketch.scaleBarW / 2).toFixed(1)}" y="${sketch.scaleBarY - 5}" width="${hW}" height="5" fill="white" stroke="#37474f" stroke-width="0.8"/>
      <line x1="${sketch.scaleBarX}" y1="${sketch.scaleBarY - 10}" x2="${sketch.scaleBarX}" y2="${sketch.scaleBarY}" stroke="#37474f" stroke-width="1"/>
      <line x1="${sbR}" y1="${sketch.scaleBarY - 10}" x2="${sbR}" y2="${sketch.scaleBarY}" stroke="#37474f" stroke-width="1"/>
      <text x="${sketch.scaleBarX}" y="${sketch.scaleBarY + 8}" font-size="8" fill="#546e7a" font-family="sans-serif">0</text>
      <text x="${sbR}" y="${sketch.scaleBarY + 8}" text-anchor="end" font-size="8" fill="#546e7a" font-family="sans-serif">${this.esc(sketch.scaleBarLabel)}</text>
      <text x="${sbM}" y="${sketch.scaleBarY + 8}" text-anchor="middle" font-size="7" fill="#78909c" font-family="sans-serif">Scale bar</text>`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${sketch.svgW}" height="${sketch.svgH}" viewBox="0 0 ${sketch.svgW} ${sketch.svgH}">
  <defs>
    <pattern id="skRoadHatch" patternUnits="userSpaceOnUse" width="7" height="7">
      <line x1="0" y1="7" x2="7" y2="0" stroke="#9e9e9e" stroke-width="1.5"/>
    </pattern>
  </defs>
  <rect x="0" y="0" width="${sketch.svgW}" height="${sketch.svgH}" fill="#f5f9f6"/>
  ${nb}
  ${sel}
  ${road}
  ${labels}
  ${scaleBar}
  <g transform="translate(${sketch.northX},${sketch.northY})">
    <polygon points="0,-16 -5,5 0,2 5,5" fill="#37474f"/>
    <polygon points="0,-16 5,5 0,2 -5,5" fill="white" stroke="#37474f" stroke-width="0.8"/>
    <text x="0" y="22" text-anchor="middle" font-size="10" font-weight="700" fill="#37474f" font-family="sans-serif">N</text>
  </g>
  <rect x="1" y="1" width="${sketch.svgW - 2}" height="${sketch.svgH - 2}" fill="none" stroke="#b0bec5" stroke-width="1"/>
</svg>`;
  }

  /** Build a complete, self-contained HTML print document with all parcel data. */
  private buildPrintHTML(): string {
    const p = this.parcel;
    const sketch = this.sketchData();
    const adj = this.adjRows();
    const e = (v: unknown) => this.esc(v);

    // Status badge helper
    const badge = (st: string) => {
      const cls =
        st === 'ACTIVE'
          ? 'st-active'
          : st === 'PENDING'
            ? 'st-pending'
            : st === 'SUSPENDED'
              ? 'st-suspended'
              : 'st-historic';
      return `<span class="badge ${cls}">${e(this.PARCEL_STATUS_DISPLAY[st as keyof typeof this.PARCEL_STATUS_DISPLAY] ?? st)}</span>`;
    };

    // SVG sketch section
    const svgBlock = sketch
      ? `<div class="sketch-wrap">${this.buildSVGString(sketch)}</div>`
      : `<p class="muted">Cadastral sketch not available — open the Spatial tab first to generate the diagram.</p>`;

    const legendBlock = sketch
      ? `<div class="legend">
          <span class="li"><span class="sw" style="background:rgba(21,101,192,0.2);border:2px solid #1565c0"></span>Selected Parcel</span>
          <span class="li"><span class="sw" style="background:#b2dfdb;border:1px solid #00796b"></span>Residential</span>
          <span class="li"><span class="sw" style="background:#fff59d;border:1px solid #f9a825"></span>Commercial</span>
          <span class="li"><span class="sw" style="background:#c8e6c9;border:1px solid #388e3c"></span>Agricultural</span>
          <span class="li"><span class="sw" style="background:#ffccbc;border:1px solid #bf360c"></span>Industrial</span>
          <span class="li"><span class="sw" style="background:#e1bee7;border:1px solid #7b1fa2"></span>Mixed Use</span>
          ${sketch.hasRoad ? `<span class="li"><span class="sw" style="background:repeating-linear-gradient(-45deg,#9e9e9e,#9e9e9e 1px,transparent 1px,transparent 5px);border:1px solid #9e9e9e"></span>Road Access</span>` : ''}
        </div>`
      : '';

    // Adjacency table
    const adjTable = adj.length
      ? `<table class="tbl"><thead><tr><th>Dir.</th><th>Parcel ID</th><th>Land Use</th><th>Area (m²)</th><th>Area (ac)</th></tr></thead>
         <tbody>${adj.map((r) => `<tr><td class="bold mono">${e(r.direction)}</td><td class="mono">${e(r.id)}</td><td>${e(r.landUse)}</td><td class="mono">${r.areaM2.toLocaleString()}</td><td class="mono">${e(r.areaAcres)}</td></tr>`).join('')}</tbody></table>`
      : `<p class="muted">No adjoining parcels within 50 m buffer.</p>`;

    // RRR entries
    const rrrBlock = p.rrr.entries.length
      ? p.rrr.entries
          .map(
            (entry) => `<div class="rrr-card">
          <div class="rrr-hdr">
            <span class="rrr-type">${e(this.RIGHT_TYPE_DISPLAY[entry.type as keyof typeof this.RIGHT_TYPE_DISPLAY] ?? entry.type)}</span>
            <span class="mono" style="font-size:8pt;color:#666">${e(entry.rrrId)}</span>
          </div>
          <div style="padding:8px 12px">
            <div class="grid3">
              <div class="field"><span class="lbl">Holder</span><span>${e(entry.holder)}</span></div>
              <div class="field"><span class="lbl">Share</span><span class="mono">${e(entry.share)}</span></div>
              <div class="field"><span class="lbl">Valid From</span><span class="mono">${this.formatDate(entry.validFrom)}</span></div>
              <div class="field"><span class="lbl">Valid To</span><span class="mono">${this.formatDate(entry.validTo)}</span></div>
              <div class="field"><span class="lbl">Document Ref</span><span class="mono">${e(entry.documentRef)}</span></div>
            </div>
            ${
              entry.restrictions?.length
                ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid #eee">
                    <span class="lbl">Restrictions</span>
                    ${entry.restrictions.map((r) => `<div style="margin-top:3px"><span class="tag tag-warn">${e(r.type)}</span> ${e(r.description)}</div>`).join('')}
                  </div>`
                : ''
            }
          </div>
        </div>`,
          )
          .join('')
      : `<p class="muted">No Rights, Restrictions, or Responsibilities registered.</p>`;

    // Utility tags
    const utils = [
      p.physical.waterSupply && 'Water Supply',
      p.physical.electricity && 'Electricity',
      p.physical.drainageSystem && 'Drainage',
      p.physical.sanitationGully && 'Sanitation Gully',
      p.physical.garbageDisposal && 'Garbage Disposal',
    ]
      .filter(Boolean)
      .map((t) => `<span class="tag">${t}</span>`)
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Land Parcel Report — ${e(p.identification.parcelId || String(this.data.featureId))}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;color:#111;background:white;line-height:1.5;padding:14px 20px;max-width:210mm;margin:0 auto}
@page{size:A4 portrait;margin:15mm 15mm 20mm 15mm}
@media print{body{padding:0;max-width:none}}
.pb{page-break-before:always;break-before:page;padding-top:10px}
.no-break{page-break-inside:avoid;break-inside:avoid}
/* Header */
.rpt-hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1a5c30;padding-bottom:10px;margin-bottom:12px}
.rpt-title{font-size:17pt;font-weight:bold;color:#1a5c30}
.rpt-sub{font-size:8pt;color:#777;margin-top:2px}
/* Identity */
.id-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:8px 12px;background:#f0f7f4;border:1px solid #a5d6b4;border-radius:6px;margin-bottom:14px}
.pid{font-family:'Courier New',monospace;font-size:14pt;font-weight:bold;color:#1a5c30}
/* Badges */
.badge{display:inline-block;padding:2px 8px;border-radius:8px;font-size:8pt;font-weight:bold;text-transform:uppercase;border:1px solid}
.st-active{background:#e8f5e9;color:#1b5e20;border-color:#a5d6a7}
.st-pending{background:#fffde7;color:#e65100;border-color:#ffe082}
.st-suspended{background:#ffebee;color:#b71c1c;border-color:#ef9a9a}
.st-historic{background:#f5f5f5;color:#616161;border-color:#bdbdbd}
/* Section titles */
h2{font-size:11pt;font-weight:bold;color:#1a5c30;border-bottom:1px solid #c8e6c9;padding-bottom:4px;margin:16px 0 10px}
h3{font-size:10pt;font-weight:bold;color:#333;margin:12px 0 6px}
/* Grids */
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:12px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px 16px;margin-bottom:12px}
.field{display:flex;flex-direction:column}
.lbl{font-size:8pt;font-weight:bold;text-transform:uppercase;letter-spacing:.4px;color:#666;margin-bottom:1px}
.mono{font-family:'Courier New',monospace}
.bold{font-weight:bold}
.hl{color:#1a5c30;font-weight:bold}
/* Metric boxes */
.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}
.mbox{border:1px solid #c8e6c9;border-radius:6px;padding:10px;text-align:center;background:#f0f7f4}
.mval{font-size:13pt;font-weight:bold;color:#1a5c30;display:block;margin:4px 0}
.mlbl{font-size:8pt;color:#666;text-transform:uppercase;letter-spacing:.4px}
/* Table */
.tbl{width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:10px}
.tbl th{background:#e8f5e9;color:#1a5c30;font-weight:bold;padding:5px 8px;text-align:left;border:1px solid #c8e6c9;font-size:8pt;text-transform:uppercase}
.tbl td{padding:4px 8px;border:1px solid #e0e0e0;vertical-align:top}
.tbl tbody tr:nth-child(even) td{background:#fafafa}
/* Sketch */
.sketch-wrap{border:1px solid #c8e6c9;border-radius:6px;overflow:hidden;margin:8px 0;text-align:center}
.sketch-wrap svg{max-width:100%;height:auto}
/* Legend */
.legend{display:flex;flex-wrap:wrap;gap:5px 14px;margin:6px 0 12px;font-size:8pt}
.li{display:flex;align-items:center;gap:5px}
.sw{display:inline-block;width:14px;height:10px;border-radius:2px;flex-shrink:0}
/* RRR */
.rrr-card{border:1px solid #e0e0e0;border-radius:6px;margin-bottom:10px;overflow:hidden}
.rrr-hdr{display:flex;align-items:center;justify-content:space-between;padding:7px 12px;background:#f0f7f4;border-bottom:1px solid #c8e6c9}
.rrr-type{font-weight:bold;color:#1a5c30}
/* Tags */
.tag-list{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}
.tag{display:inline-block;padding:2px 7px;background:#e8f5e9;border:1px solid #c8e6c9;border-radius:10px;font-size:8pt;color:#1b5e20}
.tag-warn{background:#fff8e1;border-color:#ffe082;color:#e65100}
/* Colours */
.success{color:#1b5e20}.warn{color:#e65100}.danger{color:#c62828}.muted{color:#999;font-style:italic;font-size:9pt}
/* Zoning */
.zon-banner{display:flex;align-items:center;gap:14px;padding:10px 14px;background:#f0f7f4;border:1px solid #a5d6b4;border-radius:6px;margin-bottom:12px}
.zon-code{font-family:'Courier New',monospace;font-size:20pt;font-weight:bold;color:#1a5c30}
/* Setbacks */
.sback{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}
.scard{border:1px solid #e0e0e0;border-radius:6px;padding:10px;text-align:center}
.sdir{font-size:8pt;font-weight:bold;text-transform:uppercase;color:#666}
.sval{font-size:14pt;font-weight:bold;color:#333;display:block;margin-top:4px}
/* Footer */
.rpt-ftr{border-top:1px solid #c8e6c9;margin-top:20px;padding-top:8px;font-size:8pt;color:#999;display:flex;justify-content:space-between}
</style>
</head>
<body>

<!-- HEADER -->
<div class="rpt-hdr">
  <div>
    <div class="rpt-title">Land Parcel Report</div>
    <div class="rpt-sub">InfoBhoomi Land Information System &nbsp;·&nbsp; LADM ISO 19152 Compliant</div>
  </div>
  <div style="text-align:right;font-size:9pt;color:#666">
    <div>Layer: ${e(this.data.layerId)}</div>
    <div>Generated: ${e(this.generatedAt)}</div>
  </div>
</div>

<!-- IDENTITY BAR -->
<div class="id-bar">
  <span class="pid">${e(p.identification.parcelId || String(this.data.featureId))}</span>
  ${badge(p.identification.parcelStatus)}
  ${p.identification.localAuthority ? `<span style="font-size:9pt;color:#555">${e(p.identification.localAuthority)}</span>` : ''}
</div>

<!-- PAGE 1: IDENTIFICATION + LOCATION -->
<h2>Identification</h2>
<div class="grid3">
  <div class="field"><span class="lbl">Parcel ID</span><span class="mono hl">${e(p.identification.parcelId)}</span></div>
  <div class="field"><span class="lbl">Cadastral Reference</span><span class="mono">${e(p.identification.cadastralRef)}</span></div>
  <div class="field"><span class="lbl">Registration Date</span><span class="mono">${this.formatDate(p.identification.registrationDate)}</span></div>
  <div class="field"><span class="lbl">Parcel Type</span><span>${e(this.PARCEL_TYPE_DISPLAY[p.identification.parcelType as keyof typeof this.PARCEL_TYPE_DISPLAY])}</span></div>
  <div class="field"><span class="lbl">Land Use</span><span>${e(this.LAND_USE_DISPLAY[p.identification.landUse as keyof typeof this.LAND_USE_DISPLAY])}</span></div>
  <div class="field"><span class="lbl">Tenure Type</span><span>${e(this.TENURE_TYPE_DISPLAY[p.identification.tenureType as keyof typeof this.TENURE_TYPE_DISPLAY])}</span></div>
  <div class="field"><span class="lbl">Local Authority</span><span>${e(p.identification.localAuthority)}</span></div>
  <div class="field"><span class="lbl">Status</span>${badge(p.identification.parcelStatus)}</div>
</div>

<h2>Spatial Metrics &amp; Location</h2>
<div class="metrics">
  <div class="mbox"><span class="mlbl">Total Area</span><span class="mval">${this.formatAreaM2(p.spatial.area)}</span><span style="font-size:8pt;color:#666">${this.formatAreaAcres(p.spatial.area)}</span></div>
  <div class="mbox"><span class="mlbl">Perimeter</span><span class="mval">${p.spatial.perimeter ? p.spatial.perimeter.toFixed(1) + ' m' : '—'}</span></div>
  <div class="mbox"><span class="mlbl">Vertices</span><span class="mval">${e(p.spatial.coordinateCount)}</span></div>
</div>
<div class="grid3">
  <div class="field"><span class="lbl">Centroid Longitude</span><span class="mono">${this.formatCoord(p.spatial.centroidLon)}</span></div>
  <div class="field"><span class="lbl">Centroid Latitude</span><span class="mono">${this.formatCoord(p.spatial.centroidLat)}</span></div>
  <div class="field"><span class="lbl">CRS</span><span class="mono">${e(p.spatial.crs)}</span></div>
  <div class="field"><span class="lbl">Geometry Type</span><span class="mono">${e(p.spatial.geometryType)}</span></div>
  <div class="field"><span class="lbl">Boundary Type</span><span>${e(this.BOUNDARY_TYPE_DISPLAY[p.spatial.boundaryType as keyof typeof this.BOUNDARY_TYPE_DISPLAY])}</span></div>
</div>
${
  p.relationships.buildingIds?.length ||
  p.relationships.adjacentParcels ||
  p.relationships.parentParcel
    ? `<h2>Relationships</h2>
       <div class="grid2">
         ${p.relationships.buildingIds?.length ? `<div class="field"><span class="lbl">Buildings on Parcel</span><span class="mono">${e(p.relationships.buildingIds.join(', '))}</span></div>` : ''}
         ${p.relationships.adjacentParcels ? `<div class="field"><span class="lbl">Adjacent Parcels</span><span class="mono">${e(p.relationships.adjacentParcels)}</span></div>` : ''}
         ${p.relationships.parentParcel ? `<div class="field"><span class="lbl">Parent Parcel</span><span class="mono">${e(p.relationships.parentParcel)}</span></div>` : ''}
         ${p.relationships.partOfEstate ? `<div class="field"><span class="lbl">Estate / Complex</span><span class="mono">${e(p.relationships.partOfEstate)}</span></div>` : ''}
       </div>`
    : ''
}

<!-- PAGE 2: CADASTRAL SKETCH -->
<div class="pb">
  <h2>Cadastral Sketch</h2>
  <p style="font-size:8pt;color:#999;margin-bottom:8px">Reference diagram — not for legal survey use &nbsp;·&nbsp; 50 m buffer around selected parcel</p>
  ${svgBlock}
  ${legendBlock}
  <h3>Adjoining Parcels (${adj.length})</h3>
  ${adjTable}
</div>

<!-- PAGE 3: LAND & PHYSICAL + ZONING -->
<div class="pb">
  <h2>Physical Characteristics</h2>
  <div class="grid3">
    <div class="field"><span class="lbl">Elevation</span><span class="mono">${p.physical.elevation ? p.physical.elevation + ' m MSL' : '—'}</span></div>
    <div class="field"><span class="lbl">Slope</span><span class="mono">${p.physical.slope ? p.physical.slope + '°' : '—'}</span></div>
    <div class="field"><span class="lbl">Soil Type</span><span>${e(this.SOIL_TYPE_DISPLAY[p.physical.soilType as keyof typeof this.SOIL_TYPE_DISPLAY])}</span></div>
    <div class="field"><span class="lbl">Flood Zone</span><span class="${p.physical.floodZone ? 'warn' : 'success'}">${p.physical.floodZone ? 'Yes — Flood Risk' : 'No'}</span></div>
    <div class="field"><span class="lbl">Road Access</span><span class="${p.physical.accessRoad ? 'success' : ''}">${p.physical.accessRoad ? 'Available' : 'No Access'}</span></div>
    <div class="field"><span class="lbl">Vegetation Cover</span><span>${e(p.physical.vegetationCover)}</span></div>
  </div>
  <div class="field"><span class="lbl">Utilities</span><div class="tag-list">${utils || '<span class="muted">None recorded</span>'}</div></div>

  <h2>Zoning Classification</h2>
  <div class="zon-banner">
    <span class="zon-code">${e(p.zoning.zoningCategory)}</span>
    <span style="font-size:11pt;color:#333">${e(this.ZONING_CATEGORY_DISPLAY[p.zoning.zoningCategory as keyof typeof this.ZONING_CATEGORY_DISPLAY])}</span>
  </div>
  <div class="grid3">
    <div class="field"><span class="lbl">Max Building Height</span><span class="mono">${p.zoning.maxBuildingHeight ? p.zoning.maxBuildingHeight + ' m' : '—'}</span></div>
    <div class="field"><span class="lbl">Max Coverage</span><span class="mono">${p.zoning.maxCoverage ? p.zoning.maxCoverage + '%' : '—'}</span></div>
    <div class="field"><span class="lbl">Floor Area Ratio</span><span class="mono">${e(p.zoning.maxFAR)}</span></div>
  </div>
  <h3>Setbacks</h3>
  <div class="sback">
    <div class="scard"><span class="sdir">Front</span><span class="sval">${p.zoning.setbackFront ? p.zoning.setbackFront + ' m' : '—'}</span></div>
    <div class="scard"><span class="sdir">Rear</span><span class="sval">${p.zoning.setbackRear ? p.zoning.setbackRear + ' m' : '—'}</span></div>
    <div class="scard"><span class="sdir">Side</span><span class="sval">${p.zoning.setbackSide ? p.zoning.setbackSide + ' m' : '—'}</span></div>
  </div>
  ${p.zoning.specialOverlay ? `<div class="field"><span class="lbl">Special Overlay</span><span class="warn">${e(p.zoning.specialOverlay)}</span></div>` : ''}
</div>

<!-- PAGE 4: VALUATION + RRR -->
<div class="pb">
  <h2>Valuation &amp; Assessment</h2>
  <div class="metrics">
    <div class="mbox"><span class="mlbl">Market Value</span><span class="mval">LKR ${this.formatCurrency(p.valuation.marketValue)}</span></div>
    <div class="mbox"><span class="mlbl">Land Value</span><span class="mval">LKR ${this.formatCurrency(p.valuation.landValue)}</span></div>
    <div class="mbox"><span class="mlbl">Annual Tax</span><span class="mval">LKR ${this.formatCurrency(p.valuation.annualTax)}</span></div>
  </div>
  <div class="grid2">
    <div class="field"><span class="lbl">Last Assessment Date</span><span class="mono">${this.formatDate(p.valuation.lastAssessmentDate)}</span></div>
    <div class="field"><span class="lbl">Tax Status</span>
      <span class="${p.valuation.taxStatus === 'paid' ? 'success' : p.valuation.taxStatus === 'overdue' ? 'danger' : 'warn'}">${e(p.valuation.taxStatus)}</span>
    </div>
  </div>

  <h2>Rights, Restrictions &amp; Responsibilities</h2>
  ${rrrBlock}
</div>

<!-- PAGE 5: METADATA -->
<div class="pb">
  <h2>Data Quality &amp; Metadata</h2>
  <div class="grid2">
    <div class="field"><span class="lbl">Data Quality ID</span><span class="mono">${e(p.metadata.dataQualityId)}</span></div>
    <div class="field"><span class="lbl">Accuracy Level</span><span>${e(this.ACCURACY_LEVEL_DISPLAY[p.metadata.accuracyLevel as keyof typeof this.ACCURACY_LEVEL_DISPLAY])}</span></div>
    <div class="field"><span class="lbl">Survey Method</span><span>${e(this.SURVEY_METHOD_DISPLAY[p.metadata.surveyMethod as keyof typeof this.SURVEY_METHOD_DISPLAY])}</span></div>
    <div class="field"><span class="lbl">Last Updated</span><span class="mono">${this.formatDate(p.metadata.lastUpdated)}</span></div>
    <div class="field"><span class="lbl">Responsible Party</span><span>${e(p.metadata.responsibleParty)}</span></div>
    <div class="field"><span class="lbl">Source Document</span><span class="mono">${e(p.metadata.sourceDocument)}</span></div>
  </div>
</div>

<!-- FOOTER -->
<div class="rpt-ftr">
  <span>InfoBhoomi Land Information System — LADM ISO 19152 Compliant Report</span>
  <span>Parcel: <strong>${e(p.identification.parcelId || String(this.data.featureId))}</strong></span>
</div>

</body>
</html>`;
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

    // ── Road strip ─────────────────────────────────────────────────────────
    const sxMin = toX(selExtent[0]);
    const sxMax = toX(selExtent[2]);
    const syBot = toY(selExtent[1]); // larger Y in SVG = bottom of selected parcel
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
    });

    this.adjRows.set(adjRowsArr);
    this.sketchBuilding.set(false);
  }
}
