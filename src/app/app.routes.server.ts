import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // El panel de Super Admin es autenticado y depende de datos en vivo del
  // backend (token en localStorage) — no tiene sentido prerenderizarlo ni
  // pedir los datos en el servidor, así que se renderiza solo en cliente.
  {
    path: 'superadmin/**',
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
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
