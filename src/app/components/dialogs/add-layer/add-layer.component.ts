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
import { APIsService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notifications.service';

@Component({
  selector: 'app-add-layer',
  standalone: true,
  imports: [
    MatDialogModule,
    MatTabsModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    NgSelectModule,
    CommonModule,
  ],
  templateUrl: './add-layer.component.html',
  styleUrl: './add-layer.component.css',
})
export class AddLayerComponent {
  role_user: any = [];
  layer_name = '';
  selectedColor: any = '#000';
  popup_action = 'Create';
  default_layer = false;

  ngOnInit(): void {}

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<AddLayerComponent>,
    private apiService: APIsService,
    private dialog: MatDialog,
    private notificationService: NotificationService,
  ) {
    if (this.data.action === 'edit') {
      this.popup_action = 'Edit';

      this.layer_name = this.data.data.layer_name;
      this.selectedColor = this.data.data.colour;

      if (this.data.data.group_name[0] === 'default') {
        this.default_layer = true;
      }
    } else {
      this.popup_action = 'Create';
    }
  }

  SubmitAll() {
    if (this.selectedColor == '') {
      // this.selectedColor = null
    }
    if (this.layer_name == '') {
      this.notificationService.showError('Please enter layer name');
      return; // Stop function execution if validation fails
    }
    if (this.data.action === 'create') {
      let input_data = {
        layer_name: this.layer_name,
        colour: this.selectedColor,
      };
      this.apiService.createLayer(input_data).subscribe(
        (response: any) => {
          this.notificationService.showSuccess('Layer created successfully');
          this.dialogRef.close(response); // Close dialog after success
        },
        (error: any) => {
          console.error('Error creating role:', error);
          this.notificationService.showError(error.error?.error || 'Layer creation failed');
        },
      );
    } else if (this.data.action === 'edit') {
      let input_data = {
        layer_name: this.layer_name,
        colour: this.selectedColor,
      };
      this.apiService.updateLayer(input_data, this.data.data.layer_id).subscribe(
        (response: any) => {
          this.notificationService.showSuccess('Layer updated successfully');
          this.dialogRef.close(response); // Close dialog after success
        },
        (error: any) => {
          console.error('Error updating Layer:', error);
          this.notificationService.showError(error.error?.error || 'Failed to update Layer');
        },
      );
    }
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
