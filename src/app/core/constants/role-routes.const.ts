// T18: mapa central de redirect post-login por rol. Agregar un rol nuevo
// (o una página de destino nueva para uno existente) es agregar/editar una
// entrada acá — nada más necesita cambiar para que login lo respete.
const ROLE_HOME_ROUTES: Record<string, string> = {
  super_admin: '/admin/tenants',
  // app_user: todavía no tiene panel propio (fuera de alcance de T18
  // construirlo) — queda sin mapear a propósito, cae al fallback.
};

export const DEFAULT_HOME_ROUTE = '/login';

export function hasMappedHomeRoute(role: string | null | undefined): boolean {
  return !!role && role in ROLE_HOME_ROUTES;
}

export function homeRouteForRole(role: string | null | undefined): string {
  if (role && role in ROLE_HOME_ROUTES) return ROLE_HOME_ROUTES[role];
  return DEFAULT_HOME_ROUTE;
}
