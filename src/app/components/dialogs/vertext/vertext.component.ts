import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import VectorLayer from 'ol/layer/Vector';
import Map from 'ol/Map';
import VectorSource from 'ol/source/Vector';
import { SortArrayPipe } from '../../../core/pipes/sort-array.pipe';
import {
  API_VERTEXT_PROJECT_RESPONSE,
  LoginModel,
  VERTEXT_API_LAYER_GEOM_RESPONSE,
  VERTEXT_API_LOGIN_RESPONSE,
} from '../../../models/API';
import { LayerService } from '../../../services/layer.service';
import { MapService } from '../../../services/map.service';
import { NotificationService } from '../../../services/notifications.service';
import { makePerFeatureStyleFn } from '../../../services/style-factory.service';
import { VertextService } from '../../../services/vertext.service';

@Component({
  selector: 'app-vertext',
  templateUrl: './vertext.component.html',
  styleUrl: './vertext.component.css',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    CommonModule,
    FormsModule,
    SortArrayPipe,
    MatTooltipModule,
    MatDividerModule,
  ],
})
export class VertextComponent {
  loginObj: LoginModel = new LoginModel();
  passwordRequired: boolean = false;
  usernameRequired: boolean = false;
  ActiveProjectPanel: boolean = false;
  projectList: any;
  selectedRowId!: number | null;
  token!: string;
  username!: any;
  public map: Map | undefined;
  userDeatils: any;
  isLoading = false;

  passwordVisible: boolean = false;

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  constructor(
    private loginservice: VertextService,
    private mapService: MapService,
    private sharedService: LayerService,
    private notificationService: NotificationService,
  ) {}

  // ngOnInit(): void {
  //   this.refreshProjectList("438d9a445353a212be27eef820e20e0aa4ad62d8", "user79@email.com");
  // }

  onClick() {
    if (!this.loginObj.username || !this.loginObj.password) {
      if (!this.loginObj.password) {
        this.usernameRequired = false; // Set the flag to true if password is not entered
        this.passwordRequired = true;
        return;
      } else if (!this.loginObj.username) {
        this.usernameRequired = true; // Set the flag to true if username is not entered
        this.passwordRequired = false;
        return;
      } else if (!this.loginObj.username && !this.loginObj.password) {
        this.usernameRequired = true; // Set the flag to true if username & password are not entered
        this.passwordRequired = true;
        return;
      }
    }
    this.isLoading = true;

    this.loginservice.login(this.loginObj).subscribe(
      (res: VERTEXT_API_LOGIN_RESPONSE) => {
        console.log(res);
        if (res.user.is_active) {
          this.username = res.user.id;
          this.notificationService.showSuccess('Login Success');
          this.isLoading = false;
          this.refreshProjectList(res.token, res.user.id);
          this.userDeatils = res;
          this.ActiveProjectPanel = true;
          this.token = res.token;
          this.username = res.id;

          console.log('user deatil: ', res);
        } else {
          this.notificationService.showError('Login Failed');
          this.isLoading = false;
          this.ActiveProjectPanel = false;
        }
      },
      (error) => {
        console.error('Error occurred during login:', error);
        this.notificationService.showError('Login Failed');
        this.isLoading = false;
      },
    );

    this.passwordRequired = false; // Reset the flags if username & password is valid
    this.usernameRequired = false;
  }

  refreshProjectList(token: string, username: string) {
    this.loginservice.getProjectList(token, username).subscribe(
      (res: API_VERTEXT_PROJECT_RESPONSE[]) => {
        this.projectList = res;
        console.log('Project List:', this.projectList);
      },
      (error) => {
        console.error('Error occurred:', error);
        this.notificationService.showError('Unable to load the layer list..!');
      },
    );
  }

  onCheckboxChange(dataItem: any, event: Event) {
    const checkbox = event.target as HTMLInputElement;

    if (checkbox.checked) {
      // Set selected row ID to the current dataItem's ID
      this.selectedRowId = dataItem.project_id;
    } else {
      // Deselect if the checkbox is unchecked
      this.selectedRowId = null;
    }
  }
  isRowSelected(dataItem: any): boolean {
    return this.selectedRowId === dataItem.project_id; // Check if the row is selected
  }
  addToMap() {
    if (this.selectedRowId) {
      console.log('Adding to map: Project ID', this.selectedRowId);
      this.loginservice.GetVertextGeomLayerData(this.token, this.selectedRowId).subscribe(
        (res: VERTEXT_API_LAYER_GEOM_RESPONSE) => {
          const uniqueLayerIds = new Set<number>();

          res.features.forEach((item) => {
            const color = '#FF0000';
            const feature = this.sharedService.createFeature(
              item.geometry.type,
              item.geometry.coordinates,
              color,
            );

            if (feature) {
              const layerId = String(item.properties.layer_id);
              const layerName = String(item.properties.layer_name ?? item.properties.layer_id);

              feature.set('layer_id', layerId);
              feature.set('layer_name', layerName);
              feature.set('baseHex', color);
              feature.set('sourceTag', 'addToMap');
              feature.set('selectable', true);

              feature.set(
                'forceLabel',
                String(item.properties.layer_name ?? item.properties.layer_id),
              );

              feature.setStyle(
                makePerFeatureStyleFn(
                  () => true,
                  () => false,
                ),
              );

              const vectorSource = new VectorSource({ features: [feature] });
              const vectorLayer = new VectorLayer({ source: vectorSource });

              vectorLayer.set('layerId', layerId);

              if (this.mapService.mapInstance) {
                this.mapService.mapInstance.addLayer(vectorLayer);
              }

              uniqueLayerIds.add(item.properties.layer_id);
            }
          });

          // Convert uniqueLayerIds Set to Array and update selectedLayerIdsSubject array in shared-layer-function-service
          //  this.sharedService.initializeLayerIds(Array.from(uniqueLayerIds));
        },
        (error) => {
          console.log('Token', this.token);
          console.error('Username', this.username);
          console.error('Error occurred:', error);
          this.notificationService.showError('Unable to load the layers..!');
        },
      );
    } else {
      console.log('No project selected!');
    }
  }
}
