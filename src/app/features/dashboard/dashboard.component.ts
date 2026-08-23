import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ScheduleService } from '../../core/services/schedule.service';
import { ThemeService } from '../../core/services/theme.service';
import { SidebarComponent } from '../../core/layout/sidebar/sidebar.component';
import { TopbarComponent } from '../../core/layout/topbar/topbar.component';
import { DateChipComponent } from '../../shared/components/date-chip.component';
import { BadgeComponent } from '../../shared/components/badge.component';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { AppointmentStatus } from '../../core/models/appointment.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SidebarComponent, TopbarComponent, DateChipComponent, BadgeComponent, StatCardComponent, AvatarComponent],
  template: `
    <div class="app-layout">
      <app-sidebar role="doctor" />
      <div class="main-content">
        <app-topbar title="Dashboard" subtitle="Semana del 19 – 24 may 2025">
          <button class="btn-secondary" style="font-size:.8rem;padding:.4rem .9rem;">
            <i class="ti ti-bell"></i> Alertas
          </button>
        </app-topbar>

        <div class="page-content">
          <!-- Stats -->
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem;">
            <app-stat-card label="Consultas hoy" [value]="stats().today" [accent]="true" />
            <app-stat-card label="Videoconsultas" [value]="stats().video" />
            <app-stat-card label="Próxima en" [value]="stats().next" />
            <app-stat-card label="Recetas pend." [value]="stats().prescriptions" />
          </div>

          <!-- Weekly calendar -->
          <div class="card" style="margin-bottom:1.5rem;">
            <p class="section-heading">Agenda semanal</p>
            <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:.75rem;">
              @for (day of weekDays(); track day.date) {
                <div>
                  <div style="font-size:.75rem;font-weight:700;color:var(--mil);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem;padding:.25rem 0;border-bottom:2px solid var(--mil);text-align:center;">
                    {{ day.label }}
                  </div>
                  <div style="display:flex;flex-direction:column;gap:.35rem;">
                    @for (appt of day.appointments; track appt.id) {
                      <div [style]="appt.type === 'video' ? 'background:var(--purple-pale);border-radius:7px;padding:.4rem .5rem;cursor:pointer;' : 'background:var(--card-accent);border-radius:7px;padding:.4rem .5rem;cursor:pointer;'"
                           (click)="appt.type === 'video' && router.navigate(['/video-consultation', appt.id])">
                        <div style="font-size:.7rem;font-weight:700;" [style.color]="appt.type === 'video' ? 'var(--purple)' : 'var(--mil)'">
                          {{ appt.time }}
                        </div>
                        <div style="font-size:.7rem;color:var(--tx2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                          {{ appt.patientName }}
                        </div>
                        <div style="font-size:.65rem;margin-top:.15rem;" [style.color]="appt.type === 'video' ? 'var(--purple)' : 'var(--tx3)'">
                          <i [class]="'ti ti-' + (appt.type === 'video' ? 'video' : 'building-hospital')" style="font-size:.7rem;"></i>
                          {{ appt.type === 'video' ? 'Video' : 'Presencial' }}
                        </div>
                      </div>
                    }
                    @if (day.appointments.length === 0) {
                      <div style="font-size:.72rem;color:var(--tx3);text-align:center;padding:.5rem 0;">Sin citas</div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Video consultations table -->
          <div class="card">
            <p class="section-heading">Videoconsultas de la semana</p>
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;">
                <thead>
                  <tr style="border-bottom:1px solid var(--border);">
                    <th style="text-align:left;padding:.6rem .75rem;font-size:.72rem;color:var(--tx3);font-weight:600;text-transform:uppercase;letter-spacing:.04em;">Paciente</th>
                    <th style="text-align:left;padding:.6rem .75rem;font-size:.72rem;color:var(--tx3);font-weight:600;text-transform:uppercase;letter-spacing:.04em;">Fecha / Hora</th>
                    <th style="text-align:left;padding:.6rem .75rem;font-size:.72rem;color:var(--tx3);font-weight:600;text-transform:uppercase;letter-spacing:.04em;">Motivo</th>
                    <th style="text-align:left;padding:.6rem .75rem;font-size:.72rem;color:var(--tx3);font-weight:600;text-transform:uppercase;letter-spacing:.04em;">Estado</th>
                    <th style="padding:.6rem .75rem;"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (appt of videoAppointments(); track appt.id) {
                    <tr style="border-bottom:1px solid var(--border);transition:background 0.1s;" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
                      <td style="padding:.75rem;display:flex;align-items:center;gap:.6rem;">
                        <app-avatar [initials]="appt.patientInitials" />
                        <span style="font-size:.875rem;font-weight:600;color:var(--tx);">{{ appt.patientName }}</span>
                      </td>
                      <td style="padding:.75rem;">
                        <app-date-chip [date]="formatDate(appt.date) + ' · ' + appt.time" icon="clock" />
                      </td>
                      <td style="padding:.75rem;font-size:.85rem;color:var(--tx2);">{{ appt.reason }}</td>
                      <td style="padding:.75rem;">
                        <app-badge [label]="statusLabel(appt.status)" [variant]="statusVariant(appt.status)" />
                      </td>
                      <td style="padding:.75rem;text-align:right;">
                        <button class="btn-primary" style="font-size:.78rem;padding:.35rem .85rem;" (click)="router.navigate(['/video-consultation', appt.id])">
                          <i class="ti ti-video"></i> Entrar
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent {
  private scheduleService = inject(ScheduleService);
  router = inject(Router);

  private doctorId = 'd1';

  private allAppointments = this.scheduleService.weeklyAppointments(this.doctorId);
  videoAppointments = this.scheduleService.videoAppointments(this.doctorId);

  stats = computed(() => {
    const today = new Date('2025-05-20');
    const todayAppts = this.allAppointments().filter(a => a.date.toDateString() === today.toDateString());
    const videoToday = todayAppts.filter(a => a.type === 'video');
    return {
      today: todayAppts.length,
      video: videoToday.length,
      next: '11:00',
      prescriptions: 2,
    };
  });

  weekDays = computed(() => {
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dates = [
      new Date('2025-05-19'),
      new Date('2025-05-20'),
      new Date('2025-05-21'),
      new Date('2025-05-22'),
      new Date('2025-05-23'),
      new Date('2025-05-24'),
    ];
    return dates.map((date, i) => ({
      label: dayNames[i] + ' ' + date.getDate(),
      date: date.toISOString(),
      appointments: this.allAppointments()
        .filter(a => a.date.toDateString() === date.toDateString())
        .sort((a, b) => a.time.localeCompare(b.time)),
    }));
  });

  formatDate(date: Date): string {
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  }

  statusLabel(status: AppointmentStatus): string {
    const map: Record<AppointmentStatus, string> = {
      confirmed: 'Confirmada',
      'in-progress': 'En curso',
      pending: 'Pendiente',
      completed: 'Completada',
    };
    return map[status];
  }

  statusVariant(status: AppointmentStatus): 'green' | 'amber' | 'purple' | 'red' | 'muted' {
    const map: Record<AppointmentStatus, 'green' | 'amber' | 'purple' | 'red' | 'muted'> = {
      confirmed: 'green',
      'in-progress': 'red',
      pending: 'amber',
      completed: 'muted',
    };
    return map[status];
  }
}
