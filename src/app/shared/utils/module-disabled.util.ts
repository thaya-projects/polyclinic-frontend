// Fase 6: detección del 403 "módulo apagado" (feature flag por tenant).
//
// Hoy OdontogramFeatureGuardMiddleware corta con 403 SIN body, indistinguible del 403 de una policy
// sin permiso; el backend va a pasar a responder ProblemDetails (ModuleDisabledException). Para no
// depender del texto exacto se acepta cualquiera de estas señales en el body:
//   - `type` / `code` / `error_code` que contengan "module_disabled" / "module-disabled" / "ModuleDisabled".
//   - `title` o `detail` que hablen de un módulo deshabilitado / no habilitado ("Module 'odontogram' is
//     disabled ...", "... module is not enabled for this tenant", "Módulo no habilitado").
// Si el body no trae nada de eso, quien llama cae al respaldo de siempre: el estado del módulo que
// conoce la sesión (FeaturesService / repo.odontogramEnabled()).

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

export function isModuleDisabledProblem(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const problem = body as Record<string, unknown>;
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
