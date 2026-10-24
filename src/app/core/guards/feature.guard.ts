import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanMatchFn } from '@angular/router';
import { map } from 'rxjs';
import { FeaturesService } from '../services/features.service';
import { FeatureKey } from '../models/features.model';

// Fase 6 FF: canMatch por módulo (feature flag del tenant). Con el módulo apagado la ruta NO matchea y
// el router sigue con la siguiente del mismo path — en app.routes cada ruta gated va seguida de su
// fallback a ModuleDisabledPage, así la URL directa muestra "Módulo no habilitado" en vez de la
// pantalla con un 403 crudo. Espera a GET /tenants/me/features (FeaturesService.ready) si todavía no
// cargó. En SSR deja pasar: no hay sesión y la página arranca en su estado de carga.
export function featureEnabledGuard(key: FeatureKey): CanMatchFn {
  return () => {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
    const features = inject(FeaturesService);
    return features.ready().pipe(map(() => features.enabled(key)));
  };
}
