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
import { Subject, takeUntil } from 'rxjs';
import { UserAuthenticatorComponent } from '../../../components/auth/user-authenticator/user-authenticator.component';
import { APIsService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notifications.service';
import { UserService } from '../../../services/user.service';
import { AdminHeaderComponent } from '../../common/admin-header/admin-header.component';
import { AdminSideBarComponent } from '../../common/admin-side-bar/admin-side-bar.component';

@Component({
  selector: 'app-users-create',
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
  templateUrl: './users-create.component.html',
  styleUrl: './users-create.component.css',
})
export class UsersCreateComponent {
  userForm!: FormGroup;
  passwordMatch: boolean = true;
  departments_list: any = [];
  default_pw = 'user@user123';
  userType: string = '';
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private apiService: APIsService,
    private router: Router,
    private userService: UserService,
  ) {
    this.userService.user$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      if (user) {
        this.userType = user.user_type;
        if (user.user_type === 'admin') {
          this.default_pw = 'user@user123';
        } else if (user.user_type === 'super_admin') {
          this.default_pw = 'admin@admin123';
        }
      }
    });
  }

  ngOnInit(): void {
    this.getDepartmentList();
    const user = this.userService?.getUser();
    this.userForm = this.fb.group({
      username: ['', Validators.required],
      password: ['user@user123', [Validators.required, Validators.maxLength(20)]],
      reEnterPassword: ['user@user123', [Validators.required, Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email]],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      mobile: ['', [Validators.required, Validators.pattern(/^0\d{9}$/)]],
      address: ['', Validators.required],
      nic: ['', [Validators.required, Validators.pattern(/^(?:\d{12}|\d{9}[VX])$/)]],
      birthday: ['', Validators.required],
      sex: ['', Validators.required],
      dep_id: ['', Validators.required],
      post: ['', Validators.required],
      emp_id: ['', Validators.required],
    });

    // Re-enter password match check
    this.userForm.get('reEnterPassword')?.valueChanges.subscribe(() => {
      this.checkPasswordMatch();
    });
    this.userForm.get('mobile')?.statusChanges.subscribe((status) => {
      console.log('Mobile Field Status:', status);
      console.log('Mobile Field Errors:', this.userForm.get('mobile')?.errors);
    });
  }

  getDepartmentList() {
    this.apiService.getDepartments().subscribe((res) => {
      this.departments_list = res;
    });
  }

  // Create New User
  createNewUser() {
    if (this.userForm.valid) {
      this.userForm.value.password = 'user@user123';
      const formValue = { ...this.userForm.value };
      formValue.password = '12345678';
      this.apiService.createNewUser(formValue).subscribe(
        (res) => {
          this.notificationService.showSuccess('Data saved successfully');
          this.resetForm();
          this.goBack();
        },
        (error: any) => {
          console.error('Error creating role:', error);
          this.notificationService.showError(error.error?.error || 'User creation failed');
        },
      );
    } else {
      this.notificationService.showError('Please fill all required fields');
    }
  }

  // Email formatting
  formatEmail() {
    const emailControl = this.userForm.get('email');
    if (emailControl) {
      emailControl.setValue(emailControl.value.toLowerCase());
    }
  }

  // Password match check
  checkPasswordMatch() {
    const password = this.userForm.get('password')?.value;
    const reEnterPassword = this.userForm.get('reEnterPassword')?.value;

    if (password && reEnterPassword) {
      this.passwordMatch = password === reEnterPassword;
    }
  }

  goBack() {
    this.router.navigate(['/admin-users-list']);
  }

  resetForm() {
    this.userForm.reset({
      username: '',
      password: 'user@user123',
      reEnterPassword: 'user@user123',
      email: '',
      first_name: '',
      last_name: '',
      mobile: '',
      address: '',
      nic: '',
      birthday: '',
      sex: '',
      dep_id: '',
      post: '',
      emp_id: '',
    });
    this.userForm.markAsPristine();
    this.userForm.markAsUntouched();
    this.passwordMatch = true;
  }
}
