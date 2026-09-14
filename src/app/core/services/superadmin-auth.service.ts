import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { SuperAdminAuthApi } from './superadmin-auth-api';
import { AuthTokenService } from './auth-token.service';
import { AuthStore } from './auth-store.service';
import { AuthTokenResponse, SuperAdminLoginDto } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class SuperAdminAuthService {
  private api = inject(SuperAdminAuthApi);
  private tokens = inject(AuthTokenService);
  private store = inject(AuthStore);

  // POST /auth/superadmin/login — guarda tokens y sesión (usuario/tenant) en éxito (T15).
  login(dto: SuperAdminLoginDto): Observable<AuthTokenResponse> {
    return this.api.login(dto).pipe(
      tap(res => {
        this.tokens.save(res);
        this.store.setSession(res);
      }),
    );
  }
}
