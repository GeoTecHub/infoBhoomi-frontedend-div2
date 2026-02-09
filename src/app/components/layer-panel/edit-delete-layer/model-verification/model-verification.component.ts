import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-model-verification',
  imports: [
    MatInputModule,
    MatFormFieldModule,
    CommonModule,
    FormsModule,
    MatDialogActions,
    MatDialogTitle,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './model-verification.component.html',
  styleUrl: './model-verification.component.css',
})
export class ModelVerificationComponent {
  password: string = '';
  passwordRequired: boolean = false;

  passwordVisible: boolean = false;

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  constructor(public dialogRef: MatDialogRef<ModelVerificationComponent>) {}

  onConfirm() {
    if (!this.password) {
      this.passwordRequired = true; // Set the flag to true if password is not entered
      return; // Exit the function to prevent closing the dialog
    }

    this.dialogRef.close(this.password); // Proceed to close the dialog with the password
    this.passwordRequired = false; // Reset the flag if password is valid
  }

  onCancel() {
    this.dialogRef.close(null);
  }
}
