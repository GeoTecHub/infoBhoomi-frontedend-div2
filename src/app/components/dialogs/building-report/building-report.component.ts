import { CommonModule } from '@angular/common';
import { Component, Inject, signal } from '@angular/core';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import {
  ACCURACY_LEVEL_DISPLAY,
  BuildingInfo,
  CONDITION_DISPLAY,
  ELEVATION_REF_DISPLAY,
  LEGAL_STATUS_DISPLAY,
  LegalStatus,
  LOD_LEVEL_DISPLAY,
  PRIMARY_USE_DISPLAY,
  RESTRICTION_TYPE_DISPLAY,
  RIGHT_TYPE_DISPLAY,
  ROOF_TYPE_DISPLAY,
  STRUCTURE_TYPE_DISPLAY,
  SURVEY_METHOD_DISPLAY,
  UNIT_TYPE_DISPLAY,
} from '../../../models/building-info.model';

export interface BuildingReportData {
  building: BuildingInfo;
  featureId: string | number | null;
  layerId: number | null;
}

type BrTab = 'overview' | 'spatial' | 'physical' | 'units' | 'assessment' | 'rrr' | 'metadata';

@Component({
  selector: 'app-building-report',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, CdkDrag, CdkDragHandle],
  templateUrl: './building-report.component.html',
  styleUrls: ['./building-report.component.css'],
})
export class BuildingReportComponent {
  activeTab = signal<BrTab>('overview');

  readonly tabs: { id: BrTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'info' },
    { id: 'spatial', label: 'Spatial', icon: 'straighten' },
    { id: 'physical', label: 'Physical', icon: 'construction' },
    { id: 'units', label: 'Units', icon: 'apartment' },
    { id: 'assessment', label: 'Assessment', icon: 'monetization_on' },
    { id: 'rrr', label: 'Rights & RRR', icon: 'gavel' },
    { id: 'metadata', label: 'Metadata', icon: 'fact_check' },
  ];

  readonly LEGAL_STATUS_DISPLAY = LEGAL_STATUS_DISPLAY;
  readonly PRIMARY_USE_DISPLAY = PRIMARY_USE_DISPLAY;
  readonly STRUCTURE_TYPE_DISPLAY = STRUCTURE_TYPE_DISPLAY;
  readonly CONDITION_DISPLAY = CONDITION_DISPLAY;
  readonly ROOF_TYPE_DISPLAY = ROOF_TYPE_DISPLAY;
  readonly LOD_LEVEL_DISPLAY = LOD_LEVEL_DISPLAY;
  readonly ELEVATION_REF_DISPLAY = ELEVATION_REF_DISPLAY;
  readonly RIGHT_TYPE_DISPLAY = RIGHT_TYPE_DISPLAY;
  readonly RESTRICTION_TYPE_DISPLAY = RESTRICTION_TYPE_DISPLAY;
  readonly ACCURACY_LEVEL_DISPLAY = ACCURACY_LEVEL_DISPLAY;
  readonly SURVEY_METHOD_DISPLAY = SURVEY_METHOD_DISPLAY;
  readonly UNIT_TYPE_DISPLAY = UNIT_TYPE_DISPLAY;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: BuildingReportData,
    public dialogRef: MatDialogRef<BuildingReportComponent>,
  ) {}

  get building(): BuildingInfo {
    return this.data.building;
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

  getLegalStatusClass(status: string): string {
    switch (status) {
      case LegalStatus.FREEHOLD:
        return 'brr-badge--active';
      case LegalStatus.LEASEHOLD:
        return 'brr-badge--pending';
      case LegalStatus.STRATA:
        return 'brr-badge--info';
      case LegalStatus.STATE:
        return 'brr-badge--historic';
      default:
        return 'brr-badge--pending';
    }
  }

  formatArea(m2: number): string {
    if (!m2) return '—';
    if (m2 >= 10000) return `${(m2 / 10000).toFixed(4)} ha`;
    return `${m2.toLocaleString('en-GB', { maximumFractionDigits: 2 })} m²`;
  }

  formatCurrency(val: number): string {
    if (!val) return '—';
    return val.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
}
