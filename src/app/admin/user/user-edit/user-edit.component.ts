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
import { ModalDismissReasons, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { UserAuthenticatorComponent } from '../../../components/auth/user-authenticator/user-authenticator.component';
import { APIsService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notifications.service';
import { AdminHeaderComponent } from '../../common/admin-header/admin-header.component';
import { AdminSideBarComponent } from '../../common/admin-side-bar/admin-side-bar.component';
import { AdminService, PermId } from '../../../services/admin.service';

@Component({
  selector: 'app-user-edit',
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
  templateUrl: './user-edit.component.html',
  styleUrl: './user-edit.component.css',
})
export class UserEditComponent {
  userForm!: FormGroup;
  adminDetailsForm!: FormGroup;
  user: any;
  edit_details_show = false;
  closeModal: string | undefined;
  show_user_password_inputs = false;
  departments_list: any = [];
  department_name = '';
  default_pw = 'user@user123';
  last_login: string | null = null;

  passwordVisible: boolean = false;

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private apiService: APIsService,
    private modalService: NgbModal,
    private adminService: AdminService,
  ) {
    const navigation = this.router.getCurrentNavigation();
    this.user = navigation?.extras.state?.['userData'];
  }

  getPermission(permissionId: PermId): boolean {
    return this.adminService.canEdit(permissionId);
  }

  ngOnInit(): void {
    this.adminDetailsForm = this.fb.group({
      password: ['', Validators.required],
    });
    this.userForm = this.fb.group({
      username: ['', Validators.required],
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
    this.loadUserData();
    this.getDepartmentList();
  }

  getDepartmentList() {
    this.apiService.getDepartments().subscribe((res) => {
      this.departments_list = res;
    });
  }

  // SHOW EDIT INPUTS
  getEdit() {
    this.edit_details_show = true;
  }

  //  LOAD USER DATA TO INPUTS
  loadUserData(): void {
    this.userForm.patchValue(this.user);
    this.department_name = this.user.department;
    this.last_login = this.user.last_login ? this.user.last_login : null;
  }

  goBack() {
    this.router.navigate(['/admin-users-list']);
  }

  // EDIT USER
  editUser() {
    if (this.userForm.valid) {
      const formValue = { ...this.userForm.value };
      this.apiService.editUser(this.user.id, formValue).subscribe((res) => {
        this.notificationService.showSuccess('Data saved successfully');
        this.router.navigate(['/admin-users-list']);
      });
    } else {
      this.notificationService.showError('Please fill all required fields');
    }
  }

  // EMAIL FORMATTING
  formatEmail() {
    const emailControl = this.userForm.get('email');
    if (emailControl) {
      emailControl.setValue(emailControl.value.toLowerCase());
    }
  }

  // Validator to check password match
  openPasswordResetModal(content: any) {
    // Open the modal (using Bootstrap modal methods)
    this.modalService
      .open(content, { ariaLabelledBy: 'modal-basic-title', size: 'md' })
      .result.then(
        (res) => {
          this.closeModal = `Closed with: ${res}`;
        },
        (res) => {
          this.closeModal = `Dismissed ${this.getDismissReason(res)}`;
        },
      );
  }

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return `with: ${reason}`;
    }
  }

  onNext() {
    if (this.adminDetailsForm.valid) {
      let input_data = {
        password: this.adminDetailsForm.value.password,
      };
      this.apiService.postPassword(input_data).subscribe(
        (res) => {
          let input_data = {
            user_id: this.user.id,
          };
          this.apiService.postAdminData(input_data).subscribe(
            (res) => {
              this.notificationService.showSuccess('Password changed successfully');
            },
            (error: any) => {
              console.error('Error creating role:', error);
              this.notificationService.showError(error.error?.error || 'Failed to change password');
            },
          );
        },
        (error: any) => {
          console.error('Error creating role:', error);
          this.notificationService.showError(error.error?.error || 'Failed to change password');
        },
      );
    } else {
      this.notificationService.showError('Please fill all required fields');
    }
  }
}
