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
import { ChangePasswordModel } from '../../../../../models/API';
import { LoginService } from '../../../../../services/login.service';

@Component({
  selector: 'app-user-password-change',
  standalone: true,
  imports: [
    MatDialogModule,
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './user-password-change.component.html',
  styleUrl: './user-password-change.component.css',
})
export class UserPasswordChangeComponent {
  Obj: ChangePasswordModel = new ChangePasswordModel();
  isLoading = false; // avriable for spinner
  usertoken: string = ''; // replaced with the login response detail - (token)
  msg: any;
  private snackBar = inject(MatSnackBar);

  passwordVisible: boolean = false;
  newPasswordVisible: boolean = false;
  confirmNewPasswordVisible: boolean = false;

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }
  toggleNewPasswordVisibility() {
    this.newPasswordVisible = !this.newPasswordVisible;
  }
  toggleConfirmNewPasswordVisibility() {
    this.confirmNewPasswordVisible = !this.confirmNewPasswordVisible;
  }

  constructor(
    private loginService: LoginService,
    public dialogRef: MatDialogRef<UserPasswordChangeComponent>,
  ) {}

  ngOnInit(): void {
    this.usertoken = localStorage.getItem('Token') || '';
  }

  onClick() {
    this.isLoading = true; // Show spinner while processing

    this.loginService.ChangePassword(this.Obj, this.usertoken).subscribe(
      (res: any) => {
        this.isLoading = false; // Hide spinner after response
        console.log('pwchange: ', res);

        if (res?.message === 'Password changed successfully.') {
          this.showSuccess('Password changed successfully!');
          this.dialogRef.close(true);
        }
      },
      (error) => {
        const errorMessage = error?.error?.error;
        this.isLoading = false; // Hide spinner on error
        if (errorMessage === 'New password and confirm new password do not match.') {
          this.showError('New password and confirmed password do not match!');
        } else if (errorMessage === 'Old password is incorrect.') {
          this.showError('Old password is incorrect!');
        } else {
          this.showError('Server Error. Please try again shortly!');
        }
        console.error('Error occurred:', error);
      },
    );
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
}
