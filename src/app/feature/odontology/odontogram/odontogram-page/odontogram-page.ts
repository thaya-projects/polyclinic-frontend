import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, catchError, of, switchMap } from 'rxjs';
import { OdontogramChart } from '../odontogram-chart/odontogram-chart';
import { SelectedToothPanel } from '../selected-tooth-panel/selected-tooth-panel';
import { PatientPicker } from '../patient-picker/patient-picker';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { PageTitleService } from '../../../../core/services/page-title.service';
import { ODONTOGRAM_REPOSITORY } from '../../../../core/services/odontogram-repository';
import {
  Odontogram, OdontogramPatientOption, dentitionLabel,
} from '../../../../core/models/odontogram.model';
import {
  ODONTOGRAM_LOAD_ERROR_MESSAGE, OdontogramError, odontogramError,
} from '../../../../shared/utils/odontogram-error.util';

// Fase 6 T5: Odontología > Odontograma. Solo conoce ODONTOGRAM_REPOSITORY (mock o HTTP).
//   /patients/:patientId/odontogram[?encounter_id=] → odontograma current del paciente.
//   /odontology/odontogram (entrada del menú, sin paciente) → selector de paciente que navega a la
//   ruta de arriba.
// La grilla y el panel de pieza son presentacionales: la página solo guarda la pieza seleccionada.
@Component({
  selector: 'app-odontogram-page',
  imports: [OdontogramChart, SelectedToothPanel, PatientPicker, StatusChip, RouterLink],
  templateUrl: './odontogram-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OdontogramPage {
  private repo = inject(ODONTOGRAM_REPOSITORY);
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
      this.selectedTooth.set(null);
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
      },
      error: (err: unknown) => {
        if (this.patientId() !== patientId) return;
        this.odontogram.set(null);
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
  }

  clearSelection(): void {
    this.selectedTooth.set(null);
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
