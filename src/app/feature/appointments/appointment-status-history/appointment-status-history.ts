import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AppointmentStatusHistoryEntry } from '../../../core/models/appointment-status-history.model';
import { APPOINTMENT_STATUS_LABELS } from '../../../core/constants/appointment-status.const';

@Component({
  selector: 'app-appointment-status-history',
  imports: [],
  templateUrl: './appointment-status-history.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppointmentStatusHistory {
  // Desacoplado de la fuente de datos: solo recibe las entradas ya
  // resueltas, sin saber si vienen de un mock o de HTTP.
  entries = input.required<AppointmentStatusHistoryEntry[]>();

  readonly statusLabels = APPOINTMENT_STATUS_LABELS;

  // Criterio de aceptación: el historial se muestra en orden cronológico.
  readonly sortedEntries = computed(() =>
    [...this.entries()].sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()),
  );

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
}
