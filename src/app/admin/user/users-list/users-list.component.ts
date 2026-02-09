import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { UserAuthenticatorComponent } from '../../../components/auth/user-authenticator/user-authenticator.component';
import { ManageAssWardsComponent } from '../../../components/dialogs/manage-ass-wards/manage-ass-wards.component';
import { ManageDepartmentsComponent } from '../../../components/dialogs/manage-departments/manage-departments.component';
import { APIsService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notifications.service';
import { UserService } from '../../../services/user.service';
import { AdminHeaderComponent } from '../../common/admin-header/admin-header.component';
import { AdminSideBarComponent } from '../../common/admin-side-bar/admin-side-bar.component';
import { AdminService, PermId } from '../../../services/admin.service';

@Component({
  selector: 'app-users-list',
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
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.css',
})
export class UsersListComponent {
  users_list: any = [];
  searchQuery = '';
  departments_list: any = [];
  departments_id = '';
  userType: string = '';
  private destroy$ = new Subject<void>();

  get remainingUsersAllowed(): number {
    return (this.getUsersLimit() ?? 0) - this.totalUserAccounts;
  }

  get hasReachedLimit(): boolean {
    return this.canShowUserLimitInfo && this.remainingUsersAllowed <= 0;
  }

  get totalUserAccounts(): number {
    return this.users_list?.filter((u: any) => u.user_type === 'user').length ?? 0;
  }

  get canShowUserLimitInfo(): boolean {
    return this.getUsersLimit() !== null && Array.isArray(this.users_list);
  }

  constructor(
    private router: Router,
    private notificationService: NotificationService,
    private apiService: APIsService,
    private dialog: MatDialog,
    private userService: UserService,
    private adminService: AdminService,
  ) {
    this.userService.user$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      if (user) {
        this.userType = user.user_type;
      }
    });
  }

  ngOnInit(): void {
    this.getUsersList();
    this.getDepartmentList();
  }

  getCreatePermission(permissionId: PermId): boolean {
    return this.adminService.canAdd(permissionId);
  }

  getDepartmentList() {
    this.apiService.getDepartments().subscribe((res) => {
      this.departments_list = res;
    });
  }

  manageAssWards() {
    const dialogRef = this.dialog.open(ManageAssWardsComponent, {
      width: '750px',
      maxWidth: '95%',
      panelClass: 'custom-dialog',
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
      }
    });
  }

  manageDepartments() {
    const dialogRef = this.dialog.open(ManageDepartmentsComponent, {
      width: '750px',
      maxWidth: '95%',
      panelClass: 'custom-dialog',
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
      }
    });
  }

  // GRT USERS LIST
  getUsersList() {
    this.apiService.getAdminUsers().subscribe((res) => {
      this.users_list = res;
      this.users_list.sort((a: { department: string }, b: { department: any }) =>
        a.department.localeCompare(b.department),
      );
      const query = this.searchQuery.trim().toLowerCase();
      const departmentId = this.departments_id;
      this.users_list = this.users_list.filter(
        (user: {
          username?: string;
          email?: string;
          first_name?: string;
          mobile?: string | string[];
          dep_id?: string;
        }) =>
          (!query ||
            [user.username, user.email, user.first_name, user.mobile].some((field) =>
              field?.toString().toLowerCase().includes(query),
            )) &&
          (!departmentId || user.dep_id == departmentId),
      );
    });
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

  getUsersLimit() {
    return this.userService.getUserLimit();
  }

  canCreateUser(): boolean {
    const limit = this.getUsersLimit();
    return limit === null || this.totalUserAccounts < limit;
  }
}
