import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthApi } from './auth-api';
import { AuthStore } from './auth-store.service';
import { MeResponseDto } from '../models/auth.model';

// GET /auth/me (T16). El manejo de 401 (token inválido → refresh o logout
// + redirect) ya lo resuelve authInterceptor (T15) para cualquier request;
// acá no se duplica esa lógica.
@Injectable({ providedIn: 'root' })
export class MeService {
  private api = inject(AuthApi);
  private store = inject(AuthStore);

  fetch(): Observable<MeResponseDto> {
    return this.api.me().pipe(tap(res => this.store.setFromMe(res)));
  }
}
