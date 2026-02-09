/**
 * TODO
 * - create functions default queries >>> need data layer to test
 * - save queries in databbase >>> need db table to store
 * - create functions for custom queries >>> need data layer to test
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogModule,
} from '@angular/material/dialog';

import { CustomButtonsComponent } from '../../custom-buttons/custom-buttons.component';
import { ProVersionMessageComponent } from '../../../helpers/pro-version-message/pro-version-message.component';

@Component({
  selector: 'app-query-builder',
  imports: [
    CommonModule,
    MatDialogClose,
    MatDialogActions,
    MatDialogContent,
    MatDialogModule,
    CustomButtonsComponent,
    ProVersionMessageComponent,
  ],
  templateUrl: './query-builder.component.html',
  styleUrl: './query-builder.component.css',
})
export class QueryBuilderComponent {
  showProOverlay = true;
  isAdvancedMode = false;

  toggleAdvanced() {
    if (this.showProOverlay) return;
    this.isAdvancedMode = !this.isAdvancedMode;
  }
}
