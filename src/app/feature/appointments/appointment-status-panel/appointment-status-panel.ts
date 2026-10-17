import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { AppointmentStatusForm, AppointmentStatusChange } from '../appointment-status-form/appointment-status-form';
import { AppointmentStatusHistory } from '../appointment-status-history/appointment-status-history';
import { AppointmentStatusService } from '../../../core/services/appointment-status.service';
import { Appointment } from '../../../core/models/appointment.model';
import { APPOINTMENT_STATUS_LABELS } from '../../../core/constants/appointment-status.const';
import { appointmentStatusChangeErrorMessage } from '../../../shared/utils/appointment-status-error.util';

@Component({
  selector: 'app-appointment-status-panel',
  imports: [AppointmentStatusForm, AppointmentStatusHistory],
  templateUrl: './appointment-status-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppointmentStatusPanel {
  private statusSvc = inject(AppointmentStatusService);
  private statusForm = viewChild(AppointmentStatusForm);

  // Solo se usa para saber QUÉ cita mostrar (su id) — los datos que se
  // renderizan salen de detail(), que trae el estado + historial
  // autoritativos desde GET /tenants/appointments/:id.
  appointment = input.required<Appointment>();

  readonly statusLabels = APPOINTMENT_STATUS_LABELS;
  readonly detail = this.statusSvc.detail;
  readonly detailLoading = this.statusSvc.loading;
  readonly detailError = this.statusSvc.error;

  readonly currentStatus = computed(() => this.detail()?.status ?? 'scheduled');
  readonly historyEntries = computed(() => this.detail()?.status_history ?? []);

  saving = signal(false);
  saveError = signal<string | null>(null);

  constructor() {
    // GET /tenants/appointments/:id — se pide cada vez que se abre el
    // panel para una cita distinta.
    effect(() => {
      this.statusSvc.loadDetail(this.appointment().id);
    });
  }

  onStatusChanged(change: AppointmentStatusChange): void {
    this.saving.set(true);
    this.saveError.set(null);
    // changeStatus ya vuelve a pedir el detalle tras el POST — confirmed_at
    // y el historial quedan como los setea el backend, no se calculan acá.
    this.statusSvc.changeStatus(this.appointment().id, change).subscribe({
      next: () => {
        this.saving.set(false);
        this.statusForm()?.resetAfterSuccess();
      },
      error: err => {
        this.saving.set(false);
        this.saveError.set(appointmentStatusChangeErrorMessage(err));
      },
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
}
