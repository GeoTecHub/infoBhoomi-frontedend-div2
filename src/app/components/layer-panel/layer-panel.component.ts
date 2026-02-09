import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, ViewContainerRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LayerService } from '../../services/layer.service';

import { DragDropModule } from '@angular/cdk/drag-drop';
import { SortArrayPipe } from '../../core/pipes/sort-array.pipe';
import { API_LAYER_RESPONSE } from '../../models/API';
import { CreateLayerComponent } from './create-layer/create-layer.component';
import { EditDeleteLayerComponent } from './edit-delete-layer/edit-delete-layer.component';

import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialog,
  MatDialogActions,
  MatDialogContent,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs'; // Import Subject
import { takeUntil } from 'rxjs/operators'; // Import takeUntil
import { APIsService } from '../../services/api.service';
import { NotificationService } from '../../services/notifications.service';
import { UserService } from '../../services/user.service';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { CustomTooltipComponent } from './custom-tooltip/custom-tooltip.component';

@Component({
  selector: 'app-layer-panel',
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatDialogModule,
    MatFormFieldModule,
    SortArrayPipe,
    MatDialogActions,
    MatDialogContent,
    MatTooltipModule,
    MatBadgeModule,
  ],
  templateUrl: './layer-panel.component.html',
  styleUrl: './layer-panel.component.css',
  standalone: true,
})
export class LayerPanelComponent implements OnInit, OnDestroy {
  default_layers_permisions_array: any = [];

  LayerList!: API_LAYER_RESPONSE[];
  selectedLayer: string | null = null;
  selectedcolor: string | null = null;
  ModelHeader!: string;
  buttonName!: string;
  isDeleteLayer: boolean = false;
  layer_permisions: any = [];
  selectedLayerIds: (number | string | null)[] = []; // Array to hold selected layer IDs when toggling the checkboxes
  allLayerIDs!: (number | string)[];

  user_id: string = '';
  username: string = ''; // replaced with the login response detail - (username)
  organization_id: string = ''; // replaced with the login response detail - (organization)
  organization_id_number: number | null = null;
  user_id_number: number | null = null;
  user_type: string = '';

  currentSelectedLayerIdForDrawing: number | string | null = null; // Track the ID for the checkbox

  private _snackBar = inject(MatSnackBar);
  private destroy$ = new Subject<void>(); // Subject for unsubscribing

  layer_pop_permissions: any = [];

  openSnackBar(message: string, action: string, duration: number) {
    this._snackBar.open(message, action, { duration });
  }

  isBuildingsDisabled = true; // added by malaka

  private overlayRef: OverlayRef | null = null;

  constructor(
    public dialog: MatDialog,
    public layerService: LayerService,
    public notifcationService: NotificationService,
    public apiService: APIsService,
    private layerControlService: LayerService,
    private userService: UserService,
    private overlay: Overlay,
    private vcr: ViewContainerRef,
  ) {
    this.userService.user$.pipe(takeUntil(this.destroy$)).subscribe((user: any) => {
      if (user) {
        this.username = user.username.replace(/"/g, '') || '';
        this.user_id = user.user_id.toString() || '';
        this.organization_id = user.org_id.toString() || '';
        this.organization_id_number = Number(user.org_id);
        this.user_type = user.user_type || '';
        this.user_id_number = Number(user.user_id);
      }
    });
  }

  ngOnInit(): void {
    // this.getLayerPermisions()
    this.getLayerPopPermisions();
    this.getLayerPermisions();
    this.getDefaultLayersPermisions();

    // Subscribe to the selectedLayerIds$ observable to get updates on selected layer IDs
    this.layerService.selectedLayerIds$.subscribe((ids) => {
      this.selectedLayerIds = ids;
      console.log('Updated selected layer IDs:', this.selectedLayerIds);
    });
    if (this.organization_id) {
      this.organization_id = `ORG${this.organization_id}`; // Update the class property.
    }
    // ** crucial check: ensure layerService is injected correctly **
    if (!this.layerService) {
      console.error('LayerPanelComponent: LayerService is not injected!');
      return;
    }

    // Subscribe to VISIBILITY changes
    this.layerService.selectedLayerIds$.pipe(takeUntil(this.destroy$)).subscribe((ids) => {
      console.log('LayerPanel: Visibility IDs received from service:', ids);
      this.selectedLayerIds = ids; // Assign correct type
    });

    // Subscribe to CURRENT DRAWING LAYER changes
    this.layerService.currentLayerIdForDrawing$.pipe(takeUntil(this.destroy$)).subscribe((id) => {
      console.log('LayerPanel: Current Drawing Layer ID received from service:', id);
      this.currentSelectedLayerIdForDrawing = id;
    });

    // added by malaka
    this.layerService.buildingsDisabled$.pipe(takeUntil(this.destroy$)).subscribe((disabled) => {
      this.isBuildingsDisabled = disabled;
    });
  }

  getLayerPopPermisions() {
    this.apiService.getLayersPopPermissions().subscribe((res) => {
      console.log('********************************************************', res);
      this.layer_pop_permissions = res;
      this.layer_pop_permissions = this.layer_pop_permissions.reduce(
        (acc: { [x: string]: any }, perm: { permission_id: string | number }) => {
          acc[perm.permission_id] = perm;
          return acc;
        },
        {},
      );
    });
  }

  canCreateLayer(permissionId: number): boolean {
    return this.layer_pop_permissions[permissionId]?.add ?? false;
  }

  canEditLayer(permissionId: number): boolean {
    return this.layer_pop_permissions[permissionId]?.edit ?? false;
  }

  canDeleteLayer(permissionId: number): boolean {
    return this.layer_pop_permissions[permissionId]?.delete ?? false;
  }

  // getLayerPermisions() {
  //   this.apiService.getLayersPermisions().subscribe(res=>{
  //     this.layer_permisions=res
  //     console.log(res)
  //   })
  // }

  ngOnDestroy(): void {
    // Implement OnDestroy
    this.destroy$.next();
    this.destroy$.complete();
  }

  getDefaultLayersPermisions() {
    this.apiService.getDefaultLayersPermisions().subscribe((res) => {
      this.default_layers_permisions_array = res;
      this.default_layers_permisions_array = this.default_layers_permisions_array.reduce(
        (acc: { [x: string]: any }, perm: { permission_id: string | number }) => {
          acc[perm.permission_id] = perm;
          return acc; // issue do not know => which layer id is assigned to which permission type
        },
        {},
      );
    });
  }

  //permisstion ID 80 [view, delete, add...] => Layer 1
  // Layer 1=> 80, Layer 3 =>45, Layer 4 => 53
  // User 1 => Layer 1  -> Edit, View -> Role 1
  // user 2 => Layer 1 -> View - Role 2
  // [Layer 1, Role ?]

  // Asiri Dayarathne
  //9:08 AM
  //  {
  //
  // "id": 266,
  //         "permission_id": 80,
  //         "category": "Layers",
  //         "sub_category": "Default Layers",
  //         "permission_name": "Land",
  //         "view": true,
  //         "add": false,
  //         "edit": true,
  //         "delete": false
  //     },

  // [Layer 1, Permision 80]  user 1 => Layer 1 (org)  -80 , User 2 =? Layer 1(org) - 50
  // Userroles [user_id, role_ld]

  getLayerPermisions() {
    this.apiService.getLayersPermisions().subscribe((res) => {
      this.layer_permisions = res;
      this.layerService
        .getLayers() // this where we get layer ID asssigned to the user
        .pipe(takeUntil(this.destroy$)) // Ensure unsubscription user 1 => 2,3, 4 => edit? delete? save? visible??
        .subscribe({
          // Use observer object syntax for better error handling
          next: (res: API_LAYER_RESPONSE[]) => {
            console.log('LayerPanel: Received layer data from service:', res);
            if (!res) {
              console.warn('LayerPanel: Received null or undefined layer list response!');
              this.LayerList = []; // Ensure it's an empty array
            } else {
              this.LayerList = res; // Assign data
              for (let item of this.LayerList) {
                const item_access = this.layer_permisions.filter(
                  (obj: { layer_id: number }) => obj.layer_id === item.layer_id,
                );
                console.log(item_access);

                if (item_access.length !== 0) {
                  if (item_access[0]?.edit) {
                    item.edit = item_access[0].edit;
                  }
                  if (item_access[0]?.view) {
                    item.view = item_access[0].view;
                  }
                }
                console.log(item);
              }
            }
            this.allLayerIDs = this.LayerList.map((layer: { layer_id: any }) => layer.layer_id); // all the lisy of layers
          },
          error: (error) => {
            console.error('LayerPanel: Error fetching layer list:', error);
            this.LayerList = []; // Ensure list is empty on error
            this.notifcationService.showError('Unable to load the layer list!'); // Use notification service
          },
        });
    });
  }

  /* Method called when a view icon is checked/unchecked
  (store / remove  layer_ids in selectedLayerIdsSubject array in Shared Layer Functions Service)*/
  toggleLayerView(layerId: number | string | null): void {
    console.log(`LayerPanel: Toggling visibility for layer ${layerId}`);
    this.layerService.toggleLayerVisibility(layerId);
  }

  // Method for the CHECKBOX (selecting the layer for DRAWING)
  onCheckboxChange(layerId: number | string): void {
    console.log(`LayerPanel: Checkbox changed for layer ${layerId}`);
    const currentSelectedId = this.layerService.getSelectedCurrentLayerIdForDrawing();

    if (currentSelectedId === layerId) {
      console.log(`LayerPanel: Deselecting layer ${layerId} for drawing.`);
      // Uncheck the currently selected checkbox
      this.layerService.setSelectedCurrentLayerIdForDrawing(null);
      localStorage.removeItem('selected_layer_id');
    } else {
      // Select the new layer for drawing
      console.log(`LayerPanel: Selecting layer ${layerId} for drawing.`);
      this.layerService.setSelectedCurrentLayerIdForDrawing(layerId);
      this.layerService.setLayerVisibility(layerId, true); // Add this method to service
      localStorage.setItem('selected_layer_id', layerId.toString());
      console.log('Current Layer ID:', layerId);
    }
  }

  onClose() {
    //   const uniqueVisibleLayerIds = new Set<number>();
    // this.mapService.mapInstance?.getLayers().forEach((layer) => {
    //   // Check if the layer's ID is in the allLayerIDs array and if the layer is visible
    //   if (layer.getVisible()) {
    //     // Add the layer ID to the visibleLayerIds array
    //     uniqueVisibleLayerIds.add(layer.get('layerId'));
    //   }
    // });
    // this.layerService.initializeLayerIds(Array.from(uniqueVisibleLayerIds));
  }

  openAddLayerDialog() {
    const dialogRef = this.dialog.open(CreateLayerComponent, {
      width: '450px',
      maxWidth: '95%',
      panelClass: 'custom-dialog',
    });

    this.layerService.setOpenAdditionalLayerModal(true);

    dialogRef.afterClosed().subscribe((result) => {
      this.layerService.setOpenAdditionalLayerModal(false);
      this.getLayerPermisions();
    });
  }

  getColorHex(colorName: string): string {
    return this.layerService.convertColorNameToHex(colorName);
  }

  onEditLayer(dataItem: any): void {
    this.ModelHeader = 'Edit Layer Details';
    this.buttonName = 'Update';
    this.isDeleteLayer = false;

    const dialogRef = this.dialog.open(EditDeleteLayerComponent, {
      width: '450px',
      maxWidth: '95%',
      panelClass: 'custom-dialog',
      data: {
        layer: dataItem,
        title: this.ModelHeader,
        btnName: this.buttonName,
        isdelete: this.isDeleteLayer,
      },
    });

    this.layerService.setOpenAdditionalLayerModal(true);

    dialogRef.afterClosed().subscribe((result) => {
      this.layerService.setOpenAdditionalLayerModal(false);
      this.getLayerPermisions();
    });
  }

  onDeleteLayer(dataItem: any): void {
    this.ModelHeader = 'Delete Layer Details';
    this.buttonName = 'Delete';
    this.isDeleteLayer = true;
    const dialogRef = this.dialog.open(EditDeleteLayerComponent, {
      width: '450px',
      maxWidth: '95%',
      panelClass: 'custom-dialog',
      data: {
        layer: dataItem,
        title: this.ModelHeader,
        btnName: this.buttonName,
        isdelete: this.isDeleteLayer,
      },
    });
    this.layerService.setOpenAdditionalLayerModal(true);

    dialogRef.afterClosed().subscribe((result) => {
      this.layerService.setOpenAdditionalLayerModal(false);
      this.getLayerPermisions();
    });
  }

  displaySnack() {
    this.notifcationService.showInfo(
      'This layer is shared among users. Please remove them before delete.',
      6000,
    );
  }
  filterSharedUsersWithoutOwner(sharedUsers: string[]): string[] {
    return sharedUsers.filter((user) => !user.includes('Owner'));
  }
  showTooltip(origin: HTMLElement, users: string[]) {
    if (users.length === 0) return;
    if (this.overlayRef) {
      this.overlayRef.dispose();
    }

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(origin)
      .withPositions([
        {
          originX: 'end',
          originY: 'bottom',
          overlayX: 'start',
          overlayY: 'top',
          offsetY: 8,
        },
      ]);

    this.overlayRef = this.overlay.create({ positionStrategy });

    const tooltipPortal = new ComponentPortal(CustomTooltipComponent, this.vcr);
    const tooltipRef = this.overlayRef.attach(tooltipPortal);
    tooltipRef.instance.users = users;
  }

  hideTooltip() {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }
}
