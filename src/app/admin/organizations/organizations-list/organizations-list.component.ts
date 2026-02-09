import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { UserAuthenticatorComponent } from '../../../components/auth/user-authenticator/user-authenticator.component';
import { APIsService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notifications.service';
import { UserService } from '../../../services/user.service';
import { AdminHeaderComponent } from '../../common/admin-header/admin-header.component';
import { AdminSideBarComponent } from '../../common/admin-side-bar/admin-side-bar.component';

@Component({
  selector: 'app-organizations-list',
  imports: [
    AdminHeaderComponent,
    AdminSideBarComponent,
    MatIconModule,
    RouterModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    UserAuthenticatorComponent,
    MatTooltipModule,
  ],
  templateUrl: './organizations-list.component.html',
  styleUrl: './organizations-list.component.css',
  standalone: true,
})
export class OrganizationsListComponent implements OnInit {
  organizations_list: any = [];
  user_org: number | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private notificationService: NotificationService,
    private apiService: APIsService,
    private dialog: MatDialog,
    private userService: UserService,
  ) {
    this.userService.user$.pipe(takeUntil(this.destroy$)).subscribe((user: any) => {
      if (user) {
        this.user_org = user.org_id || null;
      }
    });
  }

  ngOnInit(): void {
    this.getOrganizationsList();
  }

  getOrganizationsList() {
    this.apiService.getOrganizationsList().subscribe((res) => {
      this.organizations_list = res;
    });
  }

  updateLocation(org: any) {
    this.router.navigate([`/admin-organizations-location-edit/${org.org_id}`]);
  }

  updateArea(org: any) {
    this.router.navigate([`/admin-organizations-area-edit/${org.org_id}`]);
  }

  toggleStatus(event: Event, org: any) {
    const input = event.target as HTMLInputElement;
    if (org.org_id === this.user_org) {
      event.preventDefault();
      event.stopPropagation();
      input.checked = org.status;
      this.notificationService.showError(
        ' You cannot deactivate your own organization. Please switch to another organization first. ',
        5000,
      );
      return;
    }
    const previous = org.status;
    const next = input.checked;

    if (next && this.isPermitExpired(org.permit_end_date)) {
      event.preventDefault();
      event.stopPropagation();
      input.checked = previous;
      this.notificationService.showError('Organization permit is already expired.', 5000);
      return;
    }

    org.status = next;

    this.apiService.editOrganization(org.org_id, { status: next }).subscribe({
      next: () => {
        this.notificationService.showSuccess('Status updated successfully');
      },
      error: (err) => {
        org.status = previous;
        input.checked = previous;
        this.notificationService.showError(err.error?.error || 'Data not saved');
      },
    });
  }

  showOrganization(org: any) {
    this.router.navigate([`/admin-organizations-edit/${org.org_id}`]);
  }

  isPermitExpired(permitEndDate: string | null | undefined): boolean {
    if (!permitEndDate) {
      return false;
    }

    const [year, month, day] = permitEndDate.split('-').map((part) => Number(part));
    if (!year || !month || !day) {
      return false;
    }

    const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
    return new Date() > endDate;
  }
}
