import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  Input,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild, inject, DestroyRef} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import {Subscription } from 'rxjs';
import {finalize } from 'rxjs/operators';
import { APIsService } from '../../../services/api.service';
import { DrawService } from '../../../services/draw.service';
import { MapService } from '../../../services/map.service';
import { NotificationService } from '../../../services/notifications.service';
import { UserService } from '../../../services/user.service';
import { FeatureNotAvailableComponent } from '../../dialogs/feature-not-available/feature-not-available.component';
import { RrrPanalComponent } from '../../dialogs/rrr-panal/rrr-panal.component';
import { ThreeDBuildingViewerComponent } from '../../dialogs/three-d-building-viewer/three-d-building-viewer.component';
import { PanelImgComponent } from '../../shared/panel-img/panel-img.component';
import { LoaderComponent } from '../loader/loader.component';

@Component({
  selector: 'app-building-tab',
  standalone: true,
  templateUrl: './building-tab.component.html',
  styleUrl: './building-tab.component.css',
  imports: [ReactiveFormsModule, FormsModule, CommonModule, LoaderComponent, MatTooltipModule],
})
export class BuildingTabComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  @Input({ required: true }) selected_feature_ID: string | number | null | undefined;
  private featureSub?: Subscription;
  @ViewChild(PanelImgComponent) panelImgComponent!: PanelImgComponent;
  // ---------------------- temp variables -----------------
  selected_imag_file: File | null = null;
  parsal_image: string | null = null;
  is_loading_toast = true;
  user_id: any;
  // selected_feature_ID: any;
  anual_fee_of_assement: any;
  anual_fee_of_tax: any;
  // land tab card inputs
  adminInfo: any = {
    sl_ba_unit_type: '',
    pd: '',
    dist: '',
    gnd_id: '',
    gnd: '',
    access_road: '',
    sl_ba_unit_name: '',
    postal_ad_lnd: '',
    local_auth: '',
    eletorate: '',
    remark: '',
    ass_div: '',
    no_floors: '',
    house_hold_no: '',
    bld_property_type: '',
    ba_unit_id: '',
    status: '',
    su_id: '',
    dsd: '',
    postal_ad_build: '',
    administrative_type: '',
    building_name: '',
  };

  landInfo: any = {
    dimension_2d_3d: '',
    area: '',
    hight: '',
    surface_relation: '',
    reference_coordinate: '',
    ext_builduse_type: '',
    roof_type: '',
    ext_builduse_sub_type: '',
    wall_type: '',
  };

  lt_util_Info: any = {
    elec: '',
    water: '',
    water_drink: '',
    tele: '',
    internet: '',
    sani_sewer: '',
    sani_gully: '',
    garbage_dispose: '',
    expired_date: '',
    issued_date: '',
    drainage_system: '',
  };

  lt_asses_and_tax: any = {
    assessment_annual_value: '',
    assessment_no: '',
    assessment_percentage: '',
    date_of_valuation: '',
    outstanding_balance: 0,
    property_type: '',
    tax_date: '',
    tax_annual_value: '',
    tax_type: '',
    tax_percentage: '',
    year_of_assessment: '',
    assessment_name: '',
  };
  land_tenure: any = {
    right_type: '',
    share: '',
    time_spec: '',
    sl_party_type: '',
    la_party_type: '',
    party_name: '',
    ext_pid_type: '',
    ext_pid: '',
    tp: '',
    pmt_address: '',
    file: '',
    reference_no: '',
  };

  residents_infromation: any = {
    name: '',
    ext_pid_type: '',
    ext_pid: '',
    tp: '',
    pmt_address: '',
    file: '',
    reference_no: '',
  };

  // ------------ load data from backend ----------------

  water_supplyOptions: any = [];
  building_categories_array: any = [];
  building_sub_categories_array: any = [];
  GND_array: any = [];
  wall_type_array: any = [];
  roof_type_array: any = [];
  gullyOptions: any = [];
  administrative_types_array: any = [];
  admin_permisions_array: any = [];
  summary_permission_array: any = [];
  building_tenure_permisions_array: any = [];
  utility_permisions_array: any = [];
  building_over_view_permisions_array: any = [];
  taxandassessment_array: any = [];
  taxinformation_array: any = [];
  residential_permisions_array: any = [];

  // ------------ Hard coded dropdown data ----------------

  sanitation_sewerageOptions = ['On surface', 'Above surface', 'Below surface'];
  surface_relation_array = ['Septic Tank', 'Drainage Dispose', 'Garden Dispose'];

  telecomOptions: any = [];
  internet_types_array: any = [];
  telecomunication_types_array: any = [];
  electricityOptions = [
    'National Grid',
    'Solar',
    'National Grid + Solar',
    'Not in use',
    'Other',
    'CEB',
  ];
  drainageOptions = [
    'Concrete or Rubble drain network',
    'Concrete, Rubble or earth  drain network',
    'Earth Drains',
    'No Drains',
    'MC',
  ];
  garbage_supplyOptions = [
    'To MC Truck',
    'To MC Dump',
    'To Home Garden Pit',
    'To Home Garden Dump',
    'Other',
  ];

  administrative_is_collapsed = true;
  residents_infromation_is_collapsed = true;
  tax_and_assessment_is_collapsed = true;
  land_overview_is_collapsed = true;
  utility_information_is_collapsed = true;
  tax_information_is_collapsed = true;
  administrative_sources_is_collapsed = true;
  assessment_is_collapsed = true;
  land_tenure_is_collapsed = true;
  mainCollapsedland_Tenur = true;
  mainCollapsedTaxandAssessment = true;
  ownership_is_collapsed = true;
  documents_is_collapsed = true;

  // fields edit
  public isAdminInfoEditMode = false;
  public isUtilityInfoEditMode = false;
  public isOverviewInfoEditMode = false;
  public isTaxAssesmentInfoEditMode = false;
  public isTaxInfoEditMode = false;


  summaryAdministrativeType: string | null = null;
  summaryPropertyType: string | null = null;
  summaryPostalAdLnd: string | null = null;
  summaryAssessmentNo: string | null = null;
  summaryAssessmentDiv: string | null = null;
  summaryOwner: string | null = null;

  is_loading_summary = false;
  is_loading_toast_admin_info = false;
  is_loading_toast_overview = false;
  is_loading_toast_utility_info = false;
  is_loading_toast_tax_assessment = false;
  is_loading_toast_residential_information = false;

  Ward_array: any = [];

  fileError: string | null = null;

  parcelInfoText = 'This parcel was created by Malaka Sandakal on 23/10/2025.';

  constructor(
    private notificationService: NotificationService,
    private http: HttpClient,
    private mapService: MapService,
    private apiService: APIsService,
    private drawService: DrawService,
    private dialog: MatDialog,
    private userService: UserService,
  ) {}

  ngOnInit(): void {
    this.userService.user$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user: any) => {
      if (user) {
        this.user_id = user.user_id || '';
      }
    });
    // Load all relevant data once when the component is created
    this.loadBuildingCategories();
    this.loadSubCategory();
    this.loadWaterSupply();
    // this.loadSanitationSewerage();
    this.loadgully();
    this.loadRoofTypes();
    this.loadWallType();
    this.loadTelecomTypes();
    this.loadInternetTypes();
    this.GNDListdData();
    this.loadAssessmentWards();
    // this.getCreatedByDetails();
    this.getSummaryPermisions();

    // Subscribe ONCE (per component instance)
    // this.drawService.selectedFeatureInfo$
    //   .pipe(
    //     map(info => info?.featureId),
    //     distinctUntilChanged(),
    //     takeUntilDestroyed(this.destroyRef)
    //   )
    //   .subscribe((featureId) => {
    //     alert('Builing Tab Component Feature ID Changed + activeTab: ' + this.activeTab);
    //     // Only react if this tab is currently active
    //     if (this.activeTab !== 3 || !featureId) return;
    //     this.selected_feature_ID = featureId;
    //     this.getParsalImage();
    //     this.getSummaryDetailsMain();
    //     this.fetchAllOpenedPanelData();
    //   });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selected_feature_ID']) {
      const prevValue = changes['selected_feature_ID'].previousValue;
      const currValue = changes['selected_feature_ID'].currentValue;
      // Only run if value actually changed and not just undefined → undefined
      if (prevValue !== currValue) {
        // Do what you need here!
        console.log('selected_feature_ID changed:', prevValue, '→', currValue);
        this.getParsalImage();
        // this.getCreatedByDetails();
        this.getSummaryDetailsMain();
        this.fetchAllOpenedPanelData();
      }
    }
  }

  ngAfterViewInit() {}

  private fetchAllOpenedPanelData() {
    if (this.administrative_is_collapsed == false) {
      this.getDataOnCollapsibleClick('adminInfo');
    }
    if (this.residents_infromation_is_collapsed == false) {
      this.getDataOnCollapsibleClick('residents_infromation');
    }
    if (this.utility_information_is_collapsed == false) {
      this.getDataOnCollapsibleClick('lt_util_info');
    }
    if (this.land_overview_is_collapsed == false) {
      this.getDataOnCollapsibleClick('land_overview');
    }
    if (this.mainCollapsedland_Tenur == false) {
      this.getDataOnCollapsibleClick('land_tenure');
    }
    if (this.tax_and_assessment_is_collapsed == false) {
      this.getDataOnCollapsibleClick('tax_and_asses_information');
    }
    if (this.administrative_sources_is_collapsed == false) {
      this.getDataOnCollapsibleClick('administrative_sources');
    }
  }

  loadAssessmentWards() {
    this.apiService.getAssessWardList().subscribe((res) => {
      this.Ward_array = res;
    });
  }

  async getCreatedByDetails() {
    if (this.selected_feature_ID) {
      this.apiService
        .getCreatedByDetails(this.selected_feature_ID)
        .pipe(finalize(() => {}))
        .subscribe({
          next: (res) => {
            if (res) {
              console.log(res);
            }
          },
          error: (err) => {
            console.log('Get created by details error: ', err);
          },
        });
    } else {
      this.notificationService.showError('Please select a feature');
    }
  }

  async getSummaryDetailsMain() {
    if (this.selected_feature_ID) {
      this.sumaryReset();
      this.is_loading_summary = true;

      this.apiService
        .getBuildingSummaryDetails(this.selected_feature_ID)
        .pipe(
          finalize(() => {
            // This runs after both success or error
            this.is_loading_summary = false;
          }),
        )
        .subscribe({
          next: (res: any) => {
            if (res) {
              // @ts-ignore
              let summaryDetails = res;
              this.summaryAdministrativeType = summaryDetails.administrative_type || null;
              this.summaryPropertyType = summaryDetails.bld_property_type || null;
              this.summaryPostalAdLnd = summaryDetails.postal_ad_lnd || null;
              this.summaryAssessmentNo = summaryDetails.assessment_no || null;
              this.summaryAssessmentDiv = summaryDetails.assessment_div || null;
            }
          },
          error: (err) => {
            // this.notificationService.showError('Failed to load summary details');
            console.log('Get summary details error: ', err);
          },
        });
    } else {
      this.notificationService.showError('Please select a feature');
    }
  }

  sumaryReset() {
    this.summaryPropertyType = null;
    this.summaryPostalAdLnd = null;
    this.summaryAssessmentNo = null;
    this.summaryAssessmentDiv = null;
  }

  getSummaryPermisions() {
    this.apiService.getBuildingSummaryPermission().subscribe((res) => {
      console.log(res);
      this.summary_permission_array = res;
      this.summary_permission_array = this.summary_permission_array.reduce(
        (acc: { [x: string]: any }, perm: { permission_id: string | number }) => {
          acc[perm.permission_id] = perm;
          return acc;
        },
        {},
      );
    });
  }

  canSummaryView(permissionId: number): boolean {
    return this.summary_permission_array[permissionId]?.view ?? false;
  }

  // GET ADMIN PERMISIONS
  getAdminPermisions() {
    this.apiService.getBuildingTabAdminPermisions().subscribe((res) => {
      console.log(res);
      this.admin_permisions_array = res;
      this.admin_permisions_array = this.admin_permisions_array.reduce(
        (acc: { [x: string]: any }, perm: { permission_id: string | number }) => {
          acc[perm.permission_id] = perm;
          return acc;
        },
        {},
      );
    });
  }

  // CAN VIEW ADMIN INPUTS
  canViewAdmin(permissionId: number): boolean {
    return this.admin_permisions_array[permissionId]?.view ?? false;
  }

  // Check if field should be editable
  canEditAdmin(permissionId: number): boolean {
    return this.admin_permisions_array[permissionId]?.edit ?? false;
  }

  getResidentialPermisions() {
    this.apiService.getResidentialPermisions().subscribe((res) => {
      console.log(res);
      this.residential_permisions_array = res;
      this.residential_permisions_array = this.residential_permisions_array.reduce(
        (acc: { [x: string]: any }, perm: { permission_id: string | number }) => {
          acc[perm.permission_id] = perm;
          return acc;
        },
        {},
      );
    });
  }

  // CAN VIEW ADMIN INPUTS
  canViewResidentialPermisions(permissionId: number): boolean {
    return this.residential_permisions_array[permissionId]?.view ?? false;
  }

  // Check if field should be editable
  canEditResidentialPermisions(permissionId: number): boolean {
    return this.residential_permisions_array[permissionId]?.edit ?? false;
  }

  GNDListdData() {
    this.apiService.GNDListdData().subscribe((res) => {
      console.log(res);
      this.GND_array = res;
    });
  }

  // GET LAND TENURE PERMISIONS

  getBuldingTenurePermisions() {
    this.apiService.getBuldingTenurePermisions().subscribe((res) => {
      this.building_tenure_permisions_array = res;
      this.building_tenure_permisions_array = this.building_tenure_permisions_array.reduce(
        (acc: { [x: string]: any }, perm: { permission_id: string | number }) => {
          acc[perm.permission_id] = perm;
          return acc;
        },
        {},
      );
    });
  }

  canViewLandTnure(permissionId: number): boolean {
    return this.building_tenure_permisions_array[permissionId]?.view ?? false;
  }

  // Check if field should be editable
  canEditTnure(permissionId: number): boolean {
    return this.building_tenure_permisions_array[permissionId]?.edit ?? false;
  }

  // GET LAND OVER VIEW PERMISIONS

  getLandOverViewPermisions() {
    this.apiService.getBuildingOverViewPermisions().subscribe((res) => {
      console.log(res);
      this.building_over_view_permisions_array = res;
      this.building_over_view_permisions_array = this.building_over_view_permisions_array.reduce(
        (acc: { [x: string]: any }, perm: { permission_id: string | number }) => {
          acc[perm.permission_id] = perm;
          return acc;
        },
        {},
      );
    });
  }

  canViewBuildingOverview(permissionId: number): boolean {
    return this.building_over_view_permisions_array[permissionId]?.view ?? false;
  }

  canEditBuildingOverview(permissionId: number): boolean {
    return this.building_over_view_permisions_array[permissionId]?.edit ?? false;
  }

  // GET UTILITY PERMISIONS

  getUtilityPermisions() {
    this.apiService.getBuildingTabUtilityPermisions().subscribe((res) => {
      this.utility_permisions_array = res;
      this.utility_permisions_array = this.utility_permisions_array.reduce(
        (acc: { [x: string]: any }, perm: { permission_id: string | number }) => {
          acc[perm.permission_id] = perm;
          return acc;
        },
        {},
      );
    });
  }

  canViewUtility(permissionId: number): boolean {
    return this.utility_permisions_array[permissionId]?.view ?? false;
  }

  canEditUtility(permissionId: number): boolean {
    return this.utility_permisions_array[permissionId]?.edit ?? false;
  }

  // GET TAX AND ASSESSMENT PERMISIONS

  getTaxandAssessmentPermisions() {
    this.apiService.getBuildingTaxandAssessPermisions().subscribe((res) => {
      this.taxandassessment_array = res;
      this.taxandassessment_array = this.taxandassessment_array.reduce(
        (acc: { [x: string]: any }, perm: { permission_id: string | number }) => {
          acc[perm.permission_id] = perm;
          return acc;
        },
        {},
      );
    });
  }

  canViewTaxandAsses(permissionId: number): boolean {
    return this.taxandassessment_array[permissionId]?.view ?? false;
  }

  canEditTaxandAsses(permissionId: number): boolean {
    return this.taxandassessment_array[permissionId]?.edit ?? false;
  }

  getTaxInformationPermisions() {
    this.apiService.getBuildingTaxInfoPermisions().subscribe((res) => {
      this.taxinformation_array = res;
      this.taxinformation_array = this.taxinformation_array.reduce(
        (acc: { [x: string]: any }, perm: { permission_id: string | number }) => {
          acc[perm.permission_id] = perm;
          return acc;
        },
        {},
      );
    });
  }

  canViewTaxInformation(permissionId: number): boolean {
    return this.taxinformation_array[permissionId]?.view ?? false;
  }

  canEditTaxInformation(permissionId: number): boolean {
    return this.taxinformation_array[permissionId]?.edit ?? false;
  }

  toggleCollapse(type: any) {
    if (type == 'residents_infromation_is_collapsed') {
      this.residents_infromation_is_collapsed = !this.residents_infromation_is_collapsed;
      if (this.residents_infromation_is_collapsed == false) {
        this.getResidentialPermisions();
        this.getDataOnCollapsibleClick('residents_infromation');
      }
    }
    if (type == 'administrative_is_collapsed') {
      this.administrative_is_collapsed = !this.administrative_is_collapsed;
      if (this.administrative_is_collapsed == false) {
        this.getAdminPermisions();
        this.getDataOnCollapsibleClick('adminInfo');
      }
    }

    if (type == 'utility_information_is_collapsed') {
      this.utility_information_is_collapsed = !this.utility_information_is_collapsed;
      if (this.utility_information_is_collapsed == false) {
        this.getUtilityPermisions();
        console.log('opn');
        this.getDataOnCollapsibleClick('lt_util_info');
      }
    }

    if (type == 'administrative_sources_is_collapsed') {
      this.administrative_sources_is_collapsed = !this.administrative_sources_is_collapsed;
      if (this.administrative_sources_is_collapsed == false) {
        this.getDataOnCollapsibleClick('administrative_sources');
      }
    }

    if (type == 'land_overview_is_collapsed') {
      this.land_overview_is_collapsed = !this.land_overview_is_collapsed;
      if (this.land_overview_is_collapsed == false) {
        this.getLandOverViewPermisions();
        this.getDataOnCollapsibleClick('land_overview');
      }
    }
    if (type == 'main_collapsedland_tenur') {
      this.mainCollapsedland_Tenur = !this.mainCollapsedland_Tenur;
      if (this.mainCollapsedland_Tenur == false) {
        this.getBuldingTenurePermisions();
        this.getDataOnCollapsibleClick('land_tenure');
      }
    }
    if (type == 'land_tenure_is_collapsed') {
      this.land_tenure_is_collapsed = !this.land_tenure_is_collapsed;
      if (this.land_tenure_is_collapsed == false) {
      }
    }

    if (type == 'tax_and_assessment_is_collapsed') {
      this.tax_and_assessment_is_collapsed = !this.tax_and_assessment_is_collapsed;
      if (this.tax_and_assessment_is_collapsed == false) {
        this.getTaxandAssessmentPermisions();
        this.getDataOnCollapsibleClick('tax_and_asses_information');
      }
    }

    if (type == 'assessment_is_collapsed') {
      this.assessment_is_collapsed = !this.assessment_is_collapsed;
      if (this.assessment_is_collapsed == false) {
        this.getTaxandAssessmentPermisions();
        this.getDataOnCollapsibleClick('tax_and_asses_information');
      }
    }
    if (type == 'tax_information_is_collapsed') {
      this.tax_information_is_collapsed = !this.tax_information_is_collapsed;
      if (this.tax_information_is_collapsed == false) {
        this.getTaxInformationPermisions();
        this.getDataOnCollapsibleClick('tax_and_asses_information');
      }
    }

    if (type == 'tax_information_is_collapsed') {
      this.tax_information_is_collapsed = !this.tax_information_is_collapsed;
      if (this.tax_information_is_collapsed == false) {
      }
    }
    if (type == 'ownership_is_collapsed') {
      this.ownership_is_collapsed = !this.ownership_is_collapsed;
    }
  }

  // LOAD ADMIN TYPES
  loadAdministativeTypes() {
    this.apiService.getAdministrativeTypes().subscribe((res) => {
      this.administrative_types_array = res;
    });
  }

  loadBuildingCategories() {
    this.apiService.loadBuildingCategories().subscribe((res) => {
      this.building_categories_array = res;
    });
  }

  loadSubCategory() {
    this.apiService.loadBuildingSubCategory().subscribe((res) => {
      this.building_sub_categories_array = res;
    });
  }

  loadWaterSupply() {
    this.apiService.getWaterSupply().subscribe((res) => {
      this.water_supplyOptions = res;
    });
  }

  loadSanitationSewerage() {
    this.apiService.getSanitationSewerage().subscribe((res) => {});
  }

  loadgully() {
    this.apiService.getgully().subscribe((res) => {
      this.gullyOptions = res;
    });
  }

  loadWallType() {
    this.apiService.loadWallType().subscribe((res) => {
      this.wall_type_array = res;
    });
  }

  loadTelecomTypes() {
    this.apiService.loadTelecomTypes().subscribe((res) => {
      console.log(res);
      this.telecomOptions = res;
    });
  }

  loadInternetTypes() {
    this.apiService.loadInternetTypes().subscribe((res) => {
      this.internet_types_array = res;
    });
  }

  loadRoofTypes() {
    this.apiService.loadRoofTypes().subscribe((res) => {
      this.roof_type_array = res;
    });
  }
  calculatePercentageValue(baseValue: number, percentage: number, type: any): any {
    if (type == 'asses_information') {
      this.anual_fee_of_assement = Number((baseValue * percentage) / 100);
      if (!this.anual_fee_of_assement.toString().includes('.')) {
        this.anual_fee_of_assement = `${this.anual_fee_of_assement}.00`; // Add '.00' if no decimal part
      } else {
        this.anual_fee_of_assement = this.anual_fee_of_assement.toFixed(2); // Ensure 2 decimals if decimal part exists
      }
    }
    if (type == 'tax_information') {
      this.anual_fee_of_tax = Number((baseValue * percentage) / 100);
      if (!this.anual_fee_of_tax.toString().includes('.')) {
        this.anual_fee_of_tax = `${this.anual_fee_of_tax}.00`; // Add '.00' if no decimal part
      } else {
        this.anual_fee_of_tax = this.anual_fee_of_tax.toFixed(2); // Ensure 2 decimals if decimal part exists
      }
    }
  }

  ViewDOC() {
    console.log('ViewDOC');

    this.apiService.getlandTenurePDF(this.land_tenure.file).subscribe(
      (res) => {
        console.log('Response Headers:', res.type);
        console.log('Response Blob:', res);

        if (res.type !== 'application/pdf') {
          console.error('Invalid PDF response:', res);
          return;
        }

        const blob = new Blob([res], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      (error) => {
        console.error('Error fetching PDF:', error);
      },
    );
  }

  resetAdminInfo() {
    this.adminInfo = {
      ass_div: '',
      sl_ba_unit_type: '',
      access_road: '',
      dist: '',
      dsd: '',
      eletorate: '',
      gnd_id: '',
      local_auth: '',
      pd: '',
      postal_ad_lnd: '',
      remark: '',
      sl_ba_unit_name: '',
      gnd: '',
      no_floors: '',
      house_hold_no: '',
      bld_property_type: '',
      ba_unit_id: '',
      status: '',
      su_id: '',
      postal_ad_build: '',
      administrative_type: '',
      building_name: '',
    };
  }

  resetLandInfo() {
    this.landInfo = {
      dimension_2d_3d: '',
      area: '',
      hight: '',
      surface_relation: '',
      reference_coordinate: '',
      ext_builduse_type: '',
      roof_type: '',
      ext_builduse_sub_type: '',
      wall_type: '',
    };
  }

  resetLtUtilInfo() {
    this.lt_util_Info = {
      elec: '',
      water: '',
      water_drink: '',
      tele: '',
      internet: '',
      sani_sewer: '',
      sani_gully: '',
      garbage_dispose: '',
      expired_date: '',
      issued_date: '',
      drainage_system: '',
    };
  }

  resetLtAssesAndTax() {
    this.lt_asses_and_tax = {
      assessment_name: '',
      assessment_annual_value: '',
      assessment_no: '',
      assessment_percentage: '',
      date_of_valuation: '',
      year_of_assessment: '',
      property_type: '',
      outstanding_balance: '',
      tax_date: '',
      tax_annual_value: '',
      tax_type: '',
      tax_percentage: '',
    };
  }

  resetLandTenure() {
    this.land_tenure = {
      right_type: '',
      share: '',
      time_spec: '',
      sl_party_type: '',
      la_party_type: '',
      party_name: '',
      ext_pid_type: '',
      ext_pid: '',
      tp: '',
      pmt_address: '',
      file: '',
      reference_no: '',
    };
  }

  resetResidentsInformation() {
    this.residents_infromation = {
      name: '',
      ext_pid_type: '',
      ext_pid: '',
      tp: '',
      pmt_address: '',
      file: '',
      reference_no: '',
    };
  }

  getDataOnCollapsibleClick(type: any) {
    if (!this.selected_feature_ID) return;

    this.loadAdministativeTypes();

    if (type == 'adminInfo') {
      this.is_loading_toast_admin_info = true;
      this.resetAdminInfo();
      this.apiService
        .getBuildingAdministrativeInfo(this.selected_feature_ID)
        .pipe(
          finalize(() => {
            this.is_loading_toast_admin_info = false;
          }),
        )
        .subscribe({
          next: (res: any) => {
            if (res) {
              let adminInfo = res;
              this.adminInfo = {
                ass_div: adminInfo.ass_div || '',
                sl_ba_unit_type: adminInfo.sl_ba_unit_type || '',
                access_road: adminInfo.access_road || '',
                dist: adminInfo.dist || '',
                dsd: adminInfo.dsd || '',
                eletorate: adminInfo.eletorate || '',
                gnd_id: adminInfo.gnd_id || '',
                local_auth: adminInfo.local_auth || '',
                pd: adminInfo.pd || '',
                postal_ad_lnd: adminInfo.postal_ad_lnd || '',
                remark: adminInfo.remark || '',
                sl_ba_unit_name: adminInfo.sl_ba_unit_name || '',
                gnd: adminInfo.gnd || '',
                no_floors: adminInfo.no_floors || '',
                house_hold_no: adminInfo.house_hold_no || '',
                bld_property_type: adminInfo.bld_property_type || '',
                ba_unit_id: adminInfo.ba_unit_id || '',
                status: adminInfo.status || '',
                su_id: adminInfo.su_id || '',
                postal_ad_build: adminInfo.postal_ad_build || '',
                administrative_type: adminInfo.administrative_type || '',
                building_name: adminInfo.building_name || '',
              };
            } else {
              console.warn('No administrative info found.');
            }
          },
          error: (err) => {
            console.warn('Failed to load administrative info', err);
          },
        });
    }

    if (type == 'land_overview') {
      this.is_loading_toast_overview = true;
      this.resetLandInfo();
      this.apiService
        .getBuildingOverViewInfo(this.selected_feature_ID)
        .pipe(
          finalize(() => {
            this.is_loading_toast_overview = false;
          }),
        )
        .subscribe({
          next: (res: any) => {
            if (res) {
              let land_overview = res;
              this.landInfo = {
                dimension_2d_3d: land_overview.dimension_2d_3d,
                area: land_overview.area,
                hight: land_overview.hight,
                surface_relation: land_overview.surface_relation,
                reference_coordinate: land_overview.reference_coordinate,
                ext_builduse_type: land_overview.ext_builduse_type || '',
                roof_type: land_overview.roof_type || '',
                ext_builduse_sub_type: land_overview.ext_builduse_sub_type || '',
                wall_type: land_overview.wall_type || '',
              };
            } else {
              console.warn('No land overview info found.');
            }
          },
          error: (err) => {
            console.warn('Failed to load land overview info', err);
          },
        });
    }

    if (type == 'lt_util_info') {
      this.is_loading_toast_utility_info = true;
      this.resetLtUtilInfo();
      this.apiService
        .getBuildItInfo(this.selected_feature_ID)
        .pipe(
          finalize(() => {
            this.is_loading_toast_utility_info = false;
          }),
        )
        .subscribe({
          next: (res: any) => {
            if (res) {
              let lt_util_data = res;
              this.lt_util_Info = {
                elec: lt_util_data.elec || '',
                water: lt_util_data.water || '',
                water_drink: lt_util_data.water_drink || '',
                tele: lt_util_data.tele || '',
                internet: lt_util_data.internet || '',
                sani_sewer: lt_util_data.sani_sewer || '',
                sani_gully: lt_util_data.sani_gully || '',
                garbage_dispose: lt_util_data.garbage_dispose || '',
                expired_date: lt_util_data.expired_date,
                issued_date: lt_util_data.issued_date,
                drainage_system: lt_util_data.drainage_system || '',
              };
            } else {
              console.warn('No utility info found.');
            }
          },
          error: (err) => {
            console.warn('Failed to load utility info', err);
          },
        });
    }

    if (type == 'tax_and_asses_information') {
      this.is_loading_toast_tax_assessment = true;
      this.resetLtAssesAndTax();
      this.apiService
        .getltAssesAndTaxInfo(this.selected_feature_ID)
        .pipe(
          finalize(() => {
            this.is_loading_toast_tax_assessment = false;
          }),
        )
        .subscribe({
          next: (res: any) => {
            if (res) {
              let lt_asses_and_tax_data = res;
              this.calculatePercentageValue(
                lt_asses_and_tax_data.tax_annual_value,
                lt_asses_and_tax_data.tax_percentage,
                'tax_information',
              );
              this.calculatePercentageValue(
                lt_asses_and_tax_data.assessment_annual_value,
                lt_asses_and_tax_data.assessment_percentage,
                'asses_information',
              );
              this.lt_asses_and_tax = {
                assessment_name: lt_asses_and_tax_data.assessment_name,
                assessment_annual_value: lt_asses_and_tax_data.assessment_annual_value,
                assessment_no: lt_asses_and_tax_data.assessment_no,
                assessment_percentage: lt_asses_and_tax_data.assessment_percentage,
                date_of_valuation: lt_asses_and_tax_data.date_of_valuation,
                year_of_assessment: lt_asses_and_tax_data.year_of_assessment,
                property_type: lt_asses_and_tax_data.property_type,
                outstanding_balance: lt_asses_and_tax_data.ass_out_balance,
                tax_date: lt_asses_and_tax_data.tax_date,
                tax_annual_value: lt_asses_and_tax_data.tax_annual_value,
                tax_type: lt_asses_and_tax_data.tax_type,
                tax_percentage: lt_asses_and_tax_data.tax_percentage,
              };
            } else {
              console.warn('No tax/assessment info found.');
            }
          },
          error: (err) => {
            console.warn('Failed to load tax/assessment info', err);
          },
        });
    }

    if (type == 'land_tenure') {
      // Optionally add a loading state here as needed
      this.resetLandTenure();
      this.apiService.getLandTenureInfo(this.selected_feature_ID).subscribe({
        next: (res: any) => {
          if (res) {
            let land_tenure_data = res[0];
            this.land_tenure = {
              right_type: land_tenure_data.right_type,
              share: land_tenure_data.share,
              time_spec: land_tenure_data.time_spec,
              sl_party_type: land_tenure_data.party_info.sl_party_type,
              la_party_type: land_tenure_data.party_info.la_party_type,
              party_name: land_tenure_data.party_info.party_name,
              ext_pid_type: land_tenure_data.party_info.ext_pid_type,
              ext_pid: land_tenure_data.party_info.ext_pid,
              tp: land_tenure_data.party_info.tp,
              pmt_address: land_tenure_data.party_info.pmt_address,
              file: land_tenure_data.admin_source_info.file_url,
              reference_no: land_tenure_data.admin_source_info.reference_no,
            };
          } else {
            this.land_tenure = {
              right_type: '',
              share: '',
              time_spec: '',
              sl_party_type: '',
              la_party_type: '',
              party_name: '',
              ext_pid_type: '',
              ext_pid: '',
              tp: '',
              pmt_address: '',
              file: '',
              reference_no: '',
            };
          }
        },
        error: (err) => {
          console.warn('Failed to load land tenure info', err);
        },
      });
    }

    if (type == 'residents_infromation') {
      this.is_loading_toast_residential_information = true;
      this.resetResidentsInformation();
      this.apiService
        .getLandTenureInfo(this.selected_feature_ID)
        .pipe(
          finalize(() => {
            this.is_loading_toast_residential_information = false;
          }),
        )
        .subscribe({
          next: (res: any) => {
            if (res) {
              let land_tenure_data = res[0];
              this.residents_infromation = {
                name: land_tenure_data.party_info.party_name,
                ext_pid_type: land_tenure_data.party_info.ext_pid_type,
                ext_pid: land_tenure_data.party_info.ext_pid,
                tp: land_tenure_data.party_info.tp,
                pmt_address: land_tenure_data.party_info.pmt_address,
                file: land_tenure_data.admin_source_info.file_url,
                reference_no: land_tenure_data.admin_source_info.reference_no,
              };
            } else {
              this.residents_infromation = {
                name: '',
                ext_pid_type: '',
                ext_pid: '',
                tp: '',
                pmt_address: '',
                file: '',
                reference_no: '',
              };
            }
          },
          error: (err) => {
            console.warn('Failed to load residential information', err);
          },
        });
    }
  }

  // Save land tab data
  saveData(section: any): void {
    if (this.selected_feature_ID) {
      if (section == 'lt_admin_info') {
        try {
          this.apiService
            .updateBuildingAdministrativeInfo(this.selected_feature_ID, this.adminInfo, 'BLD')
            .subscribe(
              (lt_admin_info_res) => {
                this.notificationService.showSuccess('Data saved successfully');
                this.getSummaryDetailsMain();
              },
              (error) => {
                // Asynchronous errors should be handled here
                console.error('Error saving administrative info:', error);
                this.notificationService.showError('Data not saved');
              },
            );
        } catch (err) {
          // This catches synchronous errors that might occur before the Observable is returned
          console.error('Synchronous error occurred:', err);
          this.notificationService.showError('A synchronous error occurred while saving data');
        }
      }
      if (section == 'land_overview') {
        try {
          this.apiService
            .updateBuildOverviewInfo(this.selected_feature_ID, this.landInfo, 'BLD')
            .subscribe(
              (lt_admin_info_res) => {
                this.notificationService.showSuccess('Data saved successfully');
              },
              (error) => {
                // Asynchronous errors should be handled here
                console.error('Error saving administrative info:', error);
                this.notificationService.showError('Data not saved');
              },
            );
        } catch (err) {
          // This catches synchronous errors that might occur before the Observable is returned
          console.error('Synchronous error occurred:', err);
          this.notificationService.showError('A synchronous error occurred while saving data');
        }
      }
      if (section == 'lt_asses' || section == 'tax_info') {
        try {
          this.apiService
            .updateTaxAndAssessmentInfo(this.selected_feature_ID, this.lt_asses_and_tax, 'BUD')
            .subscribe(
              (lt_admin_info_res) => {
                this.notificationService.showSuccess('Data saved successfully');
              },
              (error) => {
                // Asynchronous errors should be handled here
                console.error('Error saving administrative info:', error);
                this.notificationService.showError('Data not saved');
              },
            );
        } catch (err) {
          // This catches synchronous errors that might occur before the Observable is returned
          console.error('Synchronous error occurred:', err);
          this.notificationService.showError('A synchronous error occurred while saving data');
        }
      }
      if (section == 'lt_util_info') {
        try {
          this.apiService
            .updateBuildingITUtilInfo(this.selected_feature_ID, this.lt_util_Info, 'BLD')
            .subscribe(
              (lt_admin_info_res) => {
                this.notificationService.showSuccess('Data saved successfully');
              },
              (error) => {
                // Asynchronous errors should be handled here
                console.error('Error saving administrative info:', error);
                this.notificationService.showError('Data not saved');
              },
            );
        } catch (err) {
          // This catches synchronous errors that might occur before the Observable is returned
          console.error('Synchronous error occurred:', err);
          this.notificationService.showError('A synchronous error occurred while saving data');
        }
      }
      if (section == 'land_tenure' || section == 'administrative_sources') {
        try {
          this.apiService
            .updateLandTenureInfo(this.selected_feature_ID, this.land_tenure, 'BLD')
            .subscribe(
              (lt_admin_info_res) => {
                this.notificationService.showSuccess('Data saved successfully');
              },
              (error) => {
                // Asynchronous errors should be handled here
                console.error('Error saving administrative info:', error);
                this.notificationService.showError('Data not saved');
              },
            );
        } catch (err) {
          // This catches synchronous errors that might occur before the Observable is returned
          console.error('Synchronous error occurred:', err);
          this.notificationService.showError('A synchronous error occurred while saving data');
        }
      }
    } else {
      this.notificationService.showError('Please select item');
    }
  }

  onFileSelected(event: any) {
    this.fileError = null;
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    const allowedTypes = ['image/png', 'image/webp', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      // this.fileError = 'Invalid file type. Only PNG, WEBP, JPG, or JPEG are allowed.';
      this.notificationService.showError(
        'Invalid file type. Only PNG, WEBP, JPG, or JPEG are allowed.',
      );
      input.value = '';
      return;
    }

    if (file.size > 102400) {
      // this.fileError = 'File must be 100KB or smaller.';
      this.notificationService.showError('File must be 100KB or smaller.');
      input.value = '';
      return;
    }

    if (file) {
      this.selected_imag_file = file; // Store file for uploading
      this.parsal_image = event.target.result;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.parsal_image = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  getParsalImage() {
    this.apiService.getParsalImage(this.selected_feature_ID).subscribe(
      (res) => {
        const imageUrl = URL.createObjectURL(res); // Create URL for the image Blob
        this.parsal_image = imageUrl; // Set the image URL to the component variable
      },
      (error) => {
        // this.parsal_image = 'sample/s_img_1.jpg';
        this.notificationService.showInfo('Image not found');
      },
    );
  }

  // saveImage() {
  //   if (!this.selected_imag_file) {
  //     console.error('No file selected!');
  //     return;
  //   }

  //   const formData = new FormData();

  //   // Append the file to formData
  //   formData.append('file_path', this.selected_imag_file);
  //   formData.append('status', 'true');
  //   // Append su_id to formData
  //   formData.append('su_id', this.selected_feature_ID !== null ? String(this.selected_feature_ID) : ''); // Ensure string and not null
  //   formData.append('user_id', this.user_id); // Assuming 'selected_feature_ID' contains su_id
  //   // Debugging: Inspect FormData contents and file details
  //   formData.forEach((value, key) => {
  //     if (value instanceof File) {
  //       console.log(`${key}:`);
  //       console.log('File name:', value.name);
  //       console.log('File type:', value.type);
  //       console.log('File size:', value.size);
  //     } else {
  //       console.log(`${key}: ${value}`);
  //     }
  //   });

  //   // Proceed with your API call
  //   this.apiService.uploadImage(formData).subscribe({
  //     next: (res: any) => {
  //       console.log('Upload Success:', res);
  //     },
  //     error: (error) => {
  //       console.error('Upload Failed:', error);
  //     },
  //   });
  // }

  saveImage() {
    if (!this.selected_imag_file) {
      console.error('No file selected!');
      return;
    }

    const formData = new FormData();

    // Append the file to formData
    formData.append('file_path', this.selected_imag_file);
    formData.append('status', 'true');
    // Append su_id to formData
    formData.append('su_id', String(this.selected_feature_ID ?? '')); // Ensure value is always a string
    formData.append('user_id', this.user_id); // Assuming 'selected_feature_ID' contains su_id
    // Debugging: Inspect FormData contents and file details
    formData.forEach((value, key) => {
      if (value instanceof File) {
      } else {
      }
    });

    // Proceed with your API call
    this.apiService.uploadImage(formData).subscribe({
      next: (res) => {
        console.log('Upload Success:', res);
      },
      error: (error) => {
        console.error('Upload Failed:', error);
        this.notificationService.showError(error.error?.error || 'Failed to upload image');
      },
    });
  }

  openRRRDialog(): void {
    this.dialog.open(RrrPanalComponent, {
      width: '75%',
      maxWidth: '85%',
      data: { feature_id: this.selected_feature_ID },
    });
  }

  async deleteImage() {
    if (!this.selected_feature_ID) {
      this.notificationService.showError('No image selected for deletion');
      return;
    }

    this.apiService
      .deleteParcelImage(this.selected_feature_ID)
      .pipe()
      .subscribe({
        next: (res) => {
          this.parsal_image = null;
          this.notificationService.showSuccess('Image deleted successfully');
        },
        error: (err) => {
          this.notificationService.showError('Failed to delete image');
          console.log('Delete image error:', err);
        },
      });
  }

  private dialogRef: any;

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

  ngOnDestroy(): void {
    this.featureSub?.unsubscribe(); // Clean up feature subscription
  }

  open3dDialog() {
    if (this.dialogRef) {
      // If dialog is already open, close it
      this.dialogRef.close();
      this.dialogRef = null; // Reset the reference
    } else {
      // Open a new dialog if it's not already open
      this.dialogRef = this.dialog.open(ThreeDBuildingViewerComponent, {
        data: { feature_id: this.selected_feature_ID },
        width: '90vw',
        maxWidth: '90vw',
        panelClass: 'rrr-centered-dialog',
      });
      // Reset dialogRef when the dialog is closed
      this.dialogRef.afterClosed().subscribe(() => {
        this.dialogRef = null;
      });
    }
  }
}
