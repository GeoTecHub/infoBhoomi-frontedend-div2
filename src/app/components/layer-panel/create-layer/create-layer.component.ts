import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AddLayerModel } from '../../../models/API';
import { LayerService } from '../../../services/layer.service';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MatDialogActions,
  MatDialogContent,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subject, takeUntil } from 'rxjs';
import { NotificationService } from '../../../services/notifications.service';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-create-layer',
  imports: [
    MatDialogActions,
    MatDialogContent,
    MatButtonModule,
    MatProgressSpinnerModule,
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
  templateUrl: './create-layer.component.html',
  styleUrl: './create-layer.component.css',
})
export class CreateLayerComponent {
  layerObj: AddLayerModel = new AddLayerModel();
  showColorPicker: boolean = false;

  user_type: string = ''; // should be replace with the login response detail - (user_type)
  user_id: string = ''; // should be replace with the login response detail - (user_id)
  user_id_number: number | null = null; // replaced with the login response detail - (user_id)
  organization_id: string = ''; // should be replace with the login response detail - (organization)

  layerNameRequired: boolean = false;

  isLoading = false; // avriable for spinner
  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<CreateLayerComponent>,
    private layerservice: LayerService,
    private userService: UserService,
    private notificationService: NotificationService,
  ) {
    this.userService.user$.pipe(takeUntil(this.destroy$)).subscribe((user: any) => {
      if (user) {
        this.user_type = user.user_type || '';
        this.user_id = user.user_id || '';
        this.user_id_number = user.user_id_number || null;
        this.organization_id = user.organization_id || '';
      }
    });
  }

  ngOnInit(): void {
    if (this.organization_id) {
      this.organization_id = `ORG${this.organization_id}`; // Update the class property.
    }
  }
  onClick() {
    this.isLoading = true; // Show spinner
    if (!this.layerObj.layer_name) {
      this.layerNameRequired = true; // Set the flag to true if layernameis not entered
      return; // Exit the function to prevent closing the dialog
    }

    // this.layerObj.user_id = this.user_id_number;
    // this.layerObj.order_by = null;

    // if (this.user_type === 'admin' || this.user_type === 'super_admin') {
    //   this.layerObj.group_name = ['org'];
    // } else if (this.user_type == 'user') {
    //   this.layerObj.group_name = null;
    // }

    this.layerservice.AddLayer(this.layerObj).subscribe(
      (res: any) => {
        this.isLoading = false; // Hide spinner on success
        this.notificationService.showSuccess(
          `${this.layerObj.layer_name + ' layer created successfully...!'}`,
        );
        console.log(res);

        this.dialogRef.close(true); // close the dialog and pass true to indicate update
      },
      (error) => {
        this.isLoading = false; // Hide spinner on error
        console.error('Layer obj: ', this.layerObj);
        console.error('Error occurred:', error.error);
        this.notificationService.showError(error.error.error || 'Unable to create the layer.');
      },
    );

    this.layerNameRequired = false; // Reset the flag if layer name is valid
  }
}
