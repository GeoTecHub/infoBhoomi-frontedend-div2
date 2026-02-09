import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root',
})
export class ActivityLogService {
  private userService = inject(UserService);

  user_name: string = ''; // replaced with the login response detail - (username)
  usertoken: string = localStorage.getItem('Token') || ''; // replaced with the login response detail - (token)

  constructor(private http: HttpClient) {
    this.userService.user$.pipe().subscribe((user: any) => {
      if (user) {
        const user = this.userService.getUser();
        this.user_name = user?.username || '';
      }
    });
  }

  // Method to add layers
  GetACtivityLogTableData(selectedchip: string): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.usertoken}`,
    });
    return this.http.get<any>(environment.API_URL + selectedchip + '/' + this.user_name + '/', {
      headers,
    });
  }
}
