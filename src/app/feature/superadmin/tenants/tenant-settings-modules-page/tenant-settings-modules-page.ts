import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { FEATURE_KEYS, UpdateEnabledModulesDto } from '../../../../core/models/features.model';
import { FeaturesService } from '../../../../core/services/features.service';
import { PageTitleService } from '../../../../core/services/page-title.service';
import { httpErrorMessage, validationErrorMessage } from '../../../../shared/utils/http-error.util';

// T7 FF: toggles en detalle de tenant (super admin). 3 estados por módulo:
//   'plan'  → no hay override, se resuelve por plan.features.
//   'on'    → override activado (gana sobre plan).
//   'off'   → override desactivado.
//
// Hidratación: al entrar, GET /superadmin/tenants/:id/settings devuelve las keys con override
// explícito → los toggles arrancan en 'on'/'off'; el resto en 'plan'. Guarda `initialState` para
// computar el diff al guardar.
//
// Save diff-only: solo se envían las keys cuyo estado difiere del inicial. Sin este diff, la
// UI mandaría null para todas las keys "plan" y borraría overrides que el super admin no tocó.
type ToggleState = 'plan' | 'on' | 'off';

@Component({
  selector: 'app-tenant-settings-modules-page',
  imports: [RouterLink],
  templateUrl: './tenant-settings-modules-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantSettingsModulesPage {
  private route = inject(ActivatedRoute);
  private featuresSvc = inject(FeaturesService);

  readonly moduleKeys = FEATURE_KEYS;

  readonly tenantId = toSignal(
    this.route.paramMap.pipe(map(pm => pm.get('id') ?? '')),
    { initialValue: '' });

  private readonly initialState = signal<Record<string, ToggleState>>(this.buildInitial());
  private readonly toggles = signal<Record<string, ToggleState>>(this.buildInitial());

  loading = signal(true);
  loadError = signal<string | null>(null);

  saving = signal(false);
  saved = signal(false);
  saveError = signal<string | null>(null);

  readonly hasPendingChanges = computed(() => {
    const cur = this.toggles();
    const init = this.initialState();
    return FEATURE_KEYS.some(k => cur[k] !== init[k]);
  });

  constructor() {
    inject(PageTitleService).set('Módulos del tenant');
    // Cargamos initialState cada vez que cambia el id (soporta navegación entre tenants).
    this.route.paramMap.subscribe(pm => {
      const id = pm.get('id');
      if (id) this.loadInitial(id);
    });
  }

  private loadInitial(tenantId: string): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.saved.set(false);
    this.featuresSvc.getTenantEnabledModules(tenantId).subscribe({
      next: dto => {
        const state = this.buildInitial();
        for (const [key, value] of Object.entries(dto.enabled_modules)) {
          if (FEATURE_KEYS.includes(key as (typeof FEATURE_KEYS)[number])) {
            state[key] = value ? 'on' : 'off';
          }
        }
        this.initialState.set(state);
        this.toggles.set({ ...state });
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.loadError.set(httpErrorMessage(err));
      },
    });
  }

  stateOf(key: string): ToggleState {
    return this.toggles()[key] ?? 'plan';
  }

  setState(key: string, state: ToggleState): void {
    this.toggles.update(m => ({ ...m, [key]: state }));
    this.saved.set(false);
  }

  save(): void {
    const id = this.tenantId();
    if (!id) return;

    const cur = this.toggles();
    const init = this.initialState();

    // Diff-only: solo keys que cambiaron respecto al estado hidratado.
    const overrides: Record<string, boolean | null> = {};
    for (const key of FEATURE_KEYS) {
      if (cur[key] === init[key]) continue;
      overrides[key] = cur[key] === 'on' ? true : cur[key] === 'off' ? false : null;
    }
    if (Object.keys(overrides).length === 0) return;

    const dto: UpdateEnabledModulesDto = { enabled_modules: overrides };
    this.saving.set(true);
    this.saveError.set(null);
    this.saved.set(false);
    this.featuresSvc.updateForTenant(id, dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set(true);
        // Nuevo estado inicial = estado actual, para que un save posterior calcule el diff bien.
        this.initialState.set({ ...cur });
      },
      error: err => {
        this.saving.set(false);
        this.saveError.set(validationErrorMessage(err) ?? httpErrorMessage(err));
      },
    });
  }

  private buildInitial(): Record<string, ToggleState> {
    return Object.fromEntries(FEATURE_KEYS.map(k => [k, 'plan' as ToggleState]));
  }
}
