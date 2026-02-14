import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject, signal, OnDestroy, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DrawService, SelectedFeatureInfo } from '../../services/draw.service';
import { MapService } from '../../services/map.service';
import { NotificationService } from '../../services/notifications.service';
import { SidebarControlService } from '../../services/sidebar-control.service';
import { BuildingInfoPanelComponent } from './building-info-panel/building-info-panel.component';
import { LandInfoPanelComponent } from './land-info-panel/land-info-panel.component';

type SidebarTab = 'land' | 'building';

@Component({
  selector: 'app-side-panel',
  standalone: true,
  imports: [CommonModule, BuildingInfoPanelComponent, LandInfoPanelComponent],
  templateUrl: './side-panel.component.html',
  styleUrl: './side-panel.component.css',
})
export class SidePanelComponent implements OnDestroy {
  private ngZone = inject(NgZone);

  @Output() emitExtend = new EventEmitter<boolean>();

  selected_feature_ID: any = '';
  selected_layer_ID: any = '';
  private destroy$ = new Subject<void>();
  selected_featureInfo: SelectedFeatureInfo | null = null;

  // Sidebar state (signals — matching 3D Cadastre pattern)
  activeSidebarTab = signal<SidebarTab>('land');
  isSidebarClosed = signal(false);
  sidebarWidth = signal(340);
  private _resizing = false;

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
        this.selected_feature_ID = null;
        this.activeSidebarTab.set('land');
        this.removeExtend();
        return;
      }

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
          this.activeSidebarTab.set('land');
          this.makeExtend();
          break;
        case 3:
        case 12:
          this.activeSidebarTab.set('building');
          this.makeExtend();
          break;
        default:
          this.activeSidebarTab.set('land');
          this.makeExtend();
      }
    });

    // Handle explicit deselection
    this.drawService.deselectedFeature$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.selected_feature_ID = null;
      this.activeSidebarTab.set('land');
      this.removeExtend();
    });

    // Handle sidebar open/close events
    this.sidebarService.isClosed$.pipe(takeUntil(this.destroy$)).subscribe((closed) => {
      this.isSidebarClosed.set(closed);
    });
  }

  switchTab(tab: SidebarTab): void {
    this.activeSidebarTab.set(tab);
    this.makeExtend();
  }

  isTabEnabled(tab: SidebarTab): boolean {
    switch (tab) {
      case 'land':
        return true;
      case 'building':
        return true;
      default:
        return false;
    }
  }

  toggleSidebar(): void {
    this.sidebarService.toggleSidebar();
  }

  makeExtend(): void {
    this.extendWidth = true;
    this.emitExtend.emit(true);
  }

  removeExtend(): void {
    this.extendWidth = false;
    this.emitExtend.emit(false);
  }

  // ─── Sidebar Resize (from 3D Cadastre) ─────────────────────
  onResizeStart(event: MouseEvent): void {
    event.preventDefault();
    this._resizing = true;
    const startX = event.clientX;
    const startWidth = this.sidebarWidth();

    const onMove = (e: MouseEvent) => {
      if (!this._resizing) return;
      const delta = startX - e.clientX;
      const newWidth = Math.max(240, Math.min(600, startWidth + delta));
      this.ngZone.run(() => this.sidebarWidth.set(newWidth));
    };

    const onUp = () => {
      this._resizing = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
