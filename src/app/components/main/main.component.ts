// src/app/components/main/main.component.ts
import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// OpenLayers imports
import { Map as OLMap } from 'ol';
import MousePosition from 'ol/control/MousePosition';
import Zoom from 'ol/control/Zoom';
import ZoomSlider from 'ol/control/ZoomSlider';
import { createStringXY } from 'ol/coordinate';
import { LoginService } from '../../services/login.service';
import { UserAuthenticatorComponent } from '../auth/user-authenticator/user-authenticator.component';

// App Components & Dialogs
import { FeatureNotAvailableComponent } from '../dialogs/feature-not-available/feature-not-available.component';
import { HeaderComponent } from '../header/header.component';
import { SidePanelComponent } from '../side-panel/side-panel.component';
import { ToolsComponent } from '../tools/tools.component';

// App Services
import { DrawService, SelectedFeatureInfo } from '../../services/draw.service';
import { FeatureService } from '../../services/feature.service';
import { FeatureLinkService } from '../../services/feature-link.service';
import { LayerService } from '../../services/layer.service';
import { MapService, ProjectionCode } from '../../services/map.service';
import { SidebarControlService } from '../../services/sidebar-control.service';
import { UserService } from '../../services/user.service';
import { InfoModalComponent } from '../dialogs/info-modal/info-modal.component';

import { Feature } from 'ol';
import { Coordinate } from 'ol/coordinate';
import { Geometry, LineString, MultiLineString, MultiPolygon, Polygon } from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';

import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point as turfPoint } from '@turf/helpers';
import type {
  Feature as TurfFeature,
  MultiPolygon as TurfMultiPolygon,
  Polygon as TurfPolygon,
} from 'geojson';
import OLFeature from 'ol/Feature';
import { NotificationService } from '../../services/notifications.service';

import { containsCoordinate, getCenter } from 'ol/extent';

function toTurfFeature(geom: Polygon | MultiPolygon): TurfFeature<TurfPolygon | TurfMultiPolygon> {
  if (geom.getType() === 'Polygon') {
    const coords = (geom as Polygon).getCoordinates();
    return {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: coords as unknown as TurfPolygon['coordinates'] },
      properties: {},
    };
  } else {
    const coords = (geom as MultiPolygon).getCoordinates();
    return {
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: coords as unknown as TurfMultiPolygon['coordinates'],
      },
      properties: {},
    };
  }
}

function isOLFeature<T extends Geometry = Geometry>(v: unknown): v is OLFeature<T> {
  return (
    !!v && typeof (v as any).get === 'function' && typeof (v as any).getGeometry === 'function'
  );
}

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    SidePanelComponent,
    UserAuthenticatorComponent,
    ToolsComponent,
    MatProgressSpinnerModule,
  ],
  templateUrl: './main.component.html',
  styleUrl: './main.component.css',
})
export class MainComponent implements OnInit, OnDestroy {
  // --- View Children ---
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('mousePositionElement', { static: true })
  mousePositionElement!: ElementRef<HTMLDivElement>;

  // --- Injected Services ---
  public mapService = inject(MapService);
  public layerService = inject(LayerService);
  public drawService = inject(DrawService);
  private featureLinkService = inject(FeatureLinkService);
  private sidebarService = inject(SidebarControlService);
  private loginService = inject(LoginService);
  private dialog = inject(MatDialog);
  private route = inject(ActivatedRoute);

  // --- Private Properties ---
  private destroy$ = new Subject<void>();
  private mapInstance: OLMap | null = null;
  private mousePositionControl: MousePosition | null = null;
  private dialogRef: any;
  private isLayerLoading = false;

  // --- Public Properties for Template Binding ---
  public availableProjections: ProjectionCode[] = [];
  public selectedDisplayProjection!: ProjectionCode;
  public currentLayerName: string = 'Not Selected';
  public isSidebarClosed = false;

  public extendWidth = false;
  public contextMenuVisible = false;
  public contextMenuPosition = { x: 0, y: 0 };
  public selectedFeatureInfo: SelectedFeatureInfo | null = null;
  public user: any | null = null;

  onExtendChanged(value: boolean) {
    this.extendWidth = value;
  }

  get canConvertToInfobhoomi(): boolean {
    const arr = this.drawService._selectedFeatureInfo?.value ?? [];
    return Array.isArray(arr) && arr.length > 0;
  }

  constructor(
    private featureService: FeatureService,
    private userService: UserService,
    private notificationService: NotificationService,
  ) {
    // Subscriptions that don't depend on the DOM being ready
    this.sidebarService.isClosed$.pipe(takeUntil(this.destroy$)).subscribe((closed) => {
      this.isSidebarClosed = closed;
    });

    this.drawService.selectedFeatureInfo$.pipe(takeUntil(this.destroy$)).subscribe((info) => {
      // If info is an array, use the first element or null; otherwise, use info as is
      const selectedInfo = Array.isArray(info) ? (info.length > 0 ? info[0] : null) : info;
      this.handleFeatureSelection(selectedInfo);
    });

    this.drawService.deselectedFeature$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.extendWidth = false;
    });
  }

  ngOnInit(): void {
    // --- Set up subscriptions to service states ---
    this.availableProjections = this.mapService.getAvailableProjectionCodes();

    // Subscribe to display projection changes
    this.mapService.displayProjection$.pipe(takeUntil(this.destroy$)).subscribe((projCode) => {
      this.selectedDisplayProjection = projCode;
      this.setupMousePositionControl();
    });

    // Subscribe to layer visibility changes from the service
    this.layerService.selectedLayerIds$.pipe(takeUntil(this.destroy$)).subscribe((visibleIds) => {
      this.updateMapLayerVisibility(visibleIds);
    });

    // Subscribe to drawing layer changes to update the UI
    this.layerService.currentLayerIdForDrawing$
      .pipe(takeUntil(this.destroy$))
      .subscribe((layerId) => {
        // this.updateCurrentLayerName(layerId);
      });

    this.layerService.isLoading$.pipe(takeUntil(this.destroy$)).subscribe((isLoading) => {
      this.isLayerLoading = isLoading;
      if (!isLoading) {
        this.tryAutoSelectFeature();
      }
    });

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const featureId = params.get('feature_id');
      if (featureId) {
        this.featureLinkService.setPendingFeatureId(featureId);
        this.tryAutoSelectFeature();
      }
    });

    // REFACTORED: Map initialization is triggered by login status, not component lifecycle.
    // This is more robust and avoids timing issues and the need for setTimeout.
    this.loginService.loginStatus$.pipe(takeUntil(this.destroy$)).subscribe((isLoggedIn) => {
      if (isLoggedIn) {
        // Use a microtask to ensure the view is updated and mapContainer is available
        Promise.resolve().then(() => this.initializeMap());
      } else {
        // Handle logout: potentially dispose of the map
        this.mapService.disposeMap();
      }
    });

    // Initialize default drawing layer
    const selectedLayerId = localStorage.getItem('selected_layer_id');
    this.layerService.setSelectedCurrentLayerIdForDrawing(
      selectedLayerId ? parseInt(selectedLayerId) : 1,
    );
  }

  ngAfterViewInit(): void {
    this.initializeMap();
    this.user = this.userService.getUser();
  }

  getChangesCount() {
    return this.featureService.getStagedChangesCount();
  }

  /**
   * REFACTORED: This is now the single point of entry for map creation.
   * It's called after the user is logged in and the view is ready.
   */
  private initializeMap(): void {
    if (this.mapInstance || !this.mapContainer?.nativeElement) {
      console.warn('Map initialization aborted. Already initialized or container not found.');
      return;
    }

    console.log('MainComponent: Initializing map...');
    this.mapService.initializeMap(this.mapContainer.nativeElement);

    // Subscribe to the map instance from the service
    this.mapService.mapInstance$.pipe(takeUntil(this.destroy$)).subscribe((map) => {
      if (map && !this.mapInstance) {
        // Run only on first-time initialization
        this.mapInstance = map;
        this.onMapReady(map);
      } else if (!map) {
        this.mapInstance = null;
      }
    });
  }

  /**
   * Called once the OpenLayers map instance is created and ready.
   */
  private onMapReady(map: OLMap): void {
    console.log('MainComponent: Map is ready. Setting up controls and loading data.');

    // Add map controls
    map.addControl(new Zoom());
    map.addControl(new ZoomSlider());
    this.setupMousePositionControl();

    // Set up event listeners for context menu
    const viewport = map.getViewport();
    viewport.addEventListener('contextmenu', this.handleRightClick);
    viewport.addEventListener('click', this.hideContextMenu);
    document.addEventListener('click', this.handleGlobalClick, true);

    // REFACTORED: Trigger the centralized layer loading process in the service.
    this.layerService.loadInitialMapLayers();

    // Ensure map size is correct after all setup
    setTimeout(() => map.updateSize(), 0);
  }

  private tryAutoSelectFeature(): void {
    if (!this.mapInstance || this.isLayerLoading) {
      return;
    }

    const pendingId = this.featureLinkService.consumePendingFeatureId();
    if (!pendingId) {
      return;
    }

    const feature = this.mapService.zoomToFeatureBySuId(pendingId, {
      zoom: 18,
      durationMs: 700,
      fitToExtent: true,
    });

    if (feature) {
      this.drawService.automaticSelectFeature(feature, { multi: false });
      this.notificationService.showSuccess('Feature located and selected.');
    } else {
      this.notificationService.showError('No feature found for that ID.');
    }
  }

  /**
   * Updates the visibility of OpenLayers layers based on the state from LayerService.
   */
  private updateMapLayerVisibility(visibleLayerIds: (number | string | null)[]): void {
    if (!this.mapInstance) return;

    this.mapInstance.getLayers().forEach((layer) => {
      const layerId = layer.get('layerId');
      if (layerId !== undefined && layerId !== null) {
        // Using `some` and `String` conversion for robust comparison
        const shouldBeVisible = visibleLayerIds.some((id) => String(id) === String(layerId));
        if (layer.getVisible() !== shouldBeVisible) {
          layer.setVisible(shouldBeVisible);
        }
      }
    });
  }

  private setupMousePositionControl(): void {
    if (!this.mapInstance || !this.mousePositionElement?.nativeElement) return;

    if (this.mousePositionControl) {
      this.mapInstance.removeControl(this.mousePositionControl);
    }

    this.mousePositionControl = new MousePosition({
      coordinateFormat: createStringXY(4),
      projection: this.mapService.getCurrentDisplayProjection(),
      className: 'custom-mouse-position',
      target: this.mousePositionElement.nativeElement,
    });
    this.mapInstance.addControl(this.mousePositionControl);
  }

  private handleFeatureSelection(info: SelectedFeatureInfo | null) {
    this.selectedFeatureInfo = info;
    if (!info || typeof info.featureId !== 'number' || isNaN(info.featureId)) {
      this.extendWidth = false;
      return;
    }

    // Logic to extend side panel width based on selected layer
    this.extendWidth = info.layerId ? true : false;
  }

  // --- Event Handlers for UI ---

  onDisplayProjectionChange(): void {
    if (this.selectedDisplayProjection) {
      this.mapService.setDisplayProjection(this.selectedDisplayProjection);
    }
  }

  getFeatureCentroid(f: Feature<Geometry>): Coordinate | null {
    const g = f.getGeometry();
    if (!g) return null;

    const type = g.getType();

    if (type === 'Polygon') {
      return (g as Polygon).getInteriorPoint().getCoordinates();
    }

    if (type === 'MultiPolygon') {
      const mp = g as MultiPolygon;
      return mp.getInteriorPoints().getCoordinates()[0];
    }

    const center = g.getExtent();
    const cx = (center[0] + center[2]) / 2;
    const cy = (center[1] + center[3]) / 2;
    const out: Coordinate = [cx, cy];
    g.getClosestPoint([cx, cy], out);
    return out;
  }

  findLayerByNumericId(
    numericLayerId: number | string,
  ): VectorLayer<VectorSource<Feature<Geometry>>> | null {
    if (!this.mapInstance) {
      console.warn('MapService findLayerByNumericId: Map not initialized.');
      return null;
    }
    const layerIdAsString = String(numericLayerId);
    const layers = this.mapInstance.getLayers().getArray();

    for (const layer of layers) {
      if (layer instanceof VectorLayer) {
        if (layer.get('layerId') === layerIdAsString) {
          return layer as VectorLayer<VectorSource<Feature<Geometry>>>;
        }
      }
    }
    console.warn(
      `MapService findLayerByNumericId: VectorLayer with custom ID string '${layerIdAsString}' not found.`,
    );
    return null;
  }

  onConvertToBuilding() {
    const sel = this.selectedFeatureInfo?.olFeature as OLFeature<Geometry> | undefined;
    if (!sel) {
      this.notificationService.showError('Please select a feature first.');
      return;
    }

    const centroid = this.getFeatureCentroid(sel);
    if (!centroid) {
      this.notificationService.showError('Could not compute the feature centroid.');
      return;
    }

    const landLayer = this.mapService.findLayerByNumericId(1);
    if (!landLayer) {
      this.notificationService.showError('Land layer (id 1) not found on the map.');
      return;
    }

    const landSrc = landLayer.getSource();
    if (!landSrc) {
      this.notificationService.showError('Land layer source not ready.');
      return;
    }

    const turfPt = turfPoint([centroid[0], centroid[1]]);

    let match: any | null = null;
    let total = 0,
      tested = 0,
      hits = 0;

    landSrc.forEachFeature((lf) => {
      total++;
      const g = lf.getGeometry();
      if (!g) return;

      const t = g.getType();
      if (t !== 'Polygon' && t !== 'MultiPolygon') return;
      tested++;

      const tFeat = toTurfFeature(g as Polygon | MultiPolygon);
      const inside = (booleanPointInPolygon as any)(turfPt, tFeat);

      if (inside && !match) {
        match = lf as OLFeature<Geometry>;
        hits++;
      }
    });

    if (!match || !isOLFeature(match)) {
      this.notificationService.showError(
        'No Land feature (layer id 1) contains the selected feature.',
      );
      return;
    }

    const fLayerId = match.get('layerId');
    if (fLayerId !== undefined && String(fLayerId) !== '1') {
      this.notificationService.showError('Found containing feature is not in Land layer (id 1).');
      return;
    }

    const suid = match.get('feature_Id') ?? (match.get('su_id') as string | undefined);

    if (!suid) {
      this.notificationService.showError('The containing Land feature has no su_id.');
      return;
    }

    if (suid === this.selectedFeatureInfo?.featureId) {
      return this.notificationService.showError('The selected feature is already a Land feature.');
    }

    sel.set('ref_id', suid);
    sel.set('layer_id', 3);

    if (this.selectedFeatureInfo?.featureId) {
      sel.set('isUpdateOnly', true);
    }

    try {
      const buildingColor = this.layerService.getLayerColor(3);
      const geomType = sel.getGeometry()?.getType() || 'Polygon';
      sel.setStyle(
        this.drawService['createStyleForLayer']?.(buildingColor, 'Polygon') ?? sel.getStyle(),
      );
    } catch (e) {}

    const newData = this.featureService.convertFeatureToFeatureData(sel);
    if (!newData) {
      this.notificationService.showError('Failed to prepare feature data for saving.');
      return;
    }

    const staged = this.featureService.getStagedChanges();
    const uuid = newData.properties.uuid;

    const idxAdd = staged.findIndex(
      (c) => c.type === 'add' && c.newFeatureData.properties.uuid === uuid,
    );
    const idxUpd = staged.findIndex(
      (c) => c.type === 'update' && c.newFeatureData.properties.uuid === uuid,
    );

    if (idxAdd > -1) {
      this.featureService.stageUpdate(newData, newData);
      this.notificationService.showSuccess('Updated staged ADD with Building ref_id and layer.');
    } else if (idxUpd > -1) {
      const existing = staged[idxUpd];
      if (existing.type === 'update') {
        this.featureService.stageUpdate(newData, existing.originalFeatureData);
        this.notificationService.showSuccess(
          'Updated staged UPDATE with Building ref_id and layer.',
        );
      } else {
        this.featureService.stageUpdate(newData, undefined as any);
      }
    } else {
      this.featureService.stageAddition(newData, undefined as any);
      this.notificationService.showSuccess('Staged as ADD with Building ref_id and layer.');
    }

    this.hideContextMenu();
  }

  handleRightClick = (event: MouseEvent): void => {
    event.preventDefault();
    if (!this.featureService.getAddPermission()) return;

    if (this.selectedFeatureInfo) {
      this.contextMenuVisible = true;
      this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    } else {
      this.hideContextMenu();
    }
  };

  hideContextMenu = (): void => {
    this.contextMenuVisible = false;
  };

  handleGlobalClick = (event: MouseEvent): void => {
    const menu = (event.target as HTMLElement).closest('.map-context-menu');
    if (!menu) {
      this.hideContextMenu();
    }
  };

  onAddBuilding(): void {
    this.drawService.selectedRefFeatureId = this.drawService.getSelectedFeatureId();
    this.layerService.setSelectedCurrentLayerIdForDrawing(3); // 'Building' layer
    this.layerService.setLayerVisibility(3, true);
    this.drawService.setActiveTool({ type: 'draw', drawType: 'Polygon' });
    this.hideContextMenu();
  }

  onAddLegalForms(): void {
    this.openProAlert();
    this.hideContextMenu();
  }

  openProAlert(): void {
    if (this.dialogRef) return;
    this.dialogRef = this.dialog.open(FeatureNotAvailableComponent, { minWidth: '480px' });
    this.dialogRef.afterClosed().subscribe(() => (this.dialogRef = null));
  }

  onClickInfo(): void {
    if (this.dialogRef) return;
    this.dialogRef = this.dialog.open(InfoModalComponent, { minWidth: '480px' });
    this.dialogRef.afterClosed().subscribe(() => (this.dialogRef = null));
  }

  private findGndVectorLayer(): VectorLayer<VectorSource<OLFeature<Geometry>>> | null {
    const map = this.mapService.mapInstance;
    if (!map) return null;

    const layers = map.getLayers().getArray();
    for (const layer of layers) {
      if (layer instanceof VectorLayer) {
        const src = layer.getSource() as VectorSource<OLFeature<Geometry>> | undefined;
        if (!src) continue;

        const tag = (
          layer.get('layerType') ||
          layer.get('layerTag') ||
          layer.get('layer_name') ||
          ''
        )
          .toString()
          .toLowerCase();
        if (tag.includes('gnd')) return layer as any;

        const sample = src.getFeatures()[0];
        if (sample) {
          const hasGndProp =
            sample.get('gnd_id') !== undefined ||
            sample.get('gndId') !== undefined ||
            sample.get('gnd_code') !== undefined ||
            sample.get('gndCode') !== undefined;
          if (hasGndProp) return layer as any;
        }
      }
    }
    return null;
  }

  private getInteriorCoordinate(g: Geometry | null): [number, number] | null {
    if (!g) return null;

    if (g instanceof Polygon) {
      const pt = g.getInteriorPoint();
      return pt.getCoordinates() as [number, number];
    }
    if (g instanceof MultiPolygon) {
      const mp = g.getInteriorPoints();
      const p = mp.getPoint(0);
      return p
        ? (p.getCoordinates() as [number, number])
        : (getCenter(g.getExtent()) as [number, number]);
    }
    if (g instanceof LineString) {
      return g.getCoordinateAt(0.5) as [number, number];
    }
    if (g instanceof MultiLineString) {
      const l0 = g.getLineString(0);
      return l0
        ? (l0.getCoordinateAt(0.5) as [number, number])
        : (getCenter(g.getExtent()) as [number, number]);
    }
    return getCenter(g.getExtent()) as [number, number];
  }

  private resolveGndIdForFeature(
    feat: OLFeature<Geometry>,
    gndLayer: VectorLayer<VectorSource<OLFeature<Geometry>>>,
  ): string | number | null {
    const src = gndLayer.getSource();
    const g = feat.getGeometry();
    if (!src || !g) return null;

    const coord = this.getInteriorCoordinate(g);
    if (!coord) return null;

    const candidates = src.getFeatures().filter((f) => {
      const geom = f.getGeometry();
      return geom && containsCoordinate(geom.getExtent(), coord);
    });

    for (const poly of candidates) {
      const geom = poly.getGeometry();
      if (!geom) continue;

      if (
        (geom instanceof Polygon || geom instanceof MultiPolygon) &&
        geom.intersectsCoordinate(coord)
      ) {
        const gid =
          poly.get('gnd_id') ??
          poly.get('gndId') ??
          poly.get('gnd_code') ??
          poly.get('gndCode') ??
          null;
        return gid;
      }
    }

    return null;
  }

  onConvertToInfobhoomi(): void {
    try {
      const selectedInfoArr = this.drawService._selectedFeatureInfo?.value ?? [];
      if (!Array.isArray(selectedInfoArr) || selectedInfoArr.length === 0) {
        this.notificationService.showError('Please select one or more features first.');
        this.hideContextMenu();
        return;
      }

      const activeLayerId = this.layerService.getSelectedCurrentLayerIdForDrawing();
      if (activeLayerId == null || activeLayerId === '') {
        this.notificationService.showError('Please select an active layer before converting.');
        this.hideContextMenu();
        return;
      }

      const gndLayer = this.findGndVectorLayer();
      if (!gndLayer) {
        this.notificationService.showError(
          'GND layer not found on the map. Please load/enable it first.',
        );
        this.hideContextMenu();
        return;
      }

      const toStage: any[] = [];
      const missingGnd: number[] = [];

      for (let i = 0; i < selectedInfoArr.length; i++) {
        const info = selectedInfoArr[i];
        const olFeature = info?.olFeature as OLFeature<Geometry> | undefined;
        if (!olFeature) continue;

        olFeature.set('layer_id', activeLayerId);

        const gndId = this.resolveGndIdForFeature(olFeature, gndLayer);
        if (gndId == null) {
          missingGnd.push(i + 1);
          continue;
        }
        olFeature.set('gnd_id', gndId);

        const payload = this.featureService.convertFeatureToFeatureData(olFeature);

        if (payload?.properties) {
          payload.properties.gnd_id = gndId;
          payload.properties.layer_id = activeLayerId;
        }

        if (payload) toStage.push(payload);
      }

      if (missingGnd.length > 0) {
        this.notificationService.showError(
          `Cannot convert: ${missingGnd.length} selected feature(s) are outside any GND (indexes: ${missingGnd.join(', ')}).`,
        );
        this.hideContextMenu();
        return;
      }

      if (toStage.length === 0) {
        this.notificationService.showError('No features were converted.');
        this.hideContextMenu();
        return;
      }

      for (const p of toStage) {
        this.featureService.stageAddition(p, undefined as any);
      }

      // this.removeSelectedFeaturesFromMap();

      this.notificationService.showSuccess(
        `Converted ${toStage.length} feature(s) to Infobhoomi (layer ${activeLayerId}).`,
      );
    } catch (err) {
      console.error('[onConvertToInfobhoomi] error:', err);
      this.notificationService.showError('Conversion failed. See console for details.');
    } finally {
      this.hideContextMenu();
    }
  }

  // private removeSelectedFeaturesFromMap(): void {
  //   const map = this.mapService.mapInstance;
  //   if (!map) return;

  //   const selectedInfoArr = this.drawService._selectedFeatureInfo?.value ?? [];
  //   if (!Array.isArray(selectedInfoArr) || selectedInfoArr.length === 0) return;

  //   const layers = map.getLayers().getArray();

  //   for (const { olFeature } of selectedInfoArr) {
  //     if (!olFeature) continue;

  //     for (const layer of layers) {
  //       if (layer instanceof VectorLayer) {
  //         const src = layer.getSource() as VectorSource<OLFeature<Geometry>> | undefined;
  //         if (src && src.hasFeature(olFeature)) {
  //           try {
  //             src.removeFeature(olFeature);
  //             break;
  //           } catch (_) {}
  //         }
  //       }
  //     }
  //   }

  //   try {
  //     this.drawService['clearSelections']?.();
  //     this.drawService._selectedFeatureInfo.next([]);
  //   } catch {}
  // }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Clean up global event listeners
    if (this.mapInstance) {
      const viewport = this.mapInstance.getViewport();
      viewport.removeEventListener('contextmenu', this.handleRightClick);
      viewport.removeEventListener('click', this.hideContextMenu);
    }
    document.removeEventListener('click', this.handleGlobalClick, true);
  }
}
