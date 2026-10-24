import { Injectable, computed, inject } from '@angular/core';
import { AuthStore } from './auth-store.service';
import { SessionRoleCode } from '../models/role.model';

// Deriva is_superadmin/roles del usuario logueado real (AuthStore). Fuente
// única para decidir qué ve cada usuario (sidebar, guards) — comparar
// siempre contra los códigos de rol reales (admin/recepcion/profesional),
// nunca contra un nombre en español.
@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private store = inject(AuthStore);

  readonly isSuperAdmin = computed(() => this.store.user()?.is_superadmin ?? false);
  readonly roleCodes = computed(() => this.store.user()?.roles.map(r => r.code) ?? []);

  hasRole(code: SessionRoleCode): boolean {
    return this.roleCodes().includes(code);
  }
}
