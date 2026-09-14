import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthTokenResponse, SuperAdminLoginDto } from '../models/auth.model';

// Capa HTTP pura — sin estado. SuperAdminAuthService la consume y le
// agrega el guardado de tokens.
@Injectable({ providedIn: 'root' })
export class SuperAdminAuthApi {
  private http = inject(HttpClient);

  login(dto: SuperAdminLoginDto): Observable<AuthTokenResponse> {
    return this.http.post<AuthTokenResponse>(`${environment.apiUrl}/auth/superadmin/login`, dto);
  }
}
