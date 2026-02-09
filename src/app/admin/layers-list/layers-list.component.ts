import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { AddLayerComponent } from '../../components/dialogs/add-layer/add-layer.component';
import { ShareLayerComponent } from '../../components/dialogs/share-layer/share-layer.component';
import { APIsService } from '../../services/api.service';
import { NotificationService } from '../../services/notifications.service';
import { AdminHeaderComponent } from '../common/admin-header/admin-header.component';
import { AdminSideBarComponent } from '../common/admin-side-bar/admin-side-bar.component';

import { MatDialog } from '@angular/material/dialog';
import { UserAuthenticatorComponent } from '../../components/auth/user-authenticator/user-authenticator.component';
import { AdminService, PermId } from '../../services/admin.service';
declare var bootstrap: any;

@Component({
  selector: 'app-layers-list',
  standalone: true,
  imports: [
    AdminHeaderComponent,
    AdminSideBarComponent,
    MatIconModule,
    RouterModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    UserAuthenticatorComponent,
  ],
  templateUrl: './layers-list.component.html',
  styleUrls: ['./layers-list.component.css'],
})
export class LayersListComponent implements OnInit, AfterViewInit {
  @ViewChild('userLayerSearchInput') userLayerSearchInput!: ElementRef<HTMLInputElement>;

  roles_list: any = [];
  admin_layers_list: any = [];
  selectedLayer: any = null;
  selectLayerData: any = null;
  filteredUsers: any[] = []; // The list after applying search filter
  searchQueryPermisions: string = '';
  admin_password = '';
  selected_user_id: any;

  nullGroup: any = [];
  orgGroup: any = [];
  otherGroups: any = [];
  searchQuery: string = '';

  passwordVisible: boolean = false;

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  constructor(
    private router: Router,
    private notificationService: NotificationService,
    private apiService: APIsService,
    private dialog: MatDialog,
    private adminService: AdminService,
  ) {}

  getPermissionAdd(permissionId: PermId): boolean {
    return this.adminService.canAdd(permissionId);
  }

  getPermissionEdit(permissionId: PermId): boolean {
    return this.adminService.canEdit(permissionId);
  }

  getPermissionDelete(permissionId: PermId): boolean {
    return this.adminService.canDelete(permissionId);
  }

  ngOnInit(): void {}

  ngAfterViewInit() {
    this.searchQueryPermisions = '';
    if (this.userLayerSearchInput) {
      this.userLayerSearchInput.nativeElement.value = '';
    }
    this.getLayers();
  }

  selectLayer(layer: any) {
    this.selectedLayer = layer;
  }

  getLayers() {
    this.apiService.getAdminLayers().subscribe((res) => {
      this.admin_layers_list = res;

      this.admin_layers_list.sort((a: { layer_name: string }, b: { layer_name: string }) => {
        const isASymbol = /^[^a-zA-Z0-9]/.test(a.layer_name);
        const isBSymbol = /^[^a-zA-Z0-9]/.test(b.layer_name);

        if (isASymbol && !isBSymbol) return 1;
        if (!isASymbol && isBSymbol) return -1;
        return a.layer_name.localeCompare(b.layer_name);
      });

      this.nullGroup = this.admin_layers_list.filter(
        (layer: { group_name: any }) =>
          Array.isArray(layer.group_name) && layer.group_name.includes('default'),
      );

      this.orgGroup = this.admin_layers_list.filter(
        (layer: { group_name: any }) =>
          Array.isArray(layer.group_name) && layer.group_name.includes('org'),
      );

      this.filterOtherGroups(); // Apply search filter inside this
    });
  }

  openDeleteCommonModal(userDelete: any) {
    this.selected_user_id = userDelete.id;
    const modal = new bootstrap.Modal(document.getElementById('confirmCommonDeleteModal'));
    modal.show();
  }

  confirmDeleteUser() {
    const userDeleteStr = String(this.selected_user_id); // Convert to string
    // Ensure group_name is an array before filtering
    if (Array.isArray(this.selectedLayer.group_name)) {
      this.selectedLayer.group_name = this.selectedLayer.group_name.filter(
        (name: string) => name !== userDeleteStr,
      );
    }
    let input_data = {
      group_name: this.selectedLayer.group_name,
    };
    if (this.selectedLayer.group_name.length == 0) {
      input_data.group_name = null;
    }
    this.apiService.updateLayer(input_data, this.selectedLayer.layer_id).subscribe(
      (response: any) => {
        this.notificationService.showSuccess('User deleted successfully');
        const modal = bootstrap.Modal.getInstance(
          document.getElementById('confirmCommonDeleteModal'),
        );
        modal.hide();
        this.getLayersAndReselect();
      },
      (error: any) => {
        console.error('Error updating Layer:', error);
        this.notificationService.showError('Failed to update Layer');
      },
    );
  }
  filterOtherGroups() {
    this.otherGroups = this.admin_layers_list.filter(
      (layer: { group_name: any; layer_name?: string }) => {
        const isNotDefaultOrOrg =
          Array.isArray(layer.group_name) &&
          !layer.group_name.includes('default') &&
          !layer.group_name.includes('org');

        const isNullGroup = layer.group_name === null;

        const matchesSearch =
          !this.searchQuery ||
          layer.layer_name?.toLowerCase().includes(this.searchQuery.toLowerCase());

        return (isNotDefaultOrOrg || isNullGroup) && matchesSearch;
      },
    );
  }

  addLayer(action: any, saved_data: any) {
    const dialogRef = this.dialog.open(AddLayerComponent, {
      width: '450px',
      maxWidth: '95%',
      panelClass: 'custom-dialog',
      data: {
        action: action,
        data: saved_data,
      },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      this.getLayers();
      if (result) {
      }
    });
  }

  shareLayer() {
    const dialogRef = this.dialog.open(ShareLayerComponent, {
      width: '750px',
      maxWidth: '95%',
      panelClass: 'custom-dialog',
      data: this.selectedLayer,
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      this.getLayersAndReselect();
    });
  }

  // Helper method
  getLayersAndReselect() {
    this.apiService.getAdminLayers().subscribe((res) => {
      // 1. SORT first (before splitting into groups)
      this.admin_layers_list = res.sort((a: { layer_name: string }, b: { layer_name: string }) => {
        const isASymbol = /^[^a-zA-Z0-9]/.test(a.layer_name);
        const isBSymbol = /^[^a-zA-Z0-9]/.test(b.layer_name);

        if (isASymbol && !isBSymbol) return 1;
        if (!isASymbol && isBSymbol) return -1;
        return a.layer_name.localeCompare(b.layer_name);
      });

      // 2. Now group and filter as usual
      this.nullGroup = this.admin_layers_list.filter(
        (layer: { group_name: any }) =>
          Array.isArray(layer.group_name) && layer.group_name.includes('default'),
      );
      this.orgGroup = this.admin_layers_list.filter(
        (layer: { group_name: any }) =>
          Array.isArray(layer.group_name) && layer.group_name.includes('org'),
      );
      this.filterOtherGroups();

      // 3. Reselect updated selectedLayer
      if (this.selectedLayer) {
        const updated = this.admin_layers_list.find(
          (layer: any) => layer.layer_id === this.selectedLayer.layer_id,
        );
        if (updated) this.selectedLayer = updated;
      }
    });
  }

  // Function to open the delete confirmation modal for user
  openDeleteModal(data: any) {
    this.selectLayerData = data;
    const modalElement = document.getElementById('confirmDeleteModal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  }

  // Confirm deletion of the user
  confirmDelete() {
    if (this.admin_password != '') {
      let input_data = {
        password: this.admin_password,
      };
      this.apiService.postPassword(input_data).subscribe((res) => {
        this.apiService.deleteLayer('input_data', this.selectLayerData.layer_id).subscribe(
          (response: any) => {
            this.notificationService.showSuccess('Layer removed successfully!');
            const modal = bootstrap.Modal.getInstance(
              document.getElementById('confirmDeleteModal'),
            );
            modal.hide();
            this.getLayers();
          },
          (error: any) => {
            console.error('Error saving administrative info:', error);
            if (error?.error?.non_field_errors) {
              this.notificationService.showError('Layer could not be removed');
            } else {
              this.notificationService.showError('Layer could not be removed');
            }
          },
        );
      });
    }
  }
}
