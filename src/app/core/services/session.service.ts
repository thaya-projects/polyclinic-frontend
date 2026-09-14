import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthTokenService } from './auth-token.service';
import { AuthStore } from './auth-store.service';

// Punto único para cerrar sesión (T15): lo usa tanto el botón "Cerrar
// sesión" del sidebar como el interceptor cuando el auto-refresh falla.
@Injectable({ providedIn: 'root' })
export class SessionService {
  private tokens = inject(AuthTokenService);
  private store = inject(AuthStore);
  private router = inject(Router);

  clearSession(): void {
    this.tokens.clear();
    this.store.clearSession();
  }

  logout(): void {
    const wasSuperAdmin = this.store.user()?.role === 'super_admin';
    this.clearSession();
    this.router.navigateByUrl(wasSuperAdmin ? '/admin/login' : '/login');
  }
}
