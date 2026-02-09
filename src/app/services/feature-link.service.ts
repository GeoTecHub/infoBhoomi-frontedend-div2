import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FeatureLinkService {
  private readonly storageKey = 'external_feature_id';
  private readonly featureIdSubject = new BehaviorSubject<string | null>(null);
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      const stored = sessionStorage.getItem(this.storageKey);
      if (stored) {
        this.featureIdSubject.next(stored);
      }
    }
  }

  setPendingFeatureId(featureId: string | number | null | undefined): void {
    if (featureId === null || featureId === undefined) {
      return;
    }

    const normalized = String(featureId).trim();
    if (!normalized) {
      return;
    }

    this.featureIdSubject.next(normalized);
    if (this.isBrowser) {
      sessionStorage.setItem(this.storageKey, normalized);
    }
  }

  getPendingFeatureId(): string | null {
    return this.featureIdSubject.value;
  }

  consumePendingFeatureId(): string | null {
    const value = this.featureIdSubject.value;
    if (!value) {
      return null;
    }

    this.clearPendingFeatureId();
    return value;
  }

  clearPendingFeatureId(): void {
    this.featureIdSubject.next(null);
    if (this.isBrowser) {
      sessionStorage.removeItem(this.storageKey);
    }
  }
}
