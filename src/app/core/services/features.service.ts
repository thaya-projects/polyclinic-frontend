import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { FeaturesApi } from './features-api';
import { FeatureKey, UpdateEnabledModulesDto } from '../models/features.model';

// T6 (FeatureProvider): expone qué módulos están activos para el user logueado. Se hidrata con
// `loadMine()` una vez que hay sesión (llamado desde init o desde el layout de clínica). Cualquier
// UI que quiera esconder un menú lee `enabled('odontogram')` — cerrado por default si aún no cargó.
@Injectable({ providedIn: 'root' })
export class FeaturesService {
  private api = inject(FeaturesApi);
  private platformId = inject(PLATFORM_ID);

  private readonly modulesSignal = signal<Record<string, boolean>>({});
  private readonly loadedSignal = signal(false);

  readonly loaded = this.loadedSignal.asReadonly();
  readonly modules = this.modulesSignal.asReadonly();

  enabled(key: FeatureKey | string): boolean {
    return this.modulesSignal()[key] === true;
  }

  readonly enabledMap = computed(() => this.modulesSignal());

  // GET en vuelo compartido: si el Shell y un guard (featureEnabledGuard) piden a la vez, sale uno solo.
  private inFlight: Observable<void> | null = null;

  loadMine(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.request().subscribe();
  }

  // Fase 6 FF: para guards de ruta. Emite (y completa) cuando el mapa está cargado: al instante si ya
  // lo estaba, si no espera el GET en vuelo o dispara uno. En SSR emite enseguida (sin sesión).
  ready(): Observable<void> {
    if (this.loadedSignal() || !isPlatformBrowser(this.platformId)) return of(undefined);
    return this.request();
  }

  private request(): Observable<void> {
    if (!this.inFlight) {
      this.inFlight = this.api.getMine().pipe(
        tap(dto => this.modulesSignal.set(dto.modules)),
        map(() => undefined),
        // Ante error (401/403/404): dejamos el mapa vacío → todos cerrados. Los guards de UI
        // deben esconder, no mostrar, hasta que haya un load exitoso.
        catchError(() => {
          this.modulesSignal.set({});
          return of(undefined);
        }),
        tap(() => this.loadedSignal.set(true)),
        finalize(() => (this.inFlight = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.inFlight;
  }

  updateForTenant(tenantId: string, dto: UpdateEnabledModulesDto): Observable<void> {
    // Después del PATCH no re-fetcheamos automáticamente porque el super admin no es el mismo
    // user que /tenants/me; el efecto lo verá el próximo GET del tenant.
    return this.api.updateEnabledModules(tenantId, dto).pipe(tap(() => {}));
  }

  getTenantEnabledModules(tenantId: string) {
    return this.api.getTenantEnabledModules(tenantId);
  }
}
