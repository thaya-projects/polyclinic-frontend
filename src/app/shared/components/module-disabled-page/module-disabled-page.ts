import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageTitleService } from '../../../core/services/page-title.service';

export interface ModuleDisabledRouteData {
  moduleTitle: string;
  message: string;
}

// Fase 6 FF: estado "Módulo no habilitado" para el acceso por URL directa a una ruta cuyo módulo
// está apagado para el tenant (fallback de featureEnabledGuard). Textos por route data.
@Component({
  selector: 'app-module-disabled-page',
  imports: [RouterLink],
  template: `
    <div class="flex flex-col gap-6">
      <h2 class="text-2xl font-bold text-navy">{{ data.moduleTitle }}</h2>
      <div class="flex flex-col items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-6 py-14 text-center text-amber-800"
        role="alert" data-testid="module-disabled">
        <i class="ti ti-lock text-3xl"></i>
        <p class="text-base font-semibold">Módulo no habilitado</p>
        <p class="max-w-md text-sm">{{ data.message }}</p>
        <a routerLink="/" class="mt-2 text-sm font-medium text-brand hover:text-brand-dark">Volver al inicio</a>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModuleDisabledPage {
  readonly data = inject(ActivatedRoute).snapshot.data as ModuleDisabledRouteData;

  constructor() {
    inject(PageTitleService).set(this.data.moduleTitle);
  }
}
