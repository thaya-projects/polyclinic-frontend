import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { StatCard } from '../stat-card/stat-card';
import { EncountersReportService } from '../../../core/services/encounters-report.service';
import { ProfessionalsService } from '../../../core/services/professionals.service';

// Corresponde a GET /tenants/reports/encounters?from=&to=&professional_id=.
@Component({
  selector: 'app-encounters-report-card',
  imports: [StatCard],
  templateUrl: './encounters-report-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EncountersReportCard {
  private reportSvc = inject(EncountersReportService);
  private professionalsSvc = inject(ProfessionalsService);

  from = input.required<string>();
  to = input.required<string>();

  // Real (ya conectado, Fase 2) — mismo criterio que AppointmentsByStatusCard.
  readonly professionals = this.professionalsSvc.getAll();
  professionalId = signal('');

  readonly count = this.reportSvc.summary;
  readonly loading = this.reportSvc.loading;
  readonly error = this.reportSvc.error;

  constructor() {
    effect(() => {
      this.reportSvc.load({ from: this.from(), to: this.to(), professional_id: this.professionalId() || undefined });
    });
  }

  onProfessionalChange(value: string): void {
    this.professionalId.set(value);
  }
}
