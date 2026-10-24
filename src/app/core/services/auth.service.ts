import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthApi } from './auth-api';
import { AuthTokenService } from './auth-token.service';
import { AuthStore } from './auth-store.service';
import { AuthTokenResponse, LoginDto } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(AuthApi);
  private tokens = inject(AuthTokenService);
  private store = inject(AuthStore);

  // POST /auth/login — guarda tokens y sesión (usuario/tenant) en éxito (T15).
  login(dto: LoginDto): Observable<AuthTokenResponse> {
    return this.api.login(dto).pipe(
      tap(res => {
        this.tokens.save(res);
        this.store.setSession(res);
      }),
    );
  }
}
