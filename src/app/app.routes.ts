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
      {
        path: 'admin/plans',
        loadComponent: () =>
          import('./feature/superadmin/plans/plans-page/plans-page').then(m => m.PlansPage),
        canActivate: [authGuard, roleGuard(['super_admin'])],
      },
      {
        // T8/T9: panel super admin de subscription de un tenant específico. No aparece en el
        // sidebar — se llega desde el detalle del tenant o navegando directo con el id.
        path: 'admin/tenants/:id/subscription',
        loadComponent: () =>
          import('./feature/superadmin/subscriptions/subscription-admin-page/subscription-admin-page')
            .then(m => m.SubscriptionAdminPage),
        canActivate: [authGuard, roleGuard(['super_admin'])],
      },
      {
        // T7 FF: panel super admin de módulos del tenant (toggles enabled_modules).
        path: 'admin/tenants/:id/settings',
        loadComponent: () =>
          import('./feature/superadmin/tenants/tenant-settings-modules-page/tenant-settings-modules-page')
            .then(m => m.TenantSettingsModulesPage),
        canActivate: [authGuard, roleGuard(['super_admin'])],
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
        // Fase 4 T6/T7: encuentros clínicos (notas de evolución). Mismo criterio que professionals:
        // authGuard; el backend aplica la policy TenantUser.
        path: 'encounters',
        loadComponent: () =>
          import('./feature/encounters/encounters-page/encounters-page').then(m => m.EncountersPage),
        canActivate: [authGuard],
      },
      {
        path: 'encounters/:id',
        loadComponent: () =>
          import('./feature/encounters/encounter-detail-page/encounter-detail-page')
            .then(m => m.EncounterDetailPage),
        canActivate: [authGuard],
        // B6: si la nota tiene cambios sin guardar, pregunta antes de salir.
        canDeactivate: [(page: { canLeave(): boolean | Promise<boolean> }) => page.canLeave()],
      },
      {
        // T12: sin guard a propósito — todavía no hay panel de clínica
        // (app_user) real ni sesión con la que probarlo. Se ajusta cuando
        // exista ese panel.
        path: 'roles',
        loadComponent: () => import('./feature/roles/roles-page/roles-page').then(m => m.RolesPage),
      },
      {
        // T14: mismo criterio que T12 (sin guard, panel de clínica no existe todavía).
        path: 'user-roles',
        loadComponent: () =>
          import('./feature/roles/user-roles-page/user-roles-page').then(m => m.UserRolesPage),
      },
      {
        // T6 (fase 3, pacientes): mismo criterio que roles/user-roles.
        path: 'patients',
        loadComponent: () => import('./feature/patients/patients-page/patients-page').then(m => m.PatientsPage),
      },
    ],
  },
];
