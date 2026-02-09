import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { APIsService } from '../../../services/api.service';
import { LoginService } from '../../../services/login.service';
import { NotificationService } from '../../../services/notifications.service';
import { UserService } from '../../../services/user.service';
@Component({
  selector: 'app-user-authenticator',
  imports: [RouterModule],
  templateUrl: './user-authenticator.component.html',
  styleUrl: './user-authenticator.component.css',
})
export class UserAuthenticatorComponent implements OnInit {
  constructor(
    private apiService: APIsService,
    private notificationsService: NotificationService,
    private authService: LoginService,
    private userService: UserService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // this.checkUserAuthentication();
    // this.getUserDetails();
  }
  checkUserAuthentication() {
    this.apiService
      .userAuthentication()
      .subscribe((res: { is_active: boolean; is_role_id: boolean; is_token_valid: boolean }) => {
        if (!res.is_token_valid) {
          this.notificationsService.showError('Session expired. Please log in again.');
          this.router.navigate(['/login']);
          return;
        }

        if (!res.is_active || !res.is_role_id) {
          this.notificationsService.showError('Unauthorized.');
          this.logout();
          return;
        }
        this.getUserDetails();
      });
  }
  getUserDetails() {
    this.apiService.getUserDetails().subscribe((res: any) => {
      this.userService.setUser(res);
    });
  }

  logout(): void {
    sessionStorage.removeItem('permissions');
    const token = localStorage.getItem('Token');
    this.authService.logout(token).subscribe(() => {
      localStorage.clear();
      this.router.navigate(['/login']);
    });
  }
}
