import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Appointment } from '../../../core/models/appointment.model';

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

@Component({
  selector: 'app-calendar-view',
  imports: [],
  templateUrl: './calendar-view.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  readonly rowHeightPx = 56;
  readonly hours = Array.from({ length: 13 }, (_, i) => 7 + i);

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

  appointmentsFor(day: Date): Appointment[] {
    return this.appointments().filter(a => isSameDay(new Date(a.starts_at), day));
  }

  topFor(appt: Appointment): number {
    const start = new Date(appt.starts_at);
    const minutesFromStart = (start.getHours() - this.startHour) * 60 + start.getMinutes();
    return (minutesFromStart / 60) * this.rowHeightPx;
  }

  heightFor(appt: Appointment): number {
    const start = new Date(appt.starts_at);
    const end = new Date(appt.ends_at);
    const minutes = (end.getTime() - start.getTime()) / 60000;
    return Math.max((minutes / 60) * this.rowHeightPx, 24);
  }

  timeLabel(hour: number): string {
    return `${hour.toString().padStart(2, '0')}:00`;
  }

  dayLabel(day: Date): string {
    return day.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });
  }

  apptTimeRange(appt: Appointment): string {
    const fmt = (iso: string) => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `${fmt(appt.starts_at)}–${fmt(appt.ends_at)}`;
  }
}
