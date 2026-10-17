import { hasProblemDetail, isModuleDisabledProblem } from './module-disabled.util';
import { moduleDisabledProblem, moduleRequiresTenantUserProblem } from '../../testing/module-problem';

describe('isModuleDisabledProblem', () => {
  it('ProblemDetails real de ModuleDisabledException: se detecta por code (y module)', () => {
    expect(isModuleDisabledProblem(moduleDisabledProblem())).toBe(true);
    expect(isModuleDisabledProblem(moduleDisabledProblem(), 'odontogram')).toBe(true);
    // code manda aunque el detail cambie de texto.
    expect(isModuleDisabledProblem({ code: 'module_disabled', module: 'odontogram', detail: 'otro texto' }, 'odontogram'))
      .toBe(true);
    expect(isModuleDisabledProblem({ code: 'module_disabled', detail: 'x' }, 'odontogram')).toBe(true);
    // Otro módulo apagado no es este módulo.
    expect(isModuleDisabledProblem(moduleDisabledProblem('billing'), 'odontogram')).toBe(false);
  });

  it('403 "solo usuarios activos de un tenant" (sin code) NO es módulo apagado', () => {
    const body = moduleRequiresTenantUserProblem();
    expect(body.detail).toBe('The odontogram module is only available to active users of a tenant.');
    expect(isModuleDisabledProblem(body)).toBe(false);
    expect(isModuleDisabledProblem(body, 'odontogram')).toBe(false);
    expect(hasProblemDetail(body)).toBe(true);
  });

  it('respaldo: reconoce otras señales por type/code/title/detail', () => {
    expect(isModuleDisabledProblem({ detail: "Module 'odontogram' is disabled for this tenant." })).toBe(true);
    expect(isModuleDisabledProblem({ detail: "Module 'odontogram' is not enabled." })).toBe(true);
    expect(isModuleDisabledProblem({ title: 'Module disabled' })).toBe(true);
    expect(isModuleDisabledProblem({ type: 'urn:problem:ModuleDisabled' })).toBe(true);
    expect(isModuleDisabledProblem({ error_code: 'MODULE_DISABLED' })).toBe(true);
    expect(isModuleDisabledProblem({ detail: 'Módulo no habilitado.' })).toBe(true);
  });

  it('sin body u otro 403 → false (quien llama usa el respaldo de la sesión)', () => {
    expect(isModuleDisabledProblem(null)).toBe(false);
    expect(isModuleDisabledProblem('')).toBe(false);
    expect(isModuleDisabledProblem({ title: 'Forbidden', detail: "Dental condition with id 'x' is global and cannot be modified." }))
      .toBe(false);
  });
});
