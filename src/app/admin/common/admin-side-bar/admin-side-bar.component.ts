import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FeatureNotAvailableComponent } from '../../../components/dialogs/feature-not-available/feature-not-available.component';
import { UserService } from '../../../services/user.service';
import { AdminService, PermId } from '../../../services/admin.service';

@Component({
  selector: 'app-admin-side-bar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-side-bar.component.html',
  styleUrl: './admin-side-bar.component.css',
})
export class AdminSideBarComponent {
  selected_feature_ID: any = '';
  selected_layer_ID: any = '';
  activeTab: number = 2;
  user_type: string = '';
  private destroy$ = new Subject<void>();
  constructor(
    private cdr: ChangeDetectorRef,
    private userService: UserService,
    private adminService: AdminService,
  ) {
    this.userService.user$.pipe(takeUntil(this.destroy$)).subscribe((user: any) => {
      if (user) {
        this.user_type = user.user_type || '';
      }
    });
  }

  getPermissionView(permissionId: PermId): boolean {
    return this.adminService.canView(permissionId);
  }

  selectTab(tabIndex: number) {
    this.activeTab = tabIndex;
    this.cdr.detectChanges(); // Force change detection
  }

  dialog = inject(MatDialog);
  private dialogRef: any;

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
}
