import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  API_VERTEXT_PROJECT_RESPONSE,
  LoginModel,
  VERTEXT_API_LAYER_GEOM_RESPONSE,
  VERTEXT_API_LOGIN_RESPONSE,
} from '../models/API';

@Injectable({
  providedIn: 'root',
})
export class VertextService {
  constructor(private http: HttpClient) {}

  login(obj: LoginModel): Observable<VERTEXT_API_LOGIN_RESPONSE> {
    return this.http.post<VERTEXT_API_LOGIN_RESPONSE>(environment.VERTEXT_BASE_URL + 'login/', obj);
  }

  // Method to fetch layers
  getProjectList(token: string, username: string): Observable<API_VERTEXT_PROJECT_RESPONSE[]> {
    const headers = new HttpHeaders({
      Authorization: `Token ${token}`,
    });
    return this.http.get<API_VERTEXT_PROJECT_RESPONSE[]>(
      environment.VERTEXT_BASE_URL + 'projectdata/',
      { headers },
    );
  }

  // Method to add layers
  GetVertextGeomLayerData(token: string, id: number): Observable<VERTEXT_API_LAYER_GEOM_RESPONSE> {
    const headers = new HttpHeaders({
      Authorization: `Token ${token}`,
    });

    const url = `${environment.VERTEXT_BASE_URL}${'spatialdata_infobhoomi/'}${id}/`;

    return this.http.get<VERTEXT_API_LAYER_GEOM_RESPONSE>(url, { headers });
  }
}
