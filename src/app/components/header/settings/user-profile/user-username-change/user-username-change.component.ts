import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { ChangeUsernameModel } from '../../../../../models/API';
import { APIsService } from '../../../../../services/api.service';
import { LoginService } from '../../../../../services/login.service';
import { NotificationService } from '../../../../../services/notifications.service';
import { UserService } from '../../../../../services/user.service';

@Component({
  selector: 'app-user-username-change',
  standalone: true,
  imports: [
    MatDialogModule,
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './user-username-change.component.html',
  styleUrl: './user-username-change.component.css',
})
export class UserUsernameChangeComponent {
  Obj: ChangeUsernameModel = new ChangeUsernameModel();
  isLoading = false;
  usertoken: string = '';
  userId: string = '';
  private snackBar = inject(MatSnackBar);
  private destroy$ = new Subject<void>();

  constructor(
    private loginService: LoginService,
    public dialogRef: MatDialogRef<UserUsernameChangeComponent>,
    private notificationService: NotificationService,
    private userService: UserService,
    private apiService: APIsService,
  ) {}

  ngOnInit(): void {
    this.usertoken = localStorage.getItem('Token') || '';
    this.userService.user$.pipe(takeUntil(this.destroy$)).subscribe((user: any) => {
      if (user) {
        this.userId = user.user_id.toString() || '';
      }
    });
  }

  horizontalPosition: MatSnackBarHorizontalPosition = 'end';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';

  // Show success notification
  showSuccess(message: string, duration: number = 3000) {
    this.snackBar.open('✅ ' + message, 'Close', {
      duration: duration,
      panelClass: ['success-snackbar'],
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  // Show error notification
  showError(message: string, duration: number = 3000) {
    this.snackBar.open('❌ ' + message, 'Close', {
      duration: duration,
      panelClass: ['error-snackbar'],
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  onClick() {
    if (!this.Obj.new_username) return;

    const formData = { username: this.Obj.new_username };

    this.isLoading = true;
    this.loginService.ChangeUser(this.usertoken, formData, this.userId).subscribe(
      (res: any) => {
        this.isLoading = false;
        if (res?.details === 'successfully updated.') {
          // localStorage.setItem('username', this.Obj.new_username);
          this.apiService.getUserDetails().subscribe((res: any) => {
            console.log(res);
            this.userService.setUser(res);
          });
          this.showSuccess('Username changed successfully!');
          this.dialogRef.close(true);
        } else if (res?.details.includes('exist') || res?.details.includes('exists')) {
          this.showError('This username is already taken!');
        }
      },
      (error: any) => {
        this.isLoading = false;
        const errorMessage = error?.error?.error;
        this.showError(errorMessage);
        // if (errorMessage === 'Username already exists.') {
        //   this.showError('This username is already taken!');
        // } else if (errorMessage === 'Invalid username.') {
        //   this.showError('Invalid username!');
        // } else {
        //   this.showError('Server Error. Please try again shortly!');
        // }
        console.error('Error occurred:', errorMessage);
      },
    );
  }
}
