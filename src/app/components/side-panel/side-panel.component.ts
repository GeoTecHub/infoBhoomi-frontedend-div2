import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { EventEmitter, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DrawService, SelectedFeatureInfo } from '../../services/draw.service'; // Adjust path
import { MapService } from '../../services/map.service';
import { NotificationService } from '../../services/notifications.service';
import { SidebarControlService } from '../../services/sidebar-control.service';
import { FeatureNotAvailableComponent } from '../dialogs/feature-not-available/feature-not-available.component';
import { BuildingTabComponent } from './building-tab/building-tab.component';
import { ExternalTabComponent } from './external-tab/external-tab.component';
import { HomeTabComponent } from './home-tab/home-tab.component';
import { LandTabComponent } from './land-tab/land-tab.component';
import { LegalSpacesTabComponent } from './legal-spaces-tab/legal-spaces-tab.component';

@Component({
  selector: 'app-side-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    BuildingTabComponent,
    HomeTabComponent,
    LandTabComponent,
    LegalSpacesTabComponent,
    ExternalTabComponent,
  ],
  templateUrl: './side-panel.component.html',
  styleUrl: './side-panel.component.css',
})
export class SidePanelComponent {
  dialog = inject(MatDialog);
  private dialogRef: any;

  @Output() emitExtend = new EventEmitter<boolean>();

  selected_feature_ID: any = '';
  selected_layer_ID: any = '';
  private destroy$ = new Subject<void>();
  selected_featureInfo: SelectedFeatureInfo | null = null; // Initialize to null

  activeTab: number = 1;
  isSidebarClosed: boolean = false;
  extendWidth = false;

  constructor(
    private mapService: MapService,
    private drawService: DrawService,
    private notificationService: NotificationService,
    private sidebarService: SidebarControlService,
  ) {
    // Handle feature selection changes
    this.drawService.selectedFeatureInfo$.pipe(takeUntil(this.destroy$)).subscribe((info) => {
      if (!info || (Array.isArray(info) && info.length === 0) || info.length > 1) {
        // Feature deselected
        this.selected_feature_ID = null;
        this.activeTab = 1;
        this.removeExtend();
        return;
      }

      // If info is an array, use the first element
      const featureInfo = Array.isArray(info) ? info[0] : info;

      if (typeof featureInfo.featureId !== 'number' || isNaN(featureInfo.featureId)) {
        this.notificationService.showError('Please save features.');
        return;
      }

      this.selected_featureInfo = featureInfo;
      this.selected_feature_ID = featureInfo.featureId || '';
      this.selected_layer_ID = featureInfo.layerId || '';

      // Auto-switch tabs based on the selected layer
      switch (this.selected_layer_ID) {
        case 1:
        case 6:
          this.activeTab = 2; // Land tab
          this.makeExtend();
          break;
        case 3:
        case 12:
          this.activeTab = 3; // Building tab
          this.makeExtend();
          break;
        case 7:
          this.activeTab = 4; // Legal spaces tab
          this.makeExtend();
          break;
        default:
          this.activeTab = 1; // Default to Home
          this.removeExtend();
      }
    });

    // Handle explicit deselection (e.g., clicking on blank space)
    this.drawService.deselectedFeature$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.selected_feature_ID = null;
      this.activeTab = 1;
      this.removeExtend();
    });

    // Handle sidebar open/close events
    this.sidebarService.isClosed$.pipe(takeUntil(this.destroy$)).subscribe((closed) => {
      this.isSidebarClosed = closed;
    });
  }

  selectTab(tabIndex: number) {
    if (this.selected_feature_ID || tabIndex === 1) {
      this.activeTab = tabIndex;
    } else {
      this.notificationService.showError('Please select an item');
    }
  }

  openProAlert() {
    if (this.dialogRef) {
      // If dialog is already open, close it
      this.dialogRef.close();
      this.dialogRef = null; // Reset the reference
    } else {
      // Open a new dialog if it's not already open
      this.dialogRef = this.dialog.open(FeatureNotAvailableComponent, {
        minWidth: '480px',
      });

      // Reset dialogRef when the dialog is closed
      this.dialogRef.afterClosed().subscribe(() => {
        this.dialogRef = null;
      });
    }
  }

  toggleSidebar() {
    this.sidebarService.toggleSidebar();
  }

  makeExtend() {
    this.extendWidth = true;
    this.emitExtend.emit(true);
  }

  removeExtend() {
    this.extendWidth = false;
    this.emitExtend.emit(false);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
