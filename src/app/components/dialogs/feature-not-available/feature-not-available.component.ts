import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProVersionMessageComponent } from '../../helpers/pro-version-message/pro-version-message.component';

@Component({
  selector: 'app-feature-not-available',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    CommonModule,
    FormsModule,
    MatTooltipModule,
    MatDividerModule,
    ProVersionMessageComponent,
  ],
  templateUrl: './feature-not-available.component.html',
  styleUrl: './feature-not-available.component.css',
})
export class FeatureNotAvailableComponent {}
