import { isModuleDisabledProblem } from './module-disabled.util';

describe('isModuleDisabledProblem', () => {
  it('reconoce el ProblemDetails del módulo apagado por type/code/title/detail', () => {
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
