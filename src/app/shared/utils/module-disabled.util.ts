// Fase 6: detección del 403 "módulo apagado" (feature flag por tenant).
//
// El backend responde ProblemDetails de ModuleDisabledException con un código estable:
//   { "status": 403, "detail": "The odontogram module is not enabled for this tenant.",
//     "code": "module_disabled", "module": "odontogram", ... }
// Se detecta primero por `code === "module_disabled"` (y `module`, si quien llama indica cuál espera).
// Como respaldo se aceptan otras señales en el body (`type` / `code` / `error_code` tipo
// "module-disabled", o `title` / `detail` que hablen de un módulo deshabilitado / no habilitado).
// El 403 de ModuleRequiresTenantUserException ("The odontogram module is only available to active
// users of a tenant.", sin code) NO es módulo apagado: es falta de acceso del usuario.
// Si el body no trae nada de eso, quien llama cae al respaldo de siempre: el estado del módulo que
// conoce la sesión (FeaturesService / repo.odontogramEnabled()).

export const MODULE_DISABLED_CODE_VALUE = 'module_disabled';
export const ODONTOGRAM_MODULE_KEY = 'odontogram';
const MODULE_DISABLED_CODE = /module[_-]?disabled/i;
const MODULE_DISABLED_TEXT = [
  /\bmodule\b.*\b(disabled|not enabled)\b/i,
  /\b(disabled|not enabled)\b.*\bmodule\b/i,
  /\bm[oó]dulo\b.*\b(deshabilitado|no (est[aá] )?habilitado)\b/i,
];

export const ODONTOGRAM_DISABLED_MESSAGE =
  'El módulo de Odontología no está habilitado para tu clínica. Pedile al administrador de la plataforma que lo active.';

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function isModuleDisabledProblem(body: unknown, module?: string): boolean {
  if (!body || typeof body !== 'object') return false;
  const problem = body as Record<string, unknown>;
  if (problem['code'] === MODULE_DISABLED_CODE_VALUE) {
    const reported = problem['module'];
    return !module || typeof reported !== 'string' || reported === module;
  }
  if ([problem['type'], problem['code'], problem['error_code']].some(v => MODULE_DISABLED_CODE.test(str(v)))) {
    return true;
  }
  return [problem['title'], problem['detail']].some(v => MODULE_DISABLED_TEXT.some(re => re.test(str(v))));
}

// 403 con body "útil" (cualquier ProblemDetails con detail): el 403 no vino del middleware del módulo.
export function hasProblemDetail(body: unknown): boolean {
  return !!body && typeof body === 'object' && typeof (body as { detail?: unknown }).detail === 'string'
    && !!(body as { detail: string }).detail;
}
