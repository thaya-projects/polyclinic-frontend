import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { CalendarToolbar } from '../calendar-toolbar/calendar-toolbar';
import { CalendarView } from '../calendar-view/calendar-view';
import { AppointmentForm } from '../appointment-form/appointment-form';
import { AppointmentStatusPanel } from '../appointment-status-panel/appointment-status-panel';
import { Modal } from '../../../shared/components/modal/modal';
import { AppointmentsService } from '../../../core/services/appointments.service';
import { BranchesService } from '../../../core/services/branches.service';
import { ProfessionalsService } from '../../../core/services/professionals.service';
import { RoomsService } from '../../../core/services/rooms.service';
import { ServicesService } from '../../../core/services/services.service';
import { PatientsService } from '../../../core/services/patients.service';
import { Appointment, AppointmentDto } from '../../../core/models/appointment.model';
import { PageTitleService } from '../../../core/services/page-title.service';
import { appointmentSaveErrorMessage } from '../../../shared/utils/appointments-error.util';

type ModalMode = 'none' | 'create' | 'edit';

@Component({
  selector: 'app-appointments-page',
  imports: [CalendarToolbar, CalendarView, AppointmentForm, AppointmentStatusPanel, Modal],
  templateUrl: './appointments-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppointmentsPage {
  private appointmentsSvc = inject(AppointmentsService);
  private branchesSvc = inject(BranchesService);
  private professionalsSvc = inject(ProfessionalsService);
  private roomsSvc = inject(RoomsService);
  private servicesSvc = inject(ServicesService);
  private patientsSvc = inject(PatientsService);
  private readonly apptForm = viewChild<AppointmentForm>('apptForm');

  readonly branches = this.branchesSvc.getAll();
  readonly professionals = this.professionalsSvc.getAll();
  readonly rooms = this.roomsSvc.getAll();
  readonly patients = this.patientsSvc.getAll();
  readonly services = computed(() => this.servicesSvc.getAll()().filter(s => s.is_active));

  // Ya vienen filtradas por el backend (criterio de aceptación de T6) —
  // el calendario solo renderiza lo que devolvió el último GET.
  readonly appointments = this.appointmentsSvc.getAll();
  readonly listLoading = this.appointmentsSvc.loading;
  readonly listError = this.appointmentsSvc.error;

  selectedProfessionalId = signal('');
  selectedBranchId = signal('');
  viewMode = signal<'day' | 'week'>('week');
  referenceDate = signal(new Date());

  modalMode = signal<ModalMode>('none');
  selectedAppointment = signal<Appointment | null>(null);
  saving = signal(false);
  actionError = signal<string | null>(null);

  constructor() {
    inject(PageTitleService).set('Agenda');

    this.patientsSvc.load({ page: 1, limit: 100 });
    this.servicesSvc.load();

    // GET /tenants/appointments — se vuelve a pedir cada vez que cambia el
    // rango visible (día/semana, navegación) o los filtros de
    // profesional/sucursal (criterio de aceptación: "los filtros consultan
    // el backend real").
    effect(() => {
      const { from, to } = this.rangeFor(this.viewMode(), this.referenceDate());
      this.appointmentsSvc.load({
        from,
        to,
        professional_id: this.selectedProfessionalId() || undefined,
        branch_id: this.selectedBranchId() || undefined,
      });
    });

    // RoomsService (ya conectado a backend real) requiere sucursal
    // explícita — sin esto el selector de consultorio queda vacío.
    effect(() => {
      this.roomsSvc.loadFor(this.selectedBranchId() || null);
    });
  }

  private rangeFor(viewMode: 'day' | 'week', referenceDate: Date): { from: string; to: string } {
    const start = new Date(referenceDate);
    if (viewMode === 'week') start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + (viewMode === 'week' ? 7 : 1));

    return { from: start.toISOString(), to: end.toISOString() };
  }

  openCreateModal(): void {
    this.selectedAppointment.set(null);
    this.actionError.set(null);
    this.modalMode.set('create');
  }

  openEditModal(appointment: Appointment): void {
    this.selectedAppointment.set(appointment);
    this.actionError.set(null);
    this.modalMode.set('edit');
  }

  closeModal(): void {
    this.modalMode.set('none');
    this.selectedAppointment.set(null);
    this.actionError.set(null);
  }

  onSave(dto: AppointmentDto): void {
    const appointment = this.selectedAppointment();
    this.saving.set(true);
    this.actionError.set(null);

    const request$ = appointment ? this.appointmentsSvc.update(appointment.id, dto) : this.appointmentsSvc.create(dto);
    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
      },
      // 409: choque de horario (overlap) — se muestra dentro del propio
      // modal en vez de cerrarlo solo (criterio de aceptación de T6). 400/422 de un campo: se
      // marca debajo de ese input y no hace falta el banner.
      error: err => {
        this.saving.set(false);
        this.actionError.set(this.apptForm()?.applyServerError(err) ? null : appointmentSaveErrorMessage(err));
      },
    });
  }
}
