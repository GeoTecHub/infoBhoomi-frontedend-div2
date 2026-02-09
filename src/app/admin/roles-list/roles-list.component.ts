import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { UserAuthenticatorComponent } from '../../components/auth/user-authenticator/user-authenticator.component';
import { AddRoleUsersComponent } from '../../components/dialogs/add-role-users/add-role-users.component';
import { AddRoleComponent } from '../../components/dialogs/add-role/add-role.component';
import { AdminService, PermId } from '../../services/admin.service';
import { APIsService } from '../../services/api.service';
import { NotificationService } from '../../services/notifications.service';
import { AdminHeaderComponent } from '../common/admin-header/admin-header.component';
import { AdminSideBarComponent } from '../common/admin-side-bar/admin-side-bar.component';
declare var bootstrap: any;

@Component({
  selector: 'app-roles-list',
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
  templateUrl: './roles-list.component.html',
  styleUrl: './roles-list.component.css',
})
export class RolesListComponent {
  selected_role_id: any;
  roles_list: any = [];
  searchQuery = '';
  searchQueryUser = '';
  departments_list: any = [];
  departments_id = '';
  selectedRole: any = null;
  role_users_list = {
    users: [
      {
        username: '',
        email: '',
        first_name: '',
        department: '',
      },
    ],
  };
  filteredUsers: any[] = []; // The list after applying search filter
  userToDelete: any;
  roleToDelete: any;
  permision_list: any = [];
  opened_dialog_type = '';
  permisions_list: any = [];
  searchQueryPermisions: string = '';
  isUnlockClicked: boolean = false;

  categoryList: string[] = [];
  filteredSubCategoryList: string[] = [];
  selectedCategory: string = '';
  selectedSubCategory: string = '';
  allPermisionsList: any[] = [];

  highlightedRole: any | null = null;

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

  ngOnInit(): void {
    this.getRolesList();
    this.getDepartmentList();
  }

  getDepartmentList() {
    this.apiService.getDepartments().subscribe((res) => {
      this.departments_list = res;
    });
  }

  getPermissionsList(id: any) {
    this.apiService.getPermisionsList(id).subscribe((res) => {
      this.allPermisionsList = res as any[];
      this.permisions_list = [...this.allPermisionsList];
      this.updateCategoryAndSubCategoryLists();
      this.applyPermissionFilters();
    });
  }

  updateCategoryAndSubCategoryLists() {
    const categories = new Set<string>();
    const subCategories = new Set<string>();
    this.allPermisionsList.forEach((item) => {
      if (item.category) categories.add(item.category);
      if (item.sub_category) subCategories.add(item.sub_category);
    });
    this.categoryList = Array.from(categories).sort();
    this.updateFilteredSubCategories();
  }

  updateFilteredSubCategories() {
    if (!this.selectedCategory) {
      const subCategories = new Set<string>();
      this.allPermisionsList.forEach((item) => {
        if (item.sub_category) subCategories.add(item.sub_category);
      });
      this.filteredSubCategoryList = Array.from(subCategories).sort();
    } else {
      this.filteredSubCategoryList = Array.from(
        new Set(
          this.allPermisionsList
            .filter((item) => item.category === this.selectedCategory)
            .map((item) => item.sub_category),
        ),
      ).sort();
      if (!this.filteredSubCategoryList.includes(this.selectedSubCategory)) {
        this.selectedSubCategory = '';
      }
    }
  }

  applyPermissionFilters() {
    this.updateFilteredSubCategories();

    this.permisions_list = this.allPermisionsList.filter((item) => {
      if (this.selectedCategory && item.category !== this.selectedCategory) return false;
      if (this.selectedSubCategory && item.sub_category !== this.selectedSubCategory) return false;
      if (this.searchQueryPermisions) {
        const search = this.searchQueryPermisions.toLowerCase();
        return (
          item.permission_name?.toLowerCase().includes(search) ||
          item.sub_category?.toLowerCase().includes(search) ||
          item.category?.toLowerCase().includes(search)
        );
      }
      return true; // If no search, all pass
    });
  }

  searchPermisionsList() {
    // Your search logic goes here
  }

  isNullValue(item: any, field: string): boolean {
    return item[field] === null;
  }

  onCheckboxChange(item: any, field: string, event: any) {
    let update_status = {
      [field]: event.target.checked, // Dynamically set the field name
    };

    this.apiService.editUserPermisions(item.id, update_status).subscribe(
      (res) => {
        this.notificationService.showSuccess('Status updated successfully');
      },
      (err) => {
        this.notificationService.showError(err.error?.error || 'Data not saved');
      },
    );
  }
  unlockAction() {
    this.isUnlockClicked = true;
  }

  lockAction() {
    this.isUnlockClicked = false;
  }

  // GRT USERS LIST
  getRolesList() {
    this.apiService.getRolesList().subscribe((res) => {
      this.roles_list = res;
      this.roles_list.sort((a: { role_name: string }, b: { role_name: any }) =>
        a.role_name.localeCompare(b.role_name),
      );
      const query = this.searchQuery.trim().toLowerCase();
      this.roles_list = this.roles_list.filter(
        (user: { role_name?: string }) =>
          !query ||
          [user.role_name].some((field) => field?.toString().toLowerCase().includes(query)),
      );
      this.selectedRole = '';
    });
  }

  searchUserList() {
    if (!this.role_users_list?.users) {
      return;
    }
    const sortedUsers = [...this.role_users_list.users].sort((a, b) =>
      a.username.localeCompare(b.username),
    );
    const query = this.searchQueryUser?.trim().toLowerCase();
    this.filteredUsers = !query
      ? [...this.role_users_list.users] // No search, display all users
      : sortedUsers.filter((user) =>
          [user.username, user.first_name, user.email, user.department].some((field) =>
            field?.toLowerCase().includes(query),
          ),
        );
  }

  selectRole(role: any) {
    this.selectedRole = role; // Set selected role
    this.role_users_list = role; // Set the original list
    this.filteredUsers = [...role.users]; // Initialize filtered list with all users
    this.selected_role_id = role.role_id;
    this.adminService.setSelectedRoleType(role.role_type);
    this.selectedCategory = '';
    this.applyPermissionFilters();
    this.getPermissionsList(role.role_id); // Get permissions list based on role_id
  }

  // SHOW PAGE
  showUser(user: any) {
    this.router.navigate(['/admin-user-edit'], { state: { userData: user } });
  }

  // CHANGE ACTIVE STATUS

  toggleStatus(user: any) {
    user.is_active = !user.is_active;
    let update_status = {
      is_active: user.is_active,
    };
    this.apiService.editUser(user.id, update_status).subscribe(
      (res) => {
        this.notificationService.showSuccess('Status updated successfully');
      },
      (err) => {
        this.notificationService.showError(err.error?.error || 'Data not saved');
      },
    );
  }

  // Function to open the delete confirmation modal for role
  deleteRole(roleToDelete: any, type: any) {
    this.selectedRole = null;
    this.opened_dialog_type = type;
    this.roleToDelete = roleToDelete;

    this.highlightedRole = roleToDelete;

    const modalEl = document.getElementById('confirmDeleteModal')!;
    const onHidden = () => {
      this.highlightedRole = null;
      modalEl.removeEventListener('hidden.bs.modal', onHidden);
    };
    modalEl.addEventListener('hidden.bs.modal', onHidden);

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }

  // Confirm deletion of the role
  confirmDeleteRole() {
    this.apiService.deleteRole(this.roleToDelete.role_id).subscribe(
      (response: any) => {
        this.notificationService.showSuccess('Role deleted successfully!');
        this.getRolesList();
        // Close the modal after success
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
        modal.hide();
      },
      (error: any) => {
        console.error('Error deleting role:', error.error);
        if (error.error == 'Please remove users before deleting the role.') {
          this.notificationService.showError('Please remove users before deleting the role');
        } else {
          this.notificationService.showError('Role could not be deleted');
        }
      },
    );
  }

  // Function to open the delete confirmation modal for user
  openDeleteModal(user: any, type: any) {
    this.opened_dialog_type = type;

    this.userToDelete = user; // Store the user to delete

    // Open confirmation modal
    const modalElement = document.getElementById('confirmDeleteModal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  }

  // Confirm deletion of the user
  confirmDelete() {
    this.selectedRole.users = this.selectedRole.users.filter(
      (user: any) => user.id !== this.userToDelete.id,
    );
    const userIds = this.selectedRole.users.map((user: { id: any }) => user.id);
    let input_data = {
      users: userIds,
    };
    // Update users on the backend
    this.apiService.addUsersToRole(input_data, this.selectedRole.role_id).subscribe(
      (response: any) => {
        this.notificationService.showSuccess('User removed successfully!');
        // Close the modal after success
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
        this.apiService.getRolesList().subscribe((roles: any) => {
          this.roles_list = roles;
          const updatedRole = (roles as any[]).find((r) => r.role_id === this.selectedRole.role_id);
          if (updatedRole) {
            this.selectRole(updatedRole);
          }
        });
        modal.hide();
      },
      (error: any) => {
        console.error('Error saving administrative info:', error);
        if (error?.error?.non_field_errors) {
          this.notificationService.showWarning('Telephone or email already exists');
        } else {
          this.notificationService.showError('User could not be removed');
        }
      },
    );
  }

  addRole(action: any, saved_data: any) {
    if (action === 'edit') this.selectedRole = null;
    this.highlightedRole = saved_data;
    const dialogRef = this.dialog.open(AddRoleComponent, {
      width: '450px', // Fixed width
      maxWidth: '95%', // Limits width to 85% of screen if it's smaller
      panelClass: 'custom-dialog',
      data: {
        action: action,
        data: saved_data,
      },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      this.highlightedRole = null;
      this.getRolesList();
      if (result) {
        console.log('Dialog result:', result);
      }
    });
  }

  addUsers() {
    const dialogRef = this.dialog.open(AddRoleUsersComponent, {
      minWidth: '85%',
      maxWidth: '450px',
      data: { role_data: this.selectedRole },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.apiService.getRolesList().subscribe((roles: any) => {
          this.roles_list = roles;
          const updatedRole = roles.find((r: any) => r.role_id === this.selectedRole.role_id);
          if (updatedRole) {
            this.selectRole(updatedRole);
          }
        });

        this.notificationService.showSuccess('Users added successfully!');
      }
    });
  }
}
