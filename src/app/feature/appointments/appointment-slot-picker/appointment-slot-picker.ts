import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { SchedulesApi } from '../../../core/services/schedules-api';
import { AppointmentsApi } from '../../../core/services/appointments-api';
import { computeFreeSlots } from '../../../shared/utils/free-slots.util';

// Botones de horario libre (Calendly-style): cruza horario laboral + excepciones +
// citas ya agendadas del profesional ese día. No usa ningún estado compartido
// (AppointmentsService/SchedulesService) para no pisar el calendario de fondo.
@Component({
  selector: 'app-appointment-slot-picker',
  imports: [DatePipe],
  templateUrl: './appointment-slot-picker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppointmentSlotPicker {
  private schedulesApi = inject(SchedulesApi);
  private appointmentsApi = inject(AppointmentsApi);

  professionalId = input('');
  branchId = input('');
  date = input('');
  durationMinutes = input(30);
  excludeAppointmentId = input<string | null>(null);
  selectedStartsAt = input<string | null>(null);

  selected = output<string>();
  // Se emite cada vez que termina de calcular los libres — el padre decide si
  // autoseleccionar alguno (ej. la hora candidata de un click en el calendario).
  slotsReady = output<Date[]>();

  slots = signal<Date[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  // true = el profesional no tiene NINGÚN bloque laboral para ese día en esa sucursal
  // (hay que cargarlo en Horarios) — distinto de "tiene horario pero está completo".
  noScheduleForDay = signal(false);

  constructor() {
    effect(() => {
      const professionalId = this.professionalId();
      const branchId = this.branchId();
      const date = this.date();
      const duration = this.durationMinutes();
      if (!professionalId || !branchId || !date || !duration) {
        this.slots.set([]);
        return;
      }
      this.fetchSlots(professionalId, branchId, date, duration);
    });
  }

  private fetchSlots(professionalId: string, branchId: string, date: string, duration: number): void {
    this.loading.set(true);
    this.error.set(null);
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    forkJoin({
      blocks: this.schedulesApi.getScheduleFor(professionalId),
      exceptions: this.schedulesApi.listExceptions(),
      appointments: this.appointmentsApi.getAll({
        from: dayStart.toISOString(),
        to: dayEnd.toISOString(),
        professional_id: professionalId,
      }),
    }).subscribe({
      next: ({ blocks, exceptions, appointments }) => {
        const excludeId = this.excludeAppointmentId();
        const busy = appointments
          .filter(a => a.id !== excludeId && a.status !== 'cancelled')
          .map(a => ({ start: new Date(a.starts_at), end: new Date(a.ends_at) }));
        // professional_id/branch_id null = excepción global: se filtra acá porque listExceptions
        // ANDea sus parámetros y excluiría las globales si se las pasáramos directo.
        const relevant = exceptions.filter(e =>
          (e.professional_id === null || e.professional_id === professionalId) &&
          (e.branch_id === null || e.branch_id === branchId));

        const dayBlocks = blocks.filter(b => b.branch_id === branchId && b.weekday === dayStart.getDay());
        this.noScheduleForDay.set(dayBlocks.length === 0);
        const computed = computeFreeSlots({
          date: dayStart,
          durationMinutes: duration,
          blocks: dayBlocks,
          exceptions: relevant,
          busy,
        });
        this.slots.set(computed);
        this.loading.set(false);
        this.slotsReady.emit(computed);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar los horarios disponibles.');
      },
    });
  }

  pick(slot: Date): void {
    this.selected.emit(slot.toISOString());
  }

  isSelected(slot: Date): boolean {
    const sel = this.selectedStartsAt();
    return !!sel && new Date(sel).getTime() === slot.getTime();
  }
}
