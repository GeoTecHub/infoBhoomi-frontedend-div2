import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { BuildingInfo } from '../../../models/building-info.model';
import { LandParcelInfo } from '../../../models/land-parcel.model';
import {
  BuildingReportComponent,
  BuildingReportData,
} from '../building-report/building-report.component';
import {
  LandParcelReportComponent,
  LandParcelReportData,
} from '../land-parcel-report/land-parcel-report.component';

export interface GenerateReportData {
  type: 'land' | 'building';
  parcel: LandParcelInfo | null;
  building: BuildingInfo | null;
  featureId: string | number | null;
  layerId: number | null;
}

interface ReportOption {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  available: boolean;
  accent: string;
}

@Component({
  selector: 'app-generate-report',
  standalone: true,
  imports: [MatDialogModule, MatIconModule],
  templateUrl: './generate-report.component.html',
  styleUrls: ['./generate-report.component.css'],
})
export class GenerateReportComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: GenerateReportData,
    public dialogRef: MatDialogRef<GenerateReportComponent>,
    private dialog: MatDialog,
  ) {}

  get reportOptions(): ReportOption[] {
    const isLand = this.data.type === 'land' || !!this.data.parcel;
    const isBuild = this.data.type === 'building' || !!this.data.building;
    return [
      {
        id: 'land',
        title: 'Land Parcel Report',
        subtitle:
          '7-section LADM ISO 19152 report covering identification, spatial, physical, zoning, valuation, RRR and metadata.',
        icon: 'map',
        available: isLand,
        accent: '#6fe8a0',
      },
      {
        id: 'building',
        title: 'Building Report',
        subtitle:
          '7-section CityJSON/LADM report covering overview, spatial, physical, units, assessment, RRR and metadata.',
        icon: 'apartment',
        available: isBuild,
        accent: '#5ec8e8',
      },
    ];
  }

  openReport(option: ReportOption): void {
    if (!option.available) return;
    this.dialogRef.close();

    if (option.id === 'land' && this.data.parcel) {
      this.dialog.open(LandParcelReportComponent, {
        data: {
          parcel: this.data.parcel,
          featureId: this.data.featureId,
          layerId: this.data.layerId,
        } as LandParcelReportData,
        width: '900px',
        height: '90vh',
        hasBackdrop: false,
        panelClass: 'report-dialog',
      });
    } else if (option.id === 'building' && this.data.building) {
      this.dialog.open(BuildingReportComponent, {
        data: {
          building: this.data.building,
          featureId: this.data.featureId,
          layerId: this.data.layerId,
        } as BuildingReportData,
        width: '900px',
        height: '90vh',
        hasBackdrop: false,
        panelClass: 'report-dialog',
      });
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
