import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CurrentUserService } from '../services/current-user.service';
import { AppRole } from '../models/role.model';

export function roleGuard(allowedRoles: AppRole[]): CanActivateFn {
  return () => {
    const currentUser = inject(CurrentUserService);
    const router = inject(Router);

    const role = currentUser.role();
    if (role && allowedRoles.includes(role)) return true;

    // Sin sesión (o rol sin acceso): mandar al login que corresponda en vez
    // de '/' — evitaría un loop de redirección ya que '/' vuelve a caer en
    // una ruta protegida por este mismo guard.
    return router.parseUrl(role === 'app_user' ? '/login' : '/admin/login');
  };
}
