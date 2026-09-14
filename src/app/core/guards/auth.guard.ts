import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, finalize, map, of } from 'rxjs';
import { AuthTokenService } from '../services/auth-token.service';
import { AuthStore } from '../services/auth-store.service';
import { MeService } from '../services/me.service';

// T17: guard de autenticación puro (sin rol — eso lo sigue resolviendo
// roleGuard) para cualquier ruta privada.
export const authGuard: CanActivateFn = () => {
  const tokens = inject(AuthTokenService);
  const store = inject(AuthStore);
  const me = inject(MeService);
  const router = inject(Router);

  if (!tokens.getAccessToken()) {
    return router.parseUrl('/login');
  }

  if (store.user()) return true;

  // Hay token pero todavía no se hidrató el usuario (p.ej. falló el
  // GET /auth/me del arranque de la app, o el usuario abrió una pestaña
  // nueva) — se reintenta acá antes de decidir. Si también falla,
  // authInterceptor (T15) ya limpia la sesión y redirige a login; acá
  // solo evitamos dejar pasar la navegación mientras tanto.
  store.setVerifying(true);
  return me.fetch().pipe(
    map(() => true),
    catchError(() => of(false)),
    finalize(() => store.setVerifying(false)),
  );
};
