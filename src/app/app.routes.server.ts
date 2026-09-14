import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // El panel de Super Admin es autenticado y depende de datos en vivo del
  // backend (token en localStorage) — no tiene sentido prerenderizarlo ni
  // pedir los datos en el servidor, así que se renderiza solo en cliente.
  {
    path: 'admin/**',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
