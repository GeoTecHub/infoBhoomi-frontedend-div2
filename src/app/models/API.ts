export interface API_LOGIN_RESPONSE {
  org_level: number;
  org_name: string;
  token: string;
  user: {
    username: string;
    id: number;
    userID: string;
    email: string;
    first_name: string;
    last_name: string;
    mobile: string;
    address: string;
    nic: string;
    birthday: string;
    sex: string;
    department: string;
    post: string;
    user_type: string;
    is_active: boolean;
    org_id: number;
    emp_id: string;
    role_id: number;
  };
}

export interface VERTEXT_API_LOGIN_RESPONSE {
  id: any;
  token: string;
  user: {
    id: any;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    display_name: string;
    mobile: string;
    address: string;
    user_type: string;
    is_active: boolean;
    license_number: string;
  };
}

export class LoginModel {
  username: string;
  password: string;
  constructor() {
    this.username = '';
    this.password = '';
  }
}

export class ChangePasswordModel {
  old_password: string;
  new_password: string;
  confirm_new_password: string;
  constructor() {
    this.old_password = '';
    this.new_password = '';
    this.confirm_new_password = '';
  }
}

export class ChangeUsernameModel {
  new_username: string;
  constructor() {
    this.new_username = '';
  }
}

export interface API_LAYER_RESPONSE {
  view: any;
  edit: any;
  layer_id: number;
  org_id: number;
  uuid: string;
  user_id: number;
  layer_name: string;
  colour: string;
  date_created: Date;
  date_modified: Date;
  group_name: string[];
  shared_users: string[];
}

export interface API_VERTEXT_PROJECT_RESPONSE {
  project_id: number;
  user_id: string;
  project_name: string;
  date_created: Date;
  survey_methode: string;
  survey_accuracy: number;
  projection: string;
}

export class AddLayerModel {
  layer_name: string;
  colour: string;

  constructor() {
    this.layer_name = '';
    this.colour = '#000000';
  }
}

export class UpdateLayerModel {
  layer_name: string;
  colour: string;

  constructor() {
    this.layer_name = '';
    this.colour = '#000000';
  }
}

export interface API_LAYER_GEOM_RESPONSE {
  type: string;
  features: Array<{
    id: number;
    type: string;
    geometry: {
      type: string;
      coordinates: any;
    };
    properties: {
      uuid: string;
      username: string;
      layer_id: number;
      infobhoomi_id: number | null;
      geom_type: string;
      area: number | null;
      dimension_2d_3d: string;
      reference_coordinate: number | null;
      geom_level: number;
      status: string;
      parent_id: number | null;
      date_created: Date;
      date_modified: Date;
      reference_id: number | null;
    };
  }>;
}

export interface VERTEXT_API_LAYER_GEOM_RESPONSE {
  type: string;
  features: Array<{
    id: number;
    type: string;
    geometry: {
      type: string;
      coordinates: any;
    };
    properties: {
      spatial_uuid: string;
      user_id: string;
      layer_id: number;
      infobhoomi_id: number | null;
      type: string;
      area: number | null;
      dimension_2d_3d: string;
      reference_coordinate: number | null;
      geom_level: number;
      status: string;
      parent_id: number | null;
      date_created: Date;
      date_modified: Date;
      reference_id: number | null;
      point_no: number;
      point_code: string;
      instrument_hight: DoubleRange;
      remarks: string | null;
      dm_type: string | null;
      project_id: number;
      layer_name?: string;
    };
  }>;
}

// export class LayerIdRequest {
//   layer_id: number[];

//   constructor(layer_id: number[]) {
//     this.layer_id = layer_id;
//   }
// }

export class LayerIdRequest {
  user_id: number;

  constructor(user_id: number) {
    this.user_id = user_id;
  }
}
export class PasswordVerificationRequest {
  password: string;
  constructor(password: string) {
    this.password = password;
  }
}

export interface VERIFICATION_RESPONSE {
  message: string;
}

// <<<< Interface for individual geometry >>>>
export interface Geometry {
  type: 'Point' | 'LineString' | 'Polygon' | 'GeometryCollection' | string;
  coordinates: any;
}

export interface GeometryCollection {
  type: 'GeometryCollection';
  geometries: Geometry[];
}

// Interface for import temp vector data payload
export interface ImportTempVectorData {
  username: string;
  dataset_name: string;
  layer_id: number;
  geom: GeometryCollection;
}
