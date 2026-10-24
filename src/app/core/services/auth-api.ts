import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthTokenResponse, LoginDto, MeResponseDto } from '../models/auth.model';

// Capa HTTP pura — sin estado. AuthService la consume.
// refresh() y me() son genéricos (T15/T16): los usa el interceptor / el
// initializer de la app sin importar si la sesión activa es de clínica o
// de super admin.
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private http = inject(HttpClient);

  login(dto: LoginDto): Observable<AuthTokenResponse> {
    return this.http.post<AuthTokenResponse>(`${environment.apiUrl}/auth/login`, dto);
  }

  refresh(refreshToken: string): Observable<AuthTokenResponse> {
    return this.http.post<AuthTokenResponse>(`${environment.apiUrl}/auth/refresh`, {
      refresh_token: refreshToken,
    });
  }

  me(): Observable<MeResponseDto> {
    return this.http.get<MeResponseDto>(`${environment.apiUrl}/auth/me`);
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/logout`, {});
  }
}
