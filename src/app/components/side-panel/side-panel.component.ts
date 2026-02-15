import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject, signal, OnDestroy, NgZone } from '@angular/core';
import { Feature } from 'ol';
import { Geometry, Polygon, MultiPolygon } from 'ol/geom';
import { getArea, getLength } from 'ol/sphere';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  LandParcelInfo,
  createDefaultLandParcel,
  BoundaryType,
  LandUse,
  ParcelStatus,
  ParcelType,
  TenureType,
  SoilType,
  ZoningCategory,
  RightType,
  AccuracyLevel,
  SurveyMethod,
} from '../../models/land-parcel.model';
import {
  BuildingInfo,
  LegalStatus,
  PrimaryUse,
  LodLevel,
  ElevationRef,
  CRS,
  StructureType,
  Condition,
  RoofType,
  TopologyStatus,
} from '../../models/building-info.model';
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

  // Data signals for info panels
  currentLandParcelInfo = signal<LandParcelInfo | null>(null);
  currentBuildingInfo = signal<BuildingInfo | null>(null);
  buildingModelLoaded = signal(false);

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
        this.currentLandParcelInfo.set(null);
        this.currentBuildingInfo.set(null);
        this.buildingModelLoaded.set(false);
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

      // Auto-switch tabs based on the selected layer and populate data
      switch (this.selected_layer_ID) {
        case 1:
        case 6:
          this.activeSidebarTab.set('land');
          this.currentBuildingInfo.set(null);
          this.buildingModelLoaded.set(false);
          this.currentLandParcelInfo.set(this.createLandParcelFromFeature(featureInfo));
          this.makeExtend();
          break;
        case 3:
        case 12:
          this.activeSidebarTab.set('building');
          this.currentLandParcelInfo.set(null);
          this.currentBuildingInfo.set(this.createBuildingFromFeature(featureInfo));
          this.buildingModelLoaded.set(true);
          this.makeExtend();
          break;
        default:
          this.activeSidebarTab.set('land');
          this.currentBuildingInfo.set(null);
          this.buildingModelLoaded.set(false);
          this.currentLandParcelInfo.set(this.createLandParcelFromFeature(featureInfo));
          this.makeExtend();
      }
    });

    // Handle explicit deselection
    this.drawService.deselectedFeature$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.selected_feature_ID = null;
      this.currentLandParcelInfo.set(null);
      this.currentBuildingInfo.set(null);
      this.buildingModelLoaded.set(false);
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

  // ─── Feature → Model Mappers ─────────────────────────────

  private createLandParcelFromFeature(featureInfo: SelectedFeatureInfo): LandParcelInfo {
    const props = featureInfo.olFeature?.getProperties() || {};
    const geometry = featureInfo.olFeature?.getGeometry();
    const featureId = String(featureInfo.featureId ?? '');

    // Compute spatial properties from geometry
    let area = 0;
    let perimeter = 0;
    let geometryType = 'Polygon';
    let coordinateCount = 0;
    let centroidLon = 0;
    let centroidLat = 0;

    if (geometry) {
      geometryType = geometry.getType();
      const mapProjection = this.mapService.mapInstance?.getView().getProjection();

      if (geometry instanceof Polygon || geometry instanceof MultiPolygon) {
        area = getArea(geometry, { projection: mapProjection }) || 0;
        const ring =
          geometry instanceof Polygon
            ? geometry.getLinearRing(0)
            : geometry.getPolygon(0)?.getLinearRing(0);
        if (ring) {
          perimeter = getLength(ring, { projection: mapProjection }) || 0;
        }
      }

      const extent = geometry.getExtent();
      centroidLon = (extent[0] + extent[2]) / 2;
      centroidLat = (extent[1] + extent[3]) / 2;

      const flatCoords = (geometry as any).getFlatCoordinates?.() || [];
      const stride = (geometry as any).stride || 2;
      coordinateCount = flatCoords.length / stride;
    }

    const parcel = createDefaultLandParcel(featureId);

    // Map feature properties to identification
    parcel.identification = {
      parcelId: props['parcel_id'] || props['parcelId'] || props['id'] || featureId,
      cadastralRef: props['cadastral_ref'] || props['cadastralRef'] || props['lot_number'] || '',
      parcelType: this.resolveEnum(props['parcel_type'], ParcelType, ParcelType.LAND),
      parcelStatus: this.resolveEnum(props['status'], ParcelStatus, ParcelStatus.ACTIVE),
      landUse: this.resolveEnum(props['land_use'] || props['landUse'], LandUse, LandUse.VAC),
      tenureType: this.resolveEnum(props['tenure_type'], TenureType, TenureType.FREE),
      registrationDate: props['registration_date'] || props['created_at'] || '',
      localAuthority: props['local_authority'] || props['district'] || props['pd'] || '',
    };

    // Map spatial properties (calculated from geometry)
    parcel.spatial = {
      area: props['area'] || Math.round(area * 100) / 100,
      perimeter: props['perimeter'] || Math.round(perimeter * 100) / 100,
      geometryType,
      boundaryType: this.resolveEnum(props['boundary_type'], BoundaryType, BoundaryType.GENERAL),
      coordinateCount,
      crs: props['crs'] || 'EPSG:4326',
      centroidLon: Math.round(centroidLon * 1000000) / 1000000,
      centroidLat: Math.round(centroidLat * 1000000) / 1000000,
    };

    // Map physical properties
    parcel.physical = {
      elevation: props['elevation'] || 0,
      slope: props['slope'] || 0,
      soilType: this.resolveEnum(props['soil_type'], SoilType, SoilType.LOAM),
      floodZone: props['flood_zone'] ?? false,
      vegetationCover: props['vegetation'] || props['vegetation_cover'] || '',
      accessRoad: props['access_road'] ?? true,
      utilities: props['utilities'] || '',
    };

    // Map zoning properties
    parcel.zoning = {
      zoningCategory: this.resolveEnum(props['zoning'], ZoningCategory, ZoningCategory.R1),
      maxBuildingHeight: props['max_height'] || 0,
      maxCoverage: props['max_coverage'] || 0,
      maxFAR: props['max_far'] || 0,
      setbackFront: props['setback_front'] || 0,
      setbackRear: props['setback_rear'] || 0,
      setbackSide: props['setback_side'] || 0,
      specialOverlay: props['special_overlay'] || '',
    };

    // Map valuation
    parcel.valuation = {
      landValue: props['land_value'] || 0,
      marketValue: props['market_value'] || 0,
      annualTax: props['annual_tax'] || 0,
      lastAssessmentDate: props['last_assessment_date'] || '',
      taxStatus: props['tax_status'] || 'pending',
    };

    // Map relationships
    parcel.relationships = {
      buildingIds: props['building_ids'] || [],
      adjacentParcels: props['adjacent_parcels'] || '',
      parentParcel: props['parent_parcel'] || '',
      childParcels: props['child_parcels'] || '',
      partOfEstate: props['estate_id'] || '',
    };

    // Map metadata
    parcel.metadata = {
      dataQualityId: props['data_quality_id'] || parcel.metadata.dataQualityId,
      accuracyLevel: this.resolveEnum(
        props['accuracy_level'],
        AccuracyLevel,
        AccuracyLevel.ACC_TIER2,
      ),
      surveyMethod: this.resolveEnum(props['survey_method'], SurveyMethod, SurveyMethod.SURVEY_TS),
      lastUpdated: props['updated_at'] || props['last_updated'] || new Date().toISOString(),
      responsibleParty: props['responsible_party'] || props['surveyor'] || '',
      sourceDocument: props['source_document'] || '',
    };

    // Map RRR from owner property if available
    if (props['owner'] || props['owner_name']) {
      parcel.rrr = {
        entries: [
          {
            rrrId: `LRRR-${featureId}`,
            type: RightType.OWN_FREE,
            holder: props['owner'] || props['owner_name'] || '',
            share: 100,
            validFrom: props['registration_date'] || '',
            validTo: '',
            documentRef: props['deed_ref'] || props['document_ref'] || '',
            documents: [],
            restrictions: [],
            responsibilities: [],
          },
        ],
      };
    }

    return parcel;
  }

  private createBuildingFromFeature(featureInfo: SelectedFeatureInfo): BuildingInfo {
    const props = featureInfo.olFeature?.getProperties() || {};
    const geometry = featureInfo.olFeature?.getGeometry();
    const featureId = String(featureInfo.featureId ?? '');

    // Compute spatial properties from geometry
    let footprintArea = 0;
    let geometryType = 'Polygon';

    if (geometry) {
      geometryType = geometry.getType();
      const mapProjection = this.mapService.mapInstance?.getView().getProjection();
      if (geometry instanceof Polygon || geometry instanceof MultiPolygon) {
        footprintArea = getArea(geometry, { projection: mapProjection }) || 0;
      }
    }

    return {
      summary: {
        buildingId: props['building_id'] || props['buildingId'] || props['id'] || featureId,
        legalStatus: this.resolveEnum(props['legal_status'], LegalStatus, LegalStatus.FREEHOLD),
        address: props['address'] || props['name'] || '',
        primaryUse: this.resolveEnum(
          props['primary_use'] || props['function'] || props['usage'],
          PrimaryUse,
          PrimaryUse.RES,
        ),
        cadastralRef: props['cadastral_ref'] || props['cadastralRef'] || props['lot_number'] || '',
        floorCount:
          props['floor_count'] ||
          props['floors'] ||
          props['storeys_above_ground'] ||
          props['number_of_floors'] ||
          1,
        registrationDate: props['registration_date'] || props['created_at'] || '',
      },
      spatial: {
        footprint: geometryType,
        solidGeometry: props['solid_geometry'] || 'N/A',
        lodLevel: this.resolveEnum(props['lod_level'], LodLevel, LodLevel.LOD0),
        height: props['height'] || props['measured_height'] || 0,
        crs: this.resolveEnum(props['crs'], CRS, CRS.EPSG_4326),
        elevationRef: this.resolveEnum(props['elevation_ref'], ElevationRef, ElevationRef.GROUND),
      },
      rrr: {
        entries: [
          {
            rrrId: `BRRR-${featureId}`,
            type: RightType.OWN_FREE,
            holder: props['owner'] || props['owner_name'] || '',
            share: 100,
            validFrom: props['registration_date'] || '',
            validTo: '',
            documentRef: props['deed_ref'] || props['document_ref'] || '',
            documents: [],
            restrictions: [],
            responsibilities: [],
          },
        ],
      },
      units: [],
      physicalAttributes: {
        constructionYear: props['construction_year'] || props['year_of_construction'] || 0,
        structureType: this.resolveEnum(
          props['structure_type'],
          StructureType,
          StructureType.CONC_REINF,
        ),
        condition: this.resolveEnum(props['condition'], Condition, Condition.GOOD),
        roofType: this.resolveEnum(props['roof_type'], RoofType, RoofType.FLAT),
        grossArea: props['gross_area'] || Math.round(footprintArea * 100) / 100,
      },
      taxValuation: {
        assessedValue: props['assessed_value'] || 0,
        marketValue: props['market_value'] || 0,
        annualTax: props['annual_tax'] || 0,
        lastAssessmentDate: props['last_assessment_date'] || '',
        taxStatus: props['tax_status'] || 'pending',
      },
      relationshipsTopology: {
        parcelRelation: props['parcel_relation'] || props['parcel_id'] || '',
        adjacentBuildings: props['adjacent_buildings'] || '',
        sharedWall: props['shared_wall'] ?? false,
        topologyStatus: this.resolveEnum(
          props['topology_status'],
          TopologyStatus,
          TopologyStatus.VALID,
        ),
        overlapVolume: props['overlap_volume'] || 0,
        partOfComplex: props['complex_id'] || '',
      },
      metadataQuality: {
        dataQualityID: props['data_quality_id'] || `DQ-${Date.now()}`,
        accuracyLevel: this.resolveEnum(
          props['accuracy_level'],
          AccuracyLevel,
          AccuracyLevel.ACC_TIER2,
        ),
        surveyMethod: this.resolveEnum(props['survey_method'], SurveyMethod, SurveyMethod.DIGIT_2D),
        lastUpdated: props['updated_at'] || props['last_updated'] || new Date().toISOString(),
        responsibleParty: props['responsible_party'] || props['surveyor'] || '',
        sourceFile: props['source_file'] || '',
      },
    };
  }

  private resolveEnum<T extends Record<string, string>>(
    raw: string | undefined | null,
    enumObj: T,
    defaultValue: T[keyof T],
  ): T[keyof T] {
    if (!raw) return defaultValue;
    const values = Object.values(enumObj);
    if (values.includes(raw as any)) return raw as T[keyof T];
    // Try uppercase match
    const upper = raw.toUpperCase().replace(/[\s-]/g, '_');
    const match = values.find((v) => v === upper);
    if (match) return match as T[keyof T];
    return defaultValue;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
