import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PLATFORM_ID } from '@angular/core';
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

import { CustomButtonsComponent } from '../../custom-buttons/custom-buttons.component';
import { APIsService } from '../../../../services/api.service';
import { MapService } from '../../../../services/map.service';
import { NotificationService } from '../../../../services/notifications.service';

// ── Static definitions ────────────────────────────────────────────────────────

export interface QueryCondition {
  field: string;
  operator: string;
  value: string;
}

export interface SavedFormula {
  name: string;
  layerId: number;
  conditions: QueryCondition[];
  logic: 'AND' | 'OR';
}

interface LayerDef {
  id: number;
  label: string;
}

interface AttributeDef {
  field: string;
  label: string;
  type: 'string' | 'number';
}

const SUPPORTED_LAYERS: LayerDef[] = [
  { id: 1, label: 'Land Parcels' },
  { id: 6, label: 'Land Parcels (Alt)' },
  { id: 3, label: 'Buildings' },
  { id: 12, label: 'Buildings (Alt)' },
];

const LAYER_ATTRIBUTES: Record<number, AttributeDef[]> = {
  1: [
    { field: 'area_m2', label: 'Area (m²)', type: 'number' },
    { field: 'land_name', label: 'Land Name', type: 'string' },
    { field: 'access_road', label: 'Access Road', type: 'string' },
    { field: 'sl_land_type', label: 'Land Type', type: 'string' },
    { field: 'postal_address', label: 'Postal Address', type: 'string' },
  ],
  3: [
    { field: 'area_m2', label: 'Area (m²)', type: 'number' },
    { field: 'building_name', label: 'Building Name', type: 'string' },
    { field: 'no_floors', label: 'No. of Floors', type: 'number' },
    { field: 'structure_type', label: 'Structure Type', type: 'string' },
    { field: 'condition', label: 'Condition', type: 'string' },
    { field: 'roof_type', label: 'Roof Type', type: 'string' },
    { field: 'construction_year', label: 'Construction Year', type: 'number' },
  ],
};
LAYER_ATTRIBUTES[6] = LAYER_ATTRIBUTES[1];
LAYER_ATTRIBUTES[12] = LAYER_ATTRIBUTES[3];

const OPERATORS_STRING = ['=', '!=', '%'];
const OPERATORS_NUMBER = ['=', '!=', '>', '<', '>=', '<='];
const SAVED_KEY = 'ib_query_formulas';

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-query-builder',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogClose,
    MatDialogActions,
    MatDialogContent,
    MatDialogModule,
    CustomButtonsComponent,
  ],
  templateUrl: './query-builder.component.html',
  styleUrl: './query-builder.component.css',
})
export class QueryBuilderComponent implements OnDestroy {
  private api = inject(APIsService);
  private mapService = inject(MapService);
  private notify = inject(NotificationService);
  private dialogRef = inject(MatDialogRef<QueryBuilderComponent>);
  private platformId = inject(PLATFORM_ID);

  // ── view state ──────────────────────────────────────────────────────────────
  isAdvancedMode = signal(false);
  isLoading = signal(false);
  resultCount = signal<number | null>(null);

  // ── layer & attribute selection ─────────────────────────────────────────────
  supportedLayers = SUPPORTED_LAYERS;
  selectedLayerId = signal<number | null>(null);

  availableAttributes = computed<AttributeDef[]>(() => {
    const id = this.selectedLayerId();
    return id != null ? (LAYER_ATTRIBUTES[id] ?? []) : [];
  });

  availableOperators = computed<string[]>(() => {
    const attr = this.availableAttributes().find((a) => a.field === this.newCondition().field);
    return attr?.type === 'number' ? OPERATORS_NUMBER : OPERATORS_STRING;
  });

  // ── new condition being built ───────────────────────────────────────────────
  newCondition = signal<QueryCondition>({ field: '', operator: '=', value: '' });

  // ── condition list & logic ──────────────────────────────────────────────────
  conditions = signal<QueryCondition[]>([]);
  logic = signal<'AND' | 'OR'>('AND');

  // ── formula display ─────────────────────────────────────────────────────────
  formulaDisplay = computed<string>(() => {
    const conds = this.conditions();
    if (!conds.length) return '';
    const logic = this.logic();
    return conds
      .map((c) => {
        const attr = this.availableAttributes().find((a) => a.field === c.field);
        const label = attr?.label ?? c.field;
        const op = c.operator === '%' ? 'LIKE' : c.operator;
        const val = attr?.type === 'number' ? c.value : `'${c.value}'`;
        return `${label} ${op} ${val}`;
      })
      .join(`\n${logic}\n`);
  });

  // ── saved formulas ──────────────────────────────────────────────────────────
  savedFormulas = signal<SavedFormula[]>(this._loadSaved());
  saveQueryName = signal('');

  // ── helpers ─────────────────────────────────────────────────────────────────

  onLayerChange(id: string): void {
    this.selectedLayerId.set(id ? Number(id) : null);
    this.conditions.set([]);
    this.resultCount.set(null);
    this.newCondition.set({ field: '', operator: '=', value: '' });
  }

  onFieldChange(field: string): void {
    const attrs = this.availableAttributes();
    const attr = attrs.find((a) => a.field === field);
    const defaultOp = attr?.type === 'number' ? '=' : '=';
    this.newCondition.set({ field, operator: defaultOp, value: '' });
  }

  onOperatorChange(op: string): void {
    this.newCondition.update((c) => ({ ...c, operator: op }));
  }

  onValueChange(val: string): void {
    this.newCondition.update((c) => ({ ...c, value: val }));
  }

  addCondition(): void {
    const c = this.newCondition();
    if (!c.field || !c.operator || c.value === '') {
      this.notify.showWarning('Fill in field, operator, and value before adding.');
      return;
    }
    this.conditions.update((list) => [...list, { ...c }]);
    this.newCondition.set({ field: c.field, operator: c.operator, value: '' });
  }

  removeCondition(index: number): void {
    this.conditions.update((list) => list.filter((_, i) => i !== index));
  }

  setLogic(l: 'AND' | 'OR'): void {
    this.logic.set(l);
  }

  // ── apply query ─────────────────────────────────────────────────────────────

  applyQuery(): void {
    const layerId = this.selectedLayerId();
    if (!layerId) {
      this.notify.showWarning('Please select a layer first.');
      return;
    }
    this.isLoading.set(true);
    this.resultCount.set(null);
    this.api.loadFromStorage();
    this.api.queryParcels(layerId, this.conditions(), this.logic()).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.resultCount.set(res.count);
        if (res.count === 0) {
          this.notify.showInfo('No features matched the query.');
          this.mapService.clearQueryHighlight();
        } else {
          this.mapService.highlightQueryResults(res.features);
          this.notify.showSuccess(`${res.count} feature(s) highlighted on the map.`);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notify.showError(err?.error?.error ?? 'Query failed. Please try again.');
      },
    });
  }

  // ── save / load ─────────────────────────────────────────────────────────────

  saveFormula(): void {
    const name = this.saveQueryName().trim();
    const layerId = this.selectedLayerId();
    if (!name) {
      this.notify.showWarning('Enter a name for this formula.');
      return;
    }
    if (!layerId || !this.conditions().length) {
      this.notify.showWarning('Build at least one condition before saving.');
      return;
    }
    const formula: SavedFormula = {
      name,
      layerId,
      conditions: [...this.conditions()],
      logic: this.logic(),
    };
    const updated = [...this.savedFormulas().filter((f) => f.name !== name), formula];
    this.savedFormulas.set(updated);
    this._persistSaved(updated);
    this.saveQueryName.set('');
    this.notify.showSuccess(`Formula "${name}" saved.`);
  }

  loadFormula(formula: SavedFormula): void {
    this.selectedLayerId.set(formula.layerId);
    this.conditions.set([...formula.conditions]);
    this.logic.set(formula.logic);
    this.newCondition.set({ field: '', operator: '=', value: '' });
    this.resultCount.set(null);
    this.isAdvancedMode.set(true);
  }

  deleteFormula(name: string): void {
    const updated = this.savedFormulas().filter((f) => f.name !== name);
    this.savedFormulas.set(updated);
    this._persistSaved(updated);
  }

  private _loadSaved(): SavedFormula[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private _persistSaved(formulas: SavedFormula[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(SAVED_KEY, JSON.stringify(formulas));
  }

  // ── lifecycle ────────────────────────────────────────────────────────────────

  ngOnDestroy(): void {
    this.mapService.clearQueryHighlight();
  }

  onClose(): void {
    this.mapService.clearQueryHighlight();
    this.dialogRef.close();
  }

  // ── template helpers ─────────────────────────────────────────────────────────

  getLayerLabel(id: number): string {
    return SUPPORTED_LAYERS.find((l) => l.id === id)?.label ?? String(id);
  }

  getAttrLabel(field: string): string {
    const attr = this.availableAttributes().find((a) => a.field === field);
    return attr?.label ?? field;
  }
}
