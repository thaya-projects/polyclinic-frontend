import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
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

  loadMine(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.api.getMine().subscribe({
      next: dto => {
        this.modulesSignal.set(dto.modules);
        this.loadedSignal.set(true);
      },
      error: () => {
        // Ante error (401/403/404): dejamos el mapa vacío → todos cerrados. Los guards de UI
        // deben esconder, no mostrar, hasta que haya un load exitoso.
        this.modulesSignal.set({});
        this.loadedSignal.set(true);
      },
    });
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
