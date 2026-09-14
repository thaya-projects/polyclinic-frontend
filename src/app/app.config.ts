import { ApplicationConfig, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';
import { hydrateSessionInitializer } from './core/init/hydrate-session.initializer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    // Orden importa: authInterceptor queda "afuera" para que un 401 que
    // httpErrorInterceptor deja pasar sin tocar termine en su lógica de
    // refresh; httpErrorInterceptor queda "adentro" (más cerca del backend)
    // y maneja 403/404/422 con un toast.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, httpErrorInterceptor])),
    provideAppInitializer(hydrateSessionInitializer),
  ],
};
