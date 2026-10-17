import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthTokenService } from './auth-token.service';
import { AuthStore } from './auth-store.service';
import { EncounterLookupsService } from './encounter-lookups.service';

// Punto único para cerrar sesión (T15): lo usa tanto el botón "Cerrar
// sesión" del sidebar como el interceptor cuando el auto-refresh falla.
@Injectable({ providedIn: 'root' })
export class SessionService {
  private tokens = inject(AuthTokenService);
  private store = inject(AuthStore);
  private router = inject(Router);
  private encounterLookups = inject(EncounterLookupsService);

  clearSession(): void {
    this.tokens.clear();
    this.store.clearSession();
    // Fase 4: los lookups de encounters son root — sin esto el próximo usuario/tenant vería
    // pacientes y profesionales (y el "profesional vinculado") de la sesión anterior.
    this.encounterLookups.reset();
  }

  logout(): void {
    const wasSuperAdmin = this.store.user()?.is_superadmin ?? false;
    this.clearSession();
    this.router.navigateByUrl(wasSuperAdmin ? '/admin/login' : '/login');
  }
}
