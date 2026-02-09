import { inject, Injectable, OnDestroy } from '@angular/core';
import { featureCollection } from '@turf/helpers';
import * as turf from '@turf/turf'; // Make sure turf is imported
import union from '@turf/union';
import {
  Feature as GeoJsonFeature,
  MultiPolygon as GeoJsonMultiPolygon,
  Polygon as GeoJsonPolygon,
  GeoJsonProperties,
} from 'geojson';
import { Feature, Map as OLMap } from 'ol';
import { CollectionEvent } from 'ol/Collection'; // Import CollectionEvent if using collection listenersimport
import { EventsKey } from 'ol/events';
import GeoJSON from 'ol/format/GeoJSON';
import { Geometry, LineString, MultiPoint, Point, Polygon } from 'ol/geom';
import { Draw, Modify, Select, Snap } from 'ol/interaction';
import { DrawEvent } from 'ol/interaction/Draw';
import { ModifyEvent } from 'ol/interaction/Modify'; // <<< IMPORT THIS TYPE
import { SelectEvent } from 'ol/interaction/Select'; // Import SelectEvent if using 'select' event listener
import VectorLayer from 'ol/layer/Vector'; // Import VectorLayer
import { unByKey } from 'ol/Observable';
import VectorSource from 'ol/source/Vector';
import { getArea, getLength } from 'ol/sphere';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { BehaviorSubject, firstValueFrom, Observable, Subject, throwError } from 'rxjs';
import { filter, finalize, take, takeUntil } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { DrawEndData, FeatureData, FeatureProperties } from '../models/geometry';
import { FeatureService } from './feature.service';
import { LayerService } from './layer.service';
import { MapService } from './map.service';
import { NotificationService } from './notifications.service';

import { UserService } from './user.service';
// Data types
type PreferredIdentifierType = 'uuid' | 'feature_Id';
type DrawType = 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon'; // Define supported types

// Define a type for the active tool for better type safety
export type ActiveTool =
  | { type: 'draw'; drawType: 'Point' | 'LineString' | 'Polygon' }
  | { type: 'select'; multi: boolean }
  | { type: 'modify' } // Modify implies a selection is needed first
  | { type: 'split' } // Split also implies selection then drawing
  | { type: 'merge' } //merge the polygons
  | null; // null when no tool is active

// Define an interface for the emitted selection info (as before)
export interface SelectedFeatureInfo {
  featureId: number | string | null;
  layerId: number | null;
  uuid?: string | null;
  gndId?: string | null; // GND ID for the feature
  olFeature?: Feature<Geometry>; // Optionally include the OL Feature
}

// Default style for drawing
const defaultDrawStyle = new Style({
  stroke: new Stroke({ color: 'rgba(0, 153, 255, 0.9)', width: 3 }), // Bright blue
  fill: new Fill({ color: 'rgba(0, 153, 255, 0.2)' }),
  image: new CircleStyle({
    radius: 7,
    fill: new Fill({ color: 'rgba(0, 153, 255, 0.6)' }),
    stroke: new Stroke({ color: '#fff', width: 2 }),
  }),
  zIndex: Infinity,
});

// Style for selected features
const olSelectedStyle = new Style({
  stroke: new Stroke({ color: 'rgba(255, 0, 0, 0.9)', width: 3 }), // Red
  fill: new Fill({ color: 'rgba(255, 0, 0, 0.2)' }),
  image: new CircleStyle({
    radius: 7,
    fill: new Fill({ color: 'rgba(255, 0, 0, 0.6)' }),
    stroke: new Stroke({ color: '#fff', width: 1.5 }),
  }),
  zIndex: Infinity,
});

// Style for features being modified
const olModifyingFeatureStyle = new Style({
  stroke: new Stroke({ color: 'rgba(255, 165, 0, 0.9)', width: 3 }), // Orange
  fill: new Fill({ color: 'rgba(255, 165, 0, 0.2)' }),
});

// Style for modification vertices
const olVertexStyle = new Style({
  image: new CircleStyle({
    radius: 6,
    fill: new Fill({ color: 'rgba(0, 153, 255, 0.8)' }), // Blue fill for vertices
    stroke: new Stroke({ color: 'white', width: 1.5 }),
  }),
});

// Style for the temporary split line itself
const tempDrawLineStyle = new Style({
  stroke: new Stroke({
    color: 'rgba(255, 0, 255, 0.7)', // Bright magenta, slightly transparent
    width: 3,
    lineDash: [10, 10], // Make the dash more obvious
  }),
});

// Style for the vertices of the temporary split line (OUR BIG SNAP INDICATOR)
const tempDrawVertexStyle = new Style({
  image: new CircleStyle({
    radius: 8,
    fill: new Fill({ color: 'rgba(255, 0, 255, 1)' }),
    stroke: new Stroke({ color: 'white', width: 2 }),
  }),
  geometry: (feature) => {
    const geom = feature.getGeometry() as LineString;
    return geom ? new MultiPoint(geom.getCoordinates()) : undefined;
  },
});

// Combine them into a single style array for the interaction
const tempSplitStyle = [tempDrawLineStyle, tempDrawVertexStyle];

const olModifyInteractionStyle = [olModifyingFeatureStyle, olVertexStyle];

export type DrawStyles =
  | 'default' // The standard blue drawing style
  | 'selected' // The red style for selected features
  | 'split' // The composite magenta style for the temporary split line (line + vertices)
  | 'modifyInteraction' // The composite style for the Modify interaction (orange feature + blue vertices)
  | 'modifying' // The style for ONLY the feature being modified (orange)
  | 'vertex'; // The style for ONLY the modification vertices (blue)

const POINT_ALPHA = 'CC'; // ~80%

function normalizeTo6Hex(color: string): string {
  if (!color) return '#000000';
  if (/^#([0-9a-f]{6})$/i.test(color)) return color;
  if (/^#([0-9a-f]{8})$/i.test(color)) return `#${color.slice(1, 7)}`;
  const m = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i.exec(color);
  if (m) {
    const toHex = (n: string) => Number(n).toString(16).padStart(2, '0');
    return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
  }
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx) {
      ctx.fillStyle = color;
      return normalizeTo6Hex(ctx.fillStyle as string);
    }
  } catch {}
  return '#000000';
}

function makeSketchStyle(hex: string): Style {
  const base = normalizeTo6Hex(hex);
  return new Style({
    stroke: new Stroke({ color: base, width: 2 }),
    fill: new Fill({ color: `${base}4D` }), // polygon sketch fill if needed
    image: new CircleStyle({
      radius: 7,
      fill: new Fill({ color: `${base}${POINT_ALPHA}` }), // <-- same as saved
      stroke: new Stroke({ color: '#fff', width: 2 }),
    }),
    zIndex: Infinity,
  });
}

@Injectable({ providedIn: 'root' })
export class DrawService implements OnDestroy {
  private userService = inject(UserService);
  public mapInstance: OLMap | null = null;
  private destroy$ = new Subject<void>();
  // This will hold the layers that the multi-select interaction should target.
  private selectableLayersForExport: VectorLayer<any>[] = [];

  // --- OpenLayers Interactions (initialized once) ---
  private olDrawPoint: Draw | null = null;
  private olDrawLine: Draw | null = null;
  private olDrawPolygon: Draw | null = null;
  public olSelectMulti: Select | null = null;
  public olSelectSingle: Select | null = null;
  private olModify: Modify | null = null;
  public olSnap: Snap | null = null;
  private currentSnapSource: VectorSource<Feature<Geometry>> | null = null;

  // --- State Management with RxJS ---
  private readonly _interactionsReady = new BehaviorSubject<boolean>(false);
  public readonly interactionsReady$ = this._interactionsReady.asObservable();

  public readonly _activeTool = new BehaviorSubject<ActiveTool>(null);
  public readonly activeTool$ = this._activeTool.asObservable();

  public readonly _isSnappingEnabled = new BehaviorSubject<boolean>(false);
  public readonly isSnappingEnabled$ = this._isSnappingEnabled.asObservable();

  public readonly _selectedFeatures = new BehaviorSubject<Feature<Geometry>[]>([]);
  public readonly selectedFeatures$ = this._selectedFeatures.asObservable();

  public readonly _selectedFeatureInfo = new BehaviorSubject<SelectedFeatureInfo[]>([]);
  public readonly selectedFeatureInfo$ = this._selectedFeatureInfo.asObservable();
  public _selectedRefFeatureId: number | null = null;

  public get selectedRefFeatureId(): number | null {
    return this._selectedRefFeatureId;
  }

  public set selectedRefFeatureId(value: number | null) {
    this._selectedRefFeatureId = value;
  }

  public readonly _drawEnd = new Subject<DrawEndData>();
  public readonly drawEnd$ = this._drawEnd.asObservable();

  public readonly _deselectedFeature = new Subject<void>();
  public readonly deselectedFeature$ = this._deselectedFeature.asObservable();

  // Listeners keys for OL events (to unByKey them)
  private olDrawEndKey: EventsKey | null = null;
  private olDrawAbortKey: EventsKey | null = null;
  private olSelectAddKey: EventsKey | null = null;
  private olSelectRemoveKey: EventsKey | null = null;
  private olModifyEndKey: EventsKey | null = null;

  private currentActiveOlDrawInteraction: Draw | null = null; // Keep track of which one is active// To keep track of the dynamically created draw interaction
  private currentActiveOlSelectInteraction: Select | null = null; // Track which select is actually active

  // This flag tells the select filter how to behave.
  // When false, it allows selection from any visible layer (General Use).
  // When true, it restricts selection based on the selectableLayersForExport array.
  private _isExportSelectionMode = false;

  constructor(
    private mapService: MapService,
    private layerService: LayerService,
    private featureService: FeatureService,
    private notificationService: NotificationService,
  ) {
    this.mapService.mapInstance$.pipe(takeUntil(this.destroy$)).subscribe((map) => {
      this.mapInstance = map;
      // if (map && !this._interactionsReady.value) {
      //   this.initializeAllOlInteractions(map);
      // } else if (!map) {
      //   this.cleanupAllOlInteractions(true);
      // }
      if (map) {
        this.initializeAllOlInteractions(map);
      } else {
        this.cleanupAllOlInteractions(true);
      }
    });

    // Manages GLOBAL tools (Draw, Select, Modify).
    this._activeTool.pipe(takeUntil(this.destroy$)).subscribe((tool) => {
      this.handleActiveToolChange(tool);
    }); // whenever tool changed this will be called

    // Manages the SOURCE of the GLOBAL snap interaction.
    this.layerService.currentLayerIdForDrawing$
      .pipe(
        takeUntil(this.destroy$),
        filter(() => this._isSnappingEnabled.value),
      )
      .subscribe((layerId) => {
        console.log('[DrawService Background] Global snap source might need update.');
        const source =
          layerId !== null ? this.findLayerOnMap(layerId)?.getSource() : new VectorSource();
        this.updateSnapSource(source);
      });

    document.addEventListener('keydown', this.handleGlobalEscKey);
  }

  getSelectedFeatureId(): number | null {
    const id =
      Array.isArray(this._selectedFeatureInfo.value) && this._selectedFeatureInfo.value.length > 0
        ? this._selectedFeatureInfo.value[0].featureId
        : null;
    return typeof id === 'number' ? id : null;
  }

  private shouldUpdateSnapSource(): boolean {
    return (
      this._isSnappingEnabled.value && this.isToolTypeRequiringSnap(this._activeTool.value?.type)
    );
  }

  private isToolTypeRequiringSnap(toolType: string | undefined): boolean {
    return toolType === 'draw' || toolType === 'modify' || toolType === 'split';
  }

  // Create a custom comparison function
  private compareActiveTools(prev: ActiveTool | null, curr: ActiveTool | null): boolean {
    if (prev === curr) return true;
    if (!prev || !curr) return false;
    if (prev.type !== curr.type) return false;

    if (prev.type === 'draw' && curr.type === 'draw') {
      return prev.drawType === curr.drawType;
    }
    if (prev.type === 'select' && curr.type === 'select') {
      return prev.multi === curr.multi;
    }
    return true;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanupAllOlInteractions(true); // Full cleanup on destroy
  }

  // Add this getter:
  public get areInteractionsReady(): boolean {
    return this._interactionsReady.value;
  }

  /**
   * Public entry point for activating a tool.
   * Its main responsibilities are to manage pre-activation cleanup (like clearing selections)
   * and then update the `_activeTool` state. The actual OpenLayers interaction management
   * is handled by the `handleActiveToolChange` method, which subscribes to `_activeTool`.
   *
   * @param tool The tool to activate, or `null` to deactivate all tools.
   */
  public setActiveTool(tool: ActiveTool | null): void {
    // 1. Guard Clause: Ensure interactions are ready before proceeding.
    if (!this._interactionsReady.value) {
      this.notificationService.showWarning('Tools are not ready yet.');
      return;
    }

    const previouslyActiveTool = this._activeTool.value;
    console.log(
      `[DrawService] Setting active tool. New: ${JSON.stringify(tool)}, Previous: ${JSON.stringify(previouslyActiveTool)}`,
    );

    // 2. Pre-update Cleanup: Clear selections if switching AWAY from a selection-based tool.
    // This logic belongs here because this is the only place where we know both the "before" and "after" states.
    if (
      previouslyActiveTool &&
      (previouslyActiveTool.type === 'select' || previouslyActiveTool.type === 'modify')
    ) {
      const newToolIsSelectionBased = tool && (tool.type === 'select' || tool.type === 'modify');
      if (!newToolIsSelectionBased) {
        console.log(`[DrawService] Switching away from a selection tool. Clearing selections.`);
        this.olSelectSingle?.getFeatures().clear();
        this.olSelectMulti?.getFeatures().clear();
        // // Manually trigger the select change handler to broadcast the empty selection state.
        // this.onOlSelectChange();
      }
    }

    // 3. Update State: Set the new tool state.
    // This will trigger the `handleActiveToolChange` subscription, which will manage all OL interaction side effects.

    this._activeTool.next(tool);
  }

  /**
   * A global keydown event handler to cancel any active persistent tool.
   * This provides a universal "ESC to cancel" functionality for the user.
   */
  private handleGlobalEscKey = (event: KeyboardEvent): void => {
    // We only act if the Escape key was pressed.
    if (event.key === 'Escape') {
      const currentTool = this._activeTool.value;

      // If a persistent tool (like draw, select, or modify) is active,
      // this will deactivate it.
      if (currentTool) {
        console.log('[DrawService] Global ESC key pressed. Deactivating current tool.');
        this.setActiveTool(null);
        this.resetRefFeatureActions(); // Reset any reference feature actions
      }
      // Note: This will not interfere with the temporary "split" operation,
      // because those methods have their own, more specific ESC listeners.
    }
  };

  /**
   * Toggles a tool on or off. If the specified tool is currently active, it deactivates it.
   * Otherwise, it activates the specified tool.
   *
   * @param targetTool The tool to toggle.
   */

  public toggleTool(targetTool: ActiveTool): void {
    if (!this._interactionsReady.value) {
      this.notificationService.showWarning('Tools are not ready yet.');
      return;
    }

    const currentTool = this._activeTool.value;

    // Check if the target tool is currently active
    const isCurrentlyActive = this.isToolActive(currentTool, targetTool);

    if (isCurrentlyActive) {
      console.log(`[DrawService] toggleTool: Deactivating ${JSON.stringify(targetTool)}`);
      this.setActiveTool(null); // Deactivate - this will trigger the selection clearing logic
      this.resetRefFeatureActions(); // Reset any reference feature actions
    } else {
      console.log(`[DrawService] toggleTool: Activating ${JSON.stringify(targetTool)}`);
      this.setActiveTool(targetTool); // Activate
    }
  }

  /**
   * Compares two tool objects to see if they represent the same active tool.
   *
   * @param current The current active tool.
   * @param target The target tool to compare against.
   * @returns `true` if the tools are functionally identical, `false` otherwise.
   */

  private isToolActive(current: ActiveTool | null, target: ActiveTool): boolean {
    if (!current || !target) {
      return false;
    }

    if (current.type !== target.type) {
      return false;
    }

    // If types are the same, check for specifics.
    if (current.type === 'draw' && target.type === 'draw') {
      return current.drawType === target.drawType;
    }
    if (current.type === 'select' && target.type === 'select') {
      return current.multi === target.multi;
    }

    // For types like 'modify' or 'split', just matching the type is enough.
    return true;
  }

  /**
   * Gets the current active tool
   */
  public getCurrentActiveTool(): ActiveTool | null {
    return this._activeTool.value;
  }

  /**
   * Deactivates the current tool
   */
  public deactivateCurrentTool(): void {
    this.setActiveTool(null);
    this.resetRefFeatureActions(); // Reset any reference feature actions
  }

  /**
   * Toggles the current snapping state (on to off, off to on).
   * A convenience method for UI buttons.
   */
  public toggleSnapping(): void {
    const newState = !this._isSnappingEnabled.value;
    this.setSnapActive(newState); // Use the refactored, efficient method
    this.notificationService.showInfo(`Snapping ${newState ? 'Enabled' : 'Disabled'}.`);
  }

  // --- Internal OL Interaction Management ---
  private initializeAllOlInteractions(map: OLMap): void {
    console.log('[DrawService] Initializing OpenLayers interactions...');
    this.cleanupAllOlInteractions(true); // Clear local refs and detach old listeners first

    const initialDrawSnapSource =
      this.layerService.getDefaultSourceForInteractions() || new VectorSource();
    if (!this.layerService.getDefaultSourceForInteractions()) {
      console.warn(
        '[DrawService Init] No active layer for initial Draw/Snap source. Using temporary empty source.',
      );
    }

    try {
      // Select
      this.olSelectSingle = new Select({ style: olSelectedStyle, multi: false });
      this.olSelectMulti = new Select({
        style: olSelectedStyle,
        multi: true,
        hitTolerance: 10, // Makes it easier to select points and lines
        // The filter option is a function that runs for every feature under the cursor.
        // It will only select the feature if the function returns true.
        filter: (feature, layer) => {
          // If we are NOT in special export selection mode, allow selection
          // from ANY visible layer. This is for your general "Select Tool".
          if (!this._isExportSelectionMode) {
            return layer.getVisible();
          }

          // 1. Get the custom 'layerId' property from the layer.
          const layerId = layer.get('layerId');
          const isLayerSelectable = this.selectableLayersForExport.some(
            (selectableLayer) => selectableLayer.get('layerId') === layerId,
          );
          // console.log(`EXPORT Filter Check: Clicked on layer ID "${layerId}". Is it selectable?`, isLayerSelectable);
          return isLayerSelectable;
        },
      });
      [this.olSelectSingle, this.olSelectMulti].forEach((sel) => {
        sel.getFeatures().on('add', (event) => this.onOlSelectChange(event, sel));
        sel.getFeatures().on('remove', (event) => this.onOlSelectChange(event, sel));
        map.addInteraction(sel);
        sel.setActive(false);
      });
      console.log('[DrawService Init] Select interactions created.');

      // Modify (targets multi-select's collection by default)
      this.olModify = new Modify({
        features: this.olSelectMulti.getFeatures(),
        style: olModifyInteractionStyle,
      });
      this.olModify.on('modifystart', (event) => {
        const features = event.features.getArray();

        features.forEach((feature) => {
          const originalGeometry = feature.getGeometry()?.clone(); // Deep clone geometry
          feature.set('__original_geometry', originalGeometry); // Store temporarily on the feature
        });

        console.log('[DrawService] Original geometries captured before modification.');
      });
      this.olModifyEndKey = this.olModify.on('modifyend', (event: ModifyEvent) =>
        this.onOlModifyEnd(event),
      ); // Cast for listener
      map.addInteraction(this.olModify);
      this.olModify.setActive(false);
      console.log('[DrawService Init] Modify created.');

      // Draw
      this.olDrawPoint = new Draw({
        type: 'Point',
        source: initialDrawSnapSource,
        style: defaultDrawStyle,
      });
      this.olDrawLine = new Draw({
        type: 'LineString',
        source: initialDrawSnapSource,
        style: defaultDrawStyle,
      });
      this.olDrawPolygon = new Draw({
        type: 'Polygon',
        source: initialDrawSnapSource,
        style: defaultDrawStyle,
      });
      // Listeners will be attached/detached dynamically in handleActiveToolChange for Draw
      [this.olDrawPoint, this.olDrawLine, this.olDrawPolygon].forEach((draw) => {
        map.addInteraction(draw);
        draw.setActive(false);
      });
      console.log('[DrawService Init] Draw interactions created.');

      // Snap (added last)
      this.olSnap = new Snap({
        source: initialDrawSnapSource,
        pixelTolerance: 15,
        vertex: true,
        edge: true,
      });
      map.addInteraction(this.olSnap);
      this.olSnap.setActive(this._isSnappingEnabled.value);
      console.log(`[DrawService Init] Snap created (active: ${this.olSnap.getActive()}).`);

      this._interactionsReady.next(true);
      console.log('[DrawService] All interactions initialized.');
    } catch (error) {
      console.error('[DrawService] CRITICAL ERROR initializing OL interactions:', error);
      this.cleanupAllOlInteractions(true); // Cleanup what might have been added
      this._interactionsReady.next(false);
    }
  }

  /**
   * Manages the activation and deactivation of OpenLayers interactions based on the active tool state.
   * This method is the single source of truth for which interactions are active on the map.
   * It is designed to be called exclusively by the subscription to the `_activeTool` BehaviorSubject.
   *
   * @param tool The new tool to be activated. Can be `null` to deactivate all tools.
   */

  public handleActiveToolChange(tool: ActiveTool): void {
    console.log('[DrawService] Active tool changed to:', tool);

    this.cleanupActiveInteractions();

    // 2. If the new tool is null, our work is done.
    if (!tool) {
      // this.notificationService.showInfo("All tools deactivated.");
      console.error('All tools deactivated.');
      // Clear snap source to prevent accidental snapping when no tool is active.
      this.clearSnapSource();
      return;
    }

    // 3. Activate the correct interaction(s) based on the tool's type.
    switch (tool.type) {
      // --- DRAW TOOL ---
      case 'draw': {
        const targetLayerId = this.layerService.getSelectedCurrentLayerIdForDrawing();
        if (targetLayerId === null) {
          this.notificationService.showWarning('Please select a layer to draw on.');
          this._activeTool.next(null); // Reset state because the action is invalid
          return;
        }

        const targetSource = this.findLayerOnMap(targetLayerId)?.getSource();
        if (!targetSource) {
          this.notificationService.showError(`Cannot find source for layer ${targetLayerId}.`);
          this._activeTool.next(null); // Reset state
          return;
        }

        // CRITICAL FIX: Create a NEW Draw interaction every time.
        // This ensures it's always configured with the correct target source.
        this.currentActiveOlDrawInteraction = new Draw({
          source: targetSource, // Draw directly onto the correct layer's source
          type: tool.drawType,
          style: defaultDrawStyle,
        });

        // Attach listeners to the new interaction instance.
        this.olDrawEndKey = this.currentActiveOlDrawInteraction.on('drawend', this.onDrawEnd);
        this.olDrawAbortKey = this.currentActiveOlDrawInteraction.on(
          'drawabort',
          this.onOlDrawAbort,
        );

        // Add the new interaction to the map.
        this.mapInstance?.addInteraction(this.currentActiveOlDrawInteraction);

        // Update snap source to the layer we are drawing on and activate if enabled.
        this.updateSnapSource(targetSource);
        this.notificationService.showInfo(`Draw ${tool.drawType} tool activated. Esc to cancel.`);
        break;
      }

      // --- SELECT TOOL ---
      case 'select': {
        const selectInteraction = tool.multi ? this.olSelectMulti : this.olSelectSingle;
        if (selectInteraction) {
          this.currentActiveOlSelectInteraction = selectInteraction;
          selectInteraction.setActive(true);
          this.notificationService.showInfo(
            `${tool.multi ? 'Multi-select' : 'Single-select'} tool activated.`,
          );
          console.log(
            `[DrawService] Select interaction activated: ${tool.multi ? 'Multi' : 'Single'}`,
          );
        } else {
          this.notificationService.showError('Select tool is not available.');
          this._activeTool.next(null);
        }
        break;
      }

      // --- MODIFY TOOL ---
      case 'modify': {
        // For 'modify', we first activate multi-select to allow the user to pick features.
        // The `onOlSelectChange` handler is then responsible for activating the `olModify` interaction itself
        // once a single feature is selected.
        if (this.olSelectMulti) {
          this.currentActiveOlSelectInteraction = this.olSelectMulti;
          this.olSelectMulti.setActive(true);
          // The Modify interaction itself remains inactive until a selection is made.
          this.notificationService.showInfo('Modify tool: Select one or more features to edit.');
        } else {
          this.notificationService.showError('Modify tool is not available.');
          this._activeTool.next(null);
        }
        break;
      }

      case 'merge': {
        if (this.olSelectMulti) {
          this.currentActiveOlSelectInteraction = this.olSelectMulti;
          this.olSelectMulti.setActive(true);
          this.notificationService.showInfo('Merge tool: Select at least two polygons to merge.');
        } else {
          this.notificationService.showError('Merge tool is not available.');
          this._activeTool.next(null);
        }
        break;
      }

      default:
        console.warn(`[DrawService] Unknown tool type encountered in handler:`, tool);
        this._activeTool.next(null); // Reset to a known state
        break;
    }
  }

  // 3. ADD THE NEW PUBLIC METHOD TO PERFORM THE MERGE
  /**
   * Merges the currently selected polygons into a single new feature.
   * This involves:
   * 1. Validating that at least two polygons are selected.
   * 2. Using Turf.js to perform a geometric union.
   * 3. Staging the removing of the original features.
   * 4. Staging the addition of the new, merged feature.
   * 5. Updating the map with the result.
   */
  public async mergeSelectedPolygons(): Promise<void> {
    const featuresToMerge = this._selectedFeatures.value;

    // --- 1. VALIDATION ---
    if (featuresToMerge.length < 2) {
      this.notificationService.showWarning('Please select at least two polygons to merge.');
      return;
    }

    const allArePolygons = featuresToMerge.every((f) => f.getGeometry()?.getType() === 'Polygon');
    if (!allArePolygons) {
      this.notificationService.showError('Merge failed: All selected features must be polygons.');
      return;
    }

    // check whether all selected features are on the same GND
    const selectedFeatureInfo = this._selectedFeatureInfo.value;
    const sameGndId =
      Array.isArray(selectedFeatureInfo) &&
      selectedFeatureInfo.length > 0 &&
      selectedFeatureInfo.every((f) => f.gndId === selectedFeatureInfo[0].gndId);
    console.log('Same GND ID across selection?', sameGndId);

    if (!sameGndId) {
      this.notificationService.showError(
        'Merge failed: All selected features must be on the same GND.',
      );
      return;
    }

    const firstFeatureLayerId = featuresToMerge[0].get('layer_id');
    if (featuresToMerge.some((f) => f.get('layer_id') !== firstFeatureLayerId)) {
      this.notificationService.showError(
        'Merge failed: All selected features must be on the same layer.',
      );
      return;
    }
    this.notificationService.showInfo('Merging polygons...');

    try {
      // --- 2. GEOMETRIC MERGE WITH TURF.JS ---

      // Convert all OL Polygons to Turf Polygons (in EPSG:4326)
      const turfFeatures: GeoJsonFeature<
        GeoJsonPolygon | GeoJsonMultiPolygon,
        GeoJsonProperties
      >[] = featuresToMerge.map((feature) => {
        const geoJsonGeom = new GeoJSON().writeGeometryObject(feature.getGeometry()!);
        return turf.feature(geoJsonGeom) as GeoJsonFeature<
          GeoJsonPolygon | GeoJsonMultiPolygon,
          GeoJsonProperties
        >;
      });

      // Use turf.union with a spread operator on all features.
      const mergedTurfFeature = this.unionAllPolygons(turfFeatures);

      if (!mergedTurfFeature || !mergedTurfFeature.geometry) {
        throw new Error(
          'Turf.js union operation resulted in a null feature. The polygons might be invalid or not touching.',
        );
      }

      // --- 3. CREATE NEW OPENLAYERS FEATURE (STILL IN MAP PROJECTION) ---
      // Read the GeoJSON result directly back into an OL Geometry. No transform is needed yet.
      const olMergedGeom = new GeoJSON().readGeometry(mergedTurfFeature.geometry);
      const newFeature = new Feature(olMergedGeom);

      // A. Gather all necessary properties for the new feature
      const originalUuids = featuresToMerge.map((f) => f.get('uuid'));
      const targetLayerId = firstFeatureLayerId;
      const newUuid = uuidv4();
      const firstGndId = selectedFeatureInfo[0]?.olFeature?.get('gnd_Id') ?? null;
      const area = turf.area(mergedTurfFeature); // Calculate area

      // B. Set all data properties on the new OpenLayers Feature object
      newFeature.setProperties({
        user_id: Number(this.userService.getUser()?.user_id) || 0,
        layer_id: targetLayerId,
        feature_Id: newUuid, // This will be the backend ID for new features
        uuid: newUuid,
        parent_uuid: originalUuids,
        gnd_id: firstGndId, // <<< THIS IS THE KEY ADDITION
        area: parseFloat(area.toFixed(4)),
        length: 0, // Polygons typically don't have a length property
        ref_id: this.selectedRefFeatureId ? this.selectedRefFeatureId : null,
      });

      // C. Set the feature's ID and Style (these are for OL, not for backend data)
      newFeature.setId(`${targetLayerId}-${newUuid}`);
      const layerColor = this.layerService.getLayerColor(targetLayerId);
      const newGeomType = olMergedGeom.getType() as 'Polygon' | 'MultiPolygon';
      newFeature.setStyle(this.createStyleForLayer(layerColor, newGeomType));

      // D. Prepare data for staging
      const idsToMerge = featuresToMerge
        .map((f) => f.get('feature_Id'))
        .filter((id) => id != null) as string[];
      if (idsToMerge.length !== featuresToMerge.length) {
        throw new Error("One or more selected features are missing a backend ID ('feature_Id').");
      }

      // E. Stage the operation. The featureService will handle the transformation.
      const newFeatureData = this.featureService.convertFeatureToFeatureData(newFeature);
      if (!newFeatureData) {
        throw new Error('Failed to convert the new merged feature to data format.');
      }

      const originalFeaturesData = featuresToMerge.map(
        (f) => this.featureService.convertFeatureToFeatureData(f) as FeatureData,
      );

      // Pass the original features data to the staging method
      this.featureService.stageMerge(idsToMerge, newFeatureData, originalFeaturesData);
      this.notificationService.showInfo('Merge operation staged. Save to confirm.');

      // --- 5. UPDATE MAP UI (Unchanged) ---
      const targetLayer = this.findLayerOnMap(targetLayerId);
      const source = targetLayer?.getSource();
      if (source) {
        source.removeFeatures(featuresToMerge);
        source.addFeature(newFeature);
      }

      // --- 6. CLEANUP (Unchanged) ---
      this.clearSelections();
      this.setActiveTool(null);
    } catch (error: any) {
      console.error('Merge operation failed:', error);
      this.notificationService.showError(`Merge failed: ${error.message}`);
      this.clearSelections();
      this.setActiveTool(null);
    }

    //####
    //   const [firstTurfPolygon, ...restOfTurfPolygons] = turfPolygons;

    //   // Use turf.union with the spread operator to merge all polygons at once
    //   const mergedTurfFeature = restOfTurfPolygons.reduce(
    //     (
    //       mergedSoFar: TurfFeature<TurfPolygon | TurfMultiPolygon>,
    //       currentPolygon: TurfFeature<TurfPolygon | TurfMultiPolygon>,
    //     ) => {
    //       // turf.union can accept and return these types
    //       const result = turf.union(turf.featureCollection([mergedSoFar, currentPolygon]));
    //       if (!result) {
    //         throw new Error('An intermediate union operation failed.');
    //       }
    //       return result as TurfFeature<TurfPolygon | TurfMultiPolygon>;
    //     },
    //     firstTurfPolygon,
    //   ) as TurfFeature<TurfPolygon | TurfMultiPolygon>; // Final assertion

    //   // --- 3. CREATE NEW OPENLAYERS FEATURE FROM MERGED RESULT ---
    //   let olMergedGeom: Polygon | MultiPolygon;

    //   const coords = mergedTurfFeature.geometry.coordinates;
    //   const geomType = mergedTurfFeature.geometry.type;

    //   if (geomType === 'Polygon') {
    //     olMergedGeom = new Polygon(coords as Coordinate[][]).transform(
    //       dataProjection,
    //       mapProjection,
    //     );
    //   } else if (geomType === 'MultiPolygon') {
    //     olMergedGeom = new MultiPolygon(coords as Coordinate[][][]).transform(
    //       dataProjection,
    //       mapProjection,
    //     );
    //   } else {
    //     throw new Error(`Unsupported geometry type: ${geomType}`);
    //   }

    //   const newFeature = new Feature(olMergedGeom);

    //   // --- 4. PREPARE PROPERTIES AND STAGE CHANGES ---
    //   const originalUuids = featuresToMerge.map((f) => f.get('uuid'));
    //   const firstFeature = featuresToMerge[0];
    //   const targetLayerId = firstFeature.get('layer_id');
    //   const newUuid = uuidv4();

    //   newFeature.setProperties({
    //     user_id: Number(this.userService.getUser()?.user_id) || 0,
    //     layer_id: targetLayerId,
    //     feature_Id: newUuid,
    //     uuid: newUuid,
    //     parent_uuid: originalUuids, // Store original UUIDs for traceability
    //     status: true,
    //     area: 0, // Recalculate if needed
    //     length: 0,
    //     ref_id: this.selectedRefFeatureId ? this.selectedRefFeatureId : null,
    //   });
    //   newFeature.setId(`${targetLayerId}-${newUuid}`);
    //   const layerColor = this.layerService.getLayerColor(targetLayerId);
    //   newFeature.setStyle(this.createStyleForLayer(layerColor, 'Polygon'));

    //   // Stage deletion of old features and addition of the new one
    //   // featuresToMerge.forEach((oldFeature) => {
    //   //   const backendId = oldFeature.get('feature_Id');
    //   //   const layerId = oldFeature.get('layer_id');
    //   //   if (backendId && layerId != null) {
    //   //     const originalData = this.featureService.convertFeatureToFeatureData(oldFeature);
    //   //     this.featureService.stageDeletion(backendId, layerId, originalData!);
    //   //   }
    //   // });

    //   const newFeatureData = this.featureService.convertFeatureToFeatureData(newFeature);
    //   // For undo, we need to provide what was there before the merge operation
    //   const originalFeaturesData = featuresToMerge.map((f) =>
    //     this.featureService.convertFeatureToFeatureData(f),
    //   );
    //   this.featureService.stageAddition(newFeatureData!, originalFeaturesData as any);

    //   // --- 5. UPDATE MAP UI ---
    //   const targetLayer = this.findLayerOnMap(targetLayerId);
    //   const source = targetLayer?.getSource();
    //   if (source) {
    //     source.removeFeatures(featuresToMerge); // Remove all old features at once
    //     source.addFeature(newFeature);
    //   }

    //   // --- 6. CLEANUP ---
    //   this.clearSelections();
    //   this.setActiveTool(null); // Deactivate the merge tool
    //   this.notificationService.showSuccess('Polygons merged successfully.');
    // } catch (error: any) {
    //   console.error('Merge operation failed:', error);
    //   this.notificationService.showError(`Merge failed: ${error.message}`);
    //   // Optional: clear selection on failure to avoid confusion
    //   this.clearSelections();
    // }
  }

  private allFeaturesHaveSameGndId(features: FeatureProperties): boolean {
    if (features.length === 0) return false;

    const firstGndId = features[0].get('gnd_id');

    return features['every'](
      (feature: FeatureProperties) => feature['get']('gnd_id') === firstGndId,
    );
  }

  /**
   * Deactivates all "static" interactions (Select/Modify) and completely
   * removes any "dynamic" interactions (like Draw) from the map.
   * This ensures a clean state before activating a new tool.
   */
  private cleanupActiveInteractions(): void {
    console.log('[DrawService] Cleaning up active interactions...');

    // --- Deactivate static interactions ---
    // These are part of the map permanently but should not be active.
    this.olSelectSingle?.setActive(false);
    this.olSelectMulti?.setActive(false);
    this.olModify?.setActive(false); // Also ensure modify is off.
    this.currentActiveOlSelectInteraction = null;

    // --- Destroy dynamic interactions (CRITICAL PART) ---
    // This is the interaction that gets created and removed on the fly.
    if (this.currentActiveOlDrawInteraction) {
      // 1. Unsubscribe from events to prevent memory leaks
      unByKey(this.olDrawEndKey as any); // Use 'as any' or check if defined
      unByKey(this.olDrawAbortKey as any);

      // 2. Remove the interaction from the map
      this.mapInstance?.removeInteraction(this.currentActiveOlDrawInteraction);

      // 3. Clear the local reference to it
      this.currentActiveOlDrawInteraction = null;

      console.log('[DrawService] Previous Draw interaction removed.');
    }
  }

  private unionAllPolygons(
    features: GeoJsonFeature<GeoJsonPolygon | GeoJsonMultiPolygon, GeoJsonProperties>[],
  ): GeoJsonFeature<GeoJsonPolygon | GeoJsonMultiPolygon, GeoJsonProperties> | null {
    if (features.length === 0) return null;

    try {
      const fc = featureCollection(features);
      const merged = union(fc);
      return merged as GeoJsonFeature<GeoJsonPolygon | GeoJsonMultiPolygon, GeoJsonProperties>;
    } catch (err) {
      console.error('Union failed:', err);
      return null;
    }
  }

  /**
   * The single, internal method for managing the lifecycle of the Snap interaction.
   * It always removes any existing snap interaction and creates a new one. This is
   * necessary because the 'source' of an OpenLayers Snap interaction cannot be
   * changed after it has been created.
   *
   * @param source The vector source to snap to. If not provided, a new empty
   *               source is used, effectively disabling snapping features.
   */
  private _recreateSnapInteraction(source?: VectorSource<Feature<Geometry>> | null): void {
    if (!this.mapInstance) {
      console.warn('[DrawService] Cannot recreate snap interaction: Map is not ready.');
      return;
    }

    // 1. Remove the existing Snap interaction from the map if it's there.
    if (this.olSnap) {
      this.mapInstance.removeInteraction(this.olSnap);
    }

    // 2. Create a brand new Snap interaction with the desired source.
    //    If the provided source is null/undefined, we use a new empty VectorSource.
    this.olSnap = new Snap({
      source: source || new VectorSource(),
      pixelTolerance: 15,
      vertex: true,
      edge: true,
    });

    // 3. Add the new interaction to the map.
    this.mapInstance.addInteraction(this.olSnap);

    // 4. IMPORTANT: Set its active state based on the current global setting.
    //    This ensures that if snapping was enabled, it remains enabled with the new source.
    this.olSnap.setActive(this._isSnappingEnabled.value);

    console.log(`[DrawService] Snap interaction was recreated. Active: ${this.olSnap.getActive()}`);
  }

  /**
   * Sets the active state of snapping. This does NOT recreate the interaction, making it
   * efficient for frequent toggling.
   *
   * @param isActive `true` to enable snapping, `false` to disable it.
   */
  public setSnapActive(isActive: boolean): void {
    if (this._isSnappingEnabled.value === isActive) return;
    this._isSnappingEnabled.next(isActive);

    if (this.olSnap) {
      this.olSnap.setActive(isActive);
      console.log(`[DrawService] Global Snap interaction active state set to: ${isActive}`);
    }
  }

  /**
   * Public method to set or update the source for the snapping interaction.
   * This will trigger a full recreation of the Snap interaction to apply the new source.
   *
   * @param source The vector source to snap to. Pass `undefined` or `null` to clear the source.
   */
  public setSnapSource(source?: VectorSource<Feature<Geometry>> | null): void {
    this._recreateSnapInteraction(source);
  }

  public clearSnapSource(): void {
    console.log('[DrawService] Clearing snap source.');
    // By passing `undefined`, our robust setSnapSource method will
    // create a new Snap interaction with a new, empty VectorSource.
    this.setSnapSource(undefined);
  }

  public deactivateAllInteractions(): void {
    console.log('[DrawService] Deactivating all managed interactions.');

    // --- 1. Clean up an older-style, temporary Draw interaction if it exists ---
    // This block handles the on-the-fly Draw interaction created by the refactored
    // `handleActiveToolChange` method.
    if (this.currentActiveOlDrawInteraction) {
      // Un-key its specific listeners to prevent memory leaks.
      if (this.olDrawEndKey) unByKey(this.olDrawEndKey);
      if (this.olDrawAbortKey) unByKey(this.olDrawAbortKey);
      this.olDrawEndKey = null;
      this.olDrawAbortKey = null;

      // Remove the interaction itself from the map.
      if (this.mapInstance) {
        this.mapInstance.removeInteraction(this.currentActiveOlDrawInteraction);
      }
      this.currentActiveOlDrawInteraction = null;
    }

    // --- 2. Deactivate all PERSISTENT interactions ---
    // These interactions live for the entire session and are just turned on/off.

    // Deactivate the persistent Select and Modify tools.
    this.olSelectSingle?.setActive(false);
    this.olSelectMulti?.setActive(false);
    this.olModify?.setActive(false);

    // Deactivate the persistent (but now unused) Draw tools for safety.
    // Although the new architecture creates Draw interactions on the fly,
    // this ensures any old logic paths are safely handled.
    this.olDrawPoint?.setActive(false);
    this.olDrawLine?.setActive(false);
    this.olDrawPolygon?.setActive(false);

    // Deactivate the global Snap interaction. Any tool that needs snapping
    // is responsible for re-activating it.
    this.olSnap?.setActive(false);

    // --- 3. Clear State References ---
    // Reset the reference to any active select interaction.
    this.currentActiveOlSelectInteraction = null;
  }

  private cleanupAllOlInteractions(removeFromMap: boolean): void {
    console.log(`[DrawService] Cleaning up all OL interactions. removeFromMap: ${removeFromMap}`);
    const interactions = [
      this.olDrawPoint,
      this.olDrawLine,
      this.olDrawPolygon,
      this.olSelectSingle,
      this.olSelectMulti,
      this.olModify,
      this.olSnap,
    ];
    interactions.forEach((interaction) => {
      if (interaction) {
        interaction.setActive(false);
        if (removeFromMap && this.mapInstance) {
          try {
            // Check if interaction is on map before removing
            if (this.mapInstance.getInteractions().getArray().includes(interaction)) {
              this.mapInstance.removeInteraction(interaction);
            }
          } catch (e) {
            console.warn('Error removing interaction during cleanup:', e);
          }
        }
      }
    });
    if (removeFromMap) {
      // Also nullify references if removing from map
      this.olDrawPoint = this.olDrawLine = this.olDrawPolygon = null;
      this.olSelectSingle = this.olSelectMulti = null;
      this.olModify = null;
      this.olSnap = null;
    }
    // Detach listeners
    if (this.olDrawEndKey) unByKey(this.olDrawEndKey);
    this.olDrawEndKey = null;
    if (this.olDrawAbortKey) unByKey(this.olDrawAbortKey);
    this.olDrawAbortKey = null;
    if (this.olSelectAddKey) unByKey(this.olSelectAddKey);
    this.olSelectAddKey = null;
    if (this.olSelectRemoveKey) unByKey(this.olSelectRemoveKey);
    this.olSelectRemoveKey = null;
    if (this.olModifyEndKey) unByKey(this.olModifyEndKey);
    this.olModifyEndKey = null;
  }

  public getSourceOfFeature(feature: Feature<Geometry>): VectorSource<Feature<Geometry>> | null {
    if (!this.mapInstance) {
      console.error('Cannot find feature source: Map instance is not available.');
      return null;
    }

    // --- Method 1: Efficient lookup using the 'layer_id' property ---
    const layerId = feature.get('layer_id');
    if (layerId !== undefined && layerId !== null) {
      const layer = this.findLayerOnMap(Number(layerId));
      if (layer) {
        const source = layer.getSource();
        // Final check to ensure the feature is actually in this source
        if (source && source.hasFeature(feature)) {
          console.log(`[DrawService] Found source for feature via 'layer_id': ${layerId}`);
          return source;
        }
      }
    }
    return null;
  }
  /**
   * Deactivates all major, persistent OpenLayers interactions
   * (Draw, Select, Modify) managed by this service.
   * Does not affect the Snap interaction's state directly, nor does it remove
   * the interactions from the map or nullify their references.
   */
  public deactivateAllMajorInteractions(): void {
    const currentActiveTool = this._activeTool.value; // Get current tool state
    console.log('[DrawService] Deactivating all major interactions.');
    if (this.currentActiveOlDrawInteraction) this.currentActiveOlDrawInteraction.setActive(false);

    // Deactivate specific Draw interaction if one was active
    if (this.olDrawPoint?.getActive()) this.olDrawPoint.setActive(false);
    if (this.olDrawLine?.getActive()) this.olDrawLine.setActive(false);
    if (this.olDrawPolygon?.getActive()) this.olDrawPolygon.setActive(false);
    // Note: We don't nullify this.olDrawPoint etc. here, as they are persistent.

    // Deactivate Select interactions
    if (this.olSelectSingle?.getActive()) {
      // If single select was the one active in the _activeTool state, clear its features.
      // Otherwise, it might have been active for 'modify' and its features are important.
      if (currentActiveTool?.type === 'select' && !currentActiveTool.multi) {
        this.olSelectSingle.getFeatures().clear();
        this.onOlSelectChange(); // Manually trigger to update BehaviorSubjects
      }
      this.olSelectSingle.setActive(false);
    }
    if (this.olSelectMulti?.getActive()) {
      // If multi select was the one active in the _activeTool state, clear its features.
      if (currentActiveTool?.type === 'select' && currentActiveTool.multi) {
        this.olSelectMulti.getFeatures().clear();
        this.onOlSelectChange(); // Manually trigger to update BehaviorSubjects
      }
      this.olSelectMulti.setActive(false);
    }

    // Deactivate Modify interaction
    if (this.olModify?.getActive()) {
      // It's generally good practice to finish a modify operation if one is "in progress"
      // when deactivating it, though OL's setActive(false) usually handles this.
      // this.olModify.finishDrawing(); // If applicable and needed.
      this.olModify.setActive(false);
    }

    // Crucially, do NOT reset the _activeTool BehaviorSubject here.
    // The component or method *calling* deactivateAllMajorInteractions
    // is responsible for then calling setActiveTool(null) if the intent is to
    // have no tool active globally. This method is purely about turning off
    // the OL interaction listeners.

    console.log('[DrawService] Major interactions deactivated.');
  }

  /**
   * Updates the source for the snapping interaction.
   * IMPORTANT: OpenLayers Snap interactions cannot have their source changed after creation.
   * Therefore, this method always removes the old Snap interaction and creates a new one
   * with the provided source.
   * @param source The vector source to snap to. If undefined or null, an empty source will be used, effectively disabling snapping features.
   */
  /** Updates the SOURCE of the GLOBAL snap interaction. */
  public updateSnapSource(source?: VectorSource | null): void {
    if (!this.mapInstance) return;
    if (this.olSnap) {
      this.mapInstance.removeInteraction(this.olSnap);
    }
    this.olSnap = new Snap({ source: source || new VectorSource() });
    this.mapInstance.addInteraction(this.olSnap);
    this.olSnap.setActive(this._isSnappingEnabled.value);
  }

  public recreateSnapInteraction(
    source?: VectorSource<Feature<Geometry>> | undefined | null,
  ): void {
    // this.setSnapSource(source || undefined);
    if (!this.mapInstance || !this.olSnap) {
      console.warn('[DrawService updateSnapSource] Map or Snap not ready.');
      return;
    }

    // 1. Remove the existing Snap interaction from the map if it's there.
    // This prevents having multiple, conflicting snap interactions.
    if (this.olSnap && this.mapInstance.getInteractions().getArray().includes(this.olSnap)) {
      this.mapInstance.removeInteraction(this.olSnap);
    }

    // 2. Create a brand new Snap interaction with the desired source.
    // If the provided source is null/undefined, we use a new empty VectorSource.
    this.olSnap = new Snap({
      source: source || new VectorSource(), // Use the provided source or a new empty one
      pixelTolerance: 15,
      vertex: true,
      edge: true,
    });

    // 3. Add the new interaction to the map.
    this.mapInstance.addInteraction(this.olSnap);

    // 4. Set its active state based on the current global setting.
    // This ensures that if snapping was enabled, it remains enabled with the new source.
    this.olSnap.setActive(this._isSnappingEnabled.value);

    console.log('[DrawService] Snap interaction was recreated with a new source.');
  }

  // Call this method when you have the target layer's source
  public enableSnappingForLayer(layerSource: VectorSource): void {
    this.updateSnapSource(layerSource);
    this.olSnap?.setActive(true);
    this._isSnappingEnabled.next(true);
  }

  private onDrawEnd = (event: DrawEvent): void => {
    console.log('[DrawService] onOlDrawEnd triggered.');

    const feature = event.feature;
    const activeTool = this._activeTool.value;

    // --- All your initial guard clauses and checks are correct ---
    if (!activeTool || activeTool.type !== 'draw' || !feature || !feature.getGeometry()) {
      console.warn(
        '[DrawService] DrawEnd fired with an invalid state, feature, or geometry. Aborting.',
      );
      this.setActiveTool(null);
      this.resetRefFeatureActions(); // Reset any reference feature actions
      return;
    }

    const drawType = activeTool.drawType as DrawType; // Ensure type is correct

    const targetLayerId = this.layerService.getSelectedCurrentLayerIdForDrawing();
    if (targetLayerId === null) {
      this.notificationService.showError('No target layer selected for drawing.');
      // Consider automatically deactivating draw tool or providing more guidance
      this.setActiveTool(null);
      this.resetRefFeatureActions(); // Reset any reference feature actions
      return;
    }

    console.log(`[DrawService] Processing drawn feature for layer ${targetLayerId}.`);

    if (!feature) {
      console.warn('[DrawService] DrawEnd event fired without a feature object.');
      this.setActiveTool(null); // Deactivate tool if something went wrong
      this.resetRefFeatureActions(); // Reset any reference feature actions
      return;
    }

    console.log(`[DrawService] onOlDrawEnd for ${drawType} on layer ${targetLayerId}.`);

    const processedFeature = this.processNewFeature(feature, targetLayerId, drawType);

    if (!processedFeature) {
      // processNewFeature can return null if something goes wrong.
      this.notificationService.showError('Failed to process the new feature. Aborting.');
      this.setActiveTool(null);
      this.resetRefFeatureActions(); // Reset any reference feature actions
      return;
    } else {
      console.log(`[DrawService] Feature ${processedFeature.getId()} successfully processed.`);
    }
    // Now that the feature has its ID, properties, and style, add it to the source.

    // Deactivate the tool after a successful draw.
    this.setActiveTool(null);
    this.resetRefFeatureActions(); // Reset any reference feature actions
  };

  private onOlDrawAbort = (): void => {
    console.log('[DrawService] Draw Aborted.');
    this.notificationService.showInfo('Drawing cancelled.');
    this.setActiveTool(null); // Deactivate current tool
    this.resetRefFeatureActions(); // Reset any reference feature actions
  };

  resetRefFeatureActions(): void {
    if (this.selectedRefFeatureId) {
      this.layerService.setSelectedCurrentLayerIdForDrawing(null);
    }
    this.selectedRefFeatureId = null;
  }

  public clearSelections(): void {
    this.olSelectSingle?.getFeatures().clear();
    this.olSelectMulti?.getFeatures().clear();
    // Manually update BehaviorSubjects if needed
    this._selectedFeatures.next([]);
    this._selectedFeatureInfo.next([]);
    this._deselectedFeature.next();
  }

  // @ this will call when the selection or modify buttons click

  private onOlSelectChange = (
    event?: CollectionEvent<Feature<Geometry>> | SelectEvent,
    sourceInteraction?: Select,
  ): void => {
    console.log('%c >>> onOlSelectChange EVENT FIRED <<<', 'background: #007bff; color: white;');

    let selectedFeatures: Feature<Geometry>[] = [];
    const activeToolState = this._activeTool.value;

    if (!this._interactionsReady.value) {
      return;
    }

    // Use the sourceInteraction that fired the event as the source of truth
    const currentSelectInteraction = sourceInteraction || this.currentActiveOlSelectInteraction;

    if (currentSelectInteraction && currentSelectInteraction.getActive()) {
      selectedFeatures = currentSelectInteraction.getFeatures().getArray().slice();
    }

    const toolUsesSelection =
      activeToolState &&
      (activeToolState.type === 'select' ||
        activeToolState.type === 'modify' ||
        activeToolState.type === 'merge');

    if (!toolUsesSelection) {
      selectedFeatures = [];
    }

    this._selectedFeatures.next(selectedFeatures);
    console.log(`[DrawService] Selection changed. Count: ${selectedFeatures.length}.`);

    // 1. Create the new array of info objects by mapping over the selected features.
    const selectedInfo: SelectedFeatureInfo[] = selectedFeatures.map((feature) => ({
      featureId: this.getFeatureIdentifier(feature, 'feature_Id'),
      layerId: feature.get('layer_id') ?? null,
      uuid: feature.get('uuid') ?? null,
      gndId: feature.get('gnd_id') ?? null, // Extract the gnd_id
      olFeature: feature,
    }));

    // 2. Broadcast the new array of info objects.
    this._selectedFeatureInfo.next(selectedInfo);

    // 3. Handle side-effects (like activating/deactivating the Modify tool).
    if (selectedFeatures.length === 0) {
      this._deselectedFeature.next();
    }

    // Handle Modify tool activation/deactivation based on selection count.
    if (activeToolState?.type === 'modify') {
      if (selectedFeatures.length === 1 && this.olModify && !this.olModify.getActive()) {
        this.olModify.setActive(true);
        this.notificationService.showInfo('Feature selected. You can now modify its geometry.');
      } else if (selectedFeatures.length !== 1 && this.olModify && this.olModify.getActive()) {
        // Deactivate if 0 or more than 1 feature is selected
        this.olModify.setActive(false);
        if (selectedFeatures.length > 1) {
          this.notificationService.showInfo(
            'Multiple features selected. Select only one to modify.',
          );
        }
      }
    }
  };

  private onOlModifyEnd = (event: ModifyEvent): void => {
    const modifiedFeatures = event.features.getArray();
    console.log('[DrawService] ModifyEnd. Features modified:', modifiedFeatures.length);

    // Process each modified feature
    modifiedFeatures.forEach((feature, index) => {
      console.log(`[DrawService] Modified feature ${index + 1}:`, {
        feature_Id: this.getFeatureIdentifier(feature, 'feature_Id'),
        layerId: feature.get('layer_id'),
        uuid: feature.get('uuid'),
        geometry: feature.getGeometry()?.getType(),
      });
    });
    this.notificationService.showSuccess(
      `Feature${modifiedFeatures.length > 1 ? 's' : ''} modified successfully.`,
    );
    this.processModifiedFeatures(modifiedFeatures);
  };

  /**
   * Activates the persistent multi-select interaction specifically for an external workflow like exporting.
   * This method ensures the interaction is properly configured and at the top of the stack.
   */
  public async activateSelectForExport(): Promise<void> {
    // 1. Wait for readiness.
    await firstValueFrom(
      this.interactionsReady$.pipe(
        filter((ready) => ready),
        take(1),
      ),
    );

    // 2. Deactivate all other tools.
    this.deactivateAllInteractions();

    // >>> SET THE CONTEXT FLAG <<<
    this._isExportSelectionMode = true;

    // 3. Configure the filter.
    this.selectableLayersForExport = this.mapInstance!.getLayers()
      .getArray()
      .filter((layer) => layer instanceof VectorLayer && layer.getVisible()) as VectorLayer<any>[];

    // 4. Clear previous selection.
    this.olSelectMulti!.getFeatures().clear();

    // 5. Activate the tool.
    this.setActiveTool({ type: 'select', multi: true });
  }

  /**
   * Deactivates the special export selection mode and returns the filter to its general state.
   */
  public deactivateSelectForExport(): void {
    // >>> RESET THE CONTEXT FLAG <<<
    this._isExportSelectionMode = false;
    this.selectableLayersForExport = []; // Clear the array for good measure.

    // Deactivate the tool.
    this.setActiveTool(null);
    console.log('[DrawService] Export selection mode OFF.');
    this.resetRefFeatureActions(); // Reset any reference feature actions
  }

  /**
   * Provides a way for a component to request a single feature selection.
   * This method temporarily takes over the selection interaction.
   * @param type The type of geometry to filter for (e.g., 'Polygon').
   * @returns An Observable that emits the selected feature and then completes.
   * It will error if the user cancels or if an invalid feature is selected.
   */
  public selectSingleFeature(type: 'Polygon' | 'LineString'): Observable<Feature<Geometry>> {
    // START OF DEBUG LOGGING
    console.error(
      '%c >>> ENTERING selectSingleFeature <<<',
      'background: #007bff; color: white; font-size: 14px;',
    );
    if (!this.mapInstance) {
      return throwError(() => new Error('Map is not ready for selection.'));
    }

    const subject = new Subject<Feature<Geometry>>();

    let tempSelect: Select | null = null;
    let keyListener: ((evt: KeyboardEvent) => void) | null = null;
    try {
      // 1. Deactivate all GLOBAL interactions to clear the stage.
      this.deactivateAllInteractions();
      this.notificationService.showInfo(`Select a single ${type} to continue.`);

      // 2. Create a NEW, temporary Select interaction for this operation ONLY.
      tempSelect = new Select({
        style: olSelectedStyle, // Use the red "selected" style
        // This filter ensures it only selects the correct type of feature.
        filter: (feature) => {
          return feature.getGeometry()?.getType() === type;
        },
      });

      // 3. Add the temporary interaction to the map.
      this.mapInstance.addInteraction(tempSelect);

      // --- ADD ESCAPE LISTENER ---
      keyListener = (evt: KeyboardEvent) => {
        if (evt.key === 'Escape') {
          // Make the Observable error out, which will trigger the finalize block.
          subject.error(new Error('Selection cancelled by user.'));
        }
      };
      document.addEventListener('keydown', keyListener);

      // 4. Listen for the 'select' event on THIS temporary interaction.
      const selectKey = tempSelect.on('select', (event: SelectEvent) => {
        // The 'select' event is more reliable than listening to the feature collection.
        if (event.selected.length > 0) {
          const feature = event.selected[0];
          subject.next(feature);
          subject.complete();
        }
      });

      // 5. Use finalize for guaranteed cleanup of the TEMPORARY interaction.
      return subject.pipe(
        finalize(() => {
          console.log('[DrawService] Finalizing temporary select. Cleaning up...');
          if (tempSelect) {
            this.mapInstance?.removeInteraction(tempSelect);
          }
          unByKey(selectKey);
        }),
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * Creates a temporary draw interaction for one-off drawing operations like a split line.
   * @param type The geometry type to draw.
   * @param snapSource Optional source to snap to during this temporary draw.
   * @returns An Observable that emits the drawn feature and completes, or errors on cancellation.
   */
  public drawTemporaryFeature(
    type: 'LineString',
    snapSource?: VectorSource | null,
  ): Observable<Feature<LineString>> {
    // VVVV ADD THIS LINE VVVV
    console.error(
      '%c <<<<< EXECUTING TEMPORARY DRAW METHOD >>>>> ',
      'background: #ff0000; color: #ffffff; font-size: 16px;',
    );

    if (!this.mapInstance) {
      return throwError(() => new Error('Map is not ready for drawing.'));
    }

    const subject = new Subject<Feature<LineString>>();
    let tempDraw: Draw | null = null;
    let tempSnap: Snap | null = null;
    let keyListener: ((evt: KeyboardEvent) => void) | null = null;

    // Store the user's original snapping state to restore it perfectly.

    try {
      // this._isManagingSnapManually = true;
      // 1. Deactivate other tools to prevent conflicts.
      this.deactivateAllInteractions();

      // 2. Set up the temporary draw interaction.
      tempDraw = new Draw({
        type: type,
        style: tempSplitStyle, // A dedicated style for the split line
        source: new VectorSource(),
      });

      // 2. >>> CRITICAL FIX: Add the Draw interaction to the map FIRST <<<
      // This makes it available for the Snap interaction to find.
      this.mapInstance.addInteraction(tempDraw);

      // 3. THIS IS THE KEY: Temporarily override the global snapping settings.
      // 3. Create a temporary, local Snap interaction if a source is provided.
      if (snapSource) {
        tempSnap = new Snap({ source: snapSource });
        this.mapInstance.addInteraction(tempSnap); // Add IT to the map. It will find tempDraw.
      }

      // --- ADD ESCAPE LISTENER ---
      keyListener = (evt: KeyboardEvent) => {
        if (evt.key === 'Escape') {
          // Abort the drawing interaction itself to clean up the visual line on the map.
          tempDraw?.abortDrawing();
          // Make the Observable error out to trigger finalize and notify the component.
          subject.error(new Error('Drawing cancelled by user.'));
        }
      };
      document.addEventListener('keydown', keyListener);
      // -------------------------

      // 4. Listen for draw events.
      const endKey = tempDraw.on('drawend', (event: DrawEvent) => {
        subject.next(event.feature as Feature<LineString>);
        subject.complete();
      });
      const abortKey = tempDraw.on('drawabort', () => {
        subject.error(new Error('Drawing was cancelled.'));
      });

      // 5. Use finalize for guaranteed cleanup of TEMPORARY interactions.
      return subject.pipe(
        finalize(() => {
          console.log('[DrawService] Finalizing temporary draw. Cleaning up...');
          if (tempDraw) this.mapInstance?.removeInteraction(tempDraw);
          if (tempSnap) this.mapInstance?.removeInteraction(tempSnap); // Clean up the temp snap too!
          unByKey([endKey, abortKey]);
        }),
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  public async getMap(): Promise<OLMap> {
    const map = await firstValueFrom(
      this.mapService.mapInstance$.pipe(
        // The filter operator waits until the emitted value is not null.
        // The `is OLMap` part is a type guard that tells TypeScript the result is a full OLMap object.
        filter((m): m is OLMap => m !== null),
      ),
    );
    return map;
  }

  /**
   * Gets a pre-configured, named style object or array of styles from the service's style library.
   * This provides a centralized and type-safe way to access common styles.
   *
   * @param styleName The name of the style to retrieve, as defined in the `DrawStyles` type.
   * @returns An OpenLayers Style object or an array of Style objects.
   */
  public getDrawStyle(styleName?: DrawStyles): Style | Style[] {
    switch (styleName) {
      case 'default':
        return defaultDrawStyle;

      case 'selected':
        return olSelectedStyle;

      case 'split':
        // Returns the array: [tempDrawLineStyle, tempDrawVertexStyle]
        return tempSplitStyle;

      case 'modifyInteraction':
        // Returns the array: [olModifyingFeatureStyle, olVertexStyle]
        return olModifyInteractionStyle;

      case 'modifying':
        return olModifyingFeatureStyle;

      case 'vertex':
        return olVertexStyle;

      default:
        // This case should ideally never be hit if using TypeScript correctly,
        // but it's good practice for robustness.
        console.warn(
          `[DrawService] getDrawStyle was called with an unknown style name: "${styleName}". Returning default style.`,
        );
        return defaultDrawStyle;
    }
  }
  // --- Feature Processing & Utility Methods (adapted from your existing service) ---
  private processNewFeature(
    feature: Feature<Geometry>,
    targetLayerId: number | string,
    type: DrawType,
  ): Feature<Geometry> | null {
    // (Your existing logic from processNewFeature, ensure it uses this.mapInstance)

    // 1. Add Properties

    const properties = this.createFeatureProperties(targetLayerId, type);

    if (feature.getGeometry()?.getType() === 'Polygon') {
      const parentGndId = this.findParentGndFeature(feature.getGeometry() as Polygon);
      if (parentGndId !== null) {
        properties.gnd_id = parentGndId;
      }
    }

    // if (feature.getGeometry()?.getType() === 'Point') {
    //   const parentGndId = this.findParentGndFeatureForPoint(feature.getGeometry() as Point);
    //   if (parentGndId !== null) {
    //     properties.gnd_id = parentGndId;
    //   }
    // }

    // if (feature.getGeometry()?.getType() === 'LineString') {
    //   const parentGndId = this.findParentGndFeatureForLine(feature.getGeometry() as LineString);
    //   if (parentGndId !== null) {
    //     properties.gnd_id = parentGndId;
    //   }
    // }

    feature.setProperties(properties, true);
    feature.setId(`${targetLayerId}-${properties.uuid}`);

    const layerColor = this.layerService.getLayerColor(targetLayerId as number);
    // <<< CHANGE: Set style on the original feature, not a clone
    feature.setStyle(this.createStyleForLayer(layerColor, type));

    // Calculate Area/Length
    const geometry = feature.getGeometry();
    if (geometry) {
      const projection = this.mapInstance?.getView().getProjection();
      if (type === 'Polygon' || type === 'MultiPolygon') {
        properties.area = parseFloat(getArea(geometry, { projection }).toFixed(4));
      } else if (type === 'LineString') {
        properties.length = parseFloat(getLength(geometry, { projection }).toFixed(4));
      }
      // Update properties on the feature one last time
      feature.set('area', properties.area);
      feature.set('length', properties.length);
    }

    // <<< CHANGE: Stage the original feature directly >>>
    // The FeatureService is now responsible for cloning and transforming.
    const newFeatureData = this.featureService.convertFeatureToFeatureData(feature);

    if (newFeatureData) {
      // Pass undefined for originalData since this is a brand new feature
      this.featureService.stageAddition(newFeatureData, undefined as any);
      this.notificationService.showSuccess(`Feature added to layer ${targetLayerId} (staged).`);
    } else {
      this.notificationService.showError('Failed to prepare feature data for saving.');
      return null;
    }

    return feature;

    //#######

    // // --- STAGE FOR SAVING (WITH REPROJECTION) ---
    // // 1. Create a clone of the feature to avoid modifying the one on the map.
    // const featureToSave = feature.clone();

    // // 2. Get its geometry.
    // const geometryToSave = featureToSave.getGeometry();

    // if (geometryToSave) {
    //   // 3. THIS IS THE KEY STEP: Transform the geometry before saving.
    //   //    Source is the map view's projection. Destination is your backend's projection.
    //   geometryToSave.transform('EPSG:3857', 'EPSG:4326');
    // }

    // const geometry = feature.getGeometry();
    // // Only perform this check if the newly drawn feature is a Polygon
    // if (geometry && geometry.getType() === 'Polygon') {
    //   const parentGndId = this.findParentGndFeature(geometry as Polygon);
    //   // If a parent was found, add its ID to the properties of the new feature.
    //   if (parentGndId !== null) {
    //     properties.gnd_id = parentGndId;
    //   }
    // }
    // // --->>> NEW LOGIC ENDS HERE <<<---

    // feature.setProperties(properties, true); // Set all properties at once
    // feature.setId(`${targetLayerId}-${properties.uuid}`);

    // featureToSave.setProperties(properties, true); // Set all properties at once
    // featureToSave.setId(`${targetLayerId}-${properties.uuid}`);

    // // 2. Apply Style
    // const layerColor = this.layerService.getLayerColor(targetLayerId as number);
    // featureToSave.setStyle(this.createStyleForLayer(layerColor, type));

    // // 3. Calculate Area/Length (Your existing code is fine)
    // const fixDecimal = (value: number, decimals = 4) =>
    //   Number(Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals));

    // if (geometry) {
    //   try {
    //     const projection = this.mapInstance?.getView().getProjection();
    //     if (type === 'Polygon' || type === 'MultiPolygon') {
    //       properties.area = fixDecimal(getArea(geometry, { projection }));
    //     } else if (type === 'LineString') {
    //       properties.length = fixDecimal(getLength(geometry, { projection }));
    //     }
    //   } catch (calcError) {
    //     console.warn(`Error calculating area/length for ${properties.uuid}:`, calcError);
    //   }
    // }
    // // featureToSave.set('area', properties.area); // Ensure OL feature has it
    // // featureToSave.set('length', properties.length); // Ensure OL feature has it
    // // featureToSave.set('id', properties.uuid)
    // // featureToSave.set('gnd_id', properties.gnd_id);

    // // 5. Stage for Saving
    // const newFeatureData = this.featureService.convertFeatureToFeatureData(featureToSave);
    // const originalFeatureData = this.featureService.convertFeatureToFeatureData(feature);
    // if (newFeatureData) {
    //   this.featureService.stageAddition(newFeatureData, originalFeatureData!); // Stage the new feature
    //   this.notificationService.showSuccess(`Feature added to layer ${targetLayerId} (staged).`);
    // } else {
    //   this.notificationService.showError('Failed to prepare feature data for saving.');
    //   return null; // Return null to indicate failure
    // }

    // // 5. Return the fully processed feature.
    // return feature;
  }

  private processModifiedFeatures(modifiedFeatures: Feature<Geometry>[]): void {
    if (!modifiedFeatures || modifiedFeatures.length === 0) return;

    modifiedFeatures.forEach((feature) => {
      const uuid = feature.get('uuid');
      try {
        // --- Recalculate Area/Length ---
        const geometry = feature.getGeometry();
        if (!geometry) {
          console.warn(`Feature ${uuid} has no geometry after modification. Skipping.`);
          return;
        }
        const projection = this.mapInstance?.getView().getProjection();
        const geomType = geometry.getType() as DrawType;

        if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
          feature.set('area', parseFloat(getArea(geometry, { projection }).toFixed(4)));
        } else if (geomType === 'LineString') {
          feature.set('length', parseFloat(getLength(geometry, { projection }).toFixed(4)));
        }

        // --- Prepare Original State for Undo ---
        const originalGeometry = feature.get('__original_geometry') as Geometry | undefined;
        let originalFeatureData;
        if (originalGeometry) {
          // Create a temporary feature representing the original state
          const tempOriginalFeature = feature.clone();
          tempOriginalFeature.setGeometry(originalGeometry.clone());
          // The FeatureService will handle transforming this clone for storage
          originalFeatureData =
            this.featureService.convertFeatureToFeatureData(tempOriginalFeature);
        }

        // --- Stage the Update ---
        // The FeatureService will handle transforming the current state of 'feature'
        const updatedFeatureData = this.featureService.convertFeatureToFeatureData(feature);

        if (updatedFeatureData && originalFeatureData) {
          this.featureService.stageUpdate(updatedFeatureData, originalFeatureData);
        } else {
          console.error(`Failed to convert updated feature ${uuid} for staging.`);
        }
      } catch (error) {
        console.error(`Error processing modified feature ${uuid}:`, error);
      }
    });

    this.notificationService.showSuccess(
      `Staged modifications for ${modifiedFeatures.length} feature(s).`,
    );

    // (Your existing logic from processModifiedFeatures, ensure it uses this.mapInstance)
    // if (!modifiedFeatures || modifiedFeatures.length === 0) return;
    // console.log(
    //   `[DrawService] Processing ${modifiedFeatures.length} modified features for staging.`,
    // );

    // let successCount = 0;
    // modifiedFeatures.forEach((feature) => {
    //   // 1. Clone the modified feature to create a save-ready version.

    //   const uuid = feature.get('uuid') || feature.getId() || 'unknown-id';
    //   const olFeature_BackendId = feature.get('feature_Id'); // The one used by backend
    //   console.log(
    //     `[DrawService.processModifiedFeatures] Processing OL Feature - OL ID: ${olFeature_BackendId}, UUID: ${uuid}, Backend feature_Id: ${olFeature_BackendId}`,
    //   );
    //   const fixDecimal = (value: number, decimals = 4) =>
    //     Number(Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals));
    //   try {
    //     const featureToSave = feature.clone();
    //     const geometryToSave = featureToSave.getGeometry();

    //     if (geometryToSave) {
    //       // 2. Reproject its geometry.
    //       geometryToSave.transform('EPSG:3857', 'EPSG:4326');
    //     }

    //     // `originalFeatureCopy` should also be reprojected if the backend expects it.
    //     const originalGeometry = feature.get('__original_geometry') as Geometry | undefined;
    //     const originalFeatureCopy = feature.clone();
    //     if (originalGeometry) {
    //       const clonedOriginalGeom = originalGeometry.clone();
    //       clonedOriginalGeom.transform('EPSG:3857', 'EPSG:4326'); // Reproject the original state as well
    //       originalFeatureCopy.setGeometry(clonedOriginalGeom);
    //     }

    //     const geometry = feature.getGeometry();
    //     const projection = this.mapInstance?.getView().getProjection();
    //     if (!geometry) {
    //       console.warn(`Feature ${uuid} has no geometry after modification. Skipping.`);
    //       return;
    //     }

    //     const geomType = geometry.getType() as DrawType; // Cast for properties
    //     let area = feature.get('area') || 0;
    //     let length = feature.get('length') || 0;

    //     if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
    //       area = fixDecimal(getArea(geometry, { projection }));
    //     } else if (geomType === 'LineString') {
    //       length = fixDecimal(getLength(geometry, { projection }));
    //     }
    //     featureToSave.set('area', area);
    //     featureToSave.set('length', length);
    //     featureToSave.set('status', true); // Mark as modified/valid

    //     const featureData = this.featureService.convertFeatureToFeatureData(featureToSave);
    //     const originalFeatureData =
    //       this.featureService.convertFeatureToFeatureData(originalFeatureCopy);

    //     console.log(
    //       `[DrawService.processModifiedFeatures] Converted FeatureData properties:`,
    //       JSON.stringify(featureData?.properties),
    //     );
    //     if (featureData) {
    //       this.featureService.stageUpdate(featureData, originalFeatureData!); // Stage the update
    //       successCount++;
    //     } else {
    //       console.error(`Failed to convert updated feature ${uuid} for staging.`);
    //     }
    //   } catch (error) {
    //     console.error(`Error processing modified feature ${uuid}:`, error);
    //   }
    // }); // end forEach

    // this.notificationService.showSuccess(
    //   `Staged modifications for ${modifiedFeatures.length} feature(s).`,
    // );

    // if (successCount < modifiedFeatures.length) {
    //   this.notificationService.showWarning(
    //     `Could not stage modifications for ${modifiedFeatures.length - successCount} feature(s). Check console.`,
    //   );
    // }
  }

  /**
   * Finds the containing feature from the GND boundary layer for a given polygon.
   * @param newPolygon The newly drawn polygon geometry.
   * @returns The identifier of the parent GND feature (e.g., its name or ID), or null if not found.
   */
  public findParentGndFeature(newPolygon: Polygon): string | number | null {
    if (!this.mapInstance) {
      console.warn('[DrawService] Map instance not available for parent search.');
      return null;
    }

    // 1. Find the GND layer by its unique string ID.
    const gndLayer = this.findLayerOnMap('gnd_boundary_layer');
    if (!gndLayer) {
      console.warn('[DrawService] GND boundary layer not found. Cannot determine parent polygon.');
      return null;
    }

    const gndSource = gndLayer.getSource();
    if (!gndSource) return null;

    // 2. Use an efficient spatial query: get the interior point of the new polygon.
    // This is guaranteed to be inside the polygon.
    const centerPoint = newPolygon.getInteriorPoint().getCoordinates();

    // 3. Find the first GND feature that contains this point.
    // `getFeaturesAtCoordinate()` is highly efficient for this.
    const parentGndFeatures = gndSource.getFeaturesAtCoordinate(centerPoint);

    if (parentGndFeatures && parentGndFeatures.length > 0) {
      const parentGndFeature = parentGndFeatures[0]; // Take the first one found

      // 4. Extract a useful identifier from the parent GND feature.
      // ADAPT THIS LINE to match a property in your GND GeoJSON data.
      // Common properties might be 'GND_N', 'name', 'id', 'DN_Name', etc.
      // Check your GeoJSON file to see what properties are available on each feature.
      const parentIdentifier = parentGndFeature.getId(); //

      if (parentIdentifier) {
        console.log(`[DrawService] New polygon is inside GND: ${parentIdentifier}`);
        return parentIdentifier;
      } else {
        console.warn(
          "[DrawService] Found a parent GND feature, but it's missing the expected identifier property ('GND_N').",
        );
        // Fallback to its OpenLayers ID if no specific property is found
        return parentGndFeature.getId() || null;
      }
    }

    console.log('[DrawService] New polygon does not appear to be inside any known GND boundary.');
    return null;
  }

  public findParentGndFeatureForPoint(point: Point): string | number | null {
    if (!this.mapInstance) {
      console.warn('[DrawService] Map instance not available for parent search.');
      return null;
    }

    const gndLayer = this.findLayerOnMap('gnd_boundary_layer');
    if (!gndLayer) {
      console.warn('[DrawService] GND boundary layer not found. Cannot determine parent polygon.');
      return null;
    }

    const gndSource = gndLayer.getSource();
    if (!gndSource) return null;

    const pointCoord = point.getCoordinates();
    const parentGndFeatures = gndSource.getFeaturesAtCoordinate(pointCoord);

    if (parentGndFeatures && parentGndFeatures.length > 0) {
      const parent = parentGndFeatures[0];
      const id = parent.getId();
      console.log(`[DrawService] Point is inside GND: ${id}`);
      return id || null;
    }

    console.log('[DrawService] Point does not appear to be inside any known GND boundary.');
    return null;
  }

  public findParentGndFeatureForLine(line: LineString): string | number | null {
    if (!this.mapInstance) {
      console.warn('[DrawService] Map instance not available for parent search.');
      return null;
    }

    const gndLayer = this.findLayerOnMap('gnd_boundary_layer');
    if (!gndLayer) {
      console.warn('[DrawService] GND boundary layer not found.');
      return null;
    }

    const gndSource = gndLayer.getSource();
    if (!gndSource) return null;

    const lineExtent = line.getExtent();
    const candidates = gndSource.getFeaturesInExtent(lineExtent);

    for (const candidate of candidates) {
      const geometry = candidate.getGeometry();
      if (geometry && geometry.intersectsExtent(lineExtent)) {
        const id = candidate.getId();
        console.log(`[DrawService] Line intersects GND: ${id}`);
        return id || null;
      }
    }

    console.log('[DrawService] Line does not intersect any known GND boundary.');
    return null;
  }

  public getActiveToolType(): 'draw' | 'select' | 'modify' | 'split' | 'merge' | null {
    // Helper for template
    const currentTool = this._activeTool.value;
    return currentTool ? currentTool.type : null;
  }

  public getCurrentDrawType(): 'Point' | 'LineString' | 'Polygon' | null {
    // Helper for template
    const currentTool = this._activeTool.value;
    if (currentTool?.type === 'draw') {
      return currentTool.drawType;
    }
    return null;
  }

  private createFeatureProperties(
    layerId: number | string,
    type: DrawType,
    parentIds?: string[],
    area?: number,
    length?: number,
    gndId?: string,
    newUuid?: string,
  ): FeatureProperties {
    return {
      user_id: Number(this.userService.getUser()?.user_id) || 0,
      layer_id: layerId,
      feature_Id: newUuid, // Using UUID as feature_Id for new features
      area: area ? area : 0,
      length: length ? length : 0,
      parent_uuid: null,
      status: true,
      uuid: newUuid || uuidv4(), // Generate a new UUID if not provided
      ref_id: this.selectedRefFeatureId ? this.selectedRefFeatureId : null,
      gnd_id: gndId ? gndId : undefined, // Will be set later if needed
    };
  }

  public createStyleForLayer(colorHex: string, geomType: DrawType): Style {
    // (Your existing createStyleForLayer implementation)
    const strokeColor = colorHex;
    const fillColor = `${colorHex}4D`; // Add alpha (e.g., 30% opacity = 4D)

    return new Style({
      stroke: new Stroke({
        color: strokeColor,
        width: geomType === 'Point' ? 1 : 2,
      }),
      fill: geomType === 'Polygon' ? new Fill({ color: fillColor }) : undefined,
      image:
        geomType === 'Point'
          ? new CircleStyle({
              radius: 5,
              fill: new Fill({ color: fillColor }),
              stroke: new Stroke({ color: strokeColor, width: 1 }),
            })
          : undefined,
    });
  }

  public findLayerOnMap(
    layerIdAsNumber: number | string,
  ): VectorLayer<VectorSource<Feature<Geometry>>> | null {
    // (Your existing findLayerOnMap implementation, ensure it uses this.mapInstance)
    if (!this.mapInstance) return null;
    const layerIdAsString = String(layerIdAsNumber);
    const layers = this.mapInstance.getLayers().getArray();
    const foundLayer = layers.find(
      (layer) => layer instanceof VectorLayer && layer.get('layerId') === layerIdAsString,
    );
    return (foundLayer as VectorLayer<VectorSource<Feature<Geometry>>>) || null;
  }

  public getFeatureIdentifier(
    feature: Feature<Geometry> | null | undefined,
    preferredType: 'uuid' | 'feature_Id' = 'uuid',
  ): string | number | null {
    // (Your existing getFeatureIdentifier implementation)
    if (!feature) return null;
    let id = feature.get(preferredType);
    if (id) return id;
    id = feature.get(preferredType === 'uuid' ? 'feature_Id' : 'uuid'); // Fallback
    if (id) return id;
    return feature.getId() ?? null;
  }

  /**
   * Deletes the currently selected features from the map and stages them for backend deletion.
   * It determines which Select interaction (single or multi) is active to get the features.
   */
  public deleteFeatures(): void {
    if (!this.validateMapReady()) {
      this.notificationService.showError('Map not ready. Cannot delete features.');
      return;
    }

    const currentToolState = this._activeTool.value;
    let activeSelectInteraction: Select | null = null;

    // Determine which select interaction is currently supposed to be active
    if (currentToolState?.type === 'select') {
      activeSelectInteraction = currentToolState.multi ? this.olSelectMulti : this.olSelectSingle;
    } else if (currentToolState?.type === 'modify') {
      // If in modify mode, the selection comes from olSelectSingle
      activeSelectInteraction = this.olSelectSingle;
    }

    if (!activeSelectInteraction || !activeSelectInteraction.getActive()) {
      this.notificationService.showInfo(
        'Selection tool not active. Please select features to delete.',
      );
      return;
    }

    const selectedFeaturesCollection = activeSelectInteraction.getFeatures();

    if (selectedFeaturesCollection.getLength() === 0) {
      this.notificationService.showInfo('No features selected to delete.');
      return;
    }

    const featuresToDelete = selectedFeaturesCollection.getArray().slice(); // Work on a copy
    const backendFeatureIdsToDelete: string[] = []; // Store backend identifiers (UUIDs or feature_Id)
    const olFeaturesToRemoveMap = new Map<string, Feature<Geometry>>(); // Map backend ID to OL Feature for map removal

    console.log(
      `[DrawService] Preparing to delete ${featuresToDelete.length} selected feature(s).`,
    );

    // 1. Collect backend identifiers and map OL features
    for (const feature of featuresToDelete) {
      // Prioritize 'feature_Id' for backend, fallback to 'uuid'
      const backendId = feature.get('feature_Id') ?? feature.get('uuid');

      if (backendId !== undefined && backendId !== null) {
        const backendIdStr = String(backendId); // Ensure it's a string for map key
        backendFeatureIdsToDelete.push(backendIdStr);
        olFeaturesToRemoveMap.set(backendIdStr, feature);
      } else {
        const olId = feature.getId() || '(no OL id)';
        console.warn(
          `[DrawService] Selected feature (OL ID: ${olId}) missing 'feature_Id' or 'uuid'. Cannot stage for backend deletion.`,
        );
        this.notificationService.showWarning(
          `Cannot delete feature (OL ID: ${olId}): missing backend identifier.`,
        );
      }
    }

    if (backendFeatureIdsToDelete.length === 0) {
      this.notificationService.showInfo('No selected features had valid identifiers for deletion.');
      // Clear selection from the map even if nothing is sent to the backend
      selectedFeaturesCollection.clear();
      this.onOlSelectChange(); // Trigger an update to selection BehaviorSubjects
      return;
    }

    // 2. Stage features for deletion in FeatureService (which will then call backend)
    this.notificationService.showInfo(
      `Staging deletion for ${backendFeatureIdsToDelete.length} feature(s)...`,
    );
    let successfullyStagedForBackend = 0;

    backendFeatureIdsToDelete.forEach((backendId) => {
      const olFeature = olFeaturesToRemoveMap.get(backendId);
      if (olFeature) {
        const layerId = olFeature.get('layer_id'); // Assuming layer_id is stored numerically
        if (layerId !== undefined && layerId !== null) {
          // For undo, FeatureService needs the original data
          const originalFeatureData = this.featureService.convertFeatureToFeatureData(olFeature);
          this.featureService.stageDeletion(backendId, layerId, originalFeatureData!);
          successfullyStagedForBackend++;
        } else {
          console.warn(
            `[DrawService] Feature with backend ID ${backendId} is missing 'layer_id'. Cannot fully stage for undo.`,
          );
          // Still stage for deletion, but undo might not restore to map correctly.
          const originalFeatureData = this.featureService.convertFeatureToFeatureData(olFeature);
          this.featureService.stageDeletion(backendId, -1, originalFeatureData!); // Use a placeholder or handle differently
        }
      }
    });

    if (successfullyStagedForBackend > 0) {
      this.notificationService.showSuccess(
        `${successfullyStagedForBackend} feature(s) staged for deletion. Save to confirm.`,
      );
      // 3. Remove features from the map (optimistic UI update)
      // The actual backend deletion happens when "Save All" is clicked.
      let removedFromMapCount = 0;
      backendFeatureIdsToDelete.forEach((backendId) => {
        const featureToRemove = olFeaturesToRemoveMap.get(backendId);
        if (featureToRemove) {
          const layerId = featureToRemove.get('layer_id');
          if (layerId !== undefined && layerId !== null) {
            const layer = this.findLayerOnMap(layerId); // Ensure this method exists and is correct
            const source = layer?.getSource();
            if (source && source.hasFeature(featureToRemove)) {
              try {
                source.removeFeature(featureToRemove);
                removedFromMapCount++;
              } catch (e) {
                console.error(
                  `[DrawService] Error removing OL feature (backend ID: ${backendId}) from map:`,
                  e,
                );
              }
            } else {
              console.warn(
                `[DrawService] OL feature (backend ID: ${backendId}) not found on map layer ${layerId} for removal.`,
              );
            }
          } else {
            console.warn(
              `[DrawService] OL feature (backend ID: ${backendId}) missing 'layer_id', cannot ensure removal from correct map layer.`,
            );
          }
        }
      });
      console.log(`[DrawService] Removed ${removedFromMapCount} OL feature(s) from map.`);
    } else {
      this.notificationService.showWarning(
        'No features could be staged for deletion (missing identifiers or layer info).',
      );
    }

    // 4. Clear the OL Select interaction's collection
    selectedFeaturesCollection.clear();
    this.onOlSelectChange(); // Trigger an update to selection BehaviorSubjects to reflect empty selection
  }
  validateMapReady(): boolean {
    if (!this.mapInstance) {
      console.error('[DrawService] Map instance is not available.');
      this.notificationService.showError('Map is not ready.');
      return false;
    }
    return true;
  }

  public automaticSelectFeature(feature: Feature<Geometry>, opts: { multi?: boolean } = {}): void {
    const multi = !!opts.multi;

    this.setActiveTool({ type: 'select', multi });

    const sel: Select | null = multi ? this.olSelectMulti : this.olSelectSingle;
    if (!sel) {
      this.notificationService.showError('Select tool is not available.');
      return;
    }

    const coll = sel.getFeatures();
    coll.clear();
    coll.push(feature);

    this.onOlSelectChange(undefined, sel);
  }
}
