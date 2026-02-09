import { Injectable } from '@angular/core';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(private snackBar: MatSnackBar) {}

  horizontalPosition: MatSnackBarHorizontalPosition = 'end';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';

  // Show success notification
  showSuccess(message: string, duration: number = 3000) {
    this.snackBar.open('✅ ' + message, 'Close', {
      duration: duration,
      panelClass: ['success-snackbar'], // Custom class for styling
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  // Show error notification
  showError(message: string, duration: number = 3000) {
    this.snackBar.open('❌ ' + message, 'Close', {
      duration: duration,
      panelClass: ['error-snackbar'], // Custom class for styling
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  // Show warning notification
  showWarning(message: string, duration: number = 3000) {
    this.snackBar.open('⚠️ ' + message, 'Close', {
      duration: duration,
      panelClass: ['warning-snackbar'], // Custom class for styling
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  // Show info notification
  showInfo(message: string, duration: number = 3000) {
    this.snackBar.open('💬 ' + message, 'Close', {
      duration: duration,
      panelClass: ['info-snackbar'], // Custom class for styling
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }
}
