import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { APIsService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notifications.service';
import { UserService } from '../../../services/user.service';

export const superAdminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const apiService = inject(APIsService);
  const notificationsService = inject(NotificationService);
  const userService = inject(UserService);

  apiService.loadFromStorage();

  if (!isPlatformBrowser(platformId)) return false;

  return new Promise<boolean>((resolve) => {
    apiService.userAuthentication().subscribe({
      next: (authRes: {
        is_active: boolean;
        is_role_id: boolean;
        is_token_valid: boolean;
        is_org_active: boolean;
      }) => {
        if (!authRes.is_token_valid) {
          notificationsService.showError('Session expired. Please log in again.');
          router.navigate(['/login']);
          resolve(false);
          return;
        }

        if (!authRes.is_org_active) {
          notificationsService.showError('Your Organization is currently inactive.');
          router.navigate(['/login']);
          resolve(false);
          return;
        }

        if (!authRes.is_active || !authRes.is_role_id) {
          notificationsService.showError('Unauthorized.');
          router.navigate(['/login']);
          resolve(false);
          return;
        }
        apiService.getUserDetails().subscribe({
          next: (user: any) => {
            if (user?.user_type === 'super_admin') {
              userService.setUser(user);
              resolve(true);
            } else {
              notificationsService.showError('You are not authorized to access this page.');
              router.navigate(['/main']);
              resolve(false);
            }
          },
          error: () => {
            notificationsService.showError('Unable to fetch user details. Please login again.');
            router.navigate(['/login']);
            resolve(false);
          },
        });
      },
      error: () => {
        notificationsService.showError('Session expired. Please log in again.');
        router.navigate(['/login']);
        resolve(false);
      },
    });
  });
};
