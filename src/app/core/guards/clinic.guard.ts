import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../services/auth-store.service';

// Rutas de clínica (/appointments, /patients, /services): exigen token de
// clínica — autenticado, is_superadmin === false y con tenant presente.
// Se asume compuesto después de authGuard; igual queda correcto si se usa
// solo (sin sesión, user() es null y cae al /login).
export const clinicGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  const user = store.user();
  if (user && !user.is_superadmin && store.tenant()) return true;

  // Logueado pero es superadmin (sin tenant): a su panel, no a un login.
  // Sin sesión (o sin tenant igual): al login de clínica.
  return router.parseUrl(user?.is_superadmin ? '/superadmin/tenants' : '/login');
};
