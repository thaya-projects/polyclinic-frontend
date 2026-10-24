import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { AppointmentsReportService } from '../../../core/services/appointments-report.service';
import { ProfessionalsService } from '../../../core/services/professionals.service';
import { AppointmentStatus } from '../../../core/models/appointment.model';
import { APPOINTMENT_STATUSES, APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_TONES } from '../../../core/constants/appointment-status.const';
import { StatusChipTone } from '../../../shared/components/status-chip/status-chip';

const TONE_BORDER_CLASS: Record<StatusChipTone, string> = {
  ok: 'border-l-chip-ok-fg',
  wait: 'border-l-chip-wait-fg',
  danger: 'border-l-chip-danger-fg',
  neutral: 'border-l-border',
};

// Corresponde a GET /tenants/reports/appointments?from=&to=&
// professional_id=&status= — autocontenida: arma su propio query y
// maneja su propio loading/error/vacío, no depende de ningún estado del
// contenedor más allá del rango de fechas compartido.
@Component({
  selector: 'app-appointments-by-status-card',
  imports: [],
  templateUrl: './appointments-by-status-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppointmentsByStatusCard {
  private reportSvc = inject(AppointmentsReportService);
  private professionalsSvc = inject(ProfessionalsService);

  from = input.required<string>();
  to = input.required<string>();

  // Real (ya conectado, Fase 2) — a propósito ya no es mock: el
  // professional_id elegido se manda tal cual al backend, tiene que ser
  // un id real para que el filtro funcione.
  readonly professionals = this.professionalsSvc.getAll();
  readonly statuses = APPOINTMENT_STATUSES;
  readonly statusLabels = APPOINTMENT_STATUS_LABELS;

  professionalId = signal('');
  status = signal('');

  readonly breakdown = this.reportSvc.summary;
  readonly loading = this.reportSvc.loading;
  readonly error = this.reportSvc.error;

  constructor() {
    effect(() => {
      this.reportSvc.load({
        from: this.from(),
        to: this.to(),
        professional_id: this.professionalId() || undefined,
        status: (this.status() as AppointmentStatus) || undefined,
      });
    });
  }

  onProfessionalChange(value: string): void {
    this.professionalId.set(value);
  }

  onStatusChange(value: string): void {
    this.status.set(value);
  }

  borderClass(status: AppointmentStatus): string {
    return TONE_BORDER_CLASS[APPOINTMENT_STATUS_TONES[status]];
  }
}
