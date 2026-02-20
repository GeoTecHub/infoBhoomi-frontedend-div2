import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { QUERY_CATEGORIES, QueryCategory, QueryDef } from './query-categories';

interface HistoryEntry {
  query: string;
  category: string;
  time: string;
  count: number;
}

@Component({
  selector: 'app-gis-query-console',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule],
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
  results = signal<{ count: number; time: string; query: string } | null>(null);
  showSQL = signal(false);
  history = signal<HistoryEntry[]>([]);

  constructor(
    private dialogRef: MatDialogRef<GisQueryConsoleComponent>,
    private sanitizer: DomSanitizer,
  ) {}

  get category(): QueryCategory {
    return this.categories[this.activeCategory()];
  }

  get generatedSQL(): string {
    const q = this.activeQuery();
    return q ? q.sql(this.params()) : '';
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
      defaults[p.key] = p.default !== undefined ? p.default : p.options?.[0] || '';
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

  runQuery(): void {
    this.isRunning.set(true);
    this.results.set(null);
    setTimeout(() => {
      this.isRunning.set(false);
      const count = Math.floor(Math.random() * 180) + 20;
      const res = {
        count,
        time: (Math.random() * 2 + 0.3).toFixed(2),
        query: this.activeQuery()!.name,
      };
      this.results.set(res);
      this.history.update((prev) => [
        {
          query: this.activeQuery()!.name,
          category: this.category.label,
          time: new Date().toLocaleTimeString(),
          count,
        },
        ...prev.slice(0, 9),
      ]);
    }, 1800);
  }

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
        let escaped = line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        // Highlight PostGIS functions (before keywords to avoid overlap)
        functions.forEach((fn) => {
          escaped = escaped.replace(
            new RegExp(`\\b${fn}\\b`, 'g'),
            `<span class="sql-fn">$&</span>`,
          );
        });

        // Highlight keywords
        keywords.forEach((kw) => {
          escaped = escaped.replace(
            new RegExp(`\\b${kw}\\b`, 'g'),
            `<span class="sql-kw">$&</span>`,
          );
        });

        // Highlight strings
        escaped = escaped.replace(
          /'([^']*)'/g,
          `<span class="sql-str">'$1'</span>`,
        );

        // Highlight numbers (not inside already-highlighted spans)
        escaped = escaped.replace(
          /(?<!["'>])\b(\d+\.?\d*)\b/g,
          `<span class="sql-num">$1</span>`,
        );

        const lineNum = `<span class="sql-ln">${i + 1}</span>`;
        return `<div class="sql-line">${lineNum}<span>${escaped}</span></div>`;
      })
      .join('');

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
