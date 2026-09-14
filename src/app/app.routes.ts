import { Routes } from '@angular/router';
import { Shell } from './layout/shell/shell';
import { roleGuard } from './core/guards/role.guard';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./feature/auth/login/login-page').then(m => m.LoginPage),
    canActivate: [guestGuard],
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./feature/auth/superadmin-login/superadmin-login-page').then(m => m.SuperAdminLoginPage),
    canActivate: [guestGuard],
  },
  {
    path: '',
    component: Shell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'admin/tenants' },
      {
        path: 'admin/tenants',
        loadComponent: () =>
          import('./feature/superadmin/tenants/tenants-page/tenants-page').then(m => m.TenantsPage),
        canActivate: [authGuard, roleGuard(['super_admin'])],
      },
    ],
  },
];
