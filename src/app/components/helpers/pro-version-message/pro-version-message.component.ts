import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pro-version-message',
  imports: [MatIconModule],
  templateUrl: './pro-version-message.component.html',
  styleUrl: './pro-version-message.component.css',
  standalone: true,
})
export class ProVersionMessageComponent {}
