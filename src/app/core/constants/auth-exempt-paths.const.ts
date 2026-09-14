// Endpoints de auth que nunca deben llevar Authorization ni disparar
// refresh/toast automáticos (evita loops y mensajes duplicados: estas
// pantallas ya muestran sus propios mensajes de error inline).
export const AUTH_EXEMPT_PATHS = ['/auth/login', '/auth/superadmin/login', '/auth/refresh'];

export function isAuthExemptPath(url: string): boolean {
  return AUTH_EXEMPT_PATHS.some(path => url.includes(path));
}
