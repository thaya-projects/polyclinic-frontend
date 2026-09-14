import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthTokenService } from '../services/auth-token.service';
import { AuthApi } from '../services/auth-api';
import { SessionService } from '../services/session.service';
import { ToastService } from '../services/toast.service';
import { isAuthExemptPath } from '../constants/auth-exempt-paths.const';

// Refresh en curso compartido entre requests concurrentes (T15): si dos
// llamadas 401 al mismo tiempo, solo se dispara un POST /auth/refresh y
// ambas esperan su resultado en vez de duplicarlo.
let inFlightRefresh$: Observable<string | null> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(AuthTokenService);
  const authApi = inject(AuthApi);
  const session = inject(SessionService);
  const toast = inject(ToastService);

  const isExempt = isAuthExemptPath(req.url);
  const accessToken = tokens.getAccessToken();
  const authReq = accessToken && !isExempt ? withBearer(req, accessToken) : req;

  return next(authReq).pipe(
    catchError((err: unknown) => {
      if (isExempt || !(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }

      const refreshToken = tokens.getRefreshToken();
      if (!refreshToken) {
        expireSession(session, toast);
        return throwError(() => err);
      }

      return refreshAccessToken(authApi, tokens, refreshToken).pipe(
        switchMap(newAccessToken => {
          if (!newAccessToken) {
            expireSession(session, toast);
            return throwError(() => err);
          }
          return next(withBearer(req, newAccessToken));
        }),
      );
    }),
  );
};

// T20: avisar por qué se cierra la sesión antes de redirigir, en vez de
// mandar a login en silencio.
function expireSession(session: SessionService, toast: ToastService): void {
  toast.error('Tu sesión expiró. Iniciá sesión de nuevo.');
  session.logout();
}

function withBearer(req: Parameters<HttpInterceptorFn>[0], token: string) {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function refreshAccessToken(
  authApi: AuthApi,
  tokens: AuthTokenService,
  refreshToken: string,
): Observable<string | null> {
  if (!inFlightRefresh$) {
    inFlightRefresh$ = authApi.refresh(refreshToken).pipe(
      map(res => {
        tokens.save(res);
        return res.access_token;
      }),
      catchError(() => of(null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    // Libera el compartido en cuanto termina esta ronda de refresh, para
    // que un 401 futuro dispare uno nuevo en vez de reusar el resultado viejo.
    inFlightRefresh$.subscribe({ complete: () => (inFlightRefresh$ = null) });
  }
  return inFlightRefresh$;
}
