import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogModule,
} from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';

import { CustomButtonsComponent } from '../../custom-buttons/custom-buttons.component';
import { ProVersionMessageComponent } from '../../../helpers/pro-version-message/pro-version-message.component';

@Component({
  selector: 'app-print-panel',
  imports: [
    CommonModule,
    MatDialogClose,
    MatDialogActions,
    MatDialogContent,
    MatDialogModule,
    CustomButtonsComponent,
    FormsModule,
    ProVersionMessageComponent,
  ],
  templateUrl: './print-panel.component.html',
  styleUrl: './print-panel.component.css',
})
export class PrintPanelComponent {
  showProOverlay = true;
  dataSetName: string = 'Untitled';

  scales = ['1:1000', '1:5000', '1:10000'];
  layouts = ['A4', 'A3', 'A2', 'A1', 'A0'];
  orientations = ['Portrait', 'Landscape'];
  layers = ['Layer 1', 'Layer 2', 'Layer 3'];
  attributes = ['Attribute 1', 'Attribute 2', 'Attribute 3'];
}
