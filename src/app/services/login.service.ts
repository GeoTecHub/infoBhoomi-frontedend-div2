import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API_LOGIN_RESPONSE, ChangePasswordModel, LoginModel } from '../models/API';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  constructor(private http: HttpClient) {}

  login(obj: LoginModel): Observable<API_LOGIN_RESPONSE> {
    return this.http.post<API_LOGIN_RESPONSE>(environment.API_URL + 'login/', obj);
  }

  logout(token: any) {
    const headers = new HttpHeaders({
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    });

    return this.http.post(`${environment.API_URL}logout/`, {}, { headers });
  }
  ChangePassword(obj: ChangePasswordModel, token: any): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${token}`,
    });
    return this.http.post<any>(environment.API_URL + 'change_password/', obj, {
      headers,
    });
  }

  ChangeUser(token: any, formData: any, document_id: string): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Token ${token}`,
    });
    const httpOptions = { headers };
    return this.http.patch(
      `${environment.API_URL}update/user_id=${document_id}/`,
      formData,
      httpOptions,
    );
  }

  loginStatus$ = new BehaviorSubject<boolean>(false);

  setLoggedIn() {
    this.loginStatus$.next(true);
  }
}
