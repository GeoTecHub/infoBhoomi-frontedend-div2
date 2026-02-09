import { Component } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { API_LOGIN_RESPONSE, LoginModel } from '../../../models/API';
import { APIsService } from '../../../services/api.service';
import { FeatureLinkService } from '../../../services/feature-link.service';
import { LoginService } from '../../../services/login.service';
import { NotificationService } from '../../../services/notifications.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, CommonModule, MatIconModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css',
})
export class LoginPageComponent {
  loginObj: LoginModel = new LoginModel();
  passwordRequired: boolean = false;
  usernameRequired: boolean = false;

  passwordVisible: boolean = false;

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  constructor(
    private router: Router,
    private loginservice: LoginService,
    private apiService: APIsService,
    private loginService: LoginService,
    private notificationService: NotificationService,
    private featureLinkService: FeatureLinkService,
  ) {}

  onClick() {
    if (!this.loginObj.username || !this.loginObj.password) {
      if (!this.loginObj.password) {
        this.usernameRequired = false; // Set the flag to true if password is not entered
        this.passwordRequired = true;
        return;
      } else if (!this.loginObj.username) {
        this.usernameRequired = true; // Set the flag to true if username is not entered
        this.passwordRequired = false;
        return;
      } else if (!this.loginObj.username && !this.loginObj.password) {
        this.usernameRequired = true; // Set the flag to true if username & password are not entered
        this.passwordRequired = true;
        return;
      }
    }

    this.loginservice.login(this.loginObj).subscribe(
      (res: API_LOGIN_RESPONSE) => {
        if (res.user && res.token) {
          localStorage.setItem('Token', res.token);
          localStorage.setItem('emp_id', res.user.emp_id);
          localStorage.setItem('role_id', res.user.role_id.toString());

          this.apiService.loadFromStorage();
          this.loginService.setLoggedIn();

          const pendingFeatureId = this.featureLinkService.getPendingFeatureId();
          if (pendingFeatureId) {
            this.router.navigate(['/main'], { queryParams: { feature_id: pendingFeatureId } });
          } else {
            this.router.navigateByUrl('/main');
          }
        } else {
          // alert('Login Failed');
          this.notificationService.showError('Login Failed');
        }
      },
      (error) => {
        console.error('Error occurred during login:', error.error.error);
        this.notificationService.showError(error.error.error, 5000);
        // alert('Login Failed');
      },
    );

    this.passwordRequired = false; // Reset the flags if username & password is valid
    this.usernameRequired = false;
  }
}
