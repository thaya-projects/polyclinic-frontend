import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, catchError, of, switchMap, throwError } from 'rxjs';
import { OdontogramChart, ToothFaceSelection } from '../odontogram-chart/odontogram-chart';
import { SelectedToothPanel } from '../selected-tooth-panel/selected-tooth-panel';
import { PatientPicker } from '../patient-picker/patient-picker';
import { ToothConditionsPanel } from '../tooth-conditions-panel/tooth-conditions-panel';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { Modal } from '../../../../shared/components/modal/modal';
import { PageTitleService } from '../../../../core/services/page-title.service';
import { ODONTOGRAM_REPOSITORY } from '../../../../core/services/odontogram-repository';
import { TOOTH_CONDITIONS_REPOSITORY } from '../../../../core/services/tooth-conditions-repository';
import { DENTAL_CONDITIONS_REPOSITORY } from '../../../../core/services/dental-conditions-repository';
import { DentalCondition } from '../../../../core/models/dental-condition.model';
import {
  TOOTH_CONDITION_FALLBACK_COLOR, ToothCondition, ToothSurface, buildOdontogramPaint,
} from '../../../../core/models/tooth-condition.model';
import {
  DENTITION_OPTIONS, Dentition, Odontogram, OdontogramPatientOption, dentitionLabel,
} from '../../../../core/models/odontogram.model';
import {
  ODONTOGRAM_LOAD_ERROR_MESSAGE, OdontogramError, odontogramError,
} from '../../../../shared/utils/odontogram-error.util';

const TEETH_LOAD_ERROR_MESSAGE = 'No se pudieron cargar las condiciones marcadas del odontograma.';
const CATALOG_LOAD_ERROR_MESSAGE = 'No se pudo cargar el catálogo de condiciones dentales.';

const NO_CLINICAL_RECORD_MESSAGE =
  'No se pudo obtener la historia clínica del paciente. Completala desde la ficha del paciente e intentá de nuevo.';

// Fase 6 T5: Odontología > Odontograma. Solo conoce ODONTOGRAM_REPOSITORY (mock o HTTP).
//   /patients/:patientId/odontogram[?encounter_id=] → odontograma current del paciente.
//   /odontology/odontogram (entrada del menú, sin paciente) → selector de paciente que navega a la
//   ruta de arriba.
// La grilla y el panel de pieza son presentacionales: la página solo guarda la pieza seleccionada.
//
// T6 "Nuevo odontograma": elige dentición, toma clinical_record_id de la historia clínica del paciente
// (resolveClinicalRecordId) y encounter_id del query param si se llegó desde un encounter. Al crear,
// recarga el current y avisa que el anterior quedó como snapshot histórico (con su fecha).
//   404 sin current → estado vacío con CTA "Crear odontograma".
//   403 módulo apagado → estado bloqueado (también si se apaga con el modal abierto).
//   409 (carrera del current) → cierra el modal, avisa y recarga.
//
// T5 "marcar pieza": con el odontograma cargado se piden sus condiciones marcadas
// (TOOTH_CONDITIONS_REPOSITORY) y el catálogo dental (DENTAL_CONDITIONS_REPOSITORY, globales + propias).
// La página es dueña de esa lista: el panel de la pieza (ToothConditionsPanel, en el slot
// [toothActions]) hace las altas / ediciones / bajas y emite el resultado; la grilla se repinta con el
// default_color de cada condición sin recargar. Click en una cara de la grilla → pieza + cara
// preseleccionada en el formulario.
//
// T6: las condiciones van contra el backend (HttpToothConditionsRepository). Un odontograma histórico
// (is_current = false) se muestra en solo lectura; si una escritura recibe 409 (el mostrado dejó de
// ser current) se avisa y se recarga el current.
@Component({
  selector: 'app-odontogram-page',
  imports: [OdontogramChart, SelectedToothPanel, ToothConditionsPanel, PatientPicker, StatusChip, Modal, RouterLink],
  templateUrl: './odontogram-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OdontogramPage {
  private repo = inject(ODONTOGRAM_REPOSITORY);
  private teethRepo = inject(TOOTH_CONDITIONS_REPOSITORY);
  private catalogRepo = inject(DENTAL_CONDITIONS_REPOSITORY);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);

  readonly patientId = signal<string | null>(null);
  // Encounter desde el que se llegó (opcional): se asocia al crear un odontograma nuevo.
  readonly encounterId = signal<string | null>(null);
  readonly patient = signal<OdontogramPatientOption | null>(null);
  readonly odontogram = signal<Odontogram | null>(null);

  // Arranca en true: en el prerender (SSR) no se pide nada y se muestra el estado de carga.
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  // 403 del módulo "odontogram" apagado: estado propio (no un error genérico) y sin acciones.
  readonly moduleDisabled = signal(false);
  // 404 "sin current": el paciente todavía no tiene odontograma (estado vacío, no error).
  readonly noCurrent = signal(false);

  readonly selectedTooth = signal<number | null>(null);
  // Cara elegida en la grilla (preselecciona la surface del formulario). null = pieza completa.
  readonly selectedSurface = signal<ToothSurface | null>(null);

  // Condiciones marcadas del odontograma y catálogo dental (para el selector y los colores).
  readonly teeth = signal<ToothCondition[]>([]);
  readonly catalog = signal<DentalCondition[]>([]);
  readonly teethError = signal<string | null>(null);
  readonly paint = computed(() => {
    const colors = new Map(this.catalog().map(c => [c.id, c.default_color]));
    return buildOdontogramPaint(this.teeth(), id => colors.get(id));
  });
  // Leyenda bajo el chart: solo las condiciones que efectivamente están marcadas, con cuántas piezas.
  readonly legend = computed(() => {
    const byId = new Map(this.catalog().map(c => [c.id, c]));
    const teethByCondition = new Map<string, Set<number>>();
    for (const item of this.teeth()) {
      (teethByCondition.get(item.condition_id) ?? teethByCondition.set(item.condition_id, new Set()).get(item.condition_id)!)
        .add(item.tooth_fdi);
    }
    return [...teethByCondition].map(([id, teeth]) => ({
      id,
      name: byId.get(id)?.name ?? 'Condición',
      color: byId.get(id)?.default_color || TOOTH_CONDITION_FALLBACK_COLOR,
      count: teeth.size,
    })).sort((a, b) => a.name.localeCompare(b.name));
  });

  // Alta de odontograma nuevo.
  readonly dentitionOptions = DENTITION_OPTIONS;
  readonly createOpen = signal(false);
  readonly newDentition = signal<Dentition>('permanente');
  readonly creating = signal(false);
  readonly actionError = signal<string | null>(null);
  // Aviso no bloqueante (snapshot histórico tras crear / conflicto de current).
  readonly notice = signal<string | null>(null);
  readonly canCreate = computed(() => !!this.patientId() && !this.loading() && !this.moduleDisabled()
    && (this.noCurrent() || !!this.odontogram()));

  // Selector de paciente (entrada sin paciente).
  readonly patientSearch = signal('');
  readonly patientOptions = signal<OdontogramPatientOption[]>([]);
  readonly patientsLoading = signal(false);
  private search$ = new Subject<string>();

  readonly dentitionText = computed(() => {
    const o = this.odontogram();
    return o ? `Dentición ${dentitionLabel(o.dentition).toLowerCase()}` : '';
  });

  constructor() {
    inject(PageTitleService).set('Odontograma');

    this.search$.pipe(
      switchMap(q => this.repo.listPatients(q).pipe(catchError(() => of([] as OdontogramPatientOption[])))),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(list => {
      this.patientOptions.set(list);
      this.patientsLoading.set(false);
    });

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.patientId.set(params.get('patientId'));
      this.encounterId.set(this.route.snapshot.queryParamMap.get('encounter_id'));
      this.clearSelection();
      this.notice.set(null);
      this.closeCreate();
      if (this.patientId()) this.load();
      else this.searchPatients(this.patientSearch());
    });
  }

  load(): void {
    const patientId = this.patientId();
    if (!patientId || !isPlatformBrowser(this.platformId)) return;
    this.loading.set(true);
    this.loadError.set(null);
    this.moduleDisabled.set(false);
    this.noCurrent.set(false);

    this.repo.getPatient(patientId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: p => { if (this.patientId() === patientId) this.patient.set(p); },
      error: () => { if (this.patientId() === patientId) this.patient.set(null); },
    });

    this.repo.getCurrent(patientId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: odontogram => {
        if (this.patientId() !== patientId) return;
        this.odontogram.set(odontogram);
        this.loading.set(false);
        this.reloadMarks();
      },
      error: (err: unknown) => {
        if (this.patientId() !== patientId) return;
        this.odontogram.set(null);
        this.teeth.set([]);
        this.loading.set(false);
        const error = this.classify(err, ODONTOGRAM_LOAD_ERROR_MESSAGE, 'read');
        if (error.kind === 'no_current') {
          this.noCurrent.set(true);
          return;
        }
        this.moduleDisabled.set(error.kind === 'feature_disabled');
        this.loadError.set(error.message);
      },
    });
  }

  // Condiciones marcadas del odontograma mostrado. Un error no bloquea la grilla: se avisa aparte.
  loadTeeth(): void {
    const odontogram = this.odontogram();
    if (!odontogram) return;
    this.teethError.set(null);
    this.teethRepo.list(odontogram.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: list => { if (this.odontogram()?.id === odontogram.id) this.teeth.set(list); },
      error: (err: unknown) => {
        if (this.odontogram()?.id !== odontogram.id) return;
        this.teeth.set([]);
        this.teethError.set(this.classify(err, TEETH_LOAD_ERROR_MESSAGE, 'read').message);
      },
    });
  }

  // Reintento desde el aviso: condiciones marcadas y catálogo.
  reloadMarks(): void {
    this.loadTeeth();
    this.loadCatalog();
  }

  private loadCatalog(): void {
    this.catalogRepo.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: list => this.catalog.set(list),
      error: (err: unknown) => {
        this.catalog.set([]);
        this.teethError.set(this.classify(err, CATALOG_LOAD_ERROR_MESSAGE, 'read').message);
      },
    });
  }

  onToothConditionAdded(item: ToothCondition): void {
    this.teeth.update(list => [...list, item]);
  }

  onToothConditionUpdated(item: ToothCondition): void {
    this.teeth.update(list => list.map(i => (i.id === item.id ? item : i)));
  }

  onToothConditionRemoved(id: string): void {
    this.teeth.update(list => list.filter(i => i.id !== id));
  }

  // 409 al escribir una condición: el odontograma mostrado ya es histórico → avisar y recargar el current.
  onOdontogramHistoric(message: string): void {
    this.notice.set(message);
    this.load();
  }

  searchPatients(q: string): void {
    this.patientSearch.set(q);
    if (!isPlatformBrowser(this.platformId)) return;
    this.patientsLoading.set(true);
    this.search$.next(q);
  }

  pickPatient(patient: OdontogramPatientOption): void {
    this.router.navigate(['/patients', patient.id, 'odontogram']);
  }

  selectTooth(fdi: number): void {
    // Click sobre la pieza ya seleccionada la deselecciona.
    this.selectedTooth.update(current => (current === fdi ? null : fdi));
    this.selectedSurface.set(null);
  }

  // Click en una cara: selecciona la pieza con esa cara; repetir la misma cara deselecciona.
  selectFace({ fdi, surface }: ToothFaceSelection): void {
    if (this.selectedTooth() === fdi && this.selectedSurface() === surface) {
      this.clearSelection();
      return;
    }
    this.selectedTooth.set(fdi);
    this.selectedSurface.set(surface);
  }

  clearSelection(): void {
    this.selectedTooth.set(null);
    this.selectedSurface.set(null);
  }

  openCreate(): void {
    if (!this.canCreate()) return;
    this.newDentition.set(this.odontogram()?.dentition ?? 'permanente');
    this.actionError.set(null);
    this.createOpen.set(true);
  }

  closeCreate(): void {
    this.createOpen.set(false);
    this.actionError.set(null);
  }

  onCreate(): void {
    const patientId = this.patientId();
    if (!patientId || this.creating()) return;
    const previous = this.odontogram();
    const dentition = this.newDentition();
    const encounterId = this.encounterId();
    let resolvingRecord = true;

    this.creating.set(true);
    this.actionError.set(null);
    this.notice.set(null);
    this.repo.resolveClinicalRecordId(patientId).pipe(
      switchMap(clinicalRecordId => {
        resolvingRecord = false;
        return this.repo.create(patientId, {
          clinical_record_id: clinicalRecordId, dentition, ...(encounterId ? { encounter_id: encounterId } : {}),
        });
      }),
      catchError((err: unknown) => throwError(() => ({ err, resolvingRecord }))),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.creating.set(false);
        this.closeCreate();
        this.clearSelection();
        if (previous?.is_current) {
          this.notice.set(`El odontograma anterior quedó como histórico del ${this.formatDate(previous.snapshot_date)}.`);
        }
        this.load();
      },
      error: ({ err, resolvingRecord: fromRecord }: { err: unknown; resolvingRecord: boolean }) => {
        this.creating.set(false);
        const { kind, message } = this.classify(err, 'No se pudo crear el odontograma.', 'write');
        if (kind === 'feature_disabled') {
          this.closeCreate();
          this.odontogram.set(null);
          this.moduleDisabled.set(true);
          this.loadError.set(message);
          return;
        }
        if (fromRecord) {
          this.actionError.set(NO_CLINICAL_RECORD_MESSAGE);
          return;
        }
        // Otro request dejó un current nuevo: el que se muestra quedó viejo → cerrar, avisar y recargar.
        if (kind === 'conflict') {
          this.closeCreate();
          this.notice.set(message);
          this.load();
          return;
        }
        this.actionError.set(message);
      },
    });
  }

  dismissNotice(): void {
    this.notice.set(null);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  protected classify(err: unknown, fallback: string, operation: 'read' | 'write'): OdontogramError {
    return odontogramError(err, fallback, { operation, odontogramEnabled: this.repo.odontogramEnabled() });
  }
}
