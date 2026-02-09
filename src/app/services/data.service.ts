/**
 * @KD-96
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  SL_BA_Unit,
  LAND_OVERVIEW,
  L_UTILITY_INFO,
  L_ASSES_TAX_INFO,
  L_LAND_TENURE,
} from '../models/form-data.model';

import { APIsService } from './api.service';
import { HttpHeaders } from '@angular/common/http';
import { Token } from '../core/constant'; // Import the Token constant

@Injectable({
  providedIn: 'root',
})
export class DataService {
  token = localStorage.getItem('Token');

  private landDataCache: any = null;

  constructor(
    private http: HttpClient,
    private apiService: APIsService,
  ) {}

  /**********************************************************
   * ********************* GET ******************************
   * ********************************************************
   * Method to get data
   */
  // LAND TAB
  getLandData<T>(su_id: string, apiEndpoint: string): Observable<T> {
    const token = Token.TOKEN; // Retrieve the token from local storage
    const headers = new HttpHeaders({
      Authorization: `Token ${token}`, // Set the Authorization header
    });
    return this.http.get<T>(apiEndpoint, { headers });
  }

  // LAND TAB > ADMIN INFO
  getLandAdminInfo(su_id: string): Observable<SL_BA_Unit[]> {
    return this.getLandData<SL_BA_Unit[]>(su_id, this.apiService.GET_LAND_INFO(su_id));
  }

  // LAND TAB > LAND OVERVIEW
  getLandOverview(su_id: string): Observable<LAND_OVERVIEW[]> {
    return this.getLandData<LAND_OVERVIEW[]>(su_id, this.apiService.GET_LAND_OVERVIEW(su_id));
  }

  // LAND TAB > UTILITY INFO
  getLandUtilInfo(su_id: string): Observable<L_UTILITY_INFO[]> {
    return this.getLandData<L_UTILITY_INFO[]>(su_id, this.apiService.GET_LAND_UTIL_INFO(su_id));
  }

  // LAND TAB > LAND TENUE
  getLandTenure(su_id: string): Observable<L_LAND_TENURE[]> {
    return this.getLandData<L_LAND_TENURE[]>(su_id, this.apiService.GET_LAND_TENURE(su_id));
  }

  // LAND TAB > ASSESMENT & TAX INFO
  getLandAssesTaxInfo(su_id: string): Observable<L_ASSES_TAX_INFO[]> {
    return this.getLandData<L_ASSES_TAX_INFO[]>(su_id, this.apiService.GET_ASSES_TAX_INFO(su_id));
  }

  // get uilding information
  getBuildingInfo(building_id: string) {}

  getLegalSpaceInfo(legalSpace_id: string) {}

  // get PDF
  getPDF(link: string) {
    const token = Token.TOKEN;
    const headers = { Authorization: `Token ${token}` };
    // const headers = new HttpHeaders({
    //   Authorization: `Token ${token}`, // Set the Authorization header
    // });

    this.http.get(link, { headers, responseType: 'blob' }).subscribe((response) => {
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    });
  }

  /**********************************************************
   * *************** GET - dropdown lists *******************
   * ********************************************************
   * Method to get data for dropdowns
   */
  getDropdownOptions(ddListID: string): Observable<{ id: string; name: string }[]> {
    // Replace 'dropdown-endpoint' with the actual endpoint for dropdown data
    return this.http.get<{ id: string; name: string }[]>(
      this.apiService.ADMIN_UNIT_TYPES_DD(ddListID),
    );
  }

  /**********************************************************
   * ********************* UPDATE ***************************
   * ********************************************************
   * Method to save data using PATCH
   */
  saveData(endpoint: string, land_id: string, updatedData: any): Observable<any> {
    const token = Token.TOKEN;
    const headers = new HttpHeaders({
      Authorization: `Token ${token}`, // Set the Authorization header
    });

    return this.http.patch<any>(
      endpoint.replace('{land_id}', land_id), // Replace placeholder in endpoint with land_id
      updatedData,
      { headers },
    );
  }

  // LAND TAB ADMIN INFO
  save_lt_adminInfo(land_id: string, updatedData: any): Observable<any> {
    return this.saveData(this.apiService.UPDATE_LT_ADMIN_INFO(land_id), land_id, updatedData);
  }

  // LAND OVERVIEW
  save_lt_landOverview(land_id: string, updatedData: any): Observable<any> {
    return this.saveData(this.apiService.UPDATE_LT_LAND_OVERVIEW(land_id), land_id, updatedData);
  }

  // UTILITY INFO
  save_lt_utilInfo(land_id: string, updatedData: any): Observable<any> {
    return this.saveData(this.apiService.UPDATE_LT_UTIL_INFO(land_id), land_id, updatedData);
  }

  // LAND TENURE
  save_lt_land_tenue(land_id: string, updatedData: any): Observable<any> {
    return this.saveData(this.apiService.UPDATE_LT_UTIL_INFO(land_id), land_id, updatedData);
  }

  // ASSESMENT & TAX INFO
  save_lt_assesTaxInfo(land_id: string, updatedData: any): Observable<any> {
    return this.saveData(this.apiService.UPDATE_TAX_ASSES_INFO(land_id), land_id, updatedData);
  }
}
