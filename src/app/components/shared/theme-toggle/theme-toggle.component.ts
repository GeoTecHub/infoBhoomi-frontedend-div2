import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <button
      mat-icon-button
      (click)="themeService.toggle()"
      [matTooltip]="themeService.theme() === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'"
      aria-label="Toggle light/dark theme"
    >
      <mat-icon>{{ themeService.theme() === 'light' ? 'dark_mode' : 'light_mode' }}</mat-icon>
    </button>
  `,
  styles: [
    `
      /* UI-only */
      button {
        color: var(--text-on-header);
      }
    `,
  ],
})
export class ThemeToggleComponent {
  protected readonly themeService = inject(ThemeService);
}
