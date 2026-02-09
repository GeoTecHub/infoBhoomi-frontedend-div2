import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogContent,
  MatDialogModule,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';
import {
  AddLayerModel,
  PasswordVerificationRequest,
  VERIFICATION_RESPONSE,
} from '../../../models/API';
import { LayerService } from '../../../services/layer.service';
import { NotificationService } from '../../../services/notifications.service';
import { UserService } from '../../../services/user.service';
import { ModelVerificationComponent } from './model-verification/model-verification.component';
import { MatCard, MatCardContent } from '@angular/material/card';

@Component({
  selector: 'app-edit-delete-layer',
  imports: [
    FormsModule,
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatDialogActions,
    MatDialogContent,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatCard,
    MatCardContent,
  ],
  templateUrl: './edit-delete-layer.component.html',
  styleUrl: './edit-delete-layer.component.css',
})
export class EditDeleteLayerComponent {
  updatedLayer: AddLayerModel = new AddLayerModel();
  layer: any;
  modelHeader!: string;
  buttonTitle!: string;
  isDeleteLayer!: boolean;

  user_type: string = ''; // replaced with the login response detail - (user_type)
  user_id_number: number | null = null;
  user_id: string = ''; // replaced with the login response detail - (user_id)
  organization_id: string = ''; // replaced with the login response detail - (organization)

  layerNameRequired: boolean = false;

  isLoading = false; // avriable for spinner
  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<EditDeleteLayerComponent>,
    public dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private layerService: LayerService,
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
    // Pre-fill the layer object with data passed from the Layer-Panel component
    this.layer = { ...data.layer };

    this.modelHeader = data.title;
    this.buttonTitle = data.btnName;
    this.isDeleteLayer = data.isdelete;
  }

  ngOnInit(): void {
    this.updatedLayer.layer_name = this.layer.layer_name;
    const newstring = this.layer.colour;
    this.updatedLayer.colour = this.layerService.convertColorNameToHex(newstring);
    if (this.organization_id) {
      this.organization_id = `ORG${this.organization_id}`; // Update the class property.
    }
  }

  onUpdateDelete() {
    this.isLoading = true; // Show spinner
    if (this.modelHeader == 'Edit Layer Details' && this.buttonTitle == 'Update') {
      // if (!this.updatedLayer.layer_name) {
      //   this.layerNameRequired = true;
      //   return;
      // }

      // this.updatedLayer.user_id = this.user_id_number;
      // if (this.user_type == 'admin' || this.user_type === 'super_admin') {
      //   this.updatedLayer.group_name = ['org'];
      // } else if (this.user_type == 'user') {
      //   this.updatedLayer.group_name = null;
      // }

      if (
        this.updatedLayer.colour != this.layerService.convertColorNameToHex(this.layer.colour) ||
        this.updatedLayer.layer_name != this.layer.layer_name
      ) {
        this.layerService
          .UpdateLayer(
            {
              layer_name: this.updatedLayer.layer_name,
              colour: this.updatedLayer.colour,
            },
            this.layer.layer_id,
          )
          .subscribe(
            (res: any) => {
              this.isLoading = false; // Hide spinner on success
              console.log(res);
              this.notificationService.showSuccess('Layer updated successfully');
              this.dialogRef.close(true); // close the dialog and pass true to indicate update
            },
            (error) => {
              this.isLoading = false; // Hide spinner on error
              console.error('Error occurred:', error);
              this.notificationService.showError(
                error.error.error || 'Error: Unable to update the layer...!',
              );
            },
          );
      } else {
        this.notificationService.showInfo('Already updated...!');
        this.isLoading = false;
      }

      this.layerNameRequired = false; // Reset the flag if layer name is valid
    } else if (this.modelHeader == 'Delete Layer Details' && this.buttonTitle == 'Delete') {
      this.layerNameRequired = false;
      this.openPasswordDialog();
    }
  }

  // Function to open the password validation dialog
  openPasswordDialog() {
    this.isLoading = true; // Show spinner
    const dialogRef = this.dialog.open(ModelVerificationComponent, {
      width: '450px',
    });

    dialogRef.afterClosed().subscribe((password) => {
      if (password) {
        const password_obj = new PasswordVerificationRequest(password);
        console.log(password);

        //-------------------Verify the identity of the user--------------------------------
        this.layerService.VerifyPassword(password_obj).subscribe(
          (res: VERIFICATION_RESPONSE) => {
            this.isLoading = false; // Hide spinner on success
            console.log(res);

            if (res.message == 'Password is correct.') {
              this.isLoading = true; // Show spinner
              const confirmation = confirm('Are you sure you want to delete this layer?');
              if (confirmation) {
                //-------------------Layer deletion Process--------------------------------
                this.layerService.DeleteLayerData(this.layer.layer_id).subscribe(
                  (res: any) => {
                    this.isLoading = false; // Hide spinner on success
                    console.log(res);
                    this.notificationService.showSuccess('Layer deleted successfully');
                    this.dialogRef.close(true); // close the dialog and pass true to indicate deletion
                  },
                  (error) => {
                    this.isLoading = false; // Hide spinner on success
                    console.error('Error occurred:', error);
                    this.notificationService.showError('Error: Unable to delete the layer...!');
                  },
                );
              } else {
                this.isLoading = false; // Hide spinner on success
                console.log('Layer deletion canceled by the user.');
              }
            }
          },
          (error) => {
            this.isLoading = false; // Hide spinner on error

            if (error.error.message == 'Incorrect password.') {
              this.notificationService.showError('Invalid password...!');
            } else {
              console.error('Error occurred:', error);
              this.notificationService.showError('Error: Unable to delete the layer...!');
            }
          },
        );
      }
    });
  }
}
