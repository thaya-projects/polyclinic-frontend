import { RenderMode, ServerRoute } from '@angular/ssr';

// Todas las rutas autenticadas (authGuard) van a RenderMode.Client. Motivo (bug real,
// no solo cautela): en build time no hay localStorage, así que authGuard/guestGuard
// prerenderizan asumiendo "sin sesión" — el HTML estático que queda es un meta-refresh
// a /login. Al refrescar el navegador en CUALQUIERA de estas rutas con sesión real, el
// usuario cae en ese HTML viejo, pasa por /login, y guestGuard lo manda siempre a
// homeRouteForUser() (= /appointments para no-superadmin) en vez de quedarse en la URL
// original. Client evita prerenderizar: el guard se resuelve en el browser, con la
// sesión real, sobre la URL real. Solo /login y el 404 quedan prerenderizados (no
// dependen de sesión).
export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Client,
  },
  {
    path: 'superadmin/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'settings/subscription',
    renderMode: RenderMode.Client,
  },
  {
    path: 'branches',
    renderMode: RenderMode.Client,
  },
  {
    path: 'specialties',
    renderMode: RenderMode.Client,
  },
  {
    path: 'professionals',
    renderMode: RenderMode.Client,
  },
  {
    path: 'inventory',
    renderMode: RenderMode.Client,
  },
  {
    path: 'rooms',
    renderMode: RenderMode.Client,
  },
  {
    path: 'schedules',
    renderMode: RenderMode.Client,
  },
  {
    path: 'encounters',
    renderMode: RenderMode.Client,
  },
  {
    // Fase 4: detalle de encounter por id — ruta con parámetro, sin datos para prerenderizar.
    path: 'encounters/:id',
    renderMode: RenderMode.Client,
  },
  {
    // Fase 6 FF: las rutas de odontología dependen del módulo del tenant (canMatch con la sesión).
    path: 'odontology/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'roles',
    renderMode: RenderMode.Client,
  },
  {
    path: 'user-roles',
    renderMode: RenderMode.Client,
  },
  {
    path: 'appointments',
    renderMode: RenderMode.Client,
  },
  {
    path: 'patients',
    renderMode: RenderMode.Client,
  },
  {
    // Ficha del paciente — ruta con parámetro, sin datos para prerenderizar.
    path: 'patients/:patientId',
    renderMode: RenderMode.Client,
  },
  {
    // Fase 6: odontograma por paciente — ruta con parámetro, sin datos para prerenderizar.
    path: 'patients/:patientId/odontogram',
    renderMode: RenderMode.Client,
  },
  {
    // Fase 4 T3: signos vitales de un paciente — ruta con parámetro, mismo criterio.
    path: 'patients/:patientId/measurements',
    renderMode: RenderMode.Client,
  },
  {
    // Fase 4 Recetas: recetas de un paciente — ruta con parámetro, mismo criterio.
    path: 'patients/:patientId/prescriptions',
    renderMode: RenderMode.Client,
  },
  {
    path: 'services',
    renderMode: RenderMode.Client,
  },
  {
    path: 'invoices',
    renderMode: RenderMode.Client,
  },
  {
    path: 'notification-templates',
    renderMode: RenderMode.Client,
  },
  {
    path: 'reports',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
