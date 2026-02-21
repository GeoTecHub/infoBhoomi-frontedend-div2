import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { finalize, Subject, takeUntil } from 'rxjs';
import { APIsService } from '../../../services/api.service';
import { DrawService } from '../../../services/draw.service';
import { MapService } from '../../../services/map.service';
import { NotificationService } from '../../../services/notifications.service';

import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserService } from '../../../services/user.service';
import { FeatureNotAvailableComponent } from '../../dialogs/feature-not-available/feature-not-available.component';
import { RrrPanalComponent } from '../../dialogs/rrr-panal/rrr-panal.component';
import { RrrPanelComponent, RRRRow } from '../../dialogs/rrr-panel/rrr-panel.component';
import { LoaderComponent } from '../loader/loader.component';

// --- Dynamic attributes support ---

export const LAND_TAB_SECTIONS = {
  ADMIN_INFO: 'ADMIN_INFO',
  LAND_OVERVIEW: 'LAND_OVERVIEW',
  UTILITY_INFO: 'UTILITY_INFO',
  TAX_ASSESSMENT: 'TAX_ASSESSMENT',
  TAX_INFO: 'TAX_INFO',
} as const;

type SectionKey = (typeof LAND_TAB_SECTIONS)[keyof typeof LAND_TAB_SECTIONS];

interface DynamicAttribute {
  id: string | number; // from backend
  label: string;
  value: string;
  section: SectionKey;
  isSavingValue?: boolean;
}

@Component({
  selector: 'app-land-tab',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule
],
  templateUrl: './land-tab.component.html',
  styleUrl: './land-tab.component.css',
})
export class LandTabComponent implements OnInit, AfterViewInit, OnDestroy {
  // ================= DYNAMIC ATTRIBUTES =================

  readonly SECTION_KEYS = LAND_TAB_SECTIONS;

  // All attributes per section
  customAttributes: Record<SectionKey, DynamicAttribute[]> = {
    ADMIN_INFO: [],
    LAND_OVERVIEW: [],
    UTILITY_INFO: [],
    TAX_ASSESSMENT: [],
    TAX_INFO: [],
  };

  // UI state: adding new attribute per section
  isAddingAttribute: Record<SectionKey, boolean> = {
    ADMIN_INFO: false,
    LAND_OVERVIEW: false,
    UTILITY_INFO: false,
    TAX_ASSESSMENT: false,
    TAX_INFO: false,
  };

  newAttributeLabel: Record<SectionKey, string> = {
    ADMIN_INFO: '',
    LAND_OVERVIEW: '',
    UTILITY_INFO: '',
    TAX_ASSESSMENT: '',
    TAX_INFO: '',
  };

  isSavingNewAttributeMeta: Record<SectionKey, boolean> = {
    ADMIN_INFO: false,
    LAND_OVERVIEW: false,
    UTILITY_INFO: false,
    TAX_ASSESSMENT: false,
    TAX_INFO: false,
  };

  @Input({ required: true }) selected_feature_ID: string | number | null | undefined;
  private destroy$ = new Subject<void>();
  // ---------------------- temp variables -----------------
  selected_imag_file: File | null = null;
  // is_loading_toast = true;
  parsal_image: string | null = null;
  user_id: any;
  // selected_feature_ID: any;
  anual_fee_of_assement: any;
  anual_fee_of_tax: any;
  // land tab card inputs
  adminInfo: any = {
    sl_ba_unit_type: '',
    pd: '',
    dist: '',
    dsd: '',
    gnd_id: '',
    access_road: '',
    sl_ba_unit_name: '',
    postal_ad_lnd: '',
    local_auth: '',
    eletorate: '',
    remark: '',
    ass_div: '',
    sl_land_type: '',
    administrative_type: '',
    land_name: '',
  };
  landInfo: any = {
    id: '',
    dimension_2d_3d: '',
    area: '',
    ext_landuse_type: '',
    ext_landuse_sub_type: '',
    reference_coordinate: '',
  };

  lt_util_Info: any = {
    drainage_system: '',
    electricity: '',
    garbage_disposal: '',
    sanitation_gully: '',
    sanitation_sewerage: '',
    water_supply: '',
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

  // ------------ load data from backend ----------------

  water_supplyOptions: any = [];
  land_ext_landuse_type_array: any = [];
  land_sub_category_array: any = [];
  GND_array: any = [];
  Ward_array: any = [];
  gullyOptions: any = [];
  administrative_types_array: any = [];
  admin_permisions_array: any = [];
  summary_permission_array: any = [];
  land_tenure_permisions_array: any = [];
  utility_permisions_array: any = [];
  land_over_view_permisions_array: any = [];
  taxandassessment_array: any = [];
  taxinformation_array: any = [];
  isCoOwners = false;

  // ------------ Hard coded dropdown data ----------------

  sanitation_sewerageOptions = ['Septic Tank', 'Drainage Dispose', 'Garden Dispose'];
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
  tax_and_assessment_is_collapsed = true;
  land_overview_is_collapsed = true;
  utility_information_is_collapsed = true;
  tax_information_is_collapsed = true;
  administrative_sources_is_collapsed = true;
  assessment_is_collapsed = true;
  land_tenure_is_collapsed = true;
  mainCollapsedland_Tenur = true;
  ownership_is_collapsed = true;
  documents_is_collapsed = true;

  // fields edit
  public isAdminInfoEditMode = false;
  public isUtilityInfoEditMode = false;
  public isOverviewInfoEditMode = false;
  public isTaxAssesmentInfoEditMode = false;
  public isTaxInfoEditMode = false;

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

  fileError: string | null = null;

  parcelInfoText = 'This parcel was created by Malaka Sandakal on 23/10/2025.';

  constructor(
    private notificationService: NotificationService,
    private http: HttpClient,
    private mapService: MapService,
    private apiService: APIsService,
    private dialog: MatDialog,
    private drawService: DrawService,
    private changeDetectorRef: ChangeDetectorRef,
    private userService: UserService,
  ) {}

  ngOnInit(): void {
    this.userService.user$.pipe(takeUntil(this.destroy$)).subscribe((user: any) => {
      if (user) {
        this.user_id = user.user_id || '';
      }
    });
    this.GNDListdData();
    this.loadLandUseCategories();
    this.loadSubCategory();
    this.loadWaterSupply();
    this.loadgully();
    this.loadAssessmentWards();
    // this.getCreatedByDetails();
    this.getSummaryPermisions();

    // Subscribe ONLY ONCE, and automatically unsubscribes when component destroyed
    // this.drawService.selectedFeatureInfo$
    //   .pipe(
    //     map((info) => info?.featureId),
    //     distinctUntilChanged(),
    //     takeUntil(this.destroy$)
    //   )
    //   .subscribe((featureId) => {
    //     // This code only runs if the tab is currently rendered
    //     if (!featureId) return;
    //     this.selected_feature_ID = featureId;
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

  rrr_permisions_array: any = [];
  permissionsLoaded = false;
  existing_admin_source: any = [];
  rrrGroups: any = [];

  getRRRPermisions() {
    this.apiService.getRRRPermisions().subscribe((res) => {
      this.rrr_permisions_array = res;
      this.rrr_permisions_array = this.rrr_permisions_array.reduce(
        (acc: { [x: string]: any }, perm: { permission_id: string | number }) => {
          acc[perm.permission_id] = perm;
          return acc;
        },
        {},
      );

      this.permissionsLoaded = true; // mark as ready

      if (this.canViewRRR(38)) {
        this.getExistingAdminSourceData();
      }
    });
  }

  canAddRRR(permissionId: number): boolean {
    return this.rrr_permisions_array[permissionId]?.add ?? false;
  }

  canViewRRR(permissionId: number): boolean {
    return this.rrr_permisions_array[permissionId]?.view ?? false;
  }

  canEditRRR(permissionId: number): boolean {
    return this.rrr_permisions_array[permissionId]?.edit ?? false;
  }

  canDeleteRRR(permissionId: number): boolean {
    return this.rrr_permisions_array[permissionId]?.delete ?? false;
  }

  getExistingAdminSourceData() {
    this.apiService.getExistingAdminSourceData(this.selected_feature_ID).subscribe((res: any) => {
      if (Array.isArray(res.records) && res.records.length > 0) {
        this.existing_admin_source = res.records;
        this.buildRRRGroups(res.records);
        this.updateSummaryOwnerFromRRR(); // <--- ADD THIS
      } else {
        this.existing_admin_source = [];
        this.summaryOwner = null; // <--- reset
        this.isCoOwners = false;
      }
    });
  }

  private updateSummaryOwnerFromRRR() {
    // Find the current group (isCurrent === true)
    const currentGroup = this.rrrGroups.find((g: any) => g.isCurrent);

    if (!currentGroup || !Array.isArray(currentGroup.rows)) {
      this.summaryOwner = null;
      this.isCoOwners = false;
      return;
    }

    // Collect unique party names from current owners
    const names = Array.from(
      new Set(
        currentGroup.rows
          .map((r: RRRRow) => r.party_name)
          .filter((n: any) => !!n && n.trim() !== ''),
      ),
    ) as string[];

    if (names.length === 0) {
      this.summaryOwner = null;
      this.isCoOwners = false;
      return;
    }

    // If only one party -> "Owner", if more -> "Co-Owners"
    this.isCoOwners = names.length > 1;
    this.summaryOwner = names.length === 1 ? names[0] : names.join(', ');
  }

  private buildRRRGroups(payload: any[]) {
    this.rrrGroups = [];

    if (!Array.isArray(payload) || payload.length === 0) return;

    payload.forEach((unit, idx) => {
      const file = (unit.admin_sources && unit.admin_sources[0]) || null;
      const sourceType = file?.admin_source_type ?? null;
      const filePath = file?.file_path ?? null;

      const rows: RRRRow[] = (unit.rrrs || []).map((r: any) => ({
        party_name: r.party_name,
        party_role_type: r.party_role_type,
        sl_ba_unit_name: unit.sl_ba_unit_name,
        sl_ba_unit_type: unit.sl_ba_unit_type,
        ba_unit_id: unit.ba_unit_id,
        share_type: r.share_type,
        share: Number(r.share) || 0,
        source_type: sourceType,
        file_path: filePath,
      }));

      this.rrrGroups.push({
        isCurrent: idx === 0,
        rows,
      });
    });
  }

  private fetchAllOpenedPanelData() {
    if (this.administrative_is_collapsed == false) {
      this.getDataOnCollapsibleClick('adminInfo');
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

  getSummaryPermisions() {
    this.apiService.getSummaryPermission().subscribe((res) => {
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

  // GET ADMININ PERMISIONS

  getAdminPermisions() {
    this.apiService.getLandTabAdminPermisions().subscribe((res) => {
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

  canView(permissionId: number): boolean {
    return this.admin_permisions_array[permissionId]?.view ?? false;
  }

  // Check if field should be editable
  canEdit(permissionId: number): boolean {
    return this.admin_permisions_array[permissionId]?.edit ?? false;
  }

  // GET LAND TENURE PERMISIONS

  getLandTenurePermisions() {
    this.apiService.getLandTenurePermisions().subscribe((res) => {
      this.land_tenure_permisions_array = res;
      this.land_tenure_permisions_array = this.land_tenure_permisions_array.reduce(
        (acc: { [x: string]: any }, perm: { permission_id: string | number }) => {
          acc[perm.permission_id] = perm;
          return acc;
        },
        {},
      );
    });
  }

  canViewLandTnure(permissionId: number): boolean {
    return this.land_tenure_permisions_array[permissionId]?.view ?? false;
  }

  // GET LAND OVER VIEW PERMISIONS

  getLandOverViewPermisions() {
    this.apiService.getLandOverViewPermisions().subscribe((res) => {
      this.land_over_view_permisions_array = res;
      this.land_over_view_permisions_array = this.land_over_view_permisions_array.reduce(
        (acc: { [x: string]: any }, perm: { permission_id: string | number }) => {
          acc[perm.permission_id] = perm;
          return acc;
        },
        {},
      );
    });
  }

  canViewLandOverView(permissionId: number): boolean {
    return this.land_over_view_permisions_array[permissionId]?.view ?? false;
  }

  canEditLandOverView(permissionId: number): boolean {
    return this.land_over_view_permisions_array[permissionId]?.edit ?? false;
  }

  // GET UTILITY PERMISIONS

  getUtilityPermisions() {
    this.apiService.getLandTabUtilityPermisions().subscribe((res) => {
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
    this.apiService.getTaxandAssessmentPermisions().subscribe((res) => {
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

  // GET TAX INFORMATION PERMISSIONS
  getTaxInformationPermisions() {
    this.apiService.getTaxInformationPermisions().subscribe((res) => {
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
    if (type == 'administrative_is_collapsed') {
      this.administrative_is_collapsed = !this.administrative_is_collapsed;
      if (this.administrative_is_collapsed == false) {
        this.getAdminPermisions();
        this.getDataOnCollapsibleClick('adminInfo');
        this.loadCustomAttributes(this.SECTION_KEYS.ADMIN_INFO);
      }
    }

    if (type == 'utility_information_is_collapsed') {
      this.utility_information_is_collapsed = !this.utility_information_is_collapsed;
      if (this.utility_information_is_collapsed == false) {
        this.getUtilityPermisions();
        this.getDataOnCollapsibleClick('lt_util_info');
        this.loadCustomAttributes(this.SECTION_KEYS.UTILITY_INFO); // << ADD
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
        this.loadCustomAttributes(this.SECTION_KEYS.LAND_OVERVIEW); // << ADD
      }
    }
    if (type == 'main_collapsedland_tenur') {
      this.mainCollapsedland_Tenur = !this.mainCollapsedland_Tenur;
      if (this.mainCollapsedland_Tenur == false) {
        this.getLandTenurePermisions();
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
        this.loadCustomAttributes(this.SECTION_KEYS.TAX_ASSESSMENT); // << ADD
      }
    }
    if (type == 'assessment_is_collapsed') {
      this.assessment_is_collapsed = !this.assessment_is_collapsed;
      if (this.assessment_is_collapsed == false) {
        this.getTaxandAssessmentPermisions();
        this.getDataOnCollapsibleClick('tax_and_asses_information');
        this.loadCustomAttributes(this.SECTION_KEYS.TAX_ASSESSMENT); // << ADD
      }
    }
    if (type == 'tax_information_is_collapsed') {
      this.tax_information_is_collapsed = !this.tax_information_is_collapsed;
      if (this.tax_information_is_collapsed == false) {
        this.getTaxInformationPermisions();
        this.getDataOnCollapsibleClick('tax_and_asses_information');
        this.loadCustomAttributes(this.SECTION_KEYS.TAX_INFO); // << ADD
      }
    }

    if (type == 'ownership_is_collapsed') {
      this.ownership_is_collapsed = !this.ownership_is_collapsed;
    }

    if (type == 'documents_is_collapsed') {
      this.documents_is_collapsed = !this.documents_is_collapsed;
    }
  }

  // LOAD ADMIN TYPES
  loadAdministativeTypes() {
    this.apiService.getAdministrativeTypes().subscribe((res) => {
      this.administrative_types_array = res;
    });
  }

  loadLandUseCategories() {
    this.apiService.loadLandUseCategories().subscribe((res) => {
      this.land_ext_landuse_type_array = res;
    });
  }

  loadSubCategory() {
    this.apiService.loadSubCategory().subscribe((res) => {
      this.land_sub_category_array = res;
    });
  }

  GNDListdData() {
    this.apiService.GNDListdData().subscribe((res) => {
      console.log(res);
      this.GND_array = res;
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

  loadAssessmentWards() {
    this.apiService.getAssessWardList().subscribe((res) => {
      this.Ward_array = res;
    });
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
    this.apiService.getlandTenurePDF(this.land_tenure.file).subscribe(
      (res) => {
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

      this.getRRRPermisions();

      this.apiService
        .getSummaryDetails(this.selected_feature_ID)
        .pipe(
          finalize(() => {
            // This runs after both success or error
            this.is_loading_summary = false;
          }),
        )
        .subscribe({
          next: (res) => {
            if (res) {
              // @ts-ignore
              let summaryDetails: any = res;
              this.summaryPropertyType = summaryDetails.property_type || null;
              this.summaryPostalAdLnd = summaryDetails.postal_ad_lnd || null;
              this.summaryAssessmentNo = summaryDetails.assessment_no || null;
              this.summaryAssessmentDiv = summaryDetails.assessment_div || null;
            }
          },
          error: (err) => {
            // this.notificationService.showError(
            //   'Failed to load summary details'
            // );
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
    this.summaryOwner = null;
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
      no_floors: '',
      house_hold_no: '',
      sl_land_type: '',
      administrative_type: '',
      land_name: '',
    };
  }

  resetLandInfo() {
    this.landInfo = {
      dimension_2d_3d: '',
      area: '',
      ext_landuse_type: '',
      ext_landuse_sub_type: '',
      reference_coordinate: '',
    };
  }

  resetLtUtilInfo() {
    this.lt_util_Info = {
      drainage_system: '',
      electricity: '',
      garbage_disposal: '',
      sanitation_gully: '',
      sanitation_sewerage: '',
      water_supply: '',
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

  // Load sidebar land tab data
  getDataOnCollapsibleClick(type: any) {
    if (!this.selected_feature_ID) return;

    this.loadAdministativeTypes();

    if (type == 'adminInfo') {
      this.is_loading_toast_admin_info = true;
      this.resetAdminInfo();
      this.apiService
        .getAdministrativeInfo(this.selected_feature_ID)
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
                no_floors: adminInfo.no_floors || '',
                house_hold_no: adminInfo.house_hold_no || '',
                sl_land_type: adminInfo.sl_land_type || '',
                administrative_type: adminInfo.administrative_type || '',
                land_name: adminInfo.land_name || '',
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
        .getLandOverViewInfo(this.selected_feature_ID)
        .pipe(
          finalize(() => {
            this.is_loading_toast_overview = false;
          }),
        )
        .subscribe({
          next: (res: any) => {
            if (res) {
              let land_overview = res;
              console.log(land_overview);
              this.landInfo = {
                dimension_2d_3d: land_overview.dimension_2d_3d,
                area: land_overview.area,
                ext_landuse_type: land_overview.ext_landuse_type || '',
                ext_landuse_sub_type: land_overview.ext_landuse_sub_type || '',
                reference_coordinate: land_overview.reference_coordinate,
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
        .getItInfo(this.selected_feature_ID)
        .pipe(
          finalize(() => {
            this.is_loading_toast_utility_info = false;
          }),
        )
        .subscribe({
          next: (res: any) => {
            if (res) {
              console.log(res);
              let lt_util_data = res;
              this.lt_util_Info = {
                drainage_system: lt_util_data.drainage_system || '',
                electricity: lt_util_data.electricity || '',
                garbage_disposal: lt_util_data.garbage_disposal || '',
                sanitation_gully: lt_util_data.sanitation_gully || '',
                sanitation_sewerage: lt_util_data.sanitation_sewerage || '',
                water_supply: lt_util_data.water_supply || '',
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
              console.warn('No tax & assessment info found.');
            }
          },
          error: (err) => {
            console.warn('Failed to load tax/assessment info', err);
          },
        });
    }

    if (type == 'land_tenure') {
      // Optionally add a loading state here too!
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
          // Optionally handle error or set a loading state if needed
          console.warn('Failed to load land tenure info', err);
        },
      });
    }
  }

  // Save land tab data
  saveData(section: any): void {
    if (this.selected_feature_ID) {
      if (section == 'lt_admin_info') {
        this.apiService
          .updateAdministrativeInfo(this.selected_feature_ID, this.adminInfo, 'LND')
          .subscribe({
            next: () => {
              this.notificationService.showSuccess('Data saved successfully');
              this.getSummaryDetailsMain();
            },
            error: (error) => {
              console.error('Error saving administrative info:', error);
              this.notificationService.showError('Data not saved');
            },
          });
      }
      if (section == 'land_overview') {
        this.apiService
          .updateLandOverviewInfo(this.selected_feature_ID, this.landInfo, 'LND')
          .subscribe({
            next: () => {
              this.notificationService.showSuccess('Data saved successfully');
            },
            error: (error) => {
              console.error('Error saving land overview info:', error);
              this.notificationService.showError('Data not saved');
            },
          });
      }
      if (section == 'lt_asses' || section == 'tax_info') {
        this.apiService
          .updateTaxAndAssessmentInfo(this.selected_feature_ID, this.lt_asses_and_tax, 'LND')
          .subscribe({
            next: () => this.notificationService.showSuccess('Data saved successfully'),
            error: (error) => {
              console.error('Error saving tax and assessment info:', error);
              this.notificationService.showError('Data not saved');
            },
          });
      }
      if (section == 'lt_util_info') {
        this.apiService
          .updateITUtilInfo(this.selected_feature_ID, this.lt_util_Info, 'LND')
          .subscribe({
            next: () => this.notificationService.showSuccess('Data saved successfully'),
            error: (error) => {
              console.error('Error saving utility info:', error);
              this.notificationService.showError('Data not saved');
            },
          });
      }
      if (section == 'land_tenure' || section == 'administrative_sources') {
        this.apiService
          .updateLandTenureInfo(this.selected_feature_ID, this.land_tenure, 'LND')
          .subscribe({
            next: () => this.notificationService.showSuccess('Data saved successfully'),
            error: (error) => {
              console.error('Error saving land tenure info:', error);
              this.notificationService.showError('Data not saved');
            },
          });
      }
    } else {
      this.notificationService.showError('Please select an item');
    }
  }

  // RRR POPUOP/DIALOG

  openRRRDialog(): void {
    this.dialog.open(RrrPanalComponent, {
      width: '75%',
      maxWidth: '85%',
      data: { feature_id: this.selected_feature_ID },
    });
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

  openRRRPanel() {
    if (this.dialogRef) {
      // If dialog is already open, close it
      this.dialogRef.close();
      this.dialogRef = null; // Reset the reference
    } else {
      // Open a new dialog if it's not already open
      this.dialogRef = this.dialog.open(RrrPanelComponent, {
        data: { feature_id: this.selected_feature_ID },
        width: '65vw',
        maxWidth: '75vw',
        panelClass: 'rrr-centered-dialog',
      });
      // Reset dialogRef when the dialog is closed and refresh ownership data
      this.dialogRef.afterClosed().subscribe(() => {
        this.dialogRef = null;
        if (this.canViewRRR(38)) {
          this.getExistingAdminSourceData();
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------- Dynamic attributes: load for a given section ----------
  private loadCustomAttributes(section: SectionKey) {
    if (!this.selected_feature_ID) return;

    this.apiService.getDynamicAttributes(this.selected_feature_ID, section).subscribe({
      next: (res: any[]) => {
        this.customAttributes[section] = (res || []).map((r: any) => ({
          id: r.id,
          label: r.label,
          value: r.value ?? '',
          section,
        }));
      },
      error: (err) => {
        console.warn('Failed to load dynamic attributes for section', section, err);
      },
    });
  }

  // ---------- Start adding a new attribute meta (label only) ----------
  startAddAttribute(section: SectionKey) {
    this.isAddingAttribute[section] = true;
    this.newAttributeLabel[section] = '';
  }

  cancelAddAttribute(section: SectionKey) {
    this.isAddingAttribute[section] = false;
    this.newAttributeLabel[section] = '';
  }

  // ---------- Save attribute DEFINITION (label + section + feature) ----------
  saveNewAttributeMeta(section: SectionKey) {
    const label = (this.newAttributeLabel[section] || '').trim();
    if (!label || !this.selected_feature_ID) return;

    this.isSavingNewAttributeMeta[section] = true;

    this.apiService
      .createDynamicAttribute({
        section_key: section, // which section this attribute belongs to
        label,
        su_id: this.selected_feature_ID, // current feature / parcel id
      })
      .pipe(
        finalize(() => {
          this.isSavingNewAttributeMeta[section] = false;
        }),
      )
      .subscribe({
        next: (created: any) => {
          // Expect backend to return id + label (+ optional value)
          const newAttr: DynamicAttribute = {
            id: created.id,
            label: created.label ?? label,
            value: created.value ?? '',
            section,
          };

          this.customAttributes[section] = [...(this.customAttributes[section] || []), newAttr];

          this.notificationService.showSuccess('Attribute added successfully');

          // Clear add form
          this.isAddingAttribute[section] = false;
          this.newAttributeLabel[section] = '';
        },
        error: (err) => {
          console.error('Failed to create dynamic attribute', err);
          this.notificationService.showError('Failed to create attribute');
        },
      });
  }

  // ---------- Save VALUE of an existing attribute ----------
  saveAttributeValue(attr: DynamicAttribute, section: SectionKey) {
    if (!attr.id || !this.selected_feature_ID) return;

    attr.isSavingValue = true;

    this.apiService
      .updateDynamicAttributeValue({
        attribute_id: attr.id as number,
        su_id: this.selected_feature_ID,
        value: attr.value ?? '',
      })
      .pipe(
        finalize(() => {
          attr.isSavingValue = false;
        }),
      )
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Attribute value saved');
        },
        error: (err) => {
          console.error('Failed to save attribute value', err);
          this.notificationService.showError('Failed to save attribute value');
        },
      });
  }
}
