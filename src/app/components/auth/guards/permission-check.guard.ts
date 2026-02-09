import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { APIsService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notifications.service';
import { AdminService } from '../../../services/admin.service';

type PermissionId = 251 | 252 | 253;
type PermissionAction = 'view' | 'add' | 'edit' | 'delete';

export const permissionCheck: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const apiService = inject(APIsService);
  const notificationsService = inject(NotificationService);
  const adminService = inject(AdminService);

  if (!isPlatformBrowser(platformId)) return false;

  const required = route.data?.['permission'] as
    | { id: PermissionId; action: PermissionAction }
    | undefined;

  if (!required) return true;

  apiService.loadFromStorage();

  const evaluate = (): boolean => {
    switch (required.action) {
      case 'view':
        return adminService.canView(required.id);
      case 'add':
        return adminService.canAdd(required.id);
      case 'edit':
        return adminService.canEdit(required.id);
      case 'delete':
        return adminService.canDelete(required.id);
      default:
        return false;
    }
  };

  return new Promise<boolean>((resolve) => {
    if (adminService.hasAnyPermissions()) {
      const ok = evaluate();
      if (ok) return resolve(true);
      notificationsService.showError('You are not authorized to access this page.');
      router.navigate(['/admin-home']);
      return resolve(false);
    }

    apiService.getAdminPermissions().subscribe({
      next: (permissions: any) => {
        const permissionsArray = Array.isArray(permissions) ? permissions : [];
        adminService.setPermissions(permissionsArray);

        console.log('Permissions loaded:', permissionsArray);

        const ok = evaluate();
        if (ok) return resolve(true);

        notificationsService.showError('You are not authorized to access this page.');
        router.navigate(['/admin-home']);
        resolve(false);
      },
      error: () => {
        notificationsService.showError('Unable to verify permissions. Please login again.');
        router.navigate(['/login']);
        resolve(false);
      },
    });
  });
};
