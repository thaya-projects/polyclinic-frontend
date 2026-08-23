import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PatientService } from '../../core/services/patient.service';
import { ScheduleService } from '../../core/services/schedule.service';
import { PrescriptionService } from '../../core/services/prescription.service';
import { SidebarComponent } from '../../core/layout/sidebar/sidebar.component';
import { TopbarComponent } from '../../core/layout/topbar/topbar.component';
import { DateChipComponent } from '../../shared/components/date-chip.component';
import { BadgeComponent } from '../../shared/components/badge.component';

@Component({
  selector: 'app-patient',
  standalone: true,
  imports: [SidebarComponent, TopbarComponent, DateChipComponent, BadgeComponent, FormsModule],
  template: `
    <div class="app-layout">
      <app-sidebar role="patient" />
      <div class="main-content">
        <app-topbar
          [title]="'Hola, ' + (patient()?.name ?? 'Paciente')"
          subtitle="Portal del paciente" />
        <div class="page-content">
          <div style="display:grid;grid-template-columns:1fr 340px;gap:1.5rem;align-items:start;">

            <!-- Main card: next video consultation -->
            <div class="card" style="border:1px solid var(--mil);">
              @if (nextVideoAppointment(); as appt) {
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
                  <app-badge label="Videoconsulta" variant="purple" />
                  <span style="font-size:.78rem;color:var(--tx3);">{{ appt.doctorName }}</span>
                </div>

                <div style="margin-bottom:1rem;">
                  <app-date-chip [date]="formatDate(appt.date)" />
                  <span style="margin-left:.5rem;">
                    <app-date-chip [date]="appt.time" icon="clock" />
                  </span>
                </div>

                <div style="margin-bottom:.5rem;">
                  <span style="font-size:1rem;font-weight:700;color:var(--mil);">{{ appt.doctorName }}</span>
                </div>
                <div style="font-size:.82rem;color:var(--tx3);margin-bottom:1rem;">{{ appt.reason }}</div>

                <!-- Patient attachments -->
                <div style="border-top:1px solid var(--border);padding-top:1rem;margin-bottom:1rem;">
                  <p class="section-heading">Adjuntar documentos</p>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:.75rem;">
                    <div class="att-box">
                      <i class="ti ti-photo" style="font-size:1.5rem;color:var(--mil);"></i>
                      <span style="font-size:.72rem;color:var(--tx3);">Radiografía</span>
                    </div>
                    <div class="att-box">
                      <i class="ti ti-file-text" style="font-size:1.5rem;color:var(--mil);"></i>
                      <span style="font-size:.72rem;color:var(--tx3);">Análisis</span>
                    </div>
                  </div>
                  <textarea [(ngModel)]="patientNote" rows="3"
                    placeholder="Describa sus síntomas o deje una nota para el médico..."
                    style="resize:vertical;"></textarea>
                </div>

                <button class="btn-primary" style="width:100%;justify-content:center;font-size:.95rem;padding:.75rem;"
                  (click)="router.navigate(['/video-consultation', appt.id])">
                  <i class="ti ti-video"></i> Unirme a la consulta
                </button>
              }
            </div>

            <!-- Right column: 3 cards -->
            <div style="display:flex;flex-direction:column;gap:1rem;">

              <!-- Latest prescription -->
              <div class="card">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;">
                  <p class="section-heading" style="margin:0;">Última receta</p>
                  <app-badge label="Vigente" variant="green" />
                </div>
                @if (latestPrescription()) {
                  <app-date-chip [date]="latestPrescription()!.displayDate" />
                  <div style="margin-top:.75rem;display:flex;flex-direction:column;gap:.4rem;">
                    @for (med of latestPrescription()!.medications; track med.name) {
                      <div style="display:flex;align-items:flex-start;gap:.5rem;padding:.4rem 0;border-bottom:1px solid var(--border);">
                        <i class="ti ti-pill" style="color:var(--mil);font-size:.9rem;margin-top:.1rem;"></i>
                        <div>
                          <div style="font-size:.82rem;font-weight:600;color:var(--tx);">{{ med.name }}</div>
                          <div style="font-size:.73rem;color:var(--tx3);">{{ med.frequency }} · {{ med.duration }}</div>
                        </div>
                      </div>
                    }
                  </div>
                } @else {
                  <div style="color:var(--tx3);font-size:.82rem;">Sin recetas registradas</div>
                }
              </div>

              <!-- Validity card -->
              <div class="card-accent">
                <p class="section-heading">Vigencia de reconsulta</p>
                @if (latestPrescription()) {
                  <div style="font-size:2rem;font-weight:700;color:var(--tx);margin-bottom:.3rem;">
                    {{ latestPrescription()!.daysRemaining }} <span style="font-size:.95rem;font-weight:500;color:var(--tx3);">días restantes</span>
                  </div>
                  <div class="progress-bar" style="margin-bottom:.5rem;">
                    <div class="progress-fill" [style.width]="(latestPrescription()!.daysRemaining / 30 * 100) + '%'"></div>
                  </div>
                  <app-badge label="Reconsulta recomendada en 30 días" variant="amber" />
                }
              </div>

              <!-- Next in-person appointment -->
              <div class="card">
                <p class="section-heading">Próxima cita presencial</p>
                @if (nextInPersonAppointment(); as appt) {
                  <div style="display:flex;flex-direction:column;gap:.4rem;">
                    <app-date-chip [date]="formatDate(appt.date)" />
                    <app-date-chip [date]="appt.time" icon="clock" />
                    <div style="font-size:.85rem;font-weight:600;color:var(--mil);margin-top:.25rem;">{{ appt.doctorName }}</div>
                    <div style="font-size:.78rem;color:var(--tx3);">{{ appt.reason }}</div>
                    <app-badge label="Confirmada" variant="green" />
                  </div>
                } @else {
                  <div style="color:var(--tx3);font-size:.82rem;">Sin citas presenciales próximas</div>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class PatientComponent {
  private patientService = inject(PatientService);
  private scheduleService = inject(ScheduleService);
  private prescriptionService = inject(PrescriptionService);
  router = inject(Router);

  private patientId = 'p1';
  patientNote = '';

  patient = computed(() => this.patientService.byId(this.patientId)());
  latestPrescription = computed(() => this.prescriptionService.latestByPatient(this.patientId)());

  private allAppointments = this.scheduleService.weeklyAppointments('d1');

  nextVideoAppointment = computed(() => {
    const today = new Date();
    return this.allAppointments()
      .filter(a => a.patientId === this.patientId && a.type === 'video' && a.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0]
      ?? this.allAppointments().find(a => a.patientId === this.patientId && a.type === 'video');
  });

  nextInPersonAppointment = computed(() => {
    const today = new Date();
    return this.allAppointments()
      .filter(a => a.patientId === this.patientId && a.type === 'in-person' && a.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  });

  formatDate(date?: Date): string {
    if (!date) return '';
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
