import {Component, EventEmitter, Output, inject, signal, NgZone, DestroyRef} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { Feature } from 'ol';
import { Geometry, Polygon, MultiPolygon } from 'ol/geom';
import { getArea, getLength } from 'ol/sphere';
import {forkJoin, of } from 'rxjs';
import {catchError, switchMap } from 'rxjs/operators';
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
  RRRInfo,
  RRREntry,
  RestrictionType,
  ResponsibilityType,
  ParcelIdentification,
  ParcelSpatial,
  ParcelPhysical,
  ParcelZoning,
  ParcelValuation,
  ParcelRelationships,
  ParcelMetadata,
} from '../../models/land-parcel.model';
import {
  BuildingInfo,
  BuildingSummary,
  BuildingUnit,
  SpatialInfo,
  PhysicalAttributes,
  UtilityInfo,
  RelationshipsTopology,
  MetadataQuality,
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
import { APIsService } from '../../services/api.service';
import { DrawService, SelectedFeatureInfo } from '../../services/draw.service';
import { MapService } from '../../services/map.service';
import { NotificationService } from '../../services/notifications.service';
import { PermissionService } from '../../services/permissions.service';
import { SidebarControlService } from '../../services/sidebar-control.service';
import { LandSectionPermissions, BuildingSectionPermissions } from '../../core/constant';
import { BuildingInfoPanelComponent } from './building-info-panel/building-info-panel.component';
import { HomeTabComponent } from './home-tab/home-tab.component';
import { LandInfoPanelComponent } from './land-info-panel/land-info-panel.component';
import {
  GenerateReportComponent,
  GenerateReportData,
} from '../dialogs/generate-report/generate-report.component';

type SidebarTab = 'home' | 'land' | 'building';

@Component({
  selector: 'app-side-panel',
  standalone: true,
  imports: [BuildingInfoPanelComponent, HomeTabComponent, LandInfoPanelComponent],
  templateUrl: './side-panel.component.html',
  styleUrl: './side-panel.component.css',
})
export class SidePanelComponent {
  private ngZone = inject(NgZone);
  private destroyRef = inject(DestroyRef);

  @Output() emitExtend = new EventEmitter<boolean>();

  selected_feature_ID: any = '';
  selected_layer_ID: any = '';
  selected_featureInfo: SelectedFeatureInfo | null = null;

  private fetchedRRRBaUnitIds = new Set<number>();
  private fetchedRRRMap = new Map<string, number>(); // rrrId (BU-xxx) → actual backend rrr_id

  // Sidebar state (signals — matching 3D Cadastre pattern)
  activeSidebarTab = signal<SidebarTab>('home');
  isSidebarClosed = signal(false);
  sidebarWidth = signal(340);
  private _resizing = false;

  // Data signals for info panels
  currentLandParcelInfo = signal<LandParcelInfo | null>(null);
  currentBuildingInfo = signal<BuildingInfo | null>(null);
  buildingModelLoaded = signal(false);
  sectionPerms = signal<Record<number, any>>({});

  extendWidth = false;

  constructor(
    private mapService: MapService,
    private drawService: DrawService,
    private notificationService: NotificationService,
    private sidebarService: SidebarControlService,
    private apiService: APIsService,
    private dialog: MatDialog,
    private permissionService: PermissionService,
  ) {
    // Handle feature selection changes
    this.drawService.selectedFeatureInfo$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((info) => {
      if (!info || (Array.isArray(info) && info.length === 0) || info.length > 1) {
        this.selected_feature_ID = null;
        this.currentLandParcelInfo.set(null);
        this.currentBuildingInfo.set(null);
        this.buildingModelLoaded.set(false);
        this.activeSidebarTab.set('home');
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
          this.fetchAndMergeLandParcelData(featureInfo.featureId);
          this.makeExtend();
          break;
        case 3:
        case 12:
          this.activeSidebarTab.set('building');
          this.currentLandParcelInfo.set(null);
          this.currentBuildingInfo.set(this.createBuildingFromFeature(featureInfo));
          this.buildingModelLoaded.set(true);
          this.fetchAndMergeBuildingData(featureInfo.featureId);
          this.makeExtend();
          break;
        default:
          this.activeSidebarTab.set('land');
          this.currentBuildingInfo.set(null);
          this.buildingModelLoaded.set(false);
          this.currentLandParcelInfo.set(this.createLandParcelFromFeature(featureInfo));
          this.fetchAndMergeLandParcelData(featureInfo.featureId);
          this.makeExtend();
      }
    });

    // Handle explicit deselection
    this.drawService.deselectedFeature$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.selected_feature_ID = null;
      this.currentLandParcelInfo.set(null);
      this.currentBuildingInfo.set(null);
      this.buildingModelLoaded.set(false);
      this.activeSidebarTab.set('home');
      this.removeExtend();
    });

    // Handle sidebar open/close events
    this.sidebarService.isClosed$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((closed) => {
      this.isSidebarClosed.set(closed);
    });
  }

  switchTab(tab: SidebarTab): void {
    this.activeSidebarTab.set(tab);
    this.makeExtend();
  }

  ngOnInit(): void {
    this.loadSectionPermissions();
  }

  private loadSectionPermissions(): void {
    const roleId = parseInt(typeof window !== 'undefined' ? (localStorage.getItem('role_id') ?? '0') : '0', 10);
    if (!roleId) return;
    const allIds = [
      ...Object.values(LandSectionPermissions),
      ...Object.values(BuildingSectionPermissions),
    ];
    this.permissionService.loadPermissions(roleId, allIds).subscribe({
      next: (perms) => this.sectionPerms.set(perms),
      error: () => { /* keep default allow-all */ },
    });
  }

  isTabEnabled(tab: SidebarTab): boolean {
    switch (tab) {
      case 'home':
        return true;
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
      accessRoad: props['access_road'] === 'Yes' || props['access_road'] === true,
      waterSupply: '',
      electricity: '',
      drainageSystem: '',
      sanitationGully: '',
      garbageDisposal: '',
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
        postalAddress: props['postal_address'] || '',
        householdNo: props['household_no'] || '',
        propertyType: props['property_type'] || '',
        accessRoad: props['access_road'] === 'Yes' || props['access_road'] === true,
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
        entries:
          props['owner'] || props['owner_name']
            ? [
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
              ]
            : [],
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
        wallType: props['wall_type'] || '',
        grossArea: props['gross_area'] || Math.round(footprintArea * 100) / 100,
      },
      utilities: {
        electricity: '',
        telephone: '',
        internet: '',
        waterDrink: '',
        water: '',
        drainage: '',
        sanitationSewer: '',
        sanitationGully: '',
        garbageDisposal: '',
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

  // ─── Land Panel Change Handlers ─────────────────────────
  onLandRRRChanged(rrr: RRRInfo): void {
    const current = this.currentLandParcelInfo();
    if (!current) return;
    this.currentLandParcelInfo.set({ ...current, rrr });
  }

  onLandIdentificationChanged(identification: ParcelIdentification): void {
    const current = this.currentLandParcelInfo();
    if (!current) return;
    this.currentLandParcelInfo.set({ ...current, identification });
  }

  onLandSpatialChanged(spatial: ParcelSpatial): void {
    const current = this.currentLandParcelInfo();
    if (!current) return;
    this.currentLandParcelInfo.set({ ...current, spatial });
  }

  onLandPhysicalChanged(physical: ParcelPhysical): void {
    const current = this.currentLandParcelInfo();
    if (!current) return;
    this.currentLandParcelInfo.set({ ...current, physical });
  }

  onLandZoningChanged(zoning: ParcelZoning): void {
    const current = this.currentLandParcelInfo();
    if (!current) return;
    this.currentLandParcelInfo.set({ ...current, zoning });
  }

  onLandValuationChanged(valuation: ParcelValuation): void {
    const current = this.currentLandParcelInfo();
    if (!current) return;
    this.currentLandParcelInfo.set({ ...current, valuation });
  }

  onLandRelationshipsChanged(relationships: ParcelRelationships): void {
    const current = this.currentLandParcelInfo();
    if (!current) return;
    this.currentLandParcelInfo.set({ ...current, relationships });
  }

  onLandMetadataChanged(metadata: ParcelMetadata): void {
    const current = this.currentLandParcelInfo();
    if (!current) return;
    this.currentLandParcelInfo.set({ ...current, metadata });
  }

  private fetchAndMergeLandParcelData(su_id: string | number): void {
    forkJoin([
      this.apiService.getAdministrativeInfo(su_id).pipe(catchError(() => of({}))),
      this.apiService.getLandOverViewInfo(su_id).pipe(catchError(() => of({}))),
      this.apiService.getltAssesAndTaxInfo(su_id).pipe(catchError(() => of({}))),
      this.apiService.getRRRData(su_id).pipe(catchError(() => of(null))),
      this.apiService.getZoningInfo(su_id).pipe(catchError(() => of(null))),
      this.apiService.getPhysicalEnvInfo(su_id).pipe(catchError(() => of(null))),
      this.apiService.getItInfo(su_id).pipe(catchError(() => of({}))),
      this.apiService.getLandMetadata(su_id).pipe(catchError(() => of({}))),
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        ([adminData, overviewData, taxData, rrrData, zoningData, physicalData, utilData, metaData]: [
          any,
          any,
          any,
          any,
          any,
          any,
          any,
          any,
        ]) => {
          console.log('[Fetch] adminData from backend:', adminData);
          const current = this.currentLandParcelInfo();
          if (!current) return;

          const identification = { ...current.identification };
          const physical = { ...current.physical };
          const spatial = { ...current.spatial };
          const valuation = { ...current.valuation };

          // Merge admin data
          if (adminData.local_auth) identification.localAuthority = adminData.local_auth;
          if (adminData.sl_land_type)
            identification.parcelType = this.resolveEnum(
              adminData.sl_land_type,
              ParcelType,
              current.identification.parcelType,
            );
          if (adminData.land_name) identification.cadastralRef = adminData.land_name;
          if (adminData.registration_date)
            identification.registrationDate = adminData.registration_date;
          if (adminData.access_road !== undefined)
            physical.accessRoad = adminData.access_road === 'Yes' || adminData.access_road === true;
          if (adminData.parcel_status)
            identification.parcelStatus = this.resolveEnum(
              adminData.parcel_status,
              ParcelStatus,
              current.identification.parcelStatus,
            );
          // GND-derived read-only administrative hierarchy
          identification.gndName = adminData.gnd ?? identification.gndName;
          identification.dsd = adminData.dsd ?? identification.dsd;
          identification.district = adminData.dist ?? identification.district;
          identification.province = adminData.pd ?? identification.province;
          identification.electoralDiv = adminData.eletorate ?? identification.electoralDiv;

          // Merge land overview data (area/perimeter/crs/boundary_type from la_ls_land_unit)
          if (overviewData.area != null) spatial.area = Number(overviewData.area);
          if (overviewData.perimeter != null) spatial.perimeter = Number(overviewData.perimeter);
          if (overviewData.boundary_type)
            spatial.boundaryType = this.resolveEnum(
              overviewData.boundary_type,
              BoundaryType,
              current.spatial.boundaryType,
            );
          if (overviewData.crs) spatial.crs = overviewData.crs;
          if (overviewData.dimension_2d_3d) spatial.geometryType = overviewData.dimension_2d_3d;
          if (overviewData.ext_landuse_type)
            identification.landUse = this.resolveEnum(
              overviewData.ext_landuse_type,
              LandUse,
              current.identification.landUse,
            );

          // Merge tax/assessment data
          if (taxData.land_value != null) valuation.landValue = Number(taxData.land_value);
          if (taxData.tax_annual_value != null)
            valuation.annualTax = Number(taxData.tax_annual_value);
          if (taxData.date_of_valuation) valuation.lastAssessmentDate = taxData.date_of_valuation;
          if (taxData.market_value != null) valuation.marketValue = Number(taxData.market_value);
          if (taxData.tax_status) valuation.taxStatus = taxData.tax_status;

          // Merge physical/environmental data
          if (physicalData) {
            if (physicalData.elevation != null) physical.elevation = Number(physicalData.elevation);
            if (physicalData.slope != null) physical.slope = Number(physicalData.slope);
            if (physicalData.soil_type) physical.soilType = physicalData.soil_type as SoilType;
            if (physicalData.flood_zone != null)
              physical.floodZone = Boolean(physicalData.flood_zone);
            if (physicalData.vegetation_cover)
              physical.vegetationCover = physicalData.vegetation_cover;
          }

          // Merge utility network data (LA_LS_Utinet_LU_Model)
          if (utilData) {
            if (utilData.water_supply != null) physical.waterSupply = utilData.water_supply || '';
            if (utilData.electricity != null) physical.electricity = utilData.electricity || '';
            if (utilData.drainage_system != null)
              physical.drainageSystem = utilData.drainage_system || '';
            if (utilData.sanitation_gully != null)
              physical.sanitationGully = utilData.sanitation_gully || '';
            if (utilData.garbage_disposal != null)
              physical.garbageDisposal = utilData.garbage_disposal || '';
          }

          // Merge RRR data
          this.fetchedRRRBaUnitIds.clear();
          this.fetchedRRRMap.clear();
          const rrrEntries: RRREntry[] = [];
          const records = rrrData?.records || [];
          for (const record of records) {
            this.fetchedRRRBaUnitIds.add(record.ba_unit_id);
            // Map admin_sources → RRRDocument[] so uploaded docs appear in the panel
            const docs = (record.admin_sources || []).map((src: any) => ({
              name: src.admin_source_type || 'Document',
              type: 'application/pdf',
              size: 0,
              fileUrl: src.file_url,
              adminSourceId: src.admin_source_id,
            }));
            for (const rrr of record.rrrs || []) {
              const entryId = `BU-${record.ba_unit_id}`;
              if (rrr.rrr_id) this.fetchedRRRMap.set(entryId, rrr.rrr_id);
              rrrEntries.push({
                rrrId: entryId,
                type: (rrr.share_type as RightType) || RightType.OWN_FREE,
                holder: rrr.party_name || '',
                holderId: String(rrr.pid),
                holderType: undefined,
                share: rrr.share,
                validFrom: rrr.time_begin || '',
                validTo: rrr.time_end || '',
                documentRef: record.sl_ba_unit_name || '',
                documents: docs,
                restrictions: [],
                responsibilities: [],
              });
            }
          }

          // Merge zoning data
          const zoning = { ...current.zoning };
          if (zoningData) {
            if (zoningData.zoning_category)
              zoning.zoningCategory = zoningData.zoning_category as ZoningCategory;
            if (zoningData.max_building_height != null)
              zoning.maxBuildingHeight = Number(zoningData.max_building_height);
            if (zoningData.max_coverage != null)
              zoning.maxCoverage = Number(zoningData.max_coverage);
            if (zoningData.max_far != null) zoning.maxFAR = Number(zoningData.max_far);
            if (zoningData.setback_front != null)
              zoning.setbackFront = Number(zoningData.setback_front);
            if (zoningData.setback_rear != null)
              zoning.setbackRear = Number(zoningData.setback_rear);
            if (zoningData.setback_side != null)
              zoning.setbackSide = Number(zoningData.setback_side);
            if (zoningData.special_overlay) zoning.specialOverlay = zoningData.special_overlay;
          }

          // Merge metadata (la_spatial_source)
          const metadata = { ...current.metadata };
          if (metaData) {
            if (metaData.spatial_source_type) metadata.surveyMethod = metaData.spatial_source_type as SurveyMethod;
            if (metaData.source_id) metadata.sourceDocument = metaData.source_id;
            if (metaData.surveyor_name) metadata.responsibleParty = metaData.surveyor_name;
            if (metaData.date_accept) metadata.lastUpdated = metaData.date_accept;
            if (metaData.description) metadata.accuracyLevel = metaData.description as AccuracyLevel;
          }

          this.currentLandParcelInfo.set({
            ...current,
            identification,
            physical,
            spatial,
            valuation,
            rrr: { entries: rrrEntries },
            zoning,
            metadata,
          });

          // Second phase: fetch restrictions & responsibilities per RRR entry
          const rrr_ids = Array.from(this.fetchedRRRMap.entries()); // [entryId, rrr_id][]
          if (rrr_ids.length > 0) {
            const restrictionReqs = rrr_ids.map(([, rid]) =>
              this.apiService.getRRRRestrictions(rid).pipe(catchError(() => of([]))),
            );
            const responsibilityReqs = rrr_ids.map(([, rid]) =>
              this.apiService.getRRRResponsibilities(rid).pipe(catchError(() => of([]))),
            );
            forkJoin([...restrictionReqs, ...responsibilityReqs])
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe((results: any[]) => {
                const half = rrr_ids.length;
                const updatedEntries = [...rrrEntries];
                rrr_ids.forEach(([entryId], idx) => {
                  const entry = updatedEntries.find((e) => e.rrrId === entryId);
                  if (!entry) return;
                  entry.restrictions = (results[idx] as any[]).map((r: any) => ({
                    type: r.rrr_restriction_type as RestrictionType,
                    description: r.description || '',
                    validFrom: r.time_begin || '',
                    validTo: r.time_end || '',
                  }));
                  entry.responsibilities = (results[half + idx] as any[]).map((r: any) => ({
                    type: r.rrr_responsibility_type as ResponsibilityType,
                    description: r.description || '',
                    validFrom: r.time_begin || '',
                    validTo: r.time_end || '',
                  }));
                });
                const current2 = this.currentLandParcelInfo();
                if (current2) {
                  this.currentLandParcelInfo.set({
                    ...current2,
                    rrr: { entries: updatedEntries },
                  });
                }
              });
          }
        },
      );
  }

  private fetchAndMergeBuildingData(su_id: string | number): void {
    forkJoin([
      this.apiService.getBuildingAdministrativeInfo(su_id).pipe(catchError(() => of({}))),
      this.apiService.getltAssesAndTaxInfo(su_id).pipe(catchError(() => of({}))),
      this.apiService.getRRRData(su_id).pipe(catchError(() => of(null))),
      this.apiService.getBuildingOverViewInfo(su_id).pipe(catchError(() => of({}))),
      this.apiService.getBuildItInfo(su_id).pipe(catchError(() => of({}))),
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        ([adminData, taxData, rrrData, overviewData, utilData]: [any, any, any, any, any]) => {
          const current = this.currentBuildingInfo();
          if (!current) return;

          const summary = { ...current.summary };
          const physicalAttributes = { ...current.physicalAttributes };
          const taxValuation = {
            ...(current.taxValuation ?? {
              assessedValue: 0,
              marketValue: 0,
              annualTax: 0,
              lastAssessmentDate: '',
              taxStatus: 'pending' as const,
            }),
          };

          // Merge admin data
          if (adminData.building_name) summary.address = adminData.building_name;
          if (adminData.registration_date) summary.registrationDate = adminData.registration_date;
          if (adminData.no_floors != null) summary.floorCount = Number(adminData.no_floors);
          if (adminData.postal_ad_build) summary.postalAddress = adminData.postal_ad_build;
          if (adminData.house_hold_no) summary.householdNo = adminData.house_hold_no;
          if (adminData.bld_property_type) summary.propertyType = adminData.bld_property_type;
          if (adminData.access_road !== undefined)
            summary.accessRoad = adminData.access_road === 'Yes' || adminData.access_road === true;
          if (adminData.construction_year != null)
            physicalAttributes.constructionYear = Number(adminData.construction_year);
          if (adminData.structure_type)
            physicalAttributes.structureType = adminData.structure_type as StructureType;
          if (adminData.condition) physicalAttributes.condition = adminData.condition as Condition;
          if (adminData.wall_type) physicalAttributes.wallType = adminData.wall_type;

          // Merge overview data (roof type, gross area)
          if (overviewData.roof_type)
            physicalAttributes.roofType = overviewData.roof_type as RoofType;
          if (overviewData.area != null) physicalAttributes.grossArea = Number(overviewData.area);

          // Merge tax/assessment data
          if (taxData.assessment_annual_value != null)
            taxValuation.assessedValue = Number(taxData.assessment_annual_value);
          if (taxData.tax_annual_value != null)
            taxValuation.annualTax = Number(taxData.tax_annual_value);
          if (taxData.date_of_valuation)
            taxValuation.lastAssessmentDate = taxData.date_of_valuation;
          if (taxData.market_value != null) taxValuation.marketValue = Number(taxData.market_value);
          if (taxData.tax_status) taxValuation.taxStatus = taxData.tax_status;

          // Merge RRR data
          this.fetchedRRRBaUnitIds.clear();
          this.fetchedRRRMap.clear();
          const rrrEntries: RRREntry[] = [];
          const records = rrrData?.records || [];
          for (const record of records) {
            this.fetchedRRRBaUnitIds.add(record.ba_unit_id);
            // Map admin_sources → RRRDocument[] so uploaded docs appear in the panel
            const docs = (record.admin_sources || []).map((src: any) => ({
              name: src.admin_source_type || 'Document',
              type: 'application/pdf',
              size: 0,
              fileUrl: src.file_url,
              adminSourceId: src.admin_source_id,
            }));
            for (const rrr of record.rrrs || []) {
              const entryId = `BU-${record.ba_unit_id}`;
              if (rrr.rrr_id) this.fetchedRRRMap.set(entryId, rrr.rrr_id);
              rrrEntries.push({
                rrrId: entryId,
                type: (rrr.share_type as RightType) || RightType.OWN_FREE,
                holder: rrr.party_name || '',
                holderId: String(rrr.pid),
                holderType: undefined,
                share: rrr.share,
                validFrom: rrr.time_begin || '',
                validTo: rrr.time_end || '',
                documentRef: record.sl_ba_unit_name || '',
                documents: docs,
                restrictions: [],
                responsibilities: [],
              });
            }
          }

          // Merge building utility data (LA_LS_Utinet_BU_Model)
          const utilities: UtilityInfo = {
            electricity: utilData?.elec || '',
            telephone: utilData?.tele || '',
            internet: utilData?.internet || '',
            waterDrink: utilData?.water_drink || '',
            water: utilData?.water || '',
            drainage: utilData?.drainage || '',
            sanitationSewer: utilData?.sani_sewer || '',
            sanitationGully: utilData?.sani_gully || '',
            garbageDisposal: utilData?.garbage_dispose || '',
          };

          this.currentBuildingInfo.set({
            ...current,
            summary,
            physicalAttributes,
            taxValuation,
            utilities,
            rrr: { entries: rrrEntries },
          });

          // Second phase: fetch restrictions & responsibilities per RRR entry
          const rrr_ids = Array.from(this.fetchedRRRMap.entries());
          if (rrr_ids.length > 0) {
            const restrictionReqs = rrr_ids.map(([, rid]) =>
              this.apiService.getRRRRestrictions(rid).pipe(catchError(() => of([]))),
            );
            const responsibilityReqs = rrr_ids.map(([, rid]) =>
              this.apiService.getRRRResponsibilities(rid).pipe(catchError(() => of([]))),
            );
            forkJoin([...restrictionReqs, ...responsibilityReqs])
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe((results: any[]) => {
                const half = rrr_ids.length;
                const updatedEntries = [...rrrEntries];
                rrr_ids.forEach(([entryId], idx) => {
                  const entry = updatedEntries.find((e) => e.rrrId === entryId);
                  if (!entry) return;
                  entry.restrictions = (results[idx] as any[]).map((r: any) => ({
                    type: r.rrr_restriction_type as RestrictionType,
                    description: r.description || '',
                    validFrom: r.time_begin || '',
                    validTo: r.time_end || '',
                  }));
                  entry.responsibilities = (results[half + idx] as any[]).map((r: any) => ({
                    type: r.rrr_responsibility_type as ResponsibilityType,
                    description: r.description || '',
                    validFrom: r.time_begin || '',
                    validTo: r.time_end || '',
                  }));
                });
                const current2 = this.currentBuildingInfo();
                if (current2) {
                  this.currentBuildingInfo.set({
                    ...current2,
                    rrr: { entries: updatedEntries },
                  });
                }
              });
          }
        },
      );
  }

  onSaveBuildingInfo(info: BuildingInfo): void {
    const su_id = this.selected_feature_ID;
    if (!su_id) {
      this.notificationService.showError('No building selected. Please select a building first.');
      return;
    }

    const bldPayload = {
      building_name: info.summary.address,
      no_floors: info.summary.floorCount,
      registration_date: info.summary.registrationDate || null,
      postal_ad_build: info.summary.postalAddress,
      house_hold_no: info.summary.householdNo,
      bld_property_type: info.summary.propertyType,
      access_road: info.summary.accessRoad ? 'Yes' : 'No',
      construction_year: info.physicalAttributes.constructionYear || null,
      structure_type: info.physicalAttributes.structureType,
      condition: info.physicalAttributes.condition,
      wall_type: info.physicalAttributes.wallType,
    };

    const taxPayload = {
      assessment_annual_value: info.taxValuation?.assessedValue,
      tax_annual_value: info.taxValuation?.annualTax,
      date_of_valuation: info.taxValuation?.lastAssessmentDate,
      market_value: info.taxValuation?.marketValue,
      tax_status: info.taxValuation?.taxStatus,
    };

    const overviewPayload = {
      roof_type: info.physicalAttributes.roofType || null,
      area: info.physicalAttributes.grossArea || null,
    };

    forkJoin([
      this.apiService.updateBuildingAdministrativeInfo(su_id, bldPayload, 'building'),
      this.apiService.updateTaxAndAssessmentInfo(su_id, taxPayload, 'building'),
      this.apiService.updateBuildOverviewInfo(su_id, overviewPayload, 'building'),
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Building details saved successfully.');
        },
        error: (err) => {
          console.error('Save building error:', err);
          console.error('Backend response:', err.error);
          this.notificationService.showError('Failed to save building details. Please try again.');
        },
      });

    // Building utility save: fire-and-forget
    if (info.utilities) {
      const bldUtilPayload = {
        elec: info.utilities.electricity,
        tele: info.utilities.telephone,
        internet: info.utilities.internet,
        water_drink: info.utilities.waterDrink,
        water: info.utilities.water,
        drainage: info.utilities.drainage,
        sani_sewer: info.utilities.sanitationSewer,
        sani_gully: info.utilities.sanitationGully,
        garbage_dispose: info.utilities.garbageDisposal,
      };
      this.apiService
        .updateBuildingITUtilInfo(su_id, bldUtilPayload, 'building')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
    }

    // RRR sync: fire-and-forget
    const currentEntries = info.rrr.entries;

    // Delete removed entries
    const currentBaUnitIds = new Set(
      currentEntries
        .filter((e) => e.rrrId.startsWith('BU-'))
        .map((e) => Number(e.rrrId.replace('BU-', ''))),
    );
    for (const baUnitId of this.fetchedRRRBaUnitIds) {
      if (!currentBaUnitIds.has(baUnitId)) {
        this.apiService.deleteRrr(String(baUnitId)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
      }
    }

    // Save new entries (identified by rrrId starting with 'BRRR-')
    const newEntries = currentEntries.filter((e) => e.rrrId.startsWith('BRRR-') && e.holderId);
    for (const entry of newEntries) {
      const fd = new FormData();
      fd.append('su_id', String(su_id));
      fd.append('sl_ba_unit_name', entry.holder);
      fd.append('sl_ba_unit_type', 'OWNERSHIP');
      fd.append('admin_source_type', entry.documentRef || 'Title Deed');
      // Attach the first locally uploaded file (if any); backend supports one file per BA unit
      const localFile = entry.documents?.find((d) => d.file)?.file;
      if (localFile) fd.append('file', localFile);
      fd.append(
        'parties',
        JSON.stringify([
          {
            pid: entry.holderId,
            share_type: entry.type,
            share: entry.share,
            party_role_type: entry.holderType || 'Owner',
            rrr_type: 'RIGHT',
            time_begin: entry.validFrom || null,
            time_end: entry.validTo || null,
            description: '',
          },
        ]),
      );
      this.apiService
        .postAdminSource(fd)
        .pipe(
          switchMap((res: any) => {
            const rrr_id = res?.created_rrr_ids?.[0];
            if (rrr_id) this.syncRRRSubRecords(rrr_id, entry);
            return of(null);
          }),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe();
    }

    // Sync restrictions, responsibilities, and new document uploads for existing RRR entries
    for (const entry of currentEntries.filter((e) => e.rrrId.startsWith('BU-'))) {
      const rrr_id = this.fetchedRRRMap.get(entry.rrrId);
      if (!rrr_id) continue;
      this.syncRRRSubRecords(rrr_id, entry);

      // If a new local file was uploaded, PATCH the existing admin source
      const newLocalFile = entry.documents?.find((d) => d.file)?.file;
      if (newLocalFile) {
        const existingAdminSourceId = entry.documents?.find((d) => d.adminSourceId)?.adminSourceId;
        if (existingAdminSourceId) {
          const fd = new FormData();
          fd.append('file', newLocalFile);
          this.apiService
            .patchAdminSource(existingAdminSourceId, fd)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
        }
      }
    }
  }

  onSaveLandParcel(info: LandParcelInfo): void {
    const su_id = this.selected_feature_ID;
    if (!su_id) {
      this.notificationService.showError('No parcel selected. Please select a parcel first.');
      return;
    }

    // access_road is a CharField on the backend — must be a string, not boolean
    const adminPayload = {
      local_auth: info.identification.localAuthority,
      sl_land_type: info.identification.parcelType,
      land_name: info.identification.cadastralRef,
      access_road: info.physical.accessRoad ? 'Yes' : 'No',
      registration_date: info.identification.registrationDate || null,
      parcel_status: info.identification.parcelStatus,
    };
    console.log('[Save] adminPayload being sent:', adminPayload);

    const overviewPayload = {
      area: info.spatial.area,
      perimeter: info.spatial.perimeter,
      ext_landuse_type: info.identification.landUse,
      reference_coordinate: `${info.spatial.centroidLon},${info.spatial.centroidLat}`,
      dimension_2d_3d: info.spatial.geometryType?.includes('3') ? '3D' : '2D',
      boundary_type: info.spatial.boundaryType,
      crs: info.spatial.crs,
    };

    const taxPayload = {
      land_value: info.valuation.landValue,
      tax_annual_value: info.valuation.annualTax,
      date_of_valuation: info.valuation.lastAssessmentDate,
      market_value: info.valuation.marketValue,
      tax_status: info.valuation.taxStatus,
    };

    const physicalEnvPayload = {
      elevation: info.physical.elevation,
      slope: info.physical.slope,
      soil_type: info.physical.soilType,
      flood_zone: info.physical.floodZone,
      vegetation_cover: info.physical.vegetationCover,
    };

    const zoningPayload = {
      zoning_category: info.zoning.zoningCategory,
      max_building_height: info.zoning.maxBuildingHeight,
      max_coverage: info.zoning.maxCoverage,
      max_far: info.zoning.maxFAR,
      setback_front: info.zoning.setbackFront,
      setback_rear: info.zoning.setbackRear,
      setback_side: info.zoning.setbackSide,
      special_overlay: info.zoning.specialOverlay,
    };

    forkJoin([
      this.apiService.updateAdministrativeInfo(su_id, adminPayload, 'land').pipe(catchError((e) => { console.error('[Save] admin info error:', e); return of(null); })),
      this.apiService.updateLandOverviewInfo(su_id, overviewPayload, 'land').pipe(catchError((e) => { console.error('[Save] overview error:', e); return of(null); })),
      this.apiService.updateTaxAndAssessmentInfo(su_id, taxPayload, 'land').pipe(catchError((e) => { console.error('[Save] tax error:', e); return of(null); })),
      this.apiService.updateZoningInfo(su_id, zoningPayload).pipe(catchError((e) => { console.error('[Save] zoning error:', e); return of(null); })),
      this.apiService.updatePhysicalEnvInfo(su_id, physicalEnvPayload).pipe(catchError((e) => { console.error('[Save] physical error:', e); return of(null); })),
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Parcel details saved successfully.');
        },
        error: (err) => {
          console.error('Save parcel error:', err);
          // Log the backend's validation error detail for easier debugging
          console.error('Backend response:', err.error);
          this.notificationService.showError('Failed to save parcel details. Please try again.');
        },
      });

    // Utility network save: fire-and-forget
    const utilPayload = {
      water_supply: info.physical.waterSupply,
      electricity: info.physical.electricity,
      drainage_system: info.physical.drainageSystem,
      sanitation_gully: info.physical.sanitationGully,
      garbage_disposal: info.physical.garbageDisposal,
    };
    this.apiService
      .updateITUtilInfo(su_id, utilPayload, 'land')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();

    // Metadata save: fire-and-forget (la_spatial_source)
    const metadataPayload = {
      spatial_source_type: info.metadata.surveyMethod,
      source_id: info.metadata.sourceDocument,
      description: info.metadata.accuracyLevel,
      date_accept: info.metadata.lastUpdated?.split('T')[0] || null,
      surveyor_name: info.metadata.responsibleParty,
    };
    this.apiService
      .updateLandMetadata(su_id, metadataPayload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();

    // RRR sync: fire-and-forget (independent of the main forkJoin)
    const currentEntries = info.rrr.entries;

    // Delete removed entries (those fetched from backend but no longer in the list)
    const currentBaUnitIds = new Set(
      currentEntries
        .filter((e) => e.rrrId.startsWith('BU-'))
        .map((e) => Number(e.rrrId.replace('BU-', ''))),
    );
    for (const baUnitId of this.fetchedRRRBaUnitIds) {
      if (!currentBaUnitIds.has(baUnitId)) {
        this.apiService.deleteRrr(String(baUnitId)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
      }
    }

    // Save new entries (those added client-side, identified by rrrId starting with 'LRRR-')
    const newEntries = currentEntries.filter((e) => e.rrrId.startsWith('LRRR-') && e.holderId);
    for (const entry of newEntries) {
      const fd = new FormData();
      fd.append('su_id', String(su_id));
      fd.append('sl_ba_unit_name', entry.holder);
      fd.append('sl_ba_unit_type', 'OWNERSHIP');
      fd.append('admin_source_type', entry.documentRef || 'Title Deed');
      // Attach the first locally uploaded file (if any); backend supports one file per BA unit
      const localFile = entry.documents?.find((d) => d.file)?.file;
      if (localFile) fd.append('file', localFile);
      fd.append(
        'parties',
        JSON.stringify([
          {
            pid: entry.holderId,
            share_type: entry.type,
            share: entry.share,
            party_role_type: entry.holderType || 'Owner',
            rrr_type: 'RIGHT',
            time_begin: entry.validFrom || null,
            time_end: entry.validTo || null,
            description: '',
          },
        ]),
      );
      this.apiService
        .postAdminSource(fd)
        .pipe(
          switchMap((res: any) => {
            const rrr_id = res?.created_rrr_ids?.[0];
            if (rrr_id) this.syncRRRSubRecords(rrr_id, entry);
            return of(null);
          }),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe();
    }

    // Sync restrictions, responsibilities, and new document uploads for existing RRR entries
    for (const entry of currentEntries.filter((e) => e.rrrId.startsWith('BU-'))) {
      const rrr_id = this.fetchedRRRMap.get(entry.rrrId);
      if (!rrr_id) continue;
      this.syncRRRSubRecords(rrr_id, entry);

      // If a new local file was uploaded, PATCH the existing admin source
      const newLocalFile = entry.documents?.find((d) => d.file)?.file;
      if (newLocalFile) {
        const existingAdminSourceId = entry.documents?.find((d) => d.adminSourceId)?.adminSourceId;
        if (existingAdminSourceId) {
          const fd = new FormData();
          fd.append('file', newLocalFile);
          this.apiService
            .patchAdminSource(existingAdminSourceId, fd)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
        }
      }
    }
  }

  // ─── RRR Sub-record Sync Helper ────────────────────────
  private syncRRRSubRecords(rrr_id: number, entry: RRREntry): void {
    this.apiService
      .getRRRRestrictions(rrr_id)
      .pipe(
        switchMap((existing: any) => {
          const delObs = (existing as any[]).map((r: any) =>
            this.apiService.deleteRRRRestriction(rrr_id, r.id).pipe(catchError(() => of(null))),
          );
          return delObs.length > 0 ? forkJoin(delObs) : of([]);
        }),
        switchMap(() => {
          const createObs = entry.restrictions.map((r) =>
            this.apiService
              .postRRRRestriction(rrr_id, {
                rrr_restriction_type: r.type,
                description: r.description,
                time_begin: r.validFrom || null,
                time_end: r.validTo || null,
              })
              .pipe(catchError(() => of(null))),
          );
          return createObs.length > 0 ? forkJoin(createObs) : of([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.apiService
      .getRRRResponsibilities(rrr_id)
      .pipe(
        switchMap((existing: any) => {
          const delObs = (existing as any[]).map((r: any) =>
            this.apiService
              .deleteRRRResponsibility(rrr_id, r.id)
              .pipe(catchError(() => of(null))),
          );
          return delObs.length > 0 ? forkJoin(delObs) : of([]);
        }),
        switchMap(() => {
          const createObs = entry.responsibilities.map((r) =>
            this.apiService
              .postRRRResponsibility(rrr_id, {
                rrr_responsibility_type: r.type,
                description: r.description,
                time_begin: r.validFrom || null,
                time_end: r.validTo || null,
              })
              .pipe(catchError(() => of(null))),
          );
          return createObs.length > 0 ? forkJoin(createObs) : of([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  // ─── Building Panel Change Handlers ────────────────────
  onBuildingRRRChanged(rrr: RRRInfo): void {
    const current = this.currentBuildingInfo();
    if (!current) return;
    this.currentBuildingInfo.set({ ...current, rrr });
  }

  onBuildingSummaryChanged(summary: BuildingSummary): void {
    const current = this.currentBuildingInfo();
    if (!current) return;
    this.currentBuildingInfo.set({ ...current, summary });
  }

  onBuildingUnitsChanged(units: BuildingUnit[]): void {
    const current = this.currentBuildingInfo();
    if (!current) return;
    this.currentBuildingInfo.set({ ...current, units });
  }

  onBuildingSpatialChanged(spatial: SpatialInfo): void {
    const current = this.currentBuildingInfo();
    if (!current) return;
    this.currentBuildingInfo.set({ ...current, spatial });
  }

  onBuildingPhysicalChanged(physicalAttributes: PhysicalAttributes): void {
    const current = this.currentBuildingInfo();
    if (!current) return;
    this.currentBuildingInfo.set({ ...current, physicalAttributes });
  }

  onBuildingUtilitiesChanged(utilities: UtilityInfo): void {
    const current = this.currentBuildingInfo();
    if (!current) return;
    this.currentBuildingInfo.set({ ...current, utilities });
  }

  onBuildingRelationshipsChanged(relationshipsTopology: RelationshipsTopology): void {
    const current = this.currentBuildingInfo();
    if (!current) return;
    this.currentBuildingInfo.set({ ...current, relationshipsTopology });
  }

  onBuildingMetadataChanged(metadataQuality: MetadataQuality): void {
    const current = this.currentBuildingInfo();
    if (!current) return;
    this.currentBuildingInfo.set({ ...current, metadataQuality });
  }

  openGenerateReport(): void {
    const tab = this.activeSidebarTab();
    const data: GenerateReportData = {
      type: tab === 'building' ? 'building' : 'land',
      parcel: this.currentLandParcelInfo(),
      building: this.currentBuildingInfo(),
      featureId: this.selected_feature_ID,
      layerId: this.selected_layer_ID ?? null,
    };
    this.dialog.open(GenerateReportComponent, {
      data,
      width: '480px',
      panelClass: 'gr-launcher-panel',
    });
  }

}
