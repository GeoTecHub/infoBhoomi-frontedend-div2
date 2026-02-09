import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { MatRipple } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { Router } from '@angular/router';
import { RrrPanalComponent } from '../../../components/dialogs/rrr-panal/rrr-panal.component';
import { ActivityLogComponent } from '../../../components/header/settings/activity-log/activity-log.component';
import { UserProfileComponent } from '../../../components/header/settings/user-profile/user-profile.component';
import { LayerPanelComponent } from '../../../components/layer-panel/layer-panel.component';
import { LoginService } from '../../../services/login.service';

import { WorkspaceComponent } from '../../../components/dialogs/workspace/workspace.component';

import { APIsService } from '../../../services/api.service';

import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { FeatureNotAvailableComponent } from '../../../components/dialogs/feature-not-available/feature-not-available.component';
import { SubscriptionDetailsComponent } from '../../../components/dialogs/subscription-details/subscription-details.component';
import { AdminService } from '../../../services/admin.service';
import { NotificationService } from '../../../services/notifications.service';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatIconButton,
    MatRipple,
    MatMenuModule,
    CommonModule,
    MatTooltip,
  ],
  templateUrl: './admin-header.component.html',
  styleUrl: './admin-header.component.css',
})
export class AdminHeaderComponent implements OnInit {
  sex: string = '';
  username: string = '';
  userType: string = '';
  userId: string | null = null;
  user_org_id: number | null = null;
  current_location: any = { dist: '', city: '', org_name: '' };
  private dialogRef: any;
  private destroy$ = new Subject<void>();

  planName = '';
  planEndsOn = '';

  organizations_list: any = [];
  isOrgsMenuOpen = false;
  current_org: any | null = null;
  hideSelector = false;

  constructor(
    private dialog: MatDialog,
    private apiService: APIsService,
    private router: Router,
    private authService: LoginService,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private loginService: LoginService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private notificationService: NotificationService,
    private adminService: AdminService,
  ) {}
  department: string | null = null;
  async ngOnInit() {
    this.checkUrl(this.router.url);
    this.router.events.subscribe((event: any) => {
      if (event.url) {
        this.checkUrl(event.url);
      }
    });
    await this.userService.user$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      if (user) {
        this.username = user.username.replace(/"/g, '') || '';
        this.sex = user.sex || '';
        this.user_org_id = user.org_id;
        this.userId = user.user_id.toString() || '';
        this.userType = user.user_type;
        this.department = user.department || '';
      }
    });

    await this.getPermissions();
    this.getOrgs();
    this.getCurrentLocation();
    this.getOrgData();
  }

  private checkUrl(url: string): void {
    if (
      url.includes('admin-organizations-location-edit') ||
      url.includes('admin-organizations-area-edit')
    ) {
      this.hideSelector = true;
    } else {
      this.hideSelector = false;
    }
  }

  getPermissions = async () => {
    this.apiService.getAdminPermissions().subscribe({
      next: (permissions: any) => {
        const permissionsArray = Array.isArray(permissions) ? permissions : [];
        this.adminService.setPermissions(permissionsArray);
        console.log('Permissions loaded:', permissionsArray);
      },
      error: () => {
        this.notificationService.showError('Unable to verify permissions. Please login again.');
      },
    });
  };

  getOrgs() {
    if (this.userType !== 'super_admin') return;
    this.apiService.getOrganizationsList().subscribe((res) => {
      this.organizations_list = res;
      this.current_org = this.organizations_list.find(
        (org: any) => org.org_id === this.user_org_id,
      );
    });
  }

  getOrgData(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.apiService.getDashboardData().subscribe({
        next: (res: any) => {
          this.planName = res.subscription_plan;
          this.planEndsOn = res.permit_end_date;
          this.userService.setUserLimit(res.users_limit);
          this.cdr.detectChanges();
          resolve(true);
        },
        error: (err) => reject(err),
      });
    });
  }

  getCurrentLocation() {
    const user = this.userService.getUser();

    if (user?.user_id) {
      this.apiService.getCurrentLocation().subscribe((res) => {
        // @ts-ignore
        this.current_location = res.features[0].properties;
      });
    } else {
      console.warn('User ID not available in admin header, skipping location fetch.');
    }
  }

  openRRRDialog(): void {
    this.dialog.open(RrrPanalComponent, {
      width: '75%',
      maxWidth: '85%',
      data: { feature_id: 91 },
    });
  }

  OpenLayersPanel() {
    if (this.dialogRef) {
      // If dialog is already open, close it
      this.dialogRef.close();
      this.dialogRef = null; // Reset the reference
    } else {
      // Open a new dialog if it's not already open
      this.dialogRef = this.dialog.open(LayerPanelComponent, {
        minWidth: '400px',
        maxWidth: '420px',
        hasBackdrop: false, // Optional: removes backdrop
      });

      // Reset dialogRef when the dialog is closed
      this.dialogRef.afterClosed().subscribe(() => {
        this.dialogRef = null;
      });
    }
  }

  OpenWorkspacePanel(): void {
    const dialogRef = this.dialog.open(WorkspaceComponent, {
      width: '300px',
      data: {}, // Pass data if needed
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // this.selectedMode = result;
        console.log('Selected Mode:', result);
      }
    });
  }
  OpenUserProfile() {
    if (this.dialogRef) {
      // If dialog is already open, close it
      this.dialogRef.close();
      this.dialogRef = null; // Reset the reference
    } else {
      // Open a new dialog if it's not already open
      this.dialogRef = this.dialog.open(UserProfileComponent, {
        minWidth: '400px',
        maxWidth: '420px',
      });

      // Reset dialogRef when the dialog is closed
      this.dialogRef.afterClosed().subscribe(() => {
        this.dialogRef = null;
      });
    }
  }

  OpenActivityLog() {
    if (this.dialogRef) {
      // If dialog is already open, close it
      this.dialogRef.close();
      this.dialogRef = null; // Reset the reference
    } else {
      // Open a new dialog if it's not already open
      this.dialogRef = this.dialog.open(ActivityLogComponent, {
        minWidth: '80vw',
      });

      // Reset dialogRef when the dialog is closed
      this.dialogRef.afterClosed().subscribe(() => {
        this.dialogRef = null;
      });
    }
  }

  backToMain() {
    this.router.navigateByUrl('/main');
  }

  OpenVERTEXT() {}

  openSubscriptionAlert() {
    if (this.dialogRef) {
      // If dialog is already open, close it
      this.dialogRef.close();
      this.dialogRef = null; // Reset the reference
    } else {
      // Open a new dialog if it's not already open
      this.dialogRef = this.dialog.open(SubscriptionDetailsComponent, {
        minWidth: '480px',
      });

      // Reset dialogRef when the dialog is closed
      this.dialogRef.afterClosed().subscribe(() => {
        this.dialogRef = null;
      });
    }
  }

  openProAlert() {
    if (this.dialogRef) {
      // If dialog is already open, close it
      this.dialogRef.close();
      this.dialogRef = null; // Reset the reference
    } else {
      // Open a new dialog if it's not already open
      this.dialogRef = this.dialog.open(FeatureNotAvailableComponent, {
        minWidth: '480px',
      });

      // Reset dialogRef when the dialog is closed
      this.dialogRef.afterClosed().subscribe(() => {
        this.dialogRef = null;
      });
    }
  }

  getSubscriptionClass(): string {
    switch ((this.planName || '').toLowerCase()) {
      case 'free trial':
        return 'free-trial';
      case 'classic':
        return 'classic';
      case 'premium':
        return 'premium';
      default:
        return 'free-trial';
    }
  }

  getRemainingDays(): number {
    const today = new Date();
    const end = new Date(this.planEndsOn);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  onOrgChange(org: any) {
    if (!this.userId) return;
    const usertoken = localStorage.getItem('Token') || '';
    const formData = { org_id: org.org_id };

    this.notificationService.showInfo('Wait untill page refresh by itself');
    this.loginService.ChangeUser(usertoken, formData, this.userId).subscribe(
      (res: any) => {
        if (res?.details === 'successfully updated.') {
          this.apiService.getUserDetails().subscribe((res: any) => {
            this.userService.setUser(res);
            window.location.reload();
          });
        }
      },
      (error: any) => {
        const errorMessage = error?.error?.error;
        this.notificationService.showError(errorMessage);
        console.error('Error occurred:', errorMessage);
      },
    );
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
    }
    // localStorage.removeItem('userdetail');
    // localStorage.removeItem('user_type');
    // localStorage.removeItem('organization_id');
    // localStorage.removeItem('department');
    // localStorage.removeItem('user_name');
    // localStorage.removeItem('first_name');
    // localStorage.removeItem('last_name');
    // localStorage.removeItem('nic');
    // localStorage.removeItem('mobile');
    // localStorage.removeItem('email');
    // localStorage.removeItem('post');
    // localStorage.removeItem('sex');
    // localStorage.removeItem('birthday');
    // localStorage.removeItem('is_active');
    // localStorage.removeItem('currentLayerId');
    // localStorage.removeItem('Oraganization');

    sessionStorage.removeItem('permissions');

    const token = localStorage.getItem('Token');
    this.authService.logout(token).subscribe(() => {
      // localStorage.removeItem('Token');
      localStorage.clear();
      this.router.navigateByUrl('/login');
    });
  }

  ngOnDestroy() {
    // Ensure the dialog is closed when the component is destroyed
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = null;
    }
  }
}
