import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { APIsService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notifications.service';
import { UserService } from '../../../services/user.service';
import { AdminHeaderComponent } from '../../common/admin-header/admin-header.component';
import { AdminSideBarComponent } from '../../common/admin-side-bar/admin-side-bar.component';

@Component({
  selector: 'app-organizations-create',
  standalone: true,
  imports: [
    CommonModule,
    AdminHeaderComponent,
    AdminSideBarComponent,
    MatIconModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './organizations-create.component.html',
  styleUrl: './organizations-create.component.css',
})
export class OrganizationsCreateComponent {
  organizationForm!: FormGroup;

  subscriptionPlans = [
    { value: 'Free Trial', label: 'Free Trial' },
    { value: 'Classic', label: 'Classic' },
    { value: 'Premium', label: 'Premium' },
  ];

  constructor(
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private apiService: APIsService,
    private router: Router,
    private userService: UserService,
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
  }

  formatEmail() {
    const emailControl = this.organizationForm.get('org_email');
    if (emailControl && emailControl.value) {
      emailControl.setValue(emailControl.value.toLowerCase());
    }
  }

  createNewOrganization() {
    if (this.organizationForm.valid) {
      const formValue = { ...this.organizationForm.value };

      this.apiService.createNewOrganization(formValue).subscribe(
        (res) => {
          this.notificationService.showSuccess('Organization created successfully');
          this.resetForm();
          this.goBack();
        },
        (error: any) => {
          console.error('Error creating organization:', error);
          this.notificationService.showError(error.error?.error || 'Organization creation failed');
        },
      );
    } else {
      this.notificationService.showError('Please fill all required fields');
    }
  }

  goBack() {
    this.router.navigate(['/admin-organizations']);
  }

  resetForm() {
    this.organizationForm.reset({
      display_name: '',
      permit_start_date: '',
      permit_end_date: '',
      director: '',
      contact_no: '',
      org_email: '',
      org_address: '',
      subscription_plan: '',
      users_limit: '',
    });
    this.organizationForm.markAsPristine();
    this.organizationForm.markAsUntouched();
  }
}
