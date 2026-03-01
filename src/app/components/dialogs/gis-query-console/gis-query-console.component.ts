import { Component, HostListener, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { APIsService } from '../../../services/api.service';
import { MapService } from '../../../services/map.service';
import { NotificationService } from '../../../services/notifications.service';
import { QUERY_CATEGORIES, QueryCategory, QueryDef } from './query-categories';

export interface QueryFeature {
  id: string | number;
  properties: Record<string, any>;
  geometry?: any;
}

interface QueryResult {
  count: number;
  time: string;
  query: string;
  features: QueryFeature[];
}

interface HistoryEntry {
  query: string;
  category: string;
  time: string;
  count: number;
}

@Component({
  selector: 'app-gis-query-console',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatIconModule],
  templateUrl: './gis-query-console.component.html',
  styleUrls: ['./gis-query-console.component.css'],
})
export class GisQueryConsoleComponent {
  categories = QUERY_CATEGORIES;
  categoryKeys = Object.keys(QUERY_CATEGORIES);

  activeCategory = signal<string>('disaster');
  activeQuery = signal<QueryDef | null>(null);
  params = signal<Record<string, any>>({});
  isRunning = signal(false);
  results = signal<QueryResult | null>(null);
  showSQL = signal(false);
  history = signal<HistoryEntry[]>([]);
  isHighlighting = signal(false);

  constructor(
    private dialogRef: MatDialogRef<GisQueryConsoleComponent>,
    private sanitizer: DomSanitizer,
    private apiService: APIsService,
    private notifications: NotificationService,
    private mapService: MapService,
  ) {}

  get category(): QueryCategory {
    return this.categories[this.activeCategory()];
  }

  get generatedSQL(): string {
    const q = this.activeQuery();
    return q ? q.sql(this.params()) : '';
  }

  /** Keys to show in the results table (up to 10 columns from first feature). */
  get resultColumns(): string[] {
    const features = this.results()?.features;
    if (!features?.length) return [];
    return Object.keys(features[0].properties)
      .filter((k) => k !== 'geojson') // hide raw geometry from table
      .slice(0, 10);
  }

  selectCategory(key: string): void {
    this.activeCategory.set(key);
    this.activeQuery.set(null);
    this.results.set(null);
    this.showSQL.set(false);
  }

  selectQuery(q: QueryDef): void {
    this.activeQuery.set(q);
    this.results.set(null);
    this.showSQL.set(false);
    const defaults: Record<string, any> = {};
    q.params.forEach((p) => {
      defaults[p.key] = p.default !== undefined ? p.default : (p.options?.[0] ?? '');
    });
    this.params.set(defaults);
  }

  updateParam(key: string, value: any, type: string): void {
    const current = { ...this.params() };
    current[key] = type === 'number' ? Number(value) : value;
    this.params.set(current);
  }

  toggleSQL(): void {
    this.showSQL.update((v) => !v);
  }

  /**
   * Resolve the layer ID.  Revenue queries expose a layer_type param
   * that lets the user pick land vs. buildings at runtime.
   */
  private resolveLayerId(): number {
    const q = this.activeQuery()!;
    const p = this.params();
    if (p['layer_type'] === 'Buildings') {
      return 3;
    }
    return q.backend!.layerIds[0];
  }

  runQuery(): void {
    const q = this.activeQuery();
    if (!q) return;

    if (!q.backend) {
      this.notifications.showInfo(
        'This query is preview-only — it requires spatial datasets not yet in the live database.',
      );
      return;
    }

    const conditions = q.backend.toConditions(this.params());
    if (conditions.length === 0) {
      this.notifications.showWarning('Please enter at least one search value.');
      return;
    }

    const layerId = this.resolveLayerId();
    const logic = q.backend.logic ?? 'AND';

    this.isRunning.set(true);
    this.results.set(null);

    const t0 = performance.now();
    this.apiService.queryParcels(layerId, conditions, logic).subscribe({
      next: (res) => {
        const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
        // Backend returns flat dicts (not GeoJSON Features).  Map them so properties
        // holds the whole flat dict (including the geojson geometry key).
        const features: QueryFeature[] = (res.features ?? []).map((f: any) => ({
          id: f.su_id ?? '',
          properties: f, // flat dict: {su_id, geojson, area_m2, land_name, ...}
          geometry: f.geojson ?? null,
        }));
        this.results.set({ count: res.count, time: elapsed, query: q.name, features });
        this.isRunning.set(false);
        this.history.update((prev) => [
          {
            query: q.name,
            category: this.category.label,
            time: new Date().toLocaleTimeString(),
            count: res.count,
          },
          ...prev.slice(0, 9),
        ]);
      },
      error: (err) => {
        this.isRunning.set(false);
        this.notifications.showError('Query failed: ' + (err?.error?.error ?? 'Server error'));
      },
    });
  }

  // ── Map Highlighting ──────────────────────────────────────────────────────

  highlightOnMap(): void {
    const features = this.results()?.features;
    if (!features?.length) return;

    this.mapService.highlightQueryResults(
      features.map((f) => ({
        su_id: f.properties['su_id'] as number,
        geojson: f.properties['geojson'],
      })),
    );

    this.isHighlighting.set(true);
    this.dialogRef.disableClose = true;
    this.dialogRef.updateSize('360px', 'auto');
  }

  restoreFromHighlight(): void {
    this.mapService.clearQueryHighlight();
    this.isHighlighting.set(false);
    this.dialogRef.disableClose = false;
    this.dialogRef.updateSize('1200px', 'auto');
  }

  /** ESC restores from highlight mode; otherwise MatDialog handles it normally. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isHighlighting()) {
      this.restoreFromHighlight();
    }
  }

  // ── Exports ───────────────────────────────────────────────────────────────

  exportCSV(): void {
    const features = this.results()?.features;
    if (!features?.length) return;
    const cols = this.resultColumns;
    const header = cols.join(',');
    const rows = features.map((f) =>
      cols.map((c) => JSON.stringify(f.properties[c] ?? '')).join(','),
    );
    this.downloadBlob(
      new Blob([[header, ...rows].join('\n')], { type: 'text/csv' }),
      'query-results.csv',
    );
  }

  exportGeoJSON(): void {
    const features = this.results()?.features;
    if (!features?.length) return;
    const geojson = {
      type: 'FeatureCollection',
      features: features.map((f) => ({
        type: 'Feature',
        id: f.id,
        geometry: f.geometry ?? null,
        properties: Object.fromEntries(
          Object.entries(f.properties).filter(([k]) => k !== 'geojson'),
        ),
      })),
    };
    this.downloadBlob(
      new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' }),
      'query-results.geojson',
    );
  }

  exportSHP(): void {
    const q = this.activeQuery();
    if (!q?.backend) return;
    const conditions = q.backend.toConditions(this.params());
    if (!conditions.length) return;
    const layerId = this.resolveLayerId();
    const logic = q.backend.logic ?? 'AND';

    this.apiService.exportQueryShp(layerId, conditions, logic).subscribe({
      next: (blob) => this.downloadBlob(blob, 'query-results.zip'),
      error: (err) => {
        // When responseType is 'blob', the error body is itself a Blob
        if (err.error instanceof Blob) {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const json = JSON.parse(reader.result as string);
              this.notifications.showError('SHP export failed: ' + (json.error ?? 'Server error'));
            } catch {
              this.notifications.showError('Shapefile export failed — check server logs.');
            }
          };
          reader.readAsText(err.error);
        } else {
          this.notifications.showError(
            'SHP export failed: ' + (err?.error?.error ?? 'Server error'),
          );
        }
      },
    });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    // Must be in the DOM for Firefox and some Chromium variants
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Delay revocation to ensure the download has started
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // ── SQL Highlight ─────────────────────────────────────────────────────────

  highlightSQL(sql: string): SafeHtml {
    const keywords = [
      'SELECT',
      'FROM',
      'WHERE',
      'JOIN',
      'ON',
      'AND',
      'OR',
      'NOT',
      'EXISTS',
      'AS',
      'LEFT',
      'ORDER',
      'BY',
      'GROUP',
      'LIMIT',
      'SUM',
      'COUNT',
      'DESC',
      'ILIKE',
      'IN',
      'INTERVAL',
    ];
    const functions = [
      'ST_DWithin',
      'ST_Within',
      'ST_Intersects',
      'ST_Distance',
      'ST_SetSRID',
      'ST_MakePoint',
      'NOW\\(\\)',
    ];

    const lines = sql.split('\n');
    const html = lines
      .map((line, i) => {
        let escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        functions.forEach((fn) => {
          escaped = escaped.replace(
            new RegExp(`\\b${fn}\\b`, 'g'),
            `<span class="sql-fn">$&</span>`,
          );
        });

        keywords.forEach((kw) => {
          escaped = escaped.replace(
            new RegExp(`\\b${kw}\\b`, 'g'),
            `<span class="sql-kw">$&</span>`,
          );
        });

        escaped = escaped.replace(/'([^']*)'/g, `<span class="sql-str">'$1'</span>`);
        escaped = escaped.replace(/(?<!["'>])\b(\d+\.?\d*)\b/g, `<span class="sql-num">$1</span>`);

        const lineNum = `<span class="sql-ln">${i + 1}</span>`;
        return `<div class="sql-line">${lineNum}<span>${escaped}</span></div>`;
      })
      .join('');

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  closeDialog(): void {
    this.mapService.clearQueryHighlight();
    this.dialogRef.close();
  }
}
