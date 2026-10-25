import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Appointment, AppointmentStatus, AppointmentType } from '../../../core/models/appointment.model';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_TONES } from '../../../core/constants/appointment-status.const';
import { StatusChip } from '../../../shared/components/status-chip/status-chip';

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function timeOf(iso: string): number {
  return new Date(iso).getTime();
}

const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  in_person: 'Presencial',
  online: 'Online',
  hybrid: 'Híbrida',
};

// Color del borde izquierdo de cada tarjeta según el estado — permite leer
// la agenda de un vistazo sin abrir cada cita.
const STATUS_ACCENT: Record<AppointmentStatus, string> = {
  scheduled: 'border-l-brand',
  confirmed: 'border-l-positive',
  checked_in: 'border-l-chip-wait-fg',
  in_progress: 'border-l-chip-wait-fg',
  completed: 'border-l-fg-subtle',
  cancelled: 'border-l-chip-danger-fg',
  no_show: 'border-l-chip-danger-fg',
};

// Popover flotante (hover): position fixed calculada desde el rect del
// elemento — el contenedor del calendario tiene overflow-x-auto y recortaría
// cualquier popover absoluto.
type HoverCard =
  | { kind: 'appointment'; appt: Appointment; top: number; left: number }
  | { kind: 'day'; day: Date; top: number; left: number };

const POPOVER_WIDTH = 288;
const POPOVER_GAP = 8;
const VIEWPORT_MARGIN = 12;
const POPOVER_MIN_HEIGHT = 240;

@Component({
  selector: 'app-calendar-view',
  imports: [StatusChip],
  templateUrl: './calendar-view.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Con position fixed el popover quedaría desfasado al scrollear.
  host: { '(window:scroll)': 'hideHover()', '(window:resize)': 'hideHover()' },
})
export class CalendarView {
  // Desacoplado de la fuente de datos (criterio de aceptación T5): recibe
  // las citas ya filtradas, sin saber si vienen de un mock o de HTTP.
  appointments = input.required<Appointment[]>();
  viewMode = input.required<'day' | 'week'>();
  referenceDate = input.required<Date>();

  select = output<Appointment>();

  readonly startHour = 7;
  readonly endHour = 20;
  readonly hours = Array.from({ length: this.endHour - this.startHour }, (_, i) => this.startHour + i);
  readonly popoverWidth = POPOVER_WIDTH;

  readonly hoverCard = signal<HoverCard | null>(null);

  readonly days = computed(() => {
    const ref = this.referenceDate();
    if (this.viewMode() === 'day') return [ref];

    const start = new Date(ref);
    start.setDate(ref.getDate() - ref.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  });

  // Filas por hora de alto variable: cada celda (día × hora) lista, una
  // debajo de otra, las citas que EMPIEZAN en esa hora, y la fila crece con
  // la celda más cargada. Así las citas simultáneas nunca se enciman ni se
  // achican; la duración se lee en la propia tarjeta. Las citas fuera del
  // rango visible se agrupan en la primera/última fila.
  readonly grid = computed(() => {
    const byDay = this.days().map(day => this.appointmentsFor(day));
    return this.hours.map(hour => ({
      hour,
      cells: byDay.map(appts => appts.filter(a => this.rowHourFor(a) === hour)),
    }));
  });

  readonly gridTemplate = computed(() => `4rem repeat(${this.days().length}, minmax(0, 1fr))`);

  appointmentsFor(day: Date): Appointment[] {
    return this.appointments()
      .filter(a => isSameDay(new Date(a.starts_at), day))
      .sort((a, b) => timeOf(a.starts_at) - timeOf(b.starts_at) || timeOf(b.ends_at) - timeOf(a.ends_at));
  }

  private rowHourFor(appt: Appointment): number {
    const hour = new Date(appt.starts_at).getHours();
    return Math.min(Math.max(hour, this.startHour), this.endHour - 1);
  }

  isToday(day: Date): boolean {
    return isSameDay(day, new Date());
  }

  durationMinutes(appt: Appointment): number {
    return Math.round((timeOf(appt.ends_at) - timeOf(appt.starts_at)) / 60000);
  }

  timeLabel(hour: number): string {
    return `${hour.toString().padStart(2, '0')}:00`;
  }

  dayLabel(day: Date): string {
    return day.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });
  }

  longDayLabel(day: Date): string {
    return day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  apptTimeRange(appt: Appointment): string {
    const fmt = (iso: string) => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `${fmt(appt.starts_at)}–${fmt(appt.ends_at)}`;
  }

  // Lo más útil para identificar la cita de un vistazo: el paciente; si el
  // backend no lo resolvió, cae al motivo.
  apptTitle(appt: Appointment): string {
    return appt.patient_name || appt.reason || 'Cita';
  }

  accentClass(appt: Appointment): string {
    return STATUS_ACCENT[appt.status ?? 'scheduled'];
  }

  statusLabel(appt: Appointment): string | null {
    return appt.status ? APPOINTMENT_STATUS_LABELS[appt.status] : null;
  }

  statusTone(appt: Appointment) {
    return appt.status ? APPOINTMENT_STATUS_TONES[appt.status] : 'neutral';
  }

  typeLabel(appt: Appointment): string | null {
    return appt.type ? APPOINTMENT_TYPE_LABELS[appt.type] : null;
  }

  isInactive(appt: Appointment): boolean {
    return appt.status === 'cancelled' || appt.status === 'no_show';
  }

  showAppointment(event: Event, appt: Appointment): void {
    const pos = this.positionFor(event.currentTarget as HTMLElement);
    this.hoverCard.set({ kind: 'appointment', appt, ...pos });
  }

  showDay(event: Event, day: Date): void {
    if (this.appointmentsFor(day).length === 0) return;
    const pos = this.positionFor(event.currentTarget as HTMLElement);
    this.hoverCard.set({ kind: 'day', day, ...pos });
  }

  hideHover(): void {
    this.hoverCard.set(null);
  }

  onSelect(appt: Appointment): void {
    this.hideHover();
    this.select.emit(appt);
  }

  // A la derecha del elemento; si no entra, a la izquierda. Verticalmente
  // alineado al elemento y acotado al viewport.
  private positionFor(el: HTMLElement): { top: number; left: number } {
    const rect = el.getBoundingClientRect();
    const fitsRight = rect.right + POPOVER_GAP + POPOVER_WIDTH <= window.innerWidth - VIEWPORT_MARGIN;
    const left = fitsRight
      ? rect.right + POPOVER_GAP
      : Math.max(VIEWPORT_MARGIN, rect.left - POPOVER_GAP - POPOVER_WIDTH);
    const top = Math.max(VIEWPORT_MARGIN, Math.min(rect.top, window.innerHeight - VIEWPORT_MARGIN - POPOVER_MIN_HEIGHT));
    return { top, left };
  }
}
