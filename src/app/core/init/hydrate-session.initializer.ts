import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, finalize, firstValueFrom, of } from 'rxjs';
import { AuthTokenService } from '../services/auth-token.service';
import { MeService } from '../services/me.service';
import { AuthStore } from '../services/auth-store.service';

// T16: al arrancar la app, si hay un access_token guardado, pide GET
// /auth/me para hidratar AuthStore con el estado fresco del usuario
// (incluido subscription_status). Si el token es inválido, authInterceptor
// (T15) ya se encarga de reintentar con refresh o, si falla, limpiar la
// sesión y redirigir a login — acá solo evitamos que ese error rompa el
// arranque de la app.
export function hydrateSessionInitializer(): Promise<unknown> {
  const platformId = inject(PLATFORM_ID);
  const tokens = inject(AuthTokenService);
  const me = inject(MeService);
  const store = inject(AuthStore);

  if (!isPlatformBrowser(platformId) || !tokens.getAccessToken()) {
    return Promise.resolve();
  }

  store.setVerifying(true);
  return firstValueFrom(
    me.fetch().pipe(
      catchError(() => of(null)),
      finalize(() => store.setVerifying(false)),
    ),
  );
}
