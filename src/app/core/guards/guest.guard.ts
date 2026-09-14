import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../services/auth-store.service';
import { hasMappedHomeRoute, homeRouteForRole } from '../constants/role-routes.const';

// T17/T18: si ya hay sesión activa Y su rol tiene un home real mapeado
// (role-routes.const, T18), /login (o /admin/login) redirige ahí en vez
// de mostrar el formulario de nuevo. Si el rol no tiene home mapeado
// todavía (ej. app_user, sin panel propio) se lo deja en el login en vez
// de mandarlo a una ruta que el propio roleGuard le va a rebotar de vuelta
// acá — evita un loop de redirección.
export const guestGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  const role = store.user()?.role;
  if (!store.isAuthenticated() || !hasMappedHomeRoute(role)) return true;

  return router.parseUrl(homeRouteForRole(role));
};
