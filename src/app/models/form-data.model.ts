/**
 * @KD-96
 */
// ***** land tab *****
export interface CombinedLandData {
  adminInfo: SL_BA_Unit;
  landOverview: LAND_OVERVIEW;
  utilInfo: L_UTILITY_INFO;
  assesTaxInfo: L_ASSES_TAX_INFO;
  landTenure: L_LAND_TENURE;
}
export interface SL_BA_Unit {
  ba_unit_id: number;
  sl_ba_unit_type: string;
  sl_ba_unit_name: string;
  pd: string;
  dist: string;
  dsd: string;
  gnd: string;
  eletorate: string;
  local_auth: string;
  status: boolean;
  remark: string;
  su_id: number;
  access_road: string;
  postal_ad_lnd: string;
}

export interface LAND_OVERVIEW {
  id: number;
  dimension_2d_3d: string;
  area: string;
  area_unit: string;
  reference_coordinate: string;
  ext_landuse_type: string;
  ext_landuse_sub_type: string;
}

export interface L_UTILITY_INFO {
  water_supply: string;
  electricity: string;
  drainage_system: string;
  sanitation_sewerage: string;
  sanitation_gully: string;
  garbage_disposal: string;
}

export interface L_ASSES_TAX_INFO {
  assessment_no: string;
  assessment_annual_value: string;
  assessment_percentage: string;
  date_of_valuation: string;
  year_of_assessment: string;
  property_type: string;
  outstanding_balance: string;
  assessment_name: string;
  tax_annual_value: string;
  tax_percentage: string;
  tax_date: string;
  tax_type: string;
}

export interface L_LAND_TENURE {
  share: number;
  right_type: string;
  time_spec: string;
  party_info: {
    party_name: string;
    la_party_type: string;
    sl_party_type: string;
    ext_pid_type: string;
    ext_pid: string;
    pmt_address: string;
    tp: [string];
  };
  admin_source_info: {
    reference_no: string;
    file_url: string;
  };
}

export interface L_SURVEY_PLAN {
  plan_no: Number;
  survey_date: Date;
  sutveyor_name: string;
}

// ------------------------ all in one (not used) ------------------------
export interface LandDataFormModel {
  adminInfo: {
    adminUnitType: string;
    province: string;
    district: string;
    dsd: string;
    gnd: string;
    assesmentWard: string;
    electorate: string;
    streetName: string;
    landName: string;
    postalAddress: string;
  };
  landOverview: {
    parcelSystemID: string;
    dimension: string;
    area: string;
    areaUnit: string;
    refPoint: string;
    surfaceRelation: string;
    landUseCategory: string;
    subcategory: string;
  };
  utilityNetworkInfo: {
    electricity: string;
    telecom: string;
    water: string;
    drainage: string;
    swerage: string;
    gully: string;
    garbageDisposal: string;
  };
  landTenure: {
    rightType: string;
    share: string;
    partyType: string;
    partyRole: string;
    partyName: string;
    partyNic: string;
    partyTele: string;
    partyAddress: string;
  };
  surveyPlanPdf: {
    spFile: string;
    spNo: string;
    spSubParentPNo: string;
    spSubApprovalStatus: string;
    spSubApprovalDate: string;
    spSubApprovalNo: string;
  };
  assessmentAndTaxInfo: {
    assesmntNo: string;
    annualValue: string;
    presentage: string;
    annualFee: string;
    valuationDate: string;
    assesmntYear: string;
    propertyType: string;
    ownerName: string;
    outStndingBalance: string;
    taxAnnualValue: string;
    taxDate: string;
    taxType: string;
    taxAnnualFee: string;
  };
  adminInfoForLinePoint: {
    adminUnitType_for_line_point: string;
    name: string;
    authority: string;
  };
  overviewForLinePoint: {
    systemID: string;
    infoBhoomiID: string;
    dimension_for_line_point: string;
    xType: string;
    builtType: string;
    length: string;
    width: string;
    lenearUnit: string;
    referencePoint: string;
    surfaceRelation_for_line_point: string;
    startPoint_line: string;
    endPoint_line: string;
    startCoordinate_line: string;
    endCoordinate_line: string;
  };
}
