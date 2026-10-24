import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../services/auth-store.service';
import { homeRouteForUser } from '../constants/role-routes.const';

// Si ya hay sesión activa, /login (o /superadmin/login) redirige al home
// que corresponda en vez de mostrar el formulario de nuevo. Como ahora todo
// usuario autenticado tiene un home real (superadmin → /superadmin/tenants,
// cualquier clínica → /appointments), ya no hay riesgo de loop por rol sin
// mapear.
export const guestGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  if (!store.isAuthenticated()) return true;

  return router.parseUrl(homeRouteForUser(store.user()));
};
