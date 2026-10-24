import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

// Bodies reales del backend para el 403 del módulo "odontogram" (ExceptionHandlingMiddleware).

// ModuleDisabledException: feature flag apagado para el tenant.
export function moduleDisabledProblem(module = 'odontogram') {
  return {
    type: 'https://tools.ietf.org/html/rfc9110#section-15.5.4',
    title: 'Forbidden',
    status: 403,
    detail: `The ${module} module is not enabled for this tenant.`,
    code: 'module_disabled',
    module,
    traceId: '00-mock-trace-00',
  };
}

// ModuleRequiresTenantUserException: sin tenant (superadmin) o app_user inactivo. Sin code.
export function moduleRequiresTenantUserProblem(module = 'odontogram') {
  return {
    type: 'https://tools.ietf.org/html/rfc9110#section-15.5.4',
    title: 'Forbidden',
    status: 403,
    detail: `The ${module} module is only available to active users of a tenant.`,
    traceId: '00-mock-trace-00',
  };
}

export function moduleDisabledError(): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status: 403, error: moduleDisabledProblem() }));
}
