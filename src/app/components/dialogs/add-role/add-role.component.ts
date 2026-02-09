import { CommonModule } from '@angular/common'; //
import { Component, Inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subject, takeUntil } from 'rxjs';
import { APIsService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notifications.service';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-add-role',
  standalone: true,
  imports: [
    MatDialogModule,
    MatTabsModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    NgSelectModule,
  ],
  templateUrl: './add-role.component.html',
  styleUrl: './add-role.component.css',
})
export class AddRoleComponent {
  role_user: any = [];
  role_name = '';
  role_type = 'user';
  role_remark: any;
  popup_action = 'Create';
  userType: string | null = null;
  private destroy$ = new Subject<void>();
  ngOnInit(): void {}

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<AddRoleComponent>,
    private apiService: APIsService,
    private dialog: MatDialog,
    private notificationService: NotificationService,
    private userService: UserService,
  ) {
    if (this.data.action == 'edit') {
      this.popup_action = 'Edit';
      ((this.role_name = this.data.data.role_name),
        (this.role_remark = this.data.data.remark),
        (this.role_type = this.data.data.role_type));
    } else {
      this.popup_action = 'Create';
    }

    this.userService.user$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      if (user) {
        this.userType = user.user_type;
      }
    });
  }

  validateRemarksLength() {
    if (this.role_remark.length > 250) {
      this.role_remark = this.role_remark.substring(0, 250); // Trim excess characters
    }
  }

  SubmitAll() {
    if (this.role_remark == '') {
      this.role_remark = null;
    }

    if (this.role_name == '') {
      this.notificationService.showError('Please enter role');
      return; // Stop function execution if validation fails
    }
    if (this.data.action === 'create') {
      let input_data = {
        role_name: this.role_name,
        remark: this.role_remark,
        role_type: this.role_type,
      };
      this.apiService.createRole(input_data).subscribe(
        (response: any) => {
          this.notificationService.showSuccess('Role created successfully');
          this.dialogRef.close(response); // Close dialog after success
        },
        (error: any) => {
          console.error('Error creating role:', error);
          // this.notificationService.showError('Role creation failed');
          this.notificationService.showError(error.error?.error || 'Role creation failed');
        },
      );
    } else if (this.data.action === 'edit') {
      let input_data = {
        role_name: this.role_name,
        remark: this.role_remark,
        role_type: this.role_type,
      };
      this.apiService.addUsersToRole(input_data, this.data.data.role_id).subscribe(
        (response: any) => {
          this.notificationService.showSuccess('Role updated successfully');
          this.dialogRef.close(response); // Close dialog after success
        },
        (error: any) => {
          console.error('Error updating role:', error);
          this.notificationService.showError('Failed to update role');
        },
      );
    }
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
