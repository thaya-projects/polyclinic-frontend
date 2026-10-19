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
        path: 'admin/plans',
        loadComponent: () =>
          import('./feature/superadmin/plans/plans-page/plans-page').then(m => m.PlansPage),
        canActivate: [authGuard, superadminGuard],
      },
      {
        // T8/T9: panel super admin de subscription de un tenant específico. No aparece en el
        // sidebar — se llega desde el detalle del tenant o navegando directo con el id.
        path: 'admin/tenants/:id/subscription',
        loadComponent: () =>
          import('./feature/superadmin/subscriptions/subscription-admin-page/subscription-admin-page')
            .then(m => m.SubscriptionAdminPage),
        canActivate: [authGuard, superadminGuard],
      },
      {
        // T7 FF: panel super admin de módulos del tenant (toggles enabled_modules).
        path: 'admin/tenants/:id/settings',
        loadComponent: () =>
          import('./feature/superadmin/tenants/tenant-settings-modules-page/tenant-settings-modules-page')
            .then(m => m.TenantSettingsModulesPage),
        canActivate: [authGuard, superadminGuard],
      },
      {
        // T10: la clínica ve su plan y status. Sin cambios (los mueve el super admin desde su
        // panel). Sin guard fuerte todavía — igual que /roles, se refuerza cuando el layout
        // de clínica exista.
        path: 'settings/subscription',
        loadComponent: () =>
          import('./feature/clinic/subscription/subscription-settings-page')
            .then(m => m.SubscriptionSettingsPage),
      },
      {
        // Fase 2 T6/T7: gestión de sucursales por el propio tenant. authGuard exige token válido
        // + app_user activo — cualquier usuario logueado (tenant user o super admin) puede
        // acceder; el backend rechaza al super admin con 403 vía policy TenantUser.
        path: 'branches',
        loadComponent: () =>
          import('./feature/clinic/branches/branches-page/branches-page').then(m => m.BranchesPage),
        canActivate: [authGuard],
      },
      {
        // Fase 2 T4/T5: especialidades del tenant.
        path: 'specialties',
        loadComponent: () =>
          import('./feature/clinic/specialties/specialties-page/specialties-page')
            .then(m => m.SpecialtiesPage),
        canActivate: [authGuard],
      },
      {
        // Fase 2 T7/T8: profesionales del tenant.
        path: 'professionals',
        loadComponent: () =>
          import('./feature/clinic/professionals/professionals-page/professionals-page')
            .then(m => m.ProfessionalsPage),
        canActivate: [authGuard],
      },
      {
        // Fase 2 Rooms T4/T5: salas por sucursal del tenant.
        path: 'rooms',
        loadComponent: () =>
          import('./feature/clinic/rooms/rooms-page/rooms-page').then(m => m.RoomsPage),
        canActivate: [authGuard],
      },
      {
        // Fase 2 Horarios T6-T8: grilla semanal + excepciones por tenant.
        path: 'schedules',
        loadComponent: () =>
          import('./feature/clinic/schedules/schedules-page/schedules-page').then(m => m.SchedulesPage),
        canActivate: [authGuard],
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
      {
        // Fase 8: facturación del tenant.
        path: 'invoices',
        loadComponent: () => import('./feature/invoices/invoices-page/invoices-page').then(m => m.InvoicesPage),
        canActivate: [authGuard, clinicGuard],
      },
      {
        // Fase 9: plantillas de notificación del tenant.
        path: 'notification-templates',
        loadComponent: () =>
          import('./feature/notification-templates/notification-templates-page/notification-templates-page')
            .then(m => m.NotificationTemplatesPage),
        canActivate: [authGuard, clinicGuard],
      },
    ],
  },
  {
    // Wildcard — tiene que ser la última entry. Sin esto, cualquier URL
    // que no matchee ningún route de arriba (ej. tipeada a mano) no la
    // resuelve el Router, y el SSR (server.ts) cae al 404 genérico de
    // Express ("Cannot GET ...") en vez de mostrar una página propia.
    path: '**',
    loadComponent: () => import('./feature/not-found/not-found-page/not-found-page').then(m => m.NotFoundPage),
  },
];