// admin/organizations/organization-edit/organization-edit.component.ts
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { take } from 'rxjs/operators';
import { UserAuthenticatorComponent } from '../../../components/auth/user-authenticator/user-authenticator.component';
import { APIsService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notifications.service';
import { AdminHeaderComponent } from '../../common/admin-header/admin-header.component';
import { AdminSideBarComponent } from '../../common/admin-side-bar/admin-side-bar.component';

@Component({
  selector: 'app-organization-edit',
  standalone: true,
  imports: [
    CommonModule,
    AdminHeaderComponent,
    AdminSideBarComponent,
    MatIconModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    UserAuthenticatorComponent,
  ],
  templateUrl: './organization-edit.component.html',
  styleUrl: './organization-edit.component.css',
})
export class OrganizationEditComponent implements OnInit {
  organizationForm!: FormGroup;
  organization: any;
  edit_details_show = false;
  loading = true;
  orgId!: string;

  subscriptionPlans = [
    { value: 'Free Trial', label: 'Free Trial' },
    { value: 'Classic', label: 'Classic' },
    { value: 'Premium', label: 'Premium' },
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private apiService: APIsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.organizationForm = this.fb.group({
      display_name: ['', Validators.required],
      permit_start_date: [null],
      permit_end_date: [null],
      director: [''],
      contact_no: [''],
      org_email: ['', [Validators.email]],
      org_address: [''],
      subscription_plan: [''],
      users_limit: [''],
    });

    this.route.paramMap.pipe(take(1)).subscribe((params) => {
      const id = params.get('org_id');
      if (!id) {
        this.notificationService.showError('Invalid organization ID');
        this.goBack();
        return;
      }
      this.orgId = id;
      this.fetchOrganization(id);
    });
  }

  private fetchOrganization(id: string) {
    this.loading = true;
    this.apiService
      .getOrganizationById(id)
      .pipe(take(1))
      .subscribe({
        next: (org: any) => {
          this.organization = org;
          this.organizationForm.patchValue({
            display_name: org.display_name,
            permit_start_date: org.permit_start_date || null,
            permit_end_date: org.permit_end_date || null,
            director: org.director,
            contact_no: org.contact_no,
            org_email: org.org_email,
            org_address: org.org_address,
            subscription_plan: org.subscription_plan,
            users_limit: org.users_limit,
          });

          this.organizationForm.updateValueAndValidity({ onlySelf: false, emitEvent: true });
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Failed to load organization:', error);
          this.notificationService.showError('Failed to load organization');
          this.loading = false;
          this.cdr.detectChanges();
          this.goBack();
        },
      });
  }

  getEdit() {
    this.edit_details_show = true;
  }

  formatEmail() {
    const c = this.organizationForm.get('org_email');
    if (c && c.value) c.setValue(String(c.value).toLowerCase());
  }

  planLabel(value: string): string {
    return this.subscriptionPlans.find((p) => p.value === value)?.label || value || '-';
  }

  editOrganization() {
    if (this.organizationForm.invalid) {
      this.notificationService.showError('Please fill all required fields');
      return;
    }
    const payload = { ...this.organizationForm.value };

    this.apiService
      .editOrganization(this.orgId, payload)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Organization updated successfully');
          this.router.navigate(['/admin-organizations']);
        },
        error: (error) => {
          console.error('Error updating organization:', error);
          this.notificationService.showError(error?.error?.error || 'Organization update failed');
        },
      });
  }

  goBack() {
    this.router.navigate(['/admin-organizations']);
  }

  debugForm() {
    console.log('Form status:', this.organizationForm.status);
    Object.keys(this.organizationForm.controls).forEach((key) => {
      const c = this.organizationForm.get(key);
      console.log(
        key,
        '=> value:',
        c?.value,
        '| valid:',
        c?.valid,
        '| errors:',
        c?.errors,
        '| touched:',
        c?.touched,
        '| dirty:',
        c?.dirty,
      );
    });
  }

  touchAll() {
    this.organizationForm.markAllAsTouched();
  }
}
