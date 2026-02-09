import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { APIsService } from '../../../services/api.service';
import { FeatureLinkService } from '../../../services/feature-link.service';
import { NotificationService } from '../../../services/notifications.service';
import { UserService } from '../../../services/user.service';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const apiService = inject(APIsService);
  const featureLinkService = inject(FeatureLinkService);
  const notificationService = inject(NotificationService);
  const userService = inject(UserService);

  apiService.loadFromStorage();

  const featureId = route.queryParamMap.get('feature_id');
  if (featureId) {
    featureLinkService.setPendingFeatureId(featureId);
  }

  if (!isPlatformBrowser(platformId)) return of(false);

  return apiService.userAuthentication().pipe(
    switchMap(
      (res: {
        is_active: boolean;
        is_role_id: boolean;
        is_token_valid: boolean;
        is_org_active: boolean;
      }) => {
        if (!res.is_token_valid) {
          notificationService.showError('Session expired. Please log in again.');
          sessionStorage.removeItem('permissions');
          localStorage.clear();
          router.navigate(['/login']);
          return of(false);
        }

        if (!res.is_org_active) {
          notificationService.showError('Your Organization is currently inactive.');
          sessionStorage.removeItem('permissions');
          localStorage.clear();
          router.navigate(['/login']);
          return of(false);
        }

        if (!res.is_active || !res.is_role_id) {
          notificationService.showError('Unauthorized.');
          sessionStorage.removeItem('permissions');
          localStorage.clear();
          router.navigate(['/login']);
          return of(false);
        }

        return apiService.getUserDetails().pipe(
          map((userDetails: any) => {
            userService.setUser(userDetails);
            return true;
          }),
          catchError(() => {
            notificationService.showError('Failed to load user info. Please login again.');
            localStorage.clear();
            router.navigate(['/login']);
            return of(false);
          }),
        );
      },
    ),
    catchError(() => {
      notificationService.showError('Authentication failed. Please try again.');
      localStorage.clear();
      router.navigate(['/login']);
      return of(false);
    }),
  );
};
