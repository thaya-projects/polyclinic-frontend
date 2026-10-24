import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../services/auth-store.service';

// Rutas de superadmin (ej. /superadmin/tenants): exigen is_superadmin === true.
// Se asume compuesto después de authGuard, que ya garantiza sesión
// verificada — igual queda correcto si se usa solo (sin sesión, user() es
// null y cae al /superadmin/login).
export const superadminGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  const user = store.user();
  if (user?.is_superadmin) return true;

  // Logueado pero no es superadmin: a su home de clínica, no a un login
  // (ya tiene sesión). Sin sesión: al login de superadmin.
  return router.parseUrl(user ? '/appointments' : '/superadmin/login');
};
