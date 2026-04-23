import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../../../services/theme.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <button
      mat-icon-button
      (click)="themeService.toggle()"
      [matTooltip]="
        themeService.theme() === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'
      "
      aria-label="Toggle light/dark theme"
      class="h-100 d-flex align-items-center"
    >
      <mat-icon class="icon-mat-only">{{
        themeService.theme() === 'light' ? 'dark_mode' : 'light_mode'
      }}</mat-icon>
    </button>
  `,
  styles: [
    `
      /* UI-only */
      button {
        color: var(--text-on-header);
      }
      .icon-mat-only {
        font-size: 20px;
      }
    `,
  ],
})
export class ThemeToggleComponent {
  protected readonly themeService = inject(ThemeService);
}
