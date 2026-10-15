import {
  ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, afterNextRender, computed, effect, inject, signal,
  untracked,
} from '@angular/core';
import { Location, isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Params, Router } from '@angular/router';
import { Subject, catchError, combineLatest, distinctUntilChanged, filter, map, of, switchMap, tap } from 'rxjs';
import { EncountersTable } from '../encounters-table/encounters-table';
import { EncounterCreateForm, EncounterCreateFormValue } from '../encounter-create-form/encounter-create-form';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { Modal } from '../../../shared/components/modal/modal';
import { ENCOUNTERS_REPOSITORY } from '../../../core/services/encounters-repository';
import { EncounterLookupsService } from '../../../core/services/encounter-lookups.service';
import { PageTitleService } from '../../../core/services/page-title.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  ENCOUNTER_STATUS_LABEL, EncounterPartyOption, EncounterStatus, EncounterSummary, EncountersQuery,
} from '../../../core/models/encounter.model';
import { PagedResult } from '../../../core/models/paged-result.model';
import { INPUT_BASE_CLASS } from '../../../shared/utils/form-validation.util';
import {
  ENCOUNTERS_ACCESS_DENIED_MESSAGE, NO_PROFESSIONAL_MESSAGE, encounterError, translateEncounterBackendMessage,
} from '../../../shared/utils/encounters-error.util';

const PAGE_SIZE = 10;

type ListResult = { ok: PagedResult<EncounterSummary> } | { error: unknown };

// Fase 4 T6/T7: listado de encounters (filtros paciente/profesional/estado + paginación
// server-side) y alta. La URL es la fuente de verdad de filtros y página:
//   ?patient_id=&professional_id=&status=&page=   → filtros/página (los selects navegan con merge)
//   ?patient_id=<id>&new=1                        → abre el alta con el paciente preseleccionado y
//                                                   saca `new` de la URL (replaceUrl)
// Cada cambio de query dispara un GET con switchMap: una respuesta vieja nunca pisa la nueva.
// El alta es siempre a nombre del profesional habilitado del usuario logueado.
// Acceso: solo profesional activo o clinical.void (policy ClinicalRead). Sin acceso se muestra el
// aviso y NO se llama al backend; mientras se verifica, "Cargando…". Un 403 del GET → mismo aviso.
// El listado trabaja con EncounterSummary: nada acá usa anamnesis/exam/clinical_data.
@Component({
  selector: 'app-encounters-page',
  imports: [EncountersTable, EncounterCreateForm, Pagination, Modal],
  templateUrl: './encounters-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EncountersPage {
  private repo = inject(ENCOUNTERS_REPOSITORY);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);
  private location = inject(Location);
  readonly lookups = inject(EncounterLookupsService);

  readonly pageSize = PAGE_SIZE;
  readonly selectClass = `${INPUT_BASE_CLASS} border-border focus:border-brand focus:ring-brand/18`;
  readonly statusOptions = (Object.keys(ENCOUNTER_STATUS_LABEL) as EncounterStatus[])
    .map(value => ({ value, label: ENCOUNTER_STATUS_LABEL[value] }));

  patientFilter = signal('');
  professionalFilter = signal('');
  statusFilter = signal<EncounterStatus | ''>('');
  page = signal(1);

  encounters = signal<EncounterSummary[]>([]);
  total = signal(0);
  listLoading = signal(false);
  listError = signal<string | null>(null);

  createOpen = signal(false);
  createPatientId = signal<string | null>(null);
  saving = signal(false);
  actionError = signal<string | null>(null);
  private patientSearchResults = signal<EncounterPartyOption[] | null>(null);
  private readonly patientSearch$ = new Subject<string>();

  // 403 del backend en el GET (la sesión dice que puede, el backend no): mismo aviso que sin acceso.
  private serverDenied = signal(false);
  readonly accessDeniedMessage = ENCOUNTERS_ACCESS_DENIED_MESSAGE;
  readonly accessView = computed(() => (this.serverDenied() ? 'denied' : this.lookups.encountersAccess()));

  // Aviso que deja el detalle al volver por un 404 (navigation state).
  notice = signal<string | null>(null);

  readonly canCreate = computed(() => this.lookups.currentProfessional() !== null);
  readonly createDisabledReason = computed(() => this.lookups.createDisabledReason() ?? '');

  // Opciones del filtro: primera página + el paciente filtrado si no vino en ella.
  readonly patientFilterOptions = computed(() =>
    withOption(this.lookups.patients(), this.patientFilter() ? this.lookups.patientOption(this.patientFilter()) : null));

  // Opciones del alta: resultados de la búsqueda (o primera página) + el preseleccionado.
  readonly createPatientOptions = computed(() => {
    const id = this.createPatientId();
    return withOption(this.patientSearchResults() ?? this.lookups.patients(), id ? this.lookups.patientOption(id) : null);
  });

  constructor() {
    inject(PageTitleService).set('Encuentros clínicos');
    this.lookups.load();
    this.readNotice();

    const params$ = this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef));

    params$.subscribe(params => {
      this.patientFilter.set(params.get('patient_id') ?? '');
      this.professionalFilter.set(params.get('professional_id') ?? '');
      this.statusFilter.set(parseStatus(params.get('status')));
      this.page.set(parsePage(params.get('page')));
      if (params.get('new') === '1') {
        this.openCreate(params.get('patient_id'));
        this.navigateParams({ new: null });
      }
    });

    combineLatest([params$, toObservable(this.lookups.encountersAccess)]).pipe(
      filter(([, access]) => isPlatformBrowser(this.platformId) && access === 'allowed'),
      map(([params]) => toQuery(params)),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      tap(() => {
        this.listLoading.set(true);
        this.listError.set(null);
      }),
      switchMap(query => this.repo.list(query).pipe(
        map((ok): ListResult => ({ ok })),
        catchError(error => of<ListResult>({ error })),
      )),
    ).subscribe(result => {
      this.listLoading.set(false);
      if ('ok' in result) {
        this.encounters.set(result.ok.items);
        this.total.set(result.ok.total_count);
      } else {
        const { kind, message } = encounterError(result.error, 'No se pudo cargar el listado de encuentros.');
        if (kind === 'forbidden') this.serverDenied.set(true);
        else this.listError.set(message);
      }
    });

    this.patientSearch$.pipe(
      distinctUntilChanged(),
      switchMap(term => (term.trim()
        ? this.repo.listPatients(term).pipe(catchError(() => of<EncounterPartyOption[] | null>(null)))
        : of<EncounterPartyOption[] | null>(null))),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(results => {
      if (results) this.lookups.remember(results);
      this.patientSearchResults.set(results);
    });

    // Nombres de pacientes fuera de la primera página (filas y filtro): se resuelven de a uno.
    effect(() => {
      const ids = [...this.encounters().map(e => e.patient_id), this.patientFilter()];
      untracked(() => this.lookups.ensurePatients(ids));
    });
  }

  setPatientFilter(value: string): void {
    this.navigateParams({ patient_id: value || null, page: null });
  }

  setProfessionalFilter(value: string): void {
    this.navigateParams({ professional_id: value || null, page: null });
  }

  setStatusFilter(value: string): void {
    this.navigateParams({ status: value || null, page: null });
  }

  setPage(page: number): void {
    this.navigateParams({ page: page > 1 ? page : null });
  }

  clearFilters(): void {
    this.navigateParams({ patient_id: null, professional_id: null, status: null, page: null });
  }

  openDetail(encounter: EncounterSummary): void {
    this.router.navigate(['/encounters', encounter.id]);
  }

  openCreate(patientId: string | null = null): void {
    const id = patientId ?? (this.patientFilter() || null);
    this.createPatientId.set(id);
    this.patientSearchResults.set(null);
    this.lookups.ensurePatients([id]);
    this.actionError.set(null);
    this.createOpen.set(true);
  }

  closeCreate(): void {
    if (this.saving()) return;
    this.createOpen.set(false);
    this.actionError.set(null);
  }

  onPatientSearch(term: string): void {
    this.patientSearch$.next(term);
  }

  dismissNotice(): void {
    this.notice.set(null);
  }

  // clinical_record_id sale del paciente (GET .../clinical-record); después POST. Ningún campo de
  // tenant/firma viaja en el body. Guarda de reentrada: un segundo submit (Enter + click, doble
  // Enter) mientras el primero está en vuelo no dispara otro POST.
  onCreate(value: EncounterCreateFormValue): void {
    if (this.saving()) return;
    const professional = this.lookups.currentProfessional();
    if (!professional) {
      this.actionError.set(this.lookups.createDisabledReason() ?? NO_PROFESSIONAL_MESSAGE);
      return;
    }
    this.saving.set(true);
    this.actionError.set(null);
    this.repo.resolveClinicalRecordId(value.patient_id).pipe(
      switchMap(clinicalRecordId => this.repo.create({
        patient_id: value.patient_id,
        clinical_record_id: clinicalRecordId,
        professional_id: professional.id,
        chief_complaint: value.chief_complaint,
      })),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: created => {
        this.saving.set(false);
        this.createOpen.set(false);
        this.toast.success('Encuentro creado.');
        this.router.navigate(['/encounters', created.id]);
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(createErrorMessage(err));
      },
    });
  }

  private navigateParams(queryParams: Params): void {
    this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }

  // El aviso viaja en el state de la navegación (history.state vía Location); se borra después de
  // leerlo —manteniendo el resto del state del router— para que un refresh/back no lo repita.
  private readNotice(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const fromNavigation = this.router.currentNavigation()?.extras.state?.['notice'];
    const fromHistory = (this.location.getState() as Record<string, unknown> | null)?.['notice'];
    const notice = typeof fromNavigation === 'string' ? fromNavigation : fromHistory;
    if (typeof notice === 'string') this.notice.set(notice);
    afterNextRender(() => {
      const state = this.location.getState() as Record<string, unknown> | null;
      if (state && 'notice' in state) {
        const { notice: _removed, ...rest } = state;
        this.location.replaceState(this.location.path(), '', rest);
      }
    });
  }
}

function parseStatus(value: string | null): EncounterStatus | '' {
  return value && value in ENCOUNTER_STATUS_LABEL ? (value as EncounterStatus) : '';
}

function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 1 ? page : 1;
}

function toQuery(params: ParamMap): EncountersQuery {
  return {
    patient_id: params.get('patient_id') || undefined,
    professional_id: params.get('professional_id') || undefined,
    status: parseStatus(params.get('status')) || undefined,
    page: parsePage(params.get('page')),
    limit: PAGE_SIZE,
  };
}

function withOption(list: EncounterPartyOption[], extra: EncounterPartyOption | null): EncounterPartyOption[] {
  return extra && !list.some(o => o.id === extra.id) ? [extra, ...list] : list;
}

function createErrorMessage(err: unknown): string {
  const { kind, message } = encounterError(err, 'No se pudo crear el encuentro.');
  switch (kind) {
    case 'not_found': return 'El paciente, su historia clínica o el profesional no existen en esta clínica.';
    case 'forbidden': return NO_PROFESSIONAL_MESSAGE;
    case 'conflict': {
      const detail = (err as { error?: { detail?: unknown } }).error?.detail;
      return (typeof detail === 'string' && translateEncounterBackendMessage(detail))
        || 'No se pudo crear el encuentro por un conflicto con otro registro. Intentá de nuevo.';
    }
    default: return message;
  }
}
