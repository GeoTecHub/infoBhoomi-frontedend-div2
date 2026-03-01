import { effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT } from '@angular/common';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'gis-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  /** Reactive signal — components can read this directly */
  readonly theme = signal<ThemeMode>(this.loadPersistedTheme());

  constructor() {
    // Apply theme to <html> element whenever signal changes
    effect(() => {
      this.applyTheme(this.theme());
    });
  }

  toggle(): void {
    const next: ThemeMode = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(next);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, next);
    }
  }

  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, mode);
    }
  }

  private loadPersistedTheme(): ThemeMode {
    if (!isPlatformBrowser(this.platformId)) {
      return 'light'; // Default to light on the server
    }
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    return stored === 'dark' ? 'dark' : 'light';
  }

  private applyTheme(mode: ThemeMode): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const html = this.document.documentElement;
    if (mode === 'dark') {
      html.setAttribute('data-theme', 'dark');
    } else {
      html.removeAttribute('data-theme');
    }
  }
}
