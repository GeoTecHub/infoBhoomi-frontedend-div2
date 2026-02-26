import { CommonModule } from '@angular/common';
import { Component, Inject, signal } from '@angular/core';
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

export interface LandParcelReportData {
  parcel: LandParcelInfo;
  featureId: string | number | null;
  layerId: number | null;
}

type ReportTab = 'overview' | 'spatial' | 'land' | 'zoning' | 'valuation' | 'rrr' | 'metadata';

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

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: LandParcelReportData,
    public dialogRef: MatDialogRef<LandParcelReportComponent>,
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
}
