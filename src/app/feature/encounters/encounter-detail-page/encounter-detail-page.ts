import {
  ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, computed, effect, inject, signal, untracked, viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BehaviorSubject, Observable, Subject, catchError, combineLatest, distinctUntilChanged, filter, map, of, switchMap } from 'rxjs';
import { EncounterNote } from '../encounter-note/encounter-note';
import { EncounterDiagnoses } from '../encounter-diagnoses/encounter-diagnoses';
import { EncounterDiagnosesStore } from '../encounter-diagnoses/encounter-diagnoses.store';
import { VoidEncounterDialog } from '../void-encounter-dialog/void-encounter-dialog';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { ENCOUNTERS_REPOSITORY } from '../../../core/services/encounters-repository';
import { EncounterLookupsService } from '../../../core/services/encounter-lookups.service';
import { PageTitleService } from '../../../core/services/page-title.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthStore } from '../../../core/services/auth-store.service';
import { FeaturesService } from '../../../core/services/features.service';
import { Encounter, EncounterNotePatch } from '../../../core/models/encounter.model';
import { CreateDiagnosisDto } from '../../../core/models/diagnosis.model';
import {
  ADMIN_VOID_ONLY_MESSAGE, ENCOUNTERS_ACCESS_DENIED_MESSAGE, ENCOUNTER_CONFLICT_MESSAGE,
  ENCOUNTER_DRAFT_CONFLICT_MESSAGE, ENCOUNTER_FORBIDDEN_MESSAGE,
  INACTIVE_PROFESSIONAL_MESSAGE, PROFESSIONALS_LOAD_ERROR_MESSAGE, encounterError,
} from '../../../shared/utils/encounters-error.util';

type PendingAction = 'save' | 'sign' | 'void';

type LoadResult = { id: string; encounter: Encounter } | { id: string; error: unknown };

// Fase 4 T6/T7: contenedor del detalle de un encounter. Toda la data pasa por
// ENCOUNTERS_REPOSITORY (mock o HTTP). Firmar/anular/guardar reemplazan el encounter local con la
// respuesta del backend — sin recargar la página — y con eso también su `version`, que es la que
// viaja en la próxima escritura (concurrencia optimista: versión vieja → 409).
// Solo el profesional del encounter (professional.user_id == usuario actual, y activo) ve la nota
// editable y las acciones; para el resto es de solo lectura.
//
// Acceso: solo profesional activo o clinical.void. El GET no sale hasta saberlo; sin acceso (o con
// 403 del backend) se muestra "Solo los profesionales pueden ver las notas clínicas.".
// Anulación administrativa: con clinical.void y sin ser el profesional del encounter, la nota es de
// solo lectura y solo se ofrece "Anular (administrativo)" (open/signed). Si además es el
// profesional, ve las acciones normales.
//
// Cargas: paramMap → switchMap(getById), así una respuesta de un id anterior nunca pisa la del
// actual; además se descarta cualquier respuesta (carga o acción) cuyo id ya no es el mostrado.
//
// Errores (403/422 además llevan el toast genérico de httpErrorInterceptor, igual que patients):
//   404 → vuelve al listado (replaceUrl) con aviso; el toast global de ese 404 se suprime.
//   409 al guardar → recarga la versión nueva CONSERVANDO lo escrito + aviso para revisar.
//   409 en firmar/anular → toast de conflicto + recarga.
//   403 → "Solo el profesional del encuentro puede editar, firmar o anular esta nota." (inline).
//   422 → mensaje del backend traducido (dentro del diálogo si fue al anular).
//   otro error al cargar → aviso con Reintentar.
//
// Diagnósticos (T4/T5): sección propia debajo de la nota; su estado vive en EncounterDiagnosesStore
// (provisto acá). Editable solo con `canEdit` y el encounter open.
//   - Alta/baja incrementan la version del encounter: se aplica en memoria (sin recargar) para que
//     el próximo Guardar/Firmar/Anular no dé un 409 falso.
//   - Un 409 de estado al agregar/eliminar (firmado/anulado en otro lado) recarga el encounter → la
//     sección pasa a solo lectura. El 409 de código repetido no recarga.
//   - Operaciones mutuamente excluyentes: con una de diagnósticos en curso no se puede guardar,
//     firmar ni anular, y viceversa.
@Component({
  selector: 'app-encounter-detail-page',
  imports: [EncounterNote, EncounterDiagnoses, VoidEncounterDialog, ConfirmDialog, RouterLink],
  providers: [EncounterDiagnosesStore],
  templateUrl: './encounter-detail-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EncounterDetailPage {
  private repo = inject(ENCOUNTERS_REPOSITORY);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  private authStore = inject(AuthStore);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);
  readonly lookups = inject(EncounterLookupsService);
  readonly diagnoses = inject(EncounterDiagnosesStore);

  private note = viewChild(EncounterNote);

  encounter = signal<Encounter | null>(null);
  loading = signal(false);
  loadError = signal<string | null>(null);
  pending = signal<PendingAction | null>(null);
  actionError = signal<string | null>(null);
  // Cambios del usuario a conservar tras un 409 al guardar (se re-aplican sobre la versión nueva).
  draft = signal<EncounterNotePatch | null>(null);

  voidOpen = signal(false);
  voidError = signal<string | null>(null);

  // canDeactivate con cambios sin guardar → ConfirmDialog (convención del proyecto, no confirm()).
  leaveConfirmOpen = signal(false);
  private leaveResolver: ((leave: boolean) => void) | null = null;

  // Fase 6: acceso al odontograma del paciente (asociando este encounter) con el módulo activo.
  private features = inject(FeaturesService);
  readonly odontogramEnabled = computed(() => this.features.enabledMap()['odontogram'] === true);

  readonly patientName = computed(() => {
    const e = this.encounter();
    return e ? this.lookups.patientNameById()[e.patient_id] ?? '' : '';
  });
  readonly professionalName = computed(() => {
    const e = this.encounter();
    return e ? this.lookups.professionalNameById()[e.professional_id] ?? '' : '';
  });
  // Mientras no cargan los profesionales (o si fallaron) queda en false: mejor no mostrar acciones
  // que mostrarlas y que el backend responda 403.
  readonly canEdit = computed(() => {
    const e = this.encounter();
    const mine = this.lookups.currentProfessional();
    return !!e && !!mine && e.professional_id === mine.id;
  });

  // Diagnósticos: mismo `canEdit` que la nota + encounter open (si no, solo el listado).
  readonly canEditDiagnoses = computed(() => this.canEdit() && this.encounter()?.status === 'open');
  private readonly encounterId = computed(() => this.encounter()?.id ?? null);

  // Anulación administrativa (clinical.void) para quien no es el profesional habilitado del encounter.
  readonly canAdminVoid = computed(() => {
    const e = this.encounter();
    return !!e && !this.canEdit() && this.lookups.hasClinicalVoid() && e.status !== 'voided';
  });

  // 403 del backend al leer, o la sesión sin acceso: mismo aviso.
  private serverDenied = signal(false);
  readonly accessDeniedMessage = ENCOUNTERS_ACCESS_DENIED_MESSAGE;
  readonly accessView = computed(() => (this.serverDenied() ? 'denied' : this.lookups.encountersAccess()));

  readonly readOnlyReason = computed(() => {
    if (this.lookups.professionalsLoading()) return 'Cargando…';
    if (this.lookups.professionalsError()) return PROFESSIONALS_LOAD_ERROR_MESSAGE;
    const e = this.encounter();
    const linked = this.lookups.linkedProfessional();
    if (e && linked && !linked.active && e.professional_id === linked.id) return INACTIVE_PROFESSIONAL_MESSAGE;
    return this.canAdminVoid() ? ADMIN_VOID_ONLY_MESSAGE : ENCOUNTER_FORBIDDEN_MESSAGE;
  });

  readonly signedByName = computed(() =>
    this.lookups.userDisplayName(this.encounter()?.signed_by ?? null, this.authStore.user()));
  readonly voidedByName = computed(() =>
    this.lookups.userDisplayName(this.encounter()?.voided_by ?? null, this.authStore.user()));

  private id = '';
  private destroyed = false;
  private readonly load$ = new Subject<string>();
  private readonly requestedId$ = new BehaviorSubject<string>('');

  constructor() {
    inject(PageTitleService).set('Nota de evolución');
    this.lookups.loadProfessionals();
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.leaveResolver?.(true);
    });

    // M4: el nombre del paciente sale de GET /tenants/patients/:id si no estaba en la caché.
    effect(() => {
      const patientId = this.encounter()?.patient_id;
      untracked(() => this.lookups.ensurePatients([patientId]));
    });

    // Diagnósticos: se cargan una vez por encounter mostrado (no en cada firma/guardado).
    effect(() => {
      const encounterId = this.encounterId();
      untracked(() => this.diagnoses.setEncounter(encounterId));
    });
    // 409 al agregar/eliminar: el encounter ya no está open → recargarlo (la sección pasa a solo
    // lectura). El mensaje lo muestra la propia sección.
    this.diagnoses.conflict$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.reload());
    this.diagnoses.encounterNotFound$.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(message => this.goToListWithNotice(message));
    this.diagnoses.encounterVersion$.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(change => this.applyVersion(change.encounterId, change.version));

    this.load$.pipe(
      switchMap(id => this.repo.getById(id).pipe(
        map((encounter): LoadResult => ({ id, encounter })),
        catchError(error => of<LoadResult>({ id, error })),
      )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => this.onLoaded(result));

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.id = params.get('id') ?? '';
      this.encounter.set(null);
      this.draft.set(null);
      this.actionError.set(null);
      this.loadError.set(null);
      this.requestedId$.next(this.id);
    });

    // El GET sale recién cuando se sabe que el usuario tiene acceso (una vez por id).
    combineLatest([this.requestedId$, toObservable(this.lookups.encountersAccess)]).pipe(
      filter(([id, access]) => !!id && access === 'allowed'),
      map(([id]) => id),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.reload());
  }

  reload(): void {
    if (!isPlatformBrowser(this.platformId) || !this.id || this.accessView() !== 'allowed') return;
    this.loading.set(true);
    this.loadError.set(null);
    this.load$.next(this.id);
  }

  retryProfessionals(): void {
    this.lookups.loadProfessionals();
  }

  // B1: la guarda va antes de construir el request (con HTTP no saldría, pero con otras fuentes sí).
  onSave(patch: EncounterNotePatch): void {
    const version = this.currentVersion();
    if (version === null || this.pending() || this.diagnoses.busy()) return;
    this.run('save', this.repo.update(this.id, { ...patch, version }), 'Nota guardada.', patch);
  }

  onSign(): void {
    const version = this.currentVersion();
    if (version === null || this.pending() || this.diagnoses.busy()) return;
    this.run('sign', this.repo.sign(this.id, { version }), 'Nota firmada.');
  }

  onCreateDiagnosis(dto: CreateDiagnosisDto): void {
    if (!this.canEditDiagnoses() || this.pending()) return;
    this.diagnoses.create(dto);
  }

  onRemoveDiagnosis(diagnosisId: string): void {
    if (!this.canEditDiagnoses() || this.pending()) return;
    this.diagnoses.remove(diagnosisId);
  }

  openVoid(): void {
    if (this.pending() || this.diagnoses.busy()) return;
    this.voidError.set(null);
    this.voidOpen.set(true);
  }

  closeVoid(): void {
    if (this.pending() === 'void') return;
    this.voidOpen.set(false);
    this.voidError.set(null);
  }

  onVoid(reason: string): void {
    const version = this.currentVersion();
    if (version === null || this.pending() || this.diagnoses.busy()) return;
    this.voidError.set(null);
    this.run('void', this.repo.void(this.id, { reason, version }), 'Encuentro anulado.');
  }

  // canDeactivate (ver app.routes.ts): pregunta solo si la nota tiene cambios sin guardar.
  canLeave(): boolean | Promise<boolean> {
    if (!this.note()?.dirty()) return true;
    this.leaveResolver?.(false);
    this.leaveConfirmOpen.set(true);
    return new Promise<boolean>(resolve => (this.leaveResolver = resolve));
  }

  resolveLeave(leave: boolean): void {
    this.leaveConfirmOpen.set(false);
    const resolve = this.leaveResolver;
    this.leaveResolver = null;
    resolve?.(leave);
  }

  private onLoaded(result: LoadResult): void {
    if (result.id !== this.id) return;
    this.loading.set(false);
    if ('encounter' in result) {
      this.applyLoaded(result.encounter);
      return;
    }
    const { kind, message } = encounterError(result.error, 'No se pudo cargar el encuentro.');
    if (kind === 'not_found') {
      this.goToListWithNotice(message);
    } else if (kind === 'forbidden') {
      this.serverDenied.set(true);
    } else if (kind !== 'unauthorized') {
      this.loadError.set(message);
    }
  }

  // Tras un 409 al guardar, el borrador sigue sólo si la versión nueva todavía se puede editar.
  private applyLoaded(encounter: Encounter): void {
    if (this.draft() && encounter.status !== 'open') {
      this.draft.set(null);
      this.actionError.set(null);
      this.toast.error(ENCOUNTER_CONFLICT_MESSAGE);
    }
    this.encounter.set(encounter);
  }

  private run(action: PendingAction, request$: Observable<Encounter>, successMessage: string, patch?: EncounterNotePatch): void {
    if (this.pending()) return;
    const id = this.id;
    this.pending.set(action);
    this.actionError.set(null);
    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: updated => {
        this.pending.set(null);
        if (id !== this.id || updated.id !== this.id) return;
        this.draft.set(null);
        this.encounter.set(updated);
        if (action === 'void') this.voidOpen.set(false);
        this.toast.success(successMessage);
      },
      error: err => {
        this.pending.set(null);
        if (id !== this.id) return;
        this.handleActionError(err, action, patch);
      },
    });
  }

  private handleActionError(err: unknown, action: PendingAction, patch?: EncounterNotePatch): void {
    const { kind, message } = encounterError(err, 'No se pudo completar la operación.');
    switch (kind) {
      case 'not_found':
        this.goToListWithNotice(message);
        return;
      case 'conflict':
        this.voidOpen.set(false);
        if (action === 'save' && patch) {
          // M1: no se pierde lo escrito — se re-aplica sobre la versión recargada.
          this.draft.set(patch);
          this.actionError.set(ENCOUNTER_DRAFT_CONFLICT_MESSAGE);
        } else {
          this.toast.error(message);
        }
        this.reload();
        return;
      case 'unauthorized':
        // authInterceptor ya hizo refresh o logout + redirect.
        return;
      default:
        // 422 del void se muestra dentro del diálogo; el resto, arriba de la nota.
        if (action === 'void' && kind === 'validation') {
          this.voidError.set(message);
        } else {
          if (action === 'void') this.voidOpen.set(false);
          this.actionError.set(message);
        }
    }
  }

  // Alta/baja de un diagnóstico: nueva version del encounter, sin recargar.
  private applyVersion(encounterId: string, version: number): void {
    const current = this.encounter();
    if (current && current.id === encounterId && current.id === this.id) this.encounter.set({ ...current, version });
  }

  private goToListWithNotice(message: string): void {
    this.voidOpen.set(false);
    if (this.destroyed) return;
    this.router.navigate(['/encounters'], { replaceUrl: true, state: { notice: message } });
  }

  private currentVersion(): number | null {
    return this.encounter()?.version ?? null;
  }
}
