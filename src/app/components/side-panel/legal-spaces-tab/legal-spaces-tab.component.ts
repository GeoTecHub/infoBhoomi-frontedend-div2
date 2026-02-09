import { Component } from '@angular/core';
import { CollapsibleComponent } from '../../shared/collapsible/collapsible.component';
import { KeyValueComponent } from '../../shared/key-value/key-value.component';
import { CustomButtonsComponent } from '../../shared/custom-buttons/custom-buttons.component';

@Component({
  selector: 'app-legal-spaces-tab',
  standalone: true,
  imports: [CollapsibleComponent, KeyValueComponent, CustomButtonsComponent],
  templateUrl: './legal-spaces-tab.component.html',
  styleUrl: './legal-spaces-tab.component.css',
})
export class LegalSpacesTabComponent {
  legalSpace_id = '2933309303';
  img = 'sample/s_img_1.jpg';

  //****************************** for outer-legal space **********************************

  //************* admin info_outer-legal space **************
  adminUnitType_O_LS = 'PRIVATE/STATE/UNIDENTIFIED';

  // core details
  province_O_LS = 'Uva';
  district_O_LS = 'Badulla';
  dsd_O_LS = 'Badulla Divisional Sec.Div.';

  gnd_O_LS = 'BADULLA SOUTH';
  assesmentWard_O_LS = 'DIV 2';
  electorate_O_LS = '';
  streetName_O_LS = 'MAIN ROAD SOUTH';
  landName_O_LS = 'pitawela Pathana, Lot A';
  postalAddress_O_LS = 'NO 32, MAIN STREET, BADULLA';

  // *************** land-legal space overview ***********
  legalSpaceSystemID = '';
  dimension_O_LS = '2D';
  area_O_LS = '';
  areaUnit_O_LS = 'SQUARE METER';
  refPoint_O_LS = '80.13254, 6.23542';
  surfaceRelation_O_LS = 'ON / ABOVE/ BELOW SURFACE';
  landUseCategory_O_LS = 'observe the detailed view';
  subcategory_O_LS = 'observe the detailed view';

  // **************** utility network info_outer-legal space *************
  electricity_O_LS = 'IN USE/NOT IN USE/ PLANNED';
  telecom_O_LS = 'IN USE/NOT IN USE/ PLANNED';
  water_O_LS = 'IN USE/NOT IN USE/ PLANNED';
  drainage_O_LS = 'IN USE/NOT IN USE/ PLANNED';
  swerage_O_LS = 'observe the detailed view';
  gully_O_LS = 'observe the detailed view';
  garbageDisposal_O_LS = 'TO MC TRUCK';

  // **************** land tenure_outer-legal space *************
  rightType_O_LS = 'SAHRED/ INDIVIDUAL';
  share_O_LS = 'PERCENTAGE OF SAHRE';

  partyType_O_LS = 'observe the detailed view';
  partyRole_O_LS = 'observe the detailed view';
  partyName_O_LS = 'WSMR JAYASINGHE';
  partyNic_O_LS = '63255978V';
  partyTele_O_LS = '038 2261655';
  partyAddress_O_LS = 'NO 2, WIHARA ROAD, BADULLA';

  adminSourceType_O_LS = '';
  availabilityStatus_O_LS = '';
  description_O_LS = '';
  acceptanceDate_O_LS = '';
  ExternalArchiveRef_O_LS = '';
  lifeSpanStamp_O_LS = '';
  file_O_LS = '';
  refNo_O_LS = '';
  docOwner_O_LS = '';

  resParty_O_LS = '';
  resType_O_LS = '';
  resID_O_LS = '';
  resDesc_O_LS = '';
  resShare_O_LS = '';
  resShareType_O_LS = '';

  restrictParty_O_LS = '';
  restrictType_O_LS = '';
  restrictID_O_LS = '';
  restrictDesc_O_LS = '';
  restrictShare_O_LS = '';
  restrictShareType_O_LS = '';

  // ***************** survey plan pdf_outer-legal space *****************
  spFile_O_LS = 'PDF';
  spNo_O_LS = '1589';

  spSubParentPNo_O_LS = '363';
  spSubApprovalStatus_O_LS = '';
  spSubApprovalDate_O_LS = '';
  spSubApprovalNo_O_LS = '';

  // ***************** assesment and tax info_outer-legal space ****************
  assesmntNo_O_LS = '25';
  annualValue_O_LS = 'RS 250000.00';
  presentage_O_LS = '8%';
  annualFee_O_LS = 'RS 20000.00';
  valuationDate_O_LS = '2/25/2006';
  assesmntYear_O_LS = '2015';
  propertyType_O_LS = 'ASBESTOS ROOFED 2 STORE BUILDING';
  ownerName_O_LS = 'WSMR JAYASINGHE';
  outStndingBalance_O_LS = 'RS 40000.00';

  taxAnnualValue_O_LS = '';
  taxDate_O_LS = '';
  taxType_O_LS = '';
  taxAnnualFee_O_LS = '';

  //****************************** for building-legal space **********************************

  //************* admin info_building-legal space **************
  adminUnitType_B_LS = 'PRIVATE/STATE/UNIDENTIFIED';

  // core details
  province_B_LS = 'Uva';
  district_B_LS = 'Badulla';
  dsd_B_LS = 'Badulla Divisional Sec.Div.';

  gnd_B_LS = 'BADULLA WEST';
  assesmentWard_B_LS = 'DIV 2';
  electorate_B_LS = '';
  streetName_B_LS = 'MAIN ROAD SOUTH';
  buildingName_B_LS = 'VISAKA HALL';
  postalAddress_B_LS = 'NO 32, MAIN STREET, BADULLA';
  houseHoldNumber_B_LS = '26/A';
  numOfFloors_B_LS = '';

  // *************** building overview_building-legal space ***********
  legalSpaceSystemID_B_LS = '';
  dimension_B_LS = '2D';
  groundFloorArea_B_LS = '';
  areaUnit_B_LS = 'SQUARE METER';
  refPoint_B_LS = '80.13254, 6.23542';
  height_B_LS = '';
  heightUnits_B_LS = '';
  surfaceRelation_B_LS = 'ON / ABOVE/ BELOW SURFACE';
  apartmentUseCategory_B_LS = 'observe the detailed view';
  subcategory_B_LS = 'observe the detailed view';

  // **************** utility network info *************
  electricity_B_LS = 'observe the detailed view';
  telecom_B_LS = 'observe the detailed view';
  internet_B_LS = 'observe the detailed view';
  waterDrinking_B_LS = 'observe the detailed view';
  waterOther_B_LS = 'observe the detailed view';
  sanitation_B_LS = 'observe the detailed view';
  garbageDisposal_B_LS = 'TO MC TRUCK';
  fireRescueRecommendation_B_LS = 'YES';
  fireRescueIssuedDate_B_LS = '21/002/2021';

  // **************** building tenure *************
  rightType_B_LS = 'SAHRED/ INDIVIDUAL';
  share_B_LS = 'PERCENTAGE OF SAHRE';

  partyType_B_LS = 'observe the detailed view';
  partyRole_B_LS = 'observe the detailed view';
  partyName_B_LS = 'WSMR JAYASINGHE';
  partyNic_B_LS = '63255978V';
  partyTele_B_LS = '038 2261655';
  partyAddress_B_LS = 'NO 2, WIHARA ROAD, BADULLA';

  adminSourceType_B_LS = '';
  availabilityStatus_B_LS = '';
  description_B_LS = '';
  acceptanceDate_B_LS = '';
  ExternalArchiveRef_B_LS = '';
  lifeSpanStamp_B_LS = '';
  file_B_LS = '';
  refNo_B_LS = '';
  docOwner_B_LS = '';

  resParty_B_LS = '';
  resType_B_LS = '';
  resID_B_LS = '';
  resDesc_B_LS = '';
  resShare_B_LS = '';
  resShareType_B_LS = '';

  restrictParty_B_LS = '';
  restrictType_B_LS = '';
  restrictID_B_LS = '';
  restrictDesc_B_LS = '';
  restrictShare_B_LS = '';
  restrictShareType_B_LS = '';

  // **************** Residents information *************
  resiInforPartyType_B_LS = 'Owner, Family Member, Boaders';
  resiInforPartyRole_B_LS = 'observe the detailed view';
  resiInforPartyName_B_LS = 'WSMR JAYASINGHE';
  resiInforPartyNIC_B_LS = '63255978V';
  resiInforPartyTele_B_LS = '038 2261655';
  resiInforPartyAddress_B_LS = 'NO 2, WIHARA ROAD, BADULLA';

  // ***************** survey plan pdf *****************
  spFile_B_LS = 'PDF';
  spNo_B_LS = '1589';
  spApprovalStatus_B_LS = '';
  spApprovedDate_B_LS = '';

  // ***************** assesment and tax info ****************
  assesmntNo_B_LS = '25_A';
  annualValue_B_LS = 'RS 250000.00';
  presentage_B_LS = '8%';
  annualFee_B_LS = 'RS 20000.00';
  valuationDate_B_LS = '2/25/2006';
  assesmntYear_B_LS = '2015';
  propertyType_B_LS = 'ASBESTOS ROOFED 2 STORE BUILDING';
  ownerName_B_LS = 'WSMR JAYASINGHE';
  outStndingBalance_B_LS = 'RS 40000.00';

  taxAnnualValue_B_LS = '';
  taxDate_B_LS = '';
  taxType_B_LS = '';
  taxAnnualFee_B_LS = '';
}
