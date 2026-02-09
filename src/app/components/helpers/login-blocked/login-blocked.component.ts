import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProVersionMessageComponent } from '../pro-version-message/pro-version-message.component';

@Component({
  selector: 'app-login-blocked',
  imports: [
    MatIconModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    CommonModule,
    FormsModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: './login-blocked.component.html',
  styleUrl: './login-blocked.component.css',
  standalone: true,
})
export class LoginBlockedComponent {
  expand = false;

  showExpand() {
    this.expand = !this.expand;
  }
}
