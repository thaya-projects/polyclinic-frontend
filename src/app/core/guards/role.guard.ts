import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user-admin.model';

export const roleGuard =
  (roles: UserRole[]): CanActivateFn =>
  () => {
    const auth   = inject(AuthService);
    const router = inject(Router);
    const user   = auth.user();
    if (!user) return router.createUrlTree(['/login']);
    if (roles.includes(user.role as UserRole)) return true;
    return router.createUrlTree(['/dashboard']);
  };
