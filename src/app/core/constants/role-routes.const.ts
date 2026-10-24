import { SessionUser } from '../models/auth.model';

// Home post-login: superadmin va a su panel; cualquier usuario de clínica
// (sea cual sea role.code, o incluso sin roles asignados) va a la agenda,
// que es el home único de la clínica — a propósito no hay un dashboard
// distinto por rol.
export function homeRouteForUser(user: SessionUser | null | undefined): string {
  if (!user) return '/login';
  return user.is_superadmin ? '/superadmin/tenants' : '/appointments';
}
