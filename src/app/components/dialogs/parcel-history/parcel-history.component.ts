import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { APIsService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notifications.service';

type HistoryRow = {
  id?: number | string;
  date?: string;
  changed_at?: string;
  user?: string;
  changed_by_name?: string;
  change_made?: string;
  change_summary?: string;
  action?: string;
  category?: string;
  record_type?: string;
  event_type?: string;
  affected_parcels?: Array<string | number>;
  status_label?: string;
  source_history_id?: number | string;
  event_id?: number | string;
  can_rectify_now?: boolean;
  can_undo_now?: boolean;
  can_restore?: boolean;
  [key: string]: any;
};

type BuildingUnitHistoryItem = {
  su_id: string | number;
  apt_name?: string;
  floor_no?: string | number;
  bld_property_type?: string;
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-parcel-history',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatTooltipModule,
  ],
  templateUrl: './parcel-history.component.html',
  styleUrl: './parcel-history.component.css',
})
export class ParcelHistoryComponent {
  private readonly cdr = inject(ChangeDetectorRef);

  loading = false;
  restoringId: string | number | null = null;
  attributes: HistoryRow[] = [];
  geometry: HistoryRow[] = [];
  rrr: HistoryRow[] = [];
  relationships: HistoryRow[] = [];
  timeline: HistoryRow[] = [];
  affectedParcels: any = null;
  rectificationControls: any = null;
  selectedEvent: HistoryRow | null = null;
  selectedSuId: string | number;
  selectedLabel = '';
  buildingUnits: BuildingUnitHistoryItem[] = [];

  constructor(
    public dialogRef: MatDialogRef<ParcelHistoryComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      suId: string | number;
      label?: string;
      layerId?: string | number;
      onRestored?: (result: { refreshMap?: boolean; refreshSelection?: boolean; suId: string | number }) => void;
    },
    private apiService: APIsService,
    private notificationService: NotificationService,
  ) {
    this.selectedSuId = data.suId;
    this.selectedLabel = data.label || 'Selected record';
    this.loadHistory();
    this.loadBuildingUnits();
  }

  loadHistory(): void {
    if (!this.selectedSuId) {
      this.notificationService.showError('No selected parcel or building.');
      return;
    }

    this.loading = true;
    this.apiService
      .getParcelHistory(this.selectedSuId)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (res: any) => {
          this.attributes = res?.attributes ?? [];
          this.geometry = res?.geometry ?? [];
          this.rrr = res?.rrr ?? [];
          this.relationships = res?.relationships ?? [];
          this.timeline = res?.timeline ?? [];
          this.affectedParcels = res?.affected_parcels ?? null;
          this.rectificationControls = res?.rectification_controls ?? null;
          this.selectedEvent = this.timeline[0] ?? null;
        },
        error: (err) => {
          this.notificationService.showError(err?.error?.error || 'Could not load history.');
        },
      });
  }

  loadBuildingUnits(): void {
    if (Number(this.data?.layerId) !== 3 || !this.data?.suId) return;
    this.apiService.getBuildingUnits(this.data.suId).subscribe({
      next: (res: any) => {
        this.buildingUnits = res?.units ?? [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.buildingUnits = [];
        this.cdr.markForCheck();
      },
    });
  }

  selectHistorySubject(suId: string | number, label: string): void {
    this.selectedSuId = suId;
    this.selectedLabel = label;
    this.loadHistory();
  }

  unitLabel(unit: BuildingUnitHistoryItem): string {
    return unit.apt_name || `Unit ${unit.su_id}`;
  }

  restore(row: HistoryRow): void {
    if (!row?.id || !row.can_rectify_now) return;
    const reason = window.prompt(`Reason for restoring ${row['field_name'] || 'this attribute'}?`);
    if (!reason?.trim()) return;

    this.restoringId = row.id;
    this.apiService
      .restoreParcelHistory(row.id, { reason: reason.trim() })
      .pipe(
        finalize(() => {
          this.restoringId = null;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Attribute restored.');
          this.notifyRestored(false);
          this.loadBuildingUnits();
          this.loadHistory();
        },
        error: (err) => {
          this.notificationService.showError(err?.error?.error || 'Could not restore this change.');
        },
      });
  }

  restoreRRR(row: HistoryRow): void {
    const historyId = row.source_history_id ?? row.id;
    if (!historyId || !row.can_rectify_now) return;
    const reason = window.prompt('Reason for restoring this RRR event?');
    if (!reason?.trim()) return;

    this.restoringId = historyId;
    this.apiService
      .restoreParcelRRR(historyId, { reason: reason.trim() })
      .pipe(
        finalize(() => {
          this.restoringId = null;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('RRR restored.');
          this.notifyRestored(false);
          this.loadBuildingUnits();
          this.loadHistory();
        },
        error: (err) => {
          this.notificationService.showError(err?.error?.error || 'Could not restore RRR.');
        },
      });
  }

  rectifySelectedEvent(row: HistoryRow): void {
    const recordType = String(row.record_type || '').toLowerCase();
    const eventType = String(row.event_type || '').toLowerCase();
    if (recordType.startsWith('geometry') || eventType.startsWith('geometry')) {
      this.restoreGeometry(row);
    } else if (recordType.startsWith('rrr') || eventType.startsWith('rrr')) {
      this.restoreRRR(row);
    } else if (recordType.startsWith('attribute') || eventType.startsWith('attribute')) {
      this.restore({ ...row, id: row.source_history_id ?? row.id });
    }
  }

  nextRectifiableEvent(): HistoryRow | null {
    return this.rectificationControls?.next_rectifiable_event ?? null;
  }

  lastRectifiedEvent(): HistoryRow | null {
    return this.rectificationControls?.last_rectified_event ?? null;
  }

  rectifyPreviousEvent(): void {
    const row = this.nextRectifiableEvent();
    if (!row) return;
    this.rectifySelectedEvent(row);
  }

  undoLastRectification(): void {
    const row = this.lastRectifiedEvent();
    if (!row) return;
    this.undoRectification(row);
  }

  controlEventLabel(row: HistoryRow | null): string {
    if (!row) return 'None';
    return `${this.eventText(row)} - ${this.rowChange(row)}`;
  }

  restoreGeometry(row: HistoryRow): void {
    if (!row?.source_history_id && !row?.id) return;
    if (!row.can_rectify_now && !row.can_restore) return;
    const childCount = this.affectedParcels?.children?.length ?? 0;
    const reason = window.prompt(
      childCount
        ? `Reason for restoring this geometry? ${childCount} child parcel(s) are linked. They can be marked inactive as part of the rectification.`
        : 'Reason for restoring this geometry?',
    );
    if (!reason?.trim()) return;
    const cancelChildren =
      childCount > 0 &&
      window.confirm(
        'Mark linked child parcels as inactive/superseded as part of this geometry restore?',
      );

    const historyId = row.source_history_id ?? row.id;
    if (historyId == null) return;
    this.restoringId = historyId;
    this.apiService
      .restoreParcelGeometry(historyId, {
        reason: reason.trim(),
        cancel_children: cancelChildren,
      })
      .pipe(
        finalize(() => {
          this.restoringId = null;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (res: any) => {
          const cancelled = res?.cancelled_children?.length
            ? ` Cancelled children: ${res.cancelled_children.join(', ')}.`
            : '';
          this.notificationService.showSuccess(`Geometry restored.${cancelled}`);
          this.notifyRestored(true);
          this.dialogRef.close({ refreshMap: true, suId: this.selectedSuId });
        },
        error: (err) => {
          this.notificationService.showError(err?.error?.error || 'Could not restore geometry.');
        },
      });
  }

  undoRectification(row: HistoryRow): void {
    if (!row?.event_id || !row.can_undo_now) return;
    const reason = window.prompt('Reason for undoing this rectification?');
    if (!reason?.trim()) return;

    this.restoringId = row.event_id;
    this.apiService
      .undoParcelRectification(row.event_id, { reason: reason.trim() })
      .pipe(
        finalize(() => {
          this.restoringId = null;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Rectification undone.');
          this.notifyRestored(true);
          this.dialogRef.close({ refreshMap: true, suId: this.selectedSuId });
        },
        error: (err) => {
          this.notificationService.showError(err?.error?.error || 'Could not undo rectification.');
        },
      });
  }

  rowDate(row: HistoryRow): string | null {
    return row.changed_at || row.date || null;
  }

  private notifyRestored(refreshMap: boolean): void {
    this.data?.onRestored?.({
      refreshMap,
      refreshSelection: true,
      suId: this.selectedSuId,
    });
  }

  rowUser(row: HistoryRow): string {
    return row.changed_by_name || row.user || 'System';
  }

  rowChange(row: HistoryRow): string {
    return row.change_made || row.change_summary || row.action || 'Change recorded';
  }

  themeRows(theme: 'geometry' | 'attribute' | 'rrr'): HistoryRow[] {
    const aliases: Record<string, string[]> = {
      geometry: ['geometry', 'geometry_restore'],
      attribute: ['attribute', 'attribute_restore'],
      rrr: ['rrr', 'rrr_restore'],
    };
    const accepted = aliases[theme] ?? [theme];
    const rows = this.timeline.filter((row) => {
      const recordType = String(row.record_type || '').toLowerCase();
      const eventType = String(row.event_type || '').toLowerCase();
      return (
        accepted.includes(recordType) ||
        accepted.includes(eventType) ||
        recordType.startsWith(theme) ||
        eventType.startsWith(theme)
      );
    });
    if (rows.length) return rows;
    const fallback: Record<string, HistoryRow[]> = {
      geometry: this.geometry,
      attribute: this.attributes,
      rrr: this.rrr,
    };
    return fallback[theme] ?? [];
  }

  relationshipRows(): HistoryRow[] {
    const timelineRows = this.timeline.filter((row) => {
      const recordType = String(row.record_type || '').toLowerCase();
      const eventType = String(row.event_type || '').toLowerCase();
      return recordType === 'relationship' || eventType === 'relationship';
    });
    return timelineRows.length ? timelineRows : this.relationships;
  }

  parcelList(rows: any[] | undefined): string {
    return (rows ?? []).map((row) => row?.su_id).filter(Boolean).join(', ') || 'None';
  }

  affectedText(row: HistoryRow): string {
    const values = row.affected_parcels;
    if (Array.isArray(values) && values.length) return values.join(', ');
    return String(this.selectedSuId);
  }

  eventText(row: HistoryRow): string {
    const type = row.event_type || row.record_type || row.category || 'event';
    return String(type).replace(/_/g, ' ');
  }

  statusText(row: HistoryRow): string {
    const label = String(row.status_label || '').toLowerCase();
    if (row.can_rectify_now) return 'Active';
    if (row.can_undo_now || label === 'rectified') return 'Rectified';
    if (label.includes('blocked')) return 'Locked';
    if (label === 'reapplied') return 'Redone';
    return row.status_label || (row.can_restore ? 'Active' : 'Recorded');
  }

  statusClass(row: HistoryRow): string {
    const status = this.statusText(row).toLowerCase();
    if (status === 'active') return 'status-active';
    if (status === 'rectified') return 'status-rectified';
    if (status === 'locked') return 'status-locked';
    if (status === 'redone' || status === 'reapplied') return 'status-redone';
    return 'status-recorded';
  }

  isLocked(row: HistoryRow): boolean {
    const status = String(row.status_label || '').toLowerCase();
    return status.includes('blocked') || Boolean(row.can_restore && !row.can_rectify_now && !row.can_undo_now);
  }

  beforeText(row: HistoryRow): string {
    return this.valueText(this.extractValue(row['old_value'], 'old_value'));
  }

  afterText(row: HistoryRow): string {
    return this.valueText(this.extractValue(row['new_value'], 'new_value'));
  }

  auditText(row: HistoryRow): string {
    if (row.can_undo_now) return 'Rectification can be redone.';
    const status = this.statusText(row);
    if (status === 'Rectified') return 'Rectified event. Use the latest redo target to reapply it.';
    if (status === 'Recorded') return 'Audit record only. No direct action is available.';
    return status;
  }

  themeLabel(theme: string): string {
    if (theme === 'rrr') return 'RRR';
    if (theme === 'attribute') return 'attribute';
    if (theme === 'relationship') return 'relationship';
    return 'geometry';
  }

  themeSummary(theme: string): string {
    const rows =
      theme === 'relationship'
        ? this.relationshipRows()
        : this.themeRows(theme as 'geometry' | 'attribute' | 'rrr');
    const active = rows.filter((row) => this.statusText(row) === 'Active').length;
    const rectified = rows.filter((row) => this.statusText(row) === 'Rectified').length;
    return `${active} active, ${rectified} rectified`;
  }

  private extractValue(value: any, key: 'old_value' | 'new_value'): any {
    if (value && typeof value === 'object' && key in value) return value[key];
    if (value && typeof value === 'object' && 'snapshot' in value) return value['snapshot'];
    return value;
  }

  private valueText(value: any): string {
    if (value === null || value === undefined || value === '') return 'Empty';
    if (typeof value === 'string') {
      if (value.length > 90) return `${value.slice(0, 90)}...`;
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'object') {
      const parts: string[] = [];
      if ('status' in value) parts.push(`Status: ${value.status ? 'Active' : 'Inactive'}`);
      if (value.rrr_type) parts.push(`Type: ${value.rrr_type}`);
      if (Array.isArray(value.parties) && value.parties.length) {
        const party = value.parties[0];
        const share = party.share ? `, share ${party.share}` : '';
        parts.push(`Party ${party.pid_id || ''}${share}`.trim());
      }
      if (Array.isArray(value.documents)) {
        const names = value.documents
          .map((doc: any) => doc.file_name || doc.admin_source_type || doc.admin_source_id)
          .filter(Boolean);
        parts.push(`Documents: ${names.length ? names.join(', ') : 'None'}`);
      }
      if (parts.length) return parts.join(' | ');
    }
    try {
      const json = JSON.stringify(value);
      return json.length > 90 ? `${json.slice(0, 90)}...` : json;
    } catch {
      return String(value);
    }
  }

  selectEvent(row: HistoryRow): void {
    this.selectedEvent = row;
  }

  selectedDetailRows(type: string): HistoryRow[] {
    if (!this.selectedEvent) return [];
    const sourceHistoryId = this.selectedEvent.source_history_id;
    const pools: Record<string, HistoryRow[]> = {
      geometry: this.geometry,
      attribute: this.attributes,
      rrr: this.rrr,
      relationship: this.relationships,
    };
    return (pools[type] ?? []).filter((row) => {
      if (sourceHistoryId && row.id === sourceHistoryId) return true;
      return row.record_type === type || this.selectedEvent?.record_type === type;
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
