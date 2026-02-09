import { Injectable } from '@angular/core';

export type PermId = 251 | 252 | 253;

export interface RawPermission {
  id?: number;
  permission_id?: number;
  category?: string;
  sub_category?: string;
  permission_name?: string;
  view?: boolean | null;
  add?: boolean | null;
  edit?: boolean | null;
  delete?: boolean | null;
}

type PermRecord = Record<PermId, { view: boolean; add: boolean; edit: boolean; delete: boolean }>;

@Injectable({ providedIn: 'root' })
export class AdminService {
  selectedRoleType: string | null = null;

  permissions: Partial<PermRecord> = {};

  setSelectedRoleType(type: string) {
    this.selectedRoleType = type;
  }
  getSelectedRoleType() {
    return this.selectedRoleType;
  }

  setPermissions(raw: RawPermission[]) {
    const map: Partial<PermRecord> = {};
    for (const p of raw ?? []) {
      const key = (p.permission_id ?? p.id) as PermId | undefined;
      if (!key) continue;
      map[key] = {
        view: !!p.view,
        add: !!p.add,
        edit: !!p.edit,
        delete: !!p.delete,
      };
    }
    this.permissions = map;
  }

  private getPerm(id: PermId) {
    return this.permissions[id] ?? { view: false, add: false, edit: false, delete: false };
  }

  canAdd(id: PermId): boolean {
    return !!this.getPerm(id).add;
  }
  canView(id: PermId): boolean {
    return !!this.getPerm(id).view;
  }
  canDelete(id: PermId): boolean {
    return !!this.getPerm(id).delete;
  }
  canEdit(id: PermId): boolean {
    return !!this.getPerm(id).edit;
  }

  hasAnyPermissions(): boolean {
    return Object.keys(this.permissions).length > 0;
  }
}
