import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogModule,
} from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { CustomButtonsComponent } from '../../../custom-buttons/custom-buttons.component';

@Component({
  selector: 'app-select-attributes',
  imports: [
    CommonModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogModule,
    CustomButtonsComponent,
  ],
  templateUrl: './select-attributes.component.html',
  styleUrl: './select-attributes.component.css',
})
export class SelectAttributesComponent {
  selectedAttributes: string[] = [];

  constructor(
    public dialogRef: MatDialogRef<SelectAttributesComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { attributesList: string[]; selectedAttributes: string[] },
  ) {
    // Initialize selected attributes from the passed data
    this.selectedAttributes = [...this.data.selectedAttributes];
  }

  // Called when the user closes the dialog
  onSave(): void {
    this.dialogRef.close(this.selectedAttributes);
  }

  // Handle checkbox change event
  onCheckboxChange(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const value = checkbox.value;

    if (checkbox.checked) {
      this.selectedAttributes.push(value);
    } else {
      this.selectedAttributes = this.selectedAttributes.filter((attribute) => attribute !== value);
    }
  }

  // Check if the attributes is already selected
  isChecked(attribute: string): boolean {
    return this.selectedAttributes.includes(attribute);
  }
}
