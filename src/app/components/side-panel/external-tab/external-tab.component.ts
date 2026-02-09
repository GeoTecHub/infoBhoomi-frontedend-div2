import { Component } from '@angular/core';
import { CollapsibleComponent } from '../../shared/collapsible/collapsible.component';
import { CustomButtonsComponent } from '../../shared/custom-buttons/custom-buttons.component';
import { KeyValueComponent } from '../../shared/key-value/key-value.component';

@Component({
  selector: 'app-external-tab',
  standalone: true,
  imports: [CollapsibleComponent, KeyValueComponent, CustomButtonsComponent],
  templateUrl: './external-tab.component.html',
  styleUrl: './external-tab.component.css',
})
export class ExternalTabComponent {
  feature_id = '2933309303';
  img = 'sample/s_img_1.jpg';

  //****************************** natural feature **********************************
  //************* admin info_natural feature **************
  adminUnitType_NF = 'PRIVATE/STATE/UNIDENTIFIED';

  // core details
  province_NF = 'Uva';
  district_NF = 'Badulla';
  dsd_NF = 'Badulla Divisional Sec.Div.';
  gnd_NF = 'BADULLA SOUTH';
  assesmentWard_NF = 'DIV 2';
  featureName_NF = 'Malaka oya';
  featureAuthority_NF = 'Mahaweli/irrigation';

  // *************** overview_natural feature***********
  systemID_NF = '';
  infoBhoomiID_NF = '';
  dimension_NF = '2D';
  type_NF = 'water feature/ Rock';
  Xtype_NF = 'seasonal water feature/non seasonal water feature';
  builtType_NF = '';
  area_NF = '250';
  areaUnit_NF = 'SQUARE METER';
  width_NF = '300';
  lenearUnit_NF = 'm';
  refPoint_NF = '80.13254, 6.23542';
  surfaceRelation_NF = 'ON / ABOVE/ BELOW SURFACE';

  //****************************** man made feature **********************************
  //************* admin info_man made feature **************
  adminUnitType_MMF = 'PRIVATE/STATE/UNIDENTIFIED';
  featureName_MMF = 'Wihara Mawatha';
  featureAuthority_MMF = 'RDA/Privincial Road Department/ PRDA or MC';

  // *************** overview_man made feature***********
  systemID_MMF = '42';
  infoBhoomiID_MMF = '';
  dimension_MMF = '2D';
  type_MMF = 'water feature, Transmission feature';
  Xtype_MMF = 'Main Road/ Sub Road/ Collective Road';
  builtType_MMF = 'Aspalt';
  area_MMF = '';
  areaUnit_MMF = '';
  width_MMF = '9';
  lenearUnit_MMF = 'm';
  grade_MMF = 'Grade B';
  refPoint_MMF = '';
  surfaceRelation_MMF = '';

  //****************************** temporary feature **********************************
  //************* admin info_temporary feature **************
  adminUnitType_TF = 'PRIVATE/STATE/UNIDENTIFIED';
  name_TF = 'Sample oya';
  authority_TF = 'Mahaweli/irrigation';

  // *************** overview_man made feature***********
  systemID_TF = '';
  infoBhoomiID_TF = '';
  dimension_TF = '';
  Xtype_TF = '';
  builtType_TF = '';
  area_TF = '';
  width_TF = '';
  lenearUnit_TF = '';
  refPoint_TF = '';
  surfaceRelation_TF = '';
  startPoint_TF = '';
  endPoint_TF = '';
  startCoordinate_TF = '';
  endCoordinate_TF = '';
  type_TF = '';
  subType_TF = '';
  firstColor_TF = '';
  secondColor_TF = '';
  thirdColor_TF = '';
}
