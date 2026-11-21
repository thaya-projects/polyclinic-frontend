import { ChangeDetectionStrategy, Component, effect, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { PatientsTable } from '../patients-table/patients-table';
import { CreatePatientForm } from '../create-patient-form/create-patient-form';
import { ListFilters } from '../../../shared/components/list-filters/list-filters';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { Modal } from '../../../shared/components/modal/modal';
import { PatientsService } from '../../../core/services/patients.service';
import { CreatePatientDto, Patient, PatientsQuery } from '../../../core/models/patient.model';
import { PageTitleService } from '../../../core/services/page-title.service';
import { patientSaveErrorMessage } from '../../../shared/utils/patients-error.util';

const PAGE_SIZE = 8;

type ModalMode = 'none' | 'create';

@Component({
  selector: 'app-patients-page',
  imports: [PatientsTable, CreatePatientForm, ListFilters, Pagination, Modal],
  templateUrl: './patients-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientsPage {
  private patientsSvc = inject(PatientsService);
  private readonly createForm = viewChild<CreatePatientForm>('patientForm');
  private router = inject(Router);

  readonly patients = this.patientsSvc.getAll();
  readonly total = this.patientsSvc.total;
  readonly listLoading = this.patientsSvc.loading;
  readonly listError = this.patientsSvc.error;

  readonly pageSize = PAGE_SIZE;

  search = signal('');
  page = signal(1);

  modalMode = signal<ModalMode>('none');
  saving = signal(false);
  actionError = signal<string | null>(null);

  constructor() {
    inject(PageTitleService).set('Pacientes');

    // Vuelve a la página 1 cada vez que cambia la búsqueda.
    effect(() => {
      this.search();
      this.page.set(1);
    });

    // GET /tenants/patients — se vuelve a pedir cada vez que cambia la
    // búsqueda o la página (server-side, T7).
    effect(() => {
      this.reload();
    });
  }

  // El buscador es uno solo (T6: "por nombre o documento"); se manda el
  // mismo término como `q` y como `document` — cualquiera de los dos que
  // matchee del lado del backend alcanza para encontrar al paciente.
  private currentQuery(): PatientsQuery {
    const term = this.search().trim();
    return {
      q: term || undefined,
      document: term || undefined,
      page: this.page(),
      limit: this.pageSize,
    };
  }

  private reload(): void {
    this.patientsSvc.load(this.currentQuery());
  }

  openCreateModal(): void {
    this.actionError.set(null);
    this.modalMode.set('create');
  }

  // La ficha es una página propia (/patients/:id), no un modal — la vista
  // completa de un paciente ya no vive acá.
  openDetail(patient: Patient): void {
    this.router.navigate(['/patients', patient.id]);
  }

  closeModal(): void {
    this.modalMode.set('none');
    this.actionError.set(null);
  }

  onCreate(dto: CreatePatientDto): void {
    this.saving.set(true);
    this.actionError.set(null);
    this.patientsSvc.create(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.page.set(1);
        this.reload();
      },
      error: err => {
        this.saving.set(false);
        // Error de un campo: se marca en su input; el banner queda para lo que no es de un campo.
        this.actionError.set(this.createForm()?.applyServerError(err) ? null : patientSaveErrorMessage(err));
      },
    });
  }
}
