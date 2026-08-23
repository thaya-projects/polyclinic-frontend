import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // ── Root redirect ────────────────────────────────────────────
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // ── Auth ─────────────────────────────────────────────────────
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },

  // ── Main dashboard (existing) ────────────────────────────────
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },

  // ── Role-specific dashboards ─────────────────────────────────
  {
    path: 'dashboard/super-admin',
    canActivate: [authGuard, roleGuard(['SuperAdmin'])],
    loadComponent: () => import('./features/dashboard/super-admin/super-admin-dashboard.component').then(m => m.SuperAdminDashboardComponent),
  },
  {
    path: 'dashboard/admin',
    canActivate: [authGuard, roleGuard(['Admin'])],
    loadComponent: () => import('./features/dashboard/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent),
  },
  {
    path: 'dashboard/doctor',
    canActivate: [authGuard, roleGuard(['Doctor', 'SupportDoctor'])],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'dashboard/secretary',
    canActivate: [authGuard, roleGuard(['Secretary'])],
    loadComponent: () => import('./features/reception/reception.component').then(m => m.ReceptionComponent),
  },

  // ── Existing features ─────────────────────────────────────────
  {
    path: 'video-consultation/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/video-consultation/video-consultation.component').then(m => m.VideoConsultationComponent),
  },
  {
    path: 'reception',
    canActivate: [authGuard],
    loadComponent: () => import('./features/reception/reception.component').then(m => m.ReceptionComponent),
  },
  {
    path: 'patient',
    canActivate: [authGuard],
    loadComponent: () => import('./features/patient/patient.component').then(m => m.PatientComponent),
  },

  // ── Admin — user management (existing) ───────────────────────
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard(['Admin', 'SuperAdmin'])],
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
  },

  // ── Admin — clinic & resource management (new) ───────────────
  {
    path: 'admin/clinics',
    canActivate: [authGuard, roleGuard(['SuperAdmin'])],
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
  },
  {
    path: 'admin/specialties',
    canActivate: [authGuard, roleGuard(['Admin', 'SuperAdmin'])],
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
  },
  {
    path: 'admin/users',
    canActivate: [authGuard, roleGuard(['Admin', 'SuperAdmin'])],
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
  },
  {
    path: 'admin/users/:userId',
    canActivate: [authGuard, roleGuard(['Admin', 'SuperAdmin'])],
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
  },
  {
    path: 'admin/fees',
    canActivate: [authGuard, roleGuard(['Admin', 'SuperAdmin'])],
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
  },
  {
    path: 'admin/allied-centers',
    canActivate: [authGuard, roleGuard(['Admin', 'SuperAdmin'])],
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
  },
  {
    path: 'admin/patients',
    canActivate: [authGuard, roleGuard(['Admin', 'SuperAdmin', 'Secretary'])],
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
  },
  {
    path: 'admin/exemptions',
    canActivate: [authGuard, roleGuard(['SuperAdmin'])],
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
  },

  // ── Fallback ──────────────────────────────────────────────────
  { path: '**', redirectTo: 'dashboard' },
];
