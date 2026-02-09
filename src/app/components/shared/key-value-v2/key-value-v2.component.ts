/**
 * @KD-96
 */
import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PermissionService } from '../../../services/permissions.service';
import { LandTabPermissions } from '../../../core/constant';

@Component({
  selector: 'app-key-value-v2',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './key-value-v2.component.html',
  styleUrl: './key-value-v2.component.css',
})
export class KeyValueV2Component implements OnInit {
  @Input() key!: string;
  @Input() db_tag!: string; // use when generate payload
  @Input() value!: string | number;
  @Input() permissionKey!: string; // Key to look up permissions for this field
  @Input() readonly: boolean = false;
  @Output() valueChange = new EventEmitter<{
    db_tag: string;
    value: string | number;
  }>();

  roleId = 1;

  permissions: any = {};

  permissionIds = [
    ...LandTabPermissions.L_ADMIN_INFO,
    ...LandTabPermissions.L_LAND_OVERVIEW,
    ...LandTabPermissions.L_LAND_TENURE,
    ...LandTabPermissions.L_ASSES_TAX_INFO,
  ];

  constructor(private permissionService: PermissionService) {}

  async ngOnInit(): Promise<void> {
    const cachedData = sessionStorage.getItem(`k-v_perm_input_${this.roleId}`);

    if (cachedData) {
      this.permissions = JSON.parse(cachedData);
      return;
    }

    try {
      // Wait until permissions are fetched and assigned to the variable
      const permissionMap = await this.permissionService
        .loadPermissions(this.roleId, this.permissionIds)
        .toPromise();
      this.permissions = permissionMap;

      console.log(permissionMap);

      // sessionStorage.setItem(
      //   `k-v_perm_input_${this.roleId}`,
      //   JSON.stringify(this.permissions)
      // );
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  }

  onValueChange(newValue: string | number): void {
    // Emit the updated value to the parent
    this.valueChange.emit({ db_tag: this.db_tag, value: newValue });
  }

  get editable(): boolean {
    const perms = this.permissions?.[this.permissionKey];

    return (this.value && perms?.can_edit) || (perms?.can_add && perms?.can_edit);
  }

  get hidden(): boolean {
    return !this.permissions?.[this.permissionKey]?.can_view;
  }
}
