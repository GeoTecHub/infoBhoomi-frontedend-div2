import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { APIsService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  private userToken = localStorage.getItem('Token');

  constructor(
    private http: HttpClient,
    private apisService: APIsService,
  ) {}

  /**
   * Fetch role permissions from the server.
   * @param roleId - The role ID.
   * @param permissionIds - An array of permission IDs.
   * @returns An observable containing the mapped permissions dictionary.
   */
  loadPermissions(roleId: number, permissionIds: number[]): Observable<any> {
    const requestBody = {
      role_id: roleId,
      permission_id: permissionIds,
    };

    const headers = new HttpHeaders({
      Authorization: `Token ${this.userToken}`,
      'Content-Type': 'application/json',
    });

    return this.http.post<any[]>(this.apisService.GET_PERMISSIONS, requestBody, { headers }).pipe(
      map((response) =>
        response.reduce((permissionMap, permission) => {
          permissionMap[permission.permission_id] = {
            name: permission.permission_name,
            can_view: permission.view,
            can_edit: permission.edit,
            can_add: permission.add,
            can_delete: permission.delete,
          };

          return permissionMap;
        }, {}),
      ),
    );
  }
}
