import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, inject, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { UserAuthenticatorComponent } from '../../components/auth/user-authenticator/user-authenticator.component';
import { AboutComponent } from '../../components/dialogs/about/about.component';
import { LoaderComponent } from '../../components/side-panel/loader/loader.component';
import { APIsService } from '../../services/api.service';
import { NotificationService } from '../../services/notifications.service';
import { UserService } from '../../services/user.service';
import { AdminHeaderComponent } from '../common/admin-header/admin-header.component';
import { AdminSideBarComponent } from '../common/admin-side-bar/admin-side-bar.component';
import { OnlineUsersComponent } from '../../components/dialogs/online-users/online-users.component';
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    AdminHeaderComponent,
    AdminSideBarComponent,
    MatIconModule,
    RouterModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LoaderComponent,
    UserAuthenticatorComponent,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
})
export class HomePageComponent implements OnInit, AfterViewInit {
  loading = false;

  dialog = inject(MatDialog);
  private dialogRef: any;

  orgName: string = '';
  owner: string = '';
  phone: string = '';
  email: string = '';
  address: string = '';

  activeUsers: number = 0;
  suspendedUsers: number = 0;
  registeredUsers: number = 0;
  onlineUsers: number = 0;

  current_name: string | null = null;
  permit_end_date: string | null = null;
  status: string = '';
  users_limit: string | null = null;

  logins: any = [];

  private intervalId: any;

  constructor(
    private notificationService: NotificationService,
    private apiService: APIsService,
    private userService: UserService,
  ) {}

  ngOnInit() {
    this.loading = true;
    Promise.all([this.getDashboardData(), this.getUsersOverview(), this.getRecentLogins()]).finally(
      () => {
        this.loading = false;
      },
    );
  }

  ngAfterViewInit() {
    this.intervalId = setInterval(() => {
      this.getUsersOverview();
    }, 60000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  getDashboardData(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.apiService.getDashboardData().subscribe({
        next: (res: any) => {
          this.orgName = res.display_name;
          this.owner = res.director;
          this.phone = res.contact_no;
          this.email = res.org_email;
          this.address = res.org_address;
          this.status = res.status;
          this.current_name = res.subscription_plan;
          this.permit_end_date = res.permit_end_date;
          this.status = res.status;
          this.users_limit = res.users_limit ? res.users_limit : 'Unlimited';
          this.userService.setUserLimit(res.users_limit);
          resolve(true);
        },
        error: (err) => reject(err),
      });
    });
  }

  getUsersOverview(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.apiService.getUserOverview().subscribe({
        next: (res: any) => {
          this.activeUsers = res.active;
          this.suspendedUsers = res.suspended;
          this.registeredUsers = res.registered;
          this.onlineUsers = res.online;
          resolve(true);
        },
        error: (err) => {
          console.error(err.error.error);
          reject(err);
        },
      });
    });
  }

  getRecentLogins(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.apiService.getRecentLogins().subscribe({
        next: (res: any) => {
          this.logins = res;
          resolve(true);
        },
        error: (err) => reject(err),
      });
    });
  }

  openBilling() {
    if (this.dialogRef) {
      // If dialog is already open, close it
      this.dialogRef.close();
      this.dialogRef = null; // Reset the reference
    } else {
      // Open a new dialog if it's not already open
      this.dialogRef = this.dialog.open(AboutComponent, {
        minWidth: '520px',
        maxWidth: '520px',
        hasBackdrop: true, // Optional: removes backdrop
      });

      // Reset dialogRef when the dialog is closed
      this.dialogRef.afterClosed().subscribe(() => {
        this.dialogRef = null;
      });
    }
  }

  formatDate(dateString: string): string {
    try {
      // Parse the string directly, JS Date will honor the +05:30 offset
      const date = new Date(dateString);

      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }

      // Use local getters, not UTC!
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(-2);

      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours || 12;

      return `${day}-${month}-${year} ${hours.toString().padStart(2, '0')}.${minutes}.${seconds} ${ampm}`;
    } catch (e) {
      console.error('Error formatting date', e);
      return dateString;
    }
  }

  formatDateOnly(dateString: string): string {
    try {
      const date = new Date(dateString);

      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }

      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch (e) {
      console.error('Error formatting date', e);
      return dateString;
    }
  }

  openOnlineUsers() {
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = null;
    } else {
      this.dialogRef = this.dialog.open(OnlineUsersComponent, {
        minWidth: '720px',
        maxWidth: '720px',
        hasBackdrop: true,
      });

      this.dialogRef.afterClosed().subscribe(() => {
        this.dialogRef = null;
      });
    }
  }
}
