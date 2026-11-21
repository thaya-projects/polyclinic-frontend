import { ChangeDetectionStrategy, Component, Injector, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
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
import { SchedulesApi } from '../../../core/services/schedules-api';
import { AuthStore } from '../../../core/services/auth-store.service';
import { CurrentUserService } from '../../../core/services/current-user.service';
import { Appointment, AppointmentDto } from '../../../core/models/appointment.model';
import { ScheduleBlock } from '../../../core/models/schedule.model';
import { PageTitleService } from '../../../core/services/page-title.service';
import { appointmentSaveErrorMessage } from '../../../shared/utils/appointments-error.util';
import { AppointmentPrefill, toDateOnly } from '../appointment-form/appointment-form.util';

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
  private schedulesApi = inject(SchedulesApi);
  private authStore = inject(AuthStore);
  private currentUser = inject(CurrentUserService);
  private injector = inject(Injector);
  private readonly apptForm = viewChild<AppointmentForm>('apptForm');

  readonly branches = this.branchesSvc.getAll();
  readonly professionals = this.professionalsSvc.getAll();
  // Un profesional ve directo su propia agenda, sin selector; si no
  // encontramos su registro, se deja el select como red de seguridad.
  readonly isProfessional = this.currentUser.hasRole('professional');
  readonly ownProfessional = computed(() =>
    this.isProfessional ? this.professionals().find(p => p.user_id === this.authStore.user()?.id) ?? null : null);
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
  scheduleBlocks = signal<ScheduleBlock[]>([]);
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

    // Fuerza el filtro al propio profesional en cuanto se resuelve su
    // registro (el select ya está oculto para este rol en el toolbar).
    effect(() => {
      const own = this.ownProfessional();
      if (own) this.selectedProfessionalId.set(own.id);
    });

    // Horario real del profesional filtrado, para bloquear en la grilla las horas
    // fuera de su jornada — pedido directo a la API (sin estado compartido).
    effect(() => {
      const professionalId = this.selectedProfessionalId();
      if (!professionalId) {
        this.scheduleBlocks.set([]);
        return;
      }
      const branchId = this.selectedBranchId();
      this.schedulesApi.getScheduleFor(professionalId).subscribe({
        next: blocks => this.scheduleBlocks.set(branchId ? blocks.filter(b => b.branch_id === branchId) : blocks),
        error: () => this.scheduleBlocks.set([]),
      });
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

  // Click en una celda libre del calendario: precarga fecha + hora candidata + los
  // filtros activos. Se aplica a mano (afterNextRender) una vez que
  // <app-appointment-form> ya existe en el DOM, en vez de un @Input reactivo — evita
  // cualquier duda de orden de efectos.
  openCreateModalAt(at: Date): void {
    this.selectedAppointment.set(null);
    this.actionError.set(null);
    this.modalMode.set('create');

    const prefill: AppointmentPrefill = {
      date: toDateOnly(at.toISOString()),
      starts_at: at.toISOString(),
      professional_id: this.selectedProfessionalId() || undefined,
      branch_id: this.selectedBranchId() || undefined,
    };
    afterNextRender(() => this.apptForm()?.applyPrefill(prefill), { injector: this.injector });
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

  submitAppointment(): void {
    this.apptForm()?.submit();
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
