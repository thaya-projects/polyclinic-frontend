import { Routes } from '@angular/router';
import { Shell } from './layout/shell/shell';
import { superadminGuard } from './core/guards/superadmin.guard';
import { clinicGuard } from './core/guards/clinic.guard';
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
        canActivate: [authGuard, superadminGuard],
      },
      {
        // Sin guard a propósito — todavía no se definió si hace falta
        // restringir esto a role.code === 'admin' a nivel de ruta (hoy
        // solo se oculta el link en el sidebar para quien no es admin).
        path: 'roles',
        loadComponent: () => import('./feature/roles/roles-page/roles-page').then(m => m.RolesPage),
      },
      {
        // Mismo criterio que 'roles' (sin guard de ruta todavía).
        path: 'user-roles',
        loadComponent: () =>
          import('./feature/roles/user-roles-page/user-roles-page').then(m => m.UserRolesPage),
      },
      {
        // Home de clínica: cualquier usuario de clínica (admin/recepcion/
        // profesional/sin rol) aterriza acá después de loguearse.
        path: 'appointments',
        loadComponent: () =>
          import('./feature/appointments/appointments-page/appointments-page').then(m => m.AppointmentsPage),
        canActivate: [authGuard, clinicGuard],
      },
      {
        path: 'patients',
        loadComponent: () => import('./feature/patients/patients-page/patients-page').then(m => m.PatientsPage),
        canActivate: [authGuard, clinicGuard],
      },
      {
        path: 'services',
        loadComponent: () => import('./feature/services/services-page/services-page').then(m => m.ServicesPage),
        canActivate: [authGuard, clinicGuard],
      },
    ],
  },
];
