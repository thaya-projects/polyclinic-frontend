import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
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
      // Este endpoint es exclusivo de super admins: se fuerza is_superadmin
      // acá en vez de confiar en que el backend lo mande. Si no venía (o
      // venía en false), el redirect post-login y el guard de
      // /admin/tenants fallaban en silencio y mandaban al usuario al login
      // de clínica.
      map(res => ({
        ...res,
        user: {
          id: res.user?.id ?? '',
          full_name: res.user?.full_name ?? '',
          email: res.user?.email ?? dto.email,
          is_superadmin: true,
          roles: [],
        },
      })),
      tap(res => {
        this.tokens.save(res);
        this.store.setSession(res);
      }),
    );
  }
}
