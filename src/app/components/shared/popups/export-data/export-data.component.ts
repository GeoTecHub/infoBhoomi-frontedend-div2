import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms'; // For ngModel
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom, Subject, Subscription } from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';

import OLFeature from 'ol/Feature';
import OLGeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
import { Geometry as OLGeometry } from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
// For SHP export, client-side creation of ZIP is complex. Usually, you'd send GeoJSON to a backend to create SHP.
// For this example, we'll focus on client-side GeoJSON and KML. SHP export will be a placeholder.
// import * as shpwrite from 'shp-write'; // Example library for client-side SHP (might be heavy)
// import JSZip from 'jszip'; // For creating ZIP files

import { API_LAYER_RESPONSE } from '../../../../models/API'; // For layer listing
import { DrawService } from '../../../../services/draw.service';
import { LayerService } from '../../../../services/layer.service';
import { MapService } from '../../../../services/map.service';
import { NotificationService } from '../../../../services/notifications.service';
import { CustomButtonsComponent } from '../../custom-buttons/custom-buttons.component';

type ExportType = 'selectedObjects' | 'layers' | null;
type ExportFormat = 'geojson' | 'kml' | 'shp' | null;

@Component({
  selector: 'app-export-data',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    CustomButtonsComponent,
  ],
  templateUrl: './export-data.component.html',
  styleUrls: ['./export-data.component.css'],
})
export class ExportDataComponent implements OnInit, OnDestroy {
  // --- Component State ---
  exportType: ExportType = null;
  exportFormat: ExportFormat = 'kml';
  exportFilename: string = 'exported_data';
  isProcessing: boolean = false;

  // --- Consolidated Selection State ---
  isSelectingForExport: boolean = false;
  selectedFeaturesForExport: OLFeature<OLGeometry>[] = [];

  // --- For Layers ---
  availableLayersForExport: API_LAYER_RESPONSE[] = [];
  selectedLayerIdsForExport: number[] = [];

  private selectionSubscription: Subscription | null = null;
  private escapeListener: ((event: KeyboardEvent) => void) | null = null;
  private destroy$ = new Subject<void>();

  private olGeoJsonFormat = new OLGeoJSON();
  private olKmlFormat = new KML({ extractStyles: true, showPointNames: true });

  constructor(
    public dialogRef: MatDialogRef<ExportDataComponent>,
    private drawService: DrawService,
    private layerService: LayerService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private mapService: MapService,
  ) {}

  ngOnInit(): void {
    this.loadAvailableLayers();
    // Listen to selection changes IF DrawService.select$ is a continuous stream
    // If drawService.selectFeatures() is promise-like, we handle selection differently
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Ensure cleanup happens if the dialog is closed while selecting.
    this.stopSelectionProcess();
  }

  loadAvailableLayers(): void {
    this.layerService
      .getLayers()
      .pipe(takeUntil(this.destroy$))
      .subscribe((layers) => {
        this.availableLayersForExport = layers;
      });
  }

  onExportTypeChange(): void {
    // When the main export type changes, stop any in-progress selection.
    this.stopSelectionProcess();
    this.selectedFeaturesForExport = [];
    this.selectedLayerIdsForExport = [];
  }

  /**
   * Called by the "Select Objects on Map" button.
   * This is the single entry point to begin the selection workflow.
   */
  async startSelectionProcess(): Promise<void> {
    if (this.isSelectingForExport) return;

    try {
      // Wait for the service to be fully ready before proceeding.
      await firstValueFrom(
        this.drawService.interactionsReady$.pipe(
          filter((ready) => ready),
          take(1),
        ),
      );

      this.isSelectingForExport = true;
      this.selectedFeaturesForExport = [];
      this.updateDialogAppearance(true); // Move dialog and hide backdrop

      // Delegate activation entirely to the service.
      this.drawService.activateSelectForExport();
      this.notificationService.showInfo(
        "Multi-select active. Click 'Done' or press ESC when finished.",
      );

      // Set up the listener for user cancellation.
      this.setupEscapeListener();

      // Subscribe to the results from the service.
      this.selectionSubscription = this.drawService.selectedFeatures$
        .pipe(takeUntil(this.destroy$))
        .subscribe((featuresFromService) => {
          this.selectedFeaturesForExport = featuresFromService;
          this.cdr.detectChanges();
        });
    } catch (error) {
      this.notificationService.showError('Failed to start selection tool.');
      this.stopSelectionProcess(); // Revert state if there was an error
    }
  }

  /**
   * Called by the "Done Selecting" button or when the process is cancelled.
   * This is the single exit point for the selection workflow.
   */
  stopSelectionProcess(): void {
    if (!this.isSelectingForExport) return;

    // >>> THE CRITICAL FIX: Unsubscribe FIRST <<<
    // This "locks in" the last valid list of features we received.
    this.selectionSubscription?.unsubscribe();
    this.selectionSubscription = null;

    // >>> NOW, tell the service to deactivate the tool <<<
    // The service will clear its internal state, but our component won't hear it.
    this.drawService.deactivateSelectForExport();

    // The rest of the logic remains the same.
    this.isSelectingForExport = false;
    this.updateDialogAppearance(false);
    this.cleanupEscapeListener();

    if (this.selectedFeaturesForExport.length > 0) {
      this.notificationService.showSuccess(
        `${this.selectedFeaturesForExport.length} features ready for export.`,
      );
    } else {
      this.notificationService.showInfo('Selection finished.');
    }
  }

  // A getter to simplify the *ngIf logic in the template.
  get showFormatOptions(): boolean {
    if (this.exportType === 'selectedObjects') {
      return this.selectedFeaturesForExport.length > 0 && !this.isSelectingForExport;
    }
    if (this.exportType === 'layers') {
      return this.selectedLayerIdsForExport.length > 0;
    }
    return false;
  }

  isExportReady(): boolean {
    return this.showFormatOptions && !!this.exportFormat && !!this.exportFilename.trim();
  }

  async executeExport(): Promise<void> {
    if (!this.isExportReady()) {
      this.notificationService.showWarning('Please complete all selections.');
      return;
    }
    let featuresToExport: OLFeature<OLGeometry>[] = [];
    const map = await this.drawService.getMap();
    const mapProjection = map.getView().getProjection();
    const dataProjection = 'EPSG:4326';

    try {
      if (this.exportType === 'selectedObjects') {
        featuresToExport = this.selectedFeaturesForExport;
      } else if (this.exportType === 'layers') {
        featuresToExport = await this.getFeaturesFromSelectedLayers();
      }

      if (featuresToExport.length === 0) {
        this.notificationService.showWarning('No features found to export.');
        this.isProcessing = false;
        return;
      }

      // Clone and reproject features if needed for export format (e.g., to WGS84 for GeoJSON/KML)
      const clonedAndReprojectedFeatures: OLFeature<OLGeometry>[] = featuresToExport.map((f) => {
        const clone = f.clone();
        if (mapProjection && mapProjection.getCode() !== dataProjection) {
          clone.getGeometry()?.transform(mapProjection, dataProjection);
        }
        // Optionally strip OL-specific properties if the format doesn't need them
        // const props = clone.getProperties();
        // delete props.layer_id; // Example
        // clone.setProperties(props);
        return clone;
      });

      let fileContent: string | ArrayBuffer = '';
      let mimeType: string = '';
      let fileExtension: string = '';

      switch (this.exportFormat) {
        case 'geojson':
          fileContent = this.olGeoJsonFormat.writeFeatures(clonedAndReprojectedFeatures);
          mimeType = 'application/geo+json';
          fileExtension = 'geojson';
          break;
        case 'kml':
          fileContent = this.olKmlFormat.writeFeatures(clonedAndReprojectedFeatures, {
            // KML specific options if needed
            // featureProjection: dataProjection, // Already transformed
            // dataProjection: dataProjection
          });
          mimeType = 'application/vnd.google-earth.kml+xml';
          fileExtension = 'kml';
          break;
        case 'shp':
          this.notificationService.showWarning(
            'Client-side SHP export is complex. This is a placeholder.',
          );
          // For actual SHP: Convert featuresToExport (ensure they are simple GeoJSON-like)
          // then use a library like shp-write and jszip.
          // Example with shp-write (requires features as GeoJSON Feature array):
          // const geoJsonFeatures = JSON.parse(this.olGeoJsonFormat.writeFeatures(clonedAndReprojectedFeatures));
          // const shpBuffer = shpwrite.zip(geoJsonFeatures);
          // fileContent = shpBuffer;
          mimeType = 'application/zip';
          fileExtension = 'zip';
          // Placeholder for actual shp data generation
          if (clonedAndReprojectedFeatures.length > 0) {
            fileContent = 'Placeholder for SHP data - See console for GeoJSON equivalent.';
            console.log(
              'Data that would be converted to SHP (as GeoJSON):',
              this.olGeoJsonFormat.writeFeatures(clonedAndReprojectedFeatures),
            );
          } else {
            throw new Error('No features to convert for SHP export.');
          }
          break;
        default:
          throw new Error('Invalid export format selected.');
      }

      this.downloadFile(fileContent, `${this.exportFilename}.${fileExtension}`, mimeType);
      this.notificationService.showSuccess('Data exported successfully!');
      this.dialogRef.close({ success: true });
    } catch (error: any) {
      console.error('Export error:', error);
      this.notificationService.showError(`Export failed: ${error.message || 'Unknown error'}`);
    } finally {
      this.isProcessing = false;
    }
  }

  onCancel(): void {
    this.stopSelectionProcess();
    this.dialogRef.close();
  }

  // --- PRIVATE HELPERS ---

  private setupEscapeListener(): void {
    this.cleanupEscapeListener();
    this.escapeListener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this.stopSelectionProcess();
      }
    };
    document.addEventListener('keydown', this.escapeListener, true); // Use capture phase
  }

  private cleanupEscapeListener(): void {
    if (this.escapeListener) {
      document.removeEventListener('keydown', this.escapeListener, true);
      this.escapeListener = null;
    }
  }

  private updateDialogAppearance(isSelecting: boolean): void {
    const backdrop = document.querySelector('.cdk-overlay-backdrop');
    if (isSelecting) {
      this.dialogRef.disableClose = true;
      this.dialogRef.addPanelClass('dialog-move-bottom-left');
      backdrop?.classList.add('hide-backdrop');
    } else {
      this.dialogRef.disableClose = false;
      this.dialogRef.removePanelClass('dialog-move-bottom-left');
      backdrop?.classList.remove('hide-backdrop');
    }
  }

  async toggleSelectObjects(): Promise<void> {
    if (this.isSelectingForExport) {
      // If we are currently selecting, this action means "Done".
      this.stopSelectionProcess();
      this.notificationService.showSuccess(
        `${this.selectedFeaturesForExport.length} features selected and ready for export.`,
      );
    } else {
      // If we are not currently selecting, this action means "Start".
      this.startSelectionProcess();
    }
  }

  private async getFeaturesFromSelectedLayers(): Promise<OLFeature<OLGeometry>[]> {
    const olMap = this.mapService.getMapInstance();
    if (!olMap) return [];

    let allFeatures: OLFeature<OLGeometry>[] = [];
    for (const layerId of this.selectedLayerIdsForExport) {
      const olLayer = this.mapService.findLayerByNumericId(layerId); // Use your existing MapService method
      if (olLayer && olLayer instanceof VectorLayer) {
        const source = olLayer.getSource();
        if (source) {
          allFeatures = allFeatures.concat(source.getFeatures());
        }
      }
    }
    return allFeatures;
  }

  private downloadFile(data: string | ArrayBuffer, filename: string, type: string): void {
    const blob = new Blob([data], { type: type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}
