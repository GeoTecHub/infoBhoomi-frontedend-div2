import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpEvent, HttpHeaders } from '@angular/common/http';
import { Inject, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AreaRow } from './org-area-define.service';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root',
})
export class APIsService {
  private userService = inject(UserService);
  token: any;
  user_id: any;
  org_id: any;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  private readonly baseUrl = environment.API_URL; // 'https://infobhoomiback.geoinfobox.com/api/user/',

  loadFromStorage() {
    if (isPlatformBrowser(this.platformId)) {
      const user = this.userService.getUser();
      this.token = localStorage.getItem('Token');
      this.user_id = user?.user_id || null;
      this.org_id = user?.org_id || null;
    } else {
      this.token = null;
      this.user_id = null;
      this.org_id = null;
    }
  }

  // Load GND

  // =================================================================
  // NEW METHOD: Add this to fetch the GND GeoJSON data
  // =================================================================
  getGndData(): Observable<GeoJSON.FeatureCollection> {
    // 'any' is fine, or you can create a GeoJSON interface
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });

    const url = `${this.baseUrl}org_area/`;
    return this.http.get<GeoJSON.FeatureCollection>(url, { headers });
  }

  //   export const environment = {
  //   production: false,
  //   API_URL: 'https://infobhoomiback.geoinfobox.com/api/user/',
  // };

  // *** Endpoints ***
  /****************** Data import panel *********** */
  // import Rater Data

  public readonly IMPORT_RASTER_DATA = `${this.baseUrl}import_raster_data/`;

  //IMPORT DATA
  importRasterData(formData: FormData): Observable<HttpEvent<any>> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      // Don't set Content-Type for FormData - browser will set it automatically
      // with the correct boundary parameter
    });

    return this.http.post(this.IMPORT_RASTER_DATA, formData, {
      headers,
      reportProgress: true, // Enable progress tracking
      observe: 'events', // Get full event stream
    });
  }

  // Import temporary data
  public readonly IMPORT_TEMP_VECTOR_DATA = `${this.baseUrl}import_vector_data/`;

  // Load temporary data
  public readonly LOAD_TEMP_VECTOR_DATA = (user_id: string) =>
    `${this.baseUrl}import_vector_data/user=${user_id}/`;

  // Remove temporary data from table
  public readonly REMOVE_TEMP_VECTOR_DATA = (record_id: string) =>
    `${this.baseUrl}import_vector_data/update/id=${record_id}/`;

  /******************** Tools ******************** */
  // Save drawings
  public readonly POST_SURVEY_REP_DATA = `${this.baseUrl}survey_rep_data/`;

  // Update Chages
  public readonly UPDATE_SURVEY_REP_DATA = (uuid: string) =>
    `${this.baseUrl}survey_rep_data/update/id=${uuid}/`;
  // Delete features
  public readonly DELETE_SURVEY_BATCH_DATA = `${this.baseUrl}survey_rep_data/bulk_delete/`;

  // Get permissions
  /**@response all permisssions for requested permission Ids */
  public readonly GET_PERMISSIONS = `${this.baseUrl}role-permission/`;

  /**********************LAND TAB****************** */
  // Get land info
  /**@response values of all the data field in land tab */
  public readonly GET_LAND_INFO = (su_id: string) => `${this.baseUrl}admin-info/su_id=${su_id}/`;

  public readonly GET_LAND_OVERVIEW = (su_id: string) =>
    `${this.baseUrl}land-overview-info/su_id=${su_id}/`;

  public readonly GET_LAND_UTIL_INFO = (su_id: string) =>
    `${this.baseUrl}utinet-info/su_id=${su_id}/`;

  public readonly GET_ASSES_TAX_INFO = (su_id: string) =>
    `${this.baseUrl}tax-assess-info/su_id=${su_id}/`;

  public readonly GET_LAND_TENURE = (su_id: string) =>
    `${this.baseUrl}ownership-rights-info/su_id=${su_id}/`;

  // ---------------------------------------------------
  // save and update land information tale
  // admin info
  public readonly UPDATE_LT_ADMIN_INFO = (su_id: string) =>
    `${this.baseUrl}admin-info/update/su_id=${su_id}/`;

  public readonly UPDATE_LT_LAND_OVERVIEW = (su_id: string) =>
    `${this.baseUrl}land-overview-info/update/su_id=${su_id}/`;

  public readonly UPDATE_LT_UTIL_INFO = (su_id: string) =>
    `${this.baseUrl}utinet-info/update/su_id=${su_id}/`;

  public readonly UPDATE_TAX_ASSES_INFO = (su_id: string) =>
    `${this.baseUrl}tax-assess-info/update/su_id=${su_id}/`;

  /***********************DROPDOWNS****************** */
  // get admin unit type dropdown content
  public readonly ADMIN_UNIT_TYPES_DD = (ddListID: string) => `${this.baseUrl}${ddListID}/`; // temp

  /***********************PANEL IMAGE****************** */
  public readonly SIDE_PANEL_IMG = (su_id: string) =>
    `${this.baseUrl}attrib-image-retrive/su_id=${su_id}/`;

  // LAND TAB ADMINISTRATIVE
  // getAdministrativeInfo(su_id_value: any) {
  //   console.log(su_id_value,this.token )
  //   const headers = new HttpHeaders({
  //     Authorization: `Token ${this.token}`,
  //     'Content-Type': 'application/json'
  //   });

  //   const requestBody = { su_id: su_id_value };

  //   return this.http.get(`${this.baseUrl}admin-info/su_id=${su_id_value}/`, { headers });
  // }

  getSummaryPermission() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}role-permission/`,
      {
        permission_id: [10, 11, 24],
      },
      { headers },
    );
  }

  // GET BUILDING TAB PERMISIONS

  getBuildingSummaryPermission() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}role-permission/`,
      {
        permission_id: [111, 113, 131, 108],
      },
      { headers },
    );
  }

  // GET ADMIN PERMISIONS
  getBuildingTabAdminPermisions() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}role-permission/`,
      {
        permission_id: [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114],
      },
      { headers },
    );
  }

  getResidentialPermisions() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}role-permission/`,
      {
        permission_id: [145, 146, 147, 148, 149],
      },
      { headers },
    );
  }

  // GET LAND TAB PERMISIONS
  // LAND TAB TENURE PERMISIONS
  getLandTenurePermisions() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}role-permission/`,
      {
        permission_id: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 15],
      },
      { headers },
    );
  }

  // GET CURRENT LOCATION

  getCurrentLocation() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}org_loc_get/`, { headers });
  }

  // BUILDING TENRE
  getBuldingTenurePermisions() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}role-permission/`,
      {
        permission_id: [212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 174],
      },
      { headers },
    );
  }

  // GET LAND TAB ADMIN PERMISIONS
  getLandTabAdminPermisions() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}role-permission/`,
      {
        permission_id: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      },
      { headers },
    );
  }

  getTaxandAssessmentPermisions() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}role-permission/`,
      {
        permission_id: [24, 25, 26, 27, 28, 29, 30, 31, 32],
      },
      { headers },
    );
  }

  getTaxInformationPermisions() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}role-permission/`,
      {
        permission_id: [33, 34, 35, 36, 37],
      },
      { headers },
    );
  }

  getBuildingTaxandAssessPermisions() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}role-permission/`,
      {
        permission_id: [131, 132, 133, 134, 135, 136, 137, 138, 139],
      },
      { headers },
    );
  }

  getBuildingTaxInfoPermisions() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}role-permission/`,
      {
        permission_id: [140, 141, 142, 143, 144],
      },
      { headers },
    );
  }

  getLandTabUtilityPermisions() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}role-permission/`,
      {
        permission_id: [19, 20, 21, 22, 23, 24],
      },
      { headers },
    );
  }

  getBuildingTabUtilityPermisions() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}role-permission/`,
      {
        permission_id: [122, 123, 124, 125, 126, 127, 128, 129, 130],
      },
      { headers },
    );
  }

  getLandOverViewPermisions() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}role-permission/`,
      {
        permission_id: [12, 13, 14, 15, 16, 17, 18],
      },
      { headers },
    );
  }

  getBuildingOverViewPermisions() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}role-permission/`,
      {
        permission_id: [115, 116, 117, 118, 119, 120, 121],
      },
      { headers },
    );
  }

  // GET ADMINISTRATIVE TYPES

  getAdministrativeTypes() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-sl-baunittype-10/`, { headers });
  }

  deleteParcelImage(su_id_value: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.delete(`${this.baseUrl}attrib-image-delete/su_id=${su_id_value}/`, {
      headers,
    });
  }

  getCreatedByDetails(su_id_value: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.post(`${this.baseUrl}create_by/`, { su_id: su_id_value }, { headers });
  }

  getSummaryDetails(su_id_value: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lnd-summary/su_id=${su_id_value}/`, { headers });
  }

  getAssessWardList() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}assess_ward_lst/`, { headers });
  }

  getAdministrativeInfo(su_id_value: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lnd-admin-info/su_id=${su_id_value}/`, { headers });
  }
  // LAND TAB ADMINISTRATIVE
  // ADMINISTRATIVE GET DATA
  loadLandUseCategories() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-ec-extlandusetype-28/`, { headers });
  }

  // SUB CATEGORY GET DATA
  loadSubCategory() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-ec-extlandusesubtype-29/`, { headers });
  }

  electricityOptions() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-ec-extlandusetype-28/`, { headers });
  }

  // LAND TAB LANDOVERVIEW
  // LANDOVERVIEW GET DATA
  getLandOverViewInfo(su_id_value: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}land-overview-info/su_id=${su_id_value}/`, { headers });
  }

  getBuildingSummaryDetails(su_id_value: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}bld-summary/su_id=${su_id_value}/`, { headers });
  }

  // LANDOVERVIEW GET DATA
  getBuildingOverViewInfo(su_id_value: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}bld-overview-info/su_id=${su_id_value}/`, { headers });
  }

  // GND GET LIST

  // SUB CATEGORY GET DATA
  GNDListdData() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-gnd-area/`, { headers });
  }

  // LANDOVERVIEW PATCH DATA
  updateLandOverviewInfo(su_id: any, data: any, tab: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    const allowedKeys = [
      'dimension_2d_3d',
      'area',
      'ext_landuse_type',
      'ext_landuse_sub_type',
      'reference_coordinate',
    ];
    // Filter the `data` object to keep only the allowed keys
    // Filter the `data` object to keep only the allowed keys and remove empty values
    const filteredData = Object.keys(data)
      .filter(
        (key) =>
          allowedKeys.includes(key) &&
          data[key] !== '' &&
          data[key] !== null &&
          data[key] !== undefined,
      )
      .reduce(
        (obj, key) => {
          obj[key] = data[key];
          return obj;
        },
        {} as Record<string, any>,
      );

    // Add `user_id` and `category`
    // filteredData['user_id'] = this.userService.getUser()?.user_id;
    // filteredData['category'] = tab;
    return this.http.patch(
      `${this.baseUrl}land-overview-info/update/su_id=${su_id}/`,
      filteredData, // Send only filtered data
      { headers },
    );
  }

  // UPDATE BUILDING OVERVIEW
  updateBuildOverviewInfo(su_id: any, data: any, tab: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    const allowedKeys = [
      'dimension_2d_3d',
      'area',
      'reference_coordinate',
      'hight',
      'surface_relation',
      'ext_builduse_type',
      'ext_builduse_sub_type',
      'roof_type',
      'wall_type',
      'no_floors',
    ];
    // Filter the `data` object to keep only the allowed keys
    // Filter the `data` object to keep only the allowed keys and remove empty values
    const filteredData = Object.keys(data)
      .filter(
        (key) =>
          allowedKeys.includes(key) &&
          data[key] !== '' &&
          data[key] !== null &&
          data[key] !== undefined,
      )
      .reduce(
        (obj, key) => {
          obj[key] = data[key];
          return obj;
        },
        {} as Record<string, any>,
      );

    // Add `user_id` and `category`
    // filteredData['user_id'] = this.userService.getUser()?.user_id;
    // filteredData['category'] = tab;
    return this.http.patch(
      `${this.baseUrl}bld-overview-info/update/su_id=${su_id}/`,
      filteredData, // Send only filtered data
      { headers },
    );
  }

  updateTaxAndAssessmentInfo(su_id: any, data: any, type: string) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    const allowedKeys = [
      'assessment_annual_value',
      'assessment_no',
      'assessment_percentage',
      ' date_of_valuation',
      'outstanding_balance',
      'property_type',
      'tax_date',
      'tax_annual_value',
      'tax_type',
      'tax_percentage',
      'year_of_assessment',
    ];
    // Filter the `data` object to keep only the allowed keys and remove empty values
    const filteredData = Object.keys(data)
      .filter(
        (key) =>
          allowedKeys.includes(key) &&
          data[key] !== '' &&
          data[key] !== null &&
          data[key] !== undefined,
      )
      .reduce(
        (obj, key) => {
          obj[key] = data[key];
          return obj;
        },
        {} as Record<string, any>,
      );
    if (data.tax_date) {
      filteredData['tax_date'] = data.tax_date;
    }
    if (data.date_of_valuation) {
      filteredData['date_of_valuation'] = data.date_of_valuation;
    }

    return this.http.patch(
      `${this.baseUrl}tax-assess-info/update/su_id=${su_id}/`,
      filteredData, // Send only filtered data
      { headers },
    );
  }

  // GET IT UNIT INFO
  getItInfo(su_id_value: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lnd-utinet-info/su_id=${su_id_value}/`, { headers });
  }

  // GET BULD INFO
  getBuildItInfo(su_id_value: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}bld-utinet-info/su_id=${su_id_value}/`, { headers });
  }

  // GET IT UNIT INFO
  getltAssesAndTaxInfo(su_id_value: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}tax-assess-info/su_id=${su_id_value}/`, { headers });
  }

  // GET LAND TENURE INFO
  getLandTenureInfo(su_id_value: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}ownership-rights-info/su_id=${su_id_value}/`, { headers });
  }

  // GET LAND TENURE PDF
  getlandTenurePDF(API: string): Observable<Blob> {
    let pdf_api = 'http://192.168.11.55:82/secure-media/documents/admin_source/11.pdf';
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });

    return this.http.get(pdf_api, { headers, responseType: 'blob' });
  }

  // WATER SUPPLY GET DATA

  getWaterSupply() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-su-sl-water-22/`, { headers });
  }

  // SANITATION SEWERGE GET DATA

  getSanitationSewerage() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-su-sl-sanitation-23/`, { headers });
  }

  // GULLY GET DATA

  getgully() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-su-sl-sanitation-23/`, { headers });
  }

  // LOAD ROOF TYPES
  loadRoofTypes() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-su-sl-roof-type-24/`, { headers });
  }

  // LOAD TELECOM TYPES
  loadTelecomTypes() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-tele-providers-38/`, { headers });
  }

  // LOAD INTERNET TYPES
  loadInternetTypes() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-int-providers-39/`, { headers });
  }

  // LOAD WALL TYPES
  loadWallType() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-su-sl-wall-type-25/`, { headers });
  }
  //LAND TENURE INFO PATCH DATA

  updateLandTenureInfo(su_id: any, data: any, tabs: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    const allowedKeys = [
      'drainage_system',
      'electricity',
      'garbage_disposal',
      'sanitation_gully',
      'sanitation_sewerage',
      'water_supply',
    ];

    const filteredData = Object.keys(data)
      .filter(
        (key) =>
          allowedKeys.includes(key) &&
          data[key] !== '' &&
          data[key] !== null &&
          data[key] !== undefined,
      )
      .reduce(
        (obj, key) => {
          obj[key] = data[key];
          return obj;
        },
        {} as Record<string, any>,
      );

    // Add `user_id` and `category`
    filteredData['user_id'] = this.userService.getUser()?.user_id;
    filteredData['category'] = tabs;
    return this.http.patch(
      `${this.baseUrl}utinet-info/update/su_id=${su_id}/`,
      filteredData, // Send only filtered data
      { headers },
    );
  }

  // LAND IT UNIT INFO PATCH DATA

  updateITUtilInfo(su_id: any, data: any, tab: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    const allowedKeys = [
      'drainage_system',
      'electricity',
      'garbage_disposal',
      'sanitation_gully',
      'sanitation_sewerage',
      'water_supply',
    ];

    const filteredData = Object.keys(data)
      .filter(
        (key) =>
          allowedKeys.includes(key) &&
          data[key] !== '' &&
          data[key] !== null &&
          data[key] !== undefined,
      )
      .reduce(
        (obj, key) => {
          obj[key] = data[key];
          return obj;
        },
        {} as Record<string, any>,
      );

    // Add `user_id` and `category`
    // filteredData['user_id'] = this.userService.getUser()?.user_id;
    // filteredData['category'] = tab;
    return this.http.patch(
      `${this.baseUrl}lnd-utinet-info/update/su_id=${su_id}/`,
      filteredData, // Send only filtered data
      { headers },
    );
  }

  updateltassesAndTaxInfo(su_id: any, data: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    const allowedKeys = [
      'drainage_system',
      'electricity',
      'garbage_disposal',
      'sanitation_gully',
      'sanitation_sewerage',
      'water_supply',
    ];

    const filteredData = Object.keys(data)
      .filter(
        (key) =>
          allowedKeys.includes(key) &&
          data[key] !== '' &&
          data[key] !== null &&
          data[key] !== undefined,
      )
      .reduce(
        (obj, key) => {
          obj[key] = data[key];
          return obj;
        },
        {} as Record<string, any>,
      );

    // Add `user_id` and `category`
    filteredData['user_id'] = this.userService.getUser()?.user_id;
    filteredData['category'] = 'LND';
    return this.http.patch(
      `${this.baseUrl}/tax-assess-info/update/su_id=${su_id}/`,
      filteredData, // Send only filtered data
      { headers },
    );
  }

  // BUILDING TAB GET PATCH START
  // ADMINISTRATIVE GET DATA
  getBuildingAdministrativeInfo(su_id_value: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}bld-admin-info/su_id=${su_id_value}/`, { headers });
  }

  getBAUnitID(su_id_value: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}ba-unit-id/su_id=${su_id_value}/`, { headers });
  }

  // ADMINISTRATIVE PATCH DATA
  updateAdministrativeInfo(su_id: any, data: any, tab: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });

    const allowedKeys = [
      'sl_ba_unit_type',
      'sl_ba_unit_name',
      'pd',
      'dist',
      'gnd_id',
      'eletorate',
      'local_auth',
      'remark',
      'access_road',
      'postal_ad_lnd',
      'ass_div',
      'no_floors',
      'house_hold_no',
      'sl_land_type',
      'administrative_type',
      'land_name',
    ];

    // Filter the `data` object to keep only the allowed keys
    // Filter the `data` object to keep only the allowed keys and remove empty values
    const filteredData = Object.keys(data)
      .filter(
        (key) =>
          allowedKeys.includes(key) &&
          data[key] !== '' &&
          data[key] !== null &&
          data[key] !== undefined,
      )
      .reduce(
        (obj, key) => {
          obj[key] = data[key];
          return obj;
        },
        {} as Record<string, any>,
      );

    // Add `user_id` and `category`
    // filteredData['user_id'] = this.userService.getUser()?.user_id;
    // filteredData['category'] = tab;
    return this.http.patch(
      `${this.baseUrl}lnd-admin-info/update/su_id=${su_id}/`,
      filteredData, // Send only filtered data
      { headers },
    );
  }

  updateBuildingAdministrativeInfo(su_id: any, data: any, tab: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });

    const allowedKeys = [
      'sl_ba_unit_type',
      'sl_ba_unit_name',
      'pd',
      'dist',
      'dsd',
      'gnd_id',
      'eletorate',
      'local_auth',
      'remark',
      'access_road',
      'postal_ad_lnd',
      'ass_div',
      'no_floors',
      'house_hold_no',
      'sl_land_type',
      'status',
      'bld_property_type',
      'postal_ad_build',
      'administrative_type',
      'building_name',
    ];
    // Filter the `data` object to keep only the allowed keys
    // Filter the `data` object to keep only the allowed keys and remove empty values
    const filteredData = Object.keys(data)
      .filter(
        (key) =>
          allowedKeys.includes(key) &&
          data[key] !== '' &&
          data[key] !== null &&
          data[key] !== undefined,
      )
      .reduce(
        (obj, key) => {
          obj[key] = data[key];
          return obj;
        },
        {} as Record<string, any>,
      );

    // Add `user_id` and `category`
    // filteredData['user_id'] = this.userService.getUser()?.user_id;
    // filteredData['category'] = tab;
    return this.http.patch(
      `${this.baseUrl}bld-admin-info/update/su_id=${su_id}/`,
      filteredData, // Send only filtered data
      { headers },
    );
  }

  uploadImage(formData: FormData) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Correct authorization format
      // Remove 'Content-Type': 'application/json' as it's handled by FormData
    });

    // Log the formData for debugging
    console.log('Sending formData:', formData);

    return this.http.post(
      `${this.baseUrl}attrib-image-upload/`,
      formData, // Pass formData directly, do not wrap it in JSON
      { headers },
    );
  }

  // BUILDING CATEGORIES
  loadBuildingCategories() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-ec-extbuildusetype-32/`, { headers });
  }

  loadBuildingSubCategory() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-ec-extbuildusesubtype-33/`, { headers });
  }

  updateBuildingITUtilInfo(su_id: any, data: any, tab: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    const allowedKeys = [
      'elec',
      'water',
      'water_drink',
      'tele',
      'internet',
      'sani_sewer',
      'sani_gully',
      'garbage_dispose',
      'expired_date',
      'issued_date',
      'drainage_system',
    ];

    const filteredData = Object.keys(data)
      .filter(
        (key) =>
          allowedKeys.includes(key) &&
          data[key] !== '' &&
          data[key] !== null &&
          data[key] !== undefined,
      )
      .reduce(
        (obj, key) => {
          obj[key] = data[key];
          return obj;
        },
        {} as Record<string, any>,
      );

    // Add `user_id` and `category`
    // filteredData['user_id'] = this.userService.getUser()?.user_id;
    // filteredData['category'] = tab;
    if (data.expired_date) {
      filteredData['expired_date'] = data.expired_date;
    }
    if (data.issued_date) {
      filteredData['issued_date'] = data.issued_date;
    }
    return this.http.patch(
      `${this.baseUrl}bld-utinet-info/update/su_id=${su_id}/`,
      filteredData, // Send only filtered data
      { headers },
    );
  }

  // RRR PANAL LOAD DATA

  //  MORTGAGE GET DATA
  loadMortgageTypes() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-sl-mortgagetype-13/`, { headers });
  }

  // GET SOURCE TYPES
  getSourceTypes() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-sl-administrativesourcetype-16/`, { headers });
  }

  getUnitTypes() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-la-baunittype-18/`, { headers });
  }

  //   GET PARTY DATA
  loadPartySubTypes() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-sl-party-type-1/`, { headers });
  }
  // OWNERSHIP GET DATA
  loadOwnershipTypes() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-sl-righttype-9/`, { headers });
  }

  // GET GENDER TYPES

  loadGenderTypes() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-sl-gendertype-8/`, { headers });
  }

  // GET AUTHORITY TYPES
  getAuthorityTypes() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-org-name-40/`, { headers });
  }

  // GET EDUCATION TYPES
  getReligionTypes() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-sl-religions-7/`, { headers });
  }

  grtMarriedStatus() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-sl-married-status-6/`, { headers });
  }
  // GET HELTH TYPES

  getHelthdTypes() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-sl-health-status-5/`, { headers });
  }

  // GET PARTY TYPES

  getPartyTypes() {}
  // GET RACE TYPES
  getRaceTypes() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-sl-race-4/`, { headers });
  }

  getEducationLevelTypes() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-sl-education-level-3/`, { headers });
  }

  // GET GROUP Names

  getGroupTypes() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-sl-group_party_type-41/`, { headers });
  }

  // GET GROUP TYPES

  getGroupNames() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}sl-party-data-type/Group/`, { headers });
  }

  // GET GROUP TYPES

  getMinisrtTypes() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}sl-party-data-type/Ministry/`, { headers });
  }

  // GET SHARE TYPES

  loadRightshareTypes() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-sl-rightsharetype-14/`, { headers });
  }

  loadRightPartyRoleTypes() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}lst-sl-partyroletype-2/`, { headers });
  }

  // GET PDF FILE

  getPDF(file_path: any) {
    console.log(file_path);
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(file_path, { headers, responseType: 'blob' });
  }

  // LAYER PERMISIONS
  getDefaultLayersPermisions() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}role-permission/`,
      {
        permission_id: [80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92],
      },
      { headers },
    );
  }

  // API service method should return an Observable
  getParsalImage(su_id: any): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}attrib-image-retrive/su_id=${su_id}/`, {
      headers,
      responseType: 'blob',
    });
  }

  // GET PARTY DATA COMMON FUNCTION
  //GET  PARTY DATA
  getCivilianPartyData(data: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}sl-party-data/`,
      {
        user_id: this.userService.getUser()?.user_id,
        ext_pid_type: data.party_registration_type,
        ext_pid: data.registration_number,
      },
      { headers },
    );
  }

  //GET MINISTRY AND GROUP PARTY DATA
  getPartyDataFromPID(data: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}sl-party-data-pid/`,
      {
        pid: data.registration_number,
      },
      { headers },
    );
  }

  // GET PARTY DATA BY NAME
  getPartyDataByName(data: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}sl-party-data-pid/`,
      {
        pid: data.registration_number,
      },
      { headers },
    );
  }
  // GET ADMIN SOURCE EXISTING DATA

  getExistingAdminSourceData(su_id: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });

    return this.http.get(`${this.baseUrl}rrr_data_get/?su_id=${su_id}`, {
      headers,
    });
  }

  // PATH CIVILIAN PARTY DATA

  pathchCivilianPartyForm(type: string, value: any, id?: any): Observable<any> {
    value.done_by = this.userService.getUser()?.user_id;
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });

    const httpOptions = { headers };

    if (type === 'update' && id) {
      return this.http.patch(`${this.baseUrl}sl-party/update/pid=${id}/`, value, httpOptions);
    } else if (type === 'create') {
      return this.http.post(`${this.baseUrl}sl-party/`, value, httpOptions);
    }

    return throwError(() => new Error('Invalid operation type')); // Returns an Observable that errors out
  }

  // CREATE ROLE
  createRole(formData: any): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.post(`${this.baseUrl}user-roles/`, formData, httpOptions);
  }

  // CREATE LAYER
  createLayer(formData: any): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.post(`${this.baseUrl}layerdata/`, formData, httpOptions);
  }

  // ADD NEW USERS TO ROLE

  // CREATE ROLE
  addUsersToRole(formData: any, role_id: any): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.patch(
      `${this.baseUrl}user-roles/update/role_id=${role_id}/`,
      formData,
      httpOptions,
    );
  }

  // DELETE LAYER
  deleteLayer(formData: any, id: any): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.delete(`${this.baseUrl}layerdata/delete/id=${id}/`, httpOptions);
  }

  // EDIT LAYER
  updateLayer(formData: any, id: any): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.patch(`${this.baseUrl}layerdata/update/id=${id}/`, formData, httpOptions);
  }

  // DELETE ROLE
  deleteRole(role_id: any): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.delete(`${this.baseUrl}user-roles/delete/role_id=${role_id}/`, httpOptions);
  }

  postAdminSource(formData: any): Observable<any> {
    // formData.user_id = this.userService.getUser()?.user_id;
    formData.append('user_id', this.userService.getUser()?.user_id);

    console.log('Form Data to be sent:', formData);

    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.post(`${this.baseUrl}rrr_data_save/`, formData, httpOptions);
  }

  // ADMIN APIS
  // GET USERS

  getAdminUsers() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.get(`${this.baseUrl}list/`, httpOptions);
  }

  getOrganizationsList() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.get(`${this.baseUrl}sl-orgnization/`, httpOptions);
  }

  getOrganizationById(id: string) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.get(`${this.baseUrl}sl-orgnization/org_id=${id}/`, httpOptions);
  }

  getDistList() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.get(`${this.baseUrl}dist-list/`, httpOptions);
  }

  getOrganizationLocationById(id: string) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.get(`${this.baseUrl}org_loc/org_id=${id}/`, httpOptions);
  }

  createNewOrganization(formData: any): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.post(`${this.baseUrl}sl-orgnization/`, formData, httpOptions);
  }

  // GET ROLE USERS
  getAdminRoleUsers() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.get(`${this.baseUrl}list-add-user-roles/`, httpOptions);
  }
  // GET DEPARTMENTS
  getDepartments(): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };

    return this.http.get(`${this.baseUrl}sl-department-list/`, httpOptions);
  }

  // GET ADMIN LAYERS
  getAdminLayers(): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };

    return this.http.get(`${this.baseUrl}layerdata_get_admin_panel/`, httpOptions);
  }
  // GET PERMISIONS
  getPermisionsList(role_id: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.get(`${this.baseUrl}role-permission-all/role_id=${role_id}/`, httpOptions);
  }

  getDashboardData() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.get(`${this.baseUrl}org_details/`, httpOptions);
  }

  getAdminContactInfo() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.get(`${this.baseUrl}admin_acc_data/`, httpOptions);
  }

  getRecentLogins() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.get(`${this.baseUrl}recent_logins/`, httpOptions);
  }

  getUserOverview() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.get(`${this.baseUrl}user_overview/`, httpOptions);
  }

  // GET ROLES LIST
  getRolesList() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.get(`${this.baseUrl}user-roles-get-admin/`, httpOptions);
  }

  // CREATE NEW USER
  createNewUser(formData: any): Observable<any> {
    // formData.user_type = 'user';
    // formData.org_id = this.userService.getUser()?.org_id;
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.post(`${this.baseUrl}create/`, formData, httpOptions);
  }

  // EDIT NEW USER
  editUser(document_id: any, formData: any): Observable<any> {
    // formData.user_type = 'user';
    // formData.org_id = this.userService.getUser()?.org_id;
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.patch(`${this.baseUrl}update/user_id=${document_id}/`, formData, httpOptions);
  }

  editOrganization(document_id: any, formData: any): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.patch(
      `${this.baseUrl}sl-organization/update/org_id=${document_id}/`,
      formData,
      httpOptions,
    );
  }

  editOrganizationLocation(document_id: any, formData: any): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.patch(
      `${this.baseUrl}org_loc/update/org_id=${document_id}/`,
      formData,
      httpOptions,
    );
  }

  // EDIT PERMISIONS

  editUserPermisions(document_id: any, formData: any): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.patch(
      `${this.baseUrl}role-permission/update/id=${document_id}/`,
      formData,
      httpOptions,
    );
  }

  postPassword(password: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Add token for authentication
    });
    const httpOptions = { headers };

    // Fix the URL and make sure the parameters are correctly passed
    return this.http.post(`${this.baseUrl}check-password/`, password, httpOptions);
  }

  // UPDATE USER PASSWORD FROM ADMIN
  postAdminData(admin: any): Observable<any> {
    admin.admin_id = this.userService.getUser()?.user_id; // Make sure user_id is assigned correctly
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Add token for authentication
    });
    const httpOptions = { headers };

    // Fix the URL and make sure the parameters are correctly passed
    return this.http.post(`${this.baseUrl}reset_password/`, admin, httpOptions);
  }

  // UPDATE ASSESSMENT WARD
  updateAssessmentWard(formData: any, id: any): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.patch(`${this.baseUrl}assess_ward_update/id=${id}/`, formData, httpOptions);
  }

  //CREATE DEPARTMENT
  createAssesmentWard(formData: any): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.post(`${this.baseUrl}assess_ward_lst/`, formData, httpOptions);
  }

  //UPDATE DEPARTMENT
  updateDepartment(formData: any, id: any): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.patch(`${this.baseUrl}sl-department/update/id=${id}/`, formData, httpOptions);
  }

  //CREATE DEPARTMENT
  createDepartment(formData: any): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.post(`${this.baseUrl}sl-department/`, formData, httpOptions);
  }

  //DELETE DEPARTMENT
  deleteDepartment(id: any): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.delete(`${this.baseUrl}sl-department/update/id=${id}/`, httpOptions);
  }

  deleteRrr(id: string): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });

    const payload = {
      status: false,
    };
    return this.http.patch(`${this.baseUrl}ba_unit/update/${id}/`, payload, { headers });
  }

  // LAYER PERMISIONS
  getLayersPermisions() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}role-permission-layerpanel/`, { headers });
  }

  userAuthentication(): Observable<{
    is_active: boolean;
    is_role_id: boolean;
    is_token_valid: boolean;
    is_org_active: boolean;
  }> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    const roleId = localStorage.getItem('role_id');
    if (roleId === null) {
      return throwError(() => new Error('Role ID is not set in localStorage'));
    }
    const body = {
      role_id: parseInt(roleId!),
    };
    return this.http.post<{
      is_active: boolean;
      is_role_id: boolean;
      is_token_valid: boolean;
      is_org_active: boolean;
    }>(`${this.baseUrl}user-authentication/`, body, { headers });
  }

  getUserDetails() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}me/`, { headers });
  }

  getToolbarPermission() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}role-permission/`,
      {
        permission_id: [201],
      },
      { headers },
    );
  }

  getOrgAreas(pd: string): Observable<AreaRow[]> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get<AreaRow[]>(`${this.baseUrl}pd-data/${pd}/`, { headers });
  }

  updateOrgArea(
    id: string,
    data: {
      gid: number;
    }[],
  ): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    const gidArray = data.map((item) => item.gid);
    const payload = {
      org_area: gidArray?.length ? gidArray : null,
    };
    return this.http.patch(`${this.baseUrl}org-area/update/org_id=${id}/`, payload, { headers });
  }

  getOrganizationAreaById(id: string) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
    });
    const httpOptions = { headers };
    return this.http.get(`${this.baseUrl}org-area-get/org_id=${id}/`, httpOptions);
  }

  getAdminPermissions() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}role-permission/`,
      {
        permission_id: [251, 252, 253],
      },
      { headers },
    );
  }

  getLayersPopPermissions() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}role-permission/`,
      {
        permission_id: [94],
      },
      { headers },
    );
  }

  getRrrByFeatureId(featureId: string): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.baseUrl}rrr-by-featureid/feature_id=${featureId}/`, { headers });
  }

  getRRRFile(url: string): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });
    return this.http.get(url, { headers });
  }

  getRRRPermisions() {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.post(
      `${this.baseUrl}role-permission/`,
      {
        permission_id: [38],
      },
      { headers },
    );
  }

  load3DData(featureId: string) {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`, // Ensure correct format
      'Content-Type': 'application/json',
    });
    return this.http.get('https://infobhoomiback.geoinfobox.com/api/user/cityjson/', { headers });
  }

  createDynamicAttribute(payload: {
    section_key: string;
    label: string;
    su_id: string | number;
  }): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });

    const apiUrl = `${this.baseUrl}dynamic-attribute/`;
    return this.http.post(apiUrl, payload, { headers });
  }

  updateDynamicAttributeValue(payload: {
    attribute_id: number;
    su_id: string | number;
    value: string;
  }): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    });

    const apiUrl = `${this.baseUrl}dynamic-attribute-value/`;

    return this.http.post(apiUrl, payload, { headers });
  }
}
