import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ScheduleService } from '../../core/services/schedule.service';
import { SidebarComponent } from '../../core/layout/sidebar/sidebar.component';
import { TopbarComponent } from '../../core/layout/topbar/topbar.component';
import { DateChipComponent } from '../../shared/components/date-chip.component';
import { BadgeComponent } from '../../shared/components/badge.component';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { Patient } from '../../core/models/patient.model';
import { Appointment, AppointmentType } from '../../core/models/appointment.model';
import { PATIENTS, DOCTORS } from '../../core/services/mock-data';

const SPECIALTIES = ['Cardiología', 'Traumatología', 'Neurología', 'Oftalmología'];
const TIME_SLOTS = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','12:00','14:00','15:00','16:00','17:00'];
const OCCUPIED_SLOTS = ['08:00', '09:00'];

@Component({
  selector: 'app-reception',
  standalone: true,
  imports: [SidebarComponent, TopbarComponent, DateChipComponent, BadgeComponent, AvatarComponent, FormsModule],
  template: `
    <div class="app-layout">
      <app-sidebar role="reception" />
      <div class="main-content">
        <app-topbar title="Recepción" subtitle="Agendar nueva consulta" />
        <div class="page-content">
          <div style="display:grid;grid-template-columns:1fr 380px;gap:1.5rem;align-items:start;">

            <!-- Left column: steps -->
            <div style="display:flex;flex-direction:column;gap:1rem;">

              <!-- Step 1: Search patient -->
              <div class="card">
                <div style="display:flex;align-items:center;gap:.65rem;margin-bottom:1rem;">
                  <div style="width:26px;height:26px;border-radius:50%;background:var(--mil);display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;color:white;">1</div>
                  <p class="section-heading" style="margin:0;">Buscar paciente</p>
                </div>
                <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="onSearch($event)" placeholder="Nombre o CI del paciente..." style="margin-bottom:.75rem;">
                @if (searchResults().length > 0) {
                  <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;">
                    @for (p of searchResults(); track p.id) {
                      <div style="display:flex;align-items:center;gap:.7rem;padding:.65rem .85rem;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.1s;"
                        (click)="selectPatient(p)"
                        [style.background]="selectedPatient()?.id === p.id ? 'var(--card-accent)' : 'transparent'">
                        <app-avatar [initials]="p.initials" size="32px" />
                        <div>
                          <div style="font-size:.875rem;font-weight:600;color:var(--tx);">{{ p.name }}</div>
                          <div style="font-size:.75rem;color:var(--tx3);">CI: {{ p.documentId }} · {{ p.age }} años · {{ p.specialty }}</div>
                        </div>
                        @if (selectedPatient()?.id === p.id) {
                          <i class="ti ti-check" style="margin-left:auto;color:var(--mil);font-size:1rem;"></i>
                        }
                      </div>
                    }
                  </div>
                }
                @if (selectedPatient()) {
                  <div class="card-accent" style="margin-top:.75rem;display:flex;align-items:center;gap:.7rem;">
                    <app-avatar [initials]="selectedPatient()!.initials" size="38px" />
                    <div>
                      <div style="font-size:.9rem;font-weight:700;color:var(--mil);">{{ selectedPatient()!.name }}</div>
                      <div style="font-size:.78rem;color:var(--tx3);">CI: {{ selectedPatient()!.documentId }} · {{ selectedPatient()!.age }} años</div>
                    </div>
                    <button (click)="selectedPatient.set(null);searchQuery=''" style="margin-left:auto;background:none;border:none;cursor:pointer;color:var(--tx3);">
                      <i class="ti ti-x"></i>
                    </button>
                  </div>
                }
              </div>

              <!-- Step 2: Specialty and doctor -->
              <div class="card">
                <div style="display:flex;align-items:center;gap:.65rem;margin-bottom:1rem;">
                  <div style="width:26px;height:26px;border-radius:50%;background:var(--mil);display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;color:white;">2</div>
                  <p class="section-heading" style="margin:0;">Especialidad y médico</p>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:.75rem;">
                  @for (sp of specialties; track sp) {
                    <button class="chip-esp" [class.selected]="selectedSpecialty() === sp" (click)="selectedSpecialty.set(sp)">{{ sp }}</button>
                  }
                </div>
                <select [(ngModel)]="selectedDoctorId">
                  <option value="">Seleccionar médico...</option>
                  @for (d of filteredDoctors(); track d.id) {
                    <option [value]="d.id">{{ d.name }} — {{ d.specialty }}</option>
                  }
                </select>
                <div style="margin-top:.75rem;">
                  <label style="font-size:.78rem;color:var(--tx3);font-weight:600;display:block;margin-bottom:.3rem;">TIPO DE CONSULTA</label>
                  <div style="display:flex;gap:.5rem;">
                    <button [class]="appointmentType() === 'in-person' ? 'btn-primary' : 'btn-secondary'" (click)="appointmentType.set('in-person')" style="flex:1;justify-content:center;">
                      <i class="ti ti-building-hospital"></i> Presencial
                    </button>
                    <button [class]="appointmentType() === 'video' ? 'btn-primary' : 'btn-secondary'" (click)="appointmentType.set('video')" style="flex:1;justify-content:center;">
                      <i class="ti ti-video"></i> Videoconsulta
                    </button>
                  </div>
                </div>
              </div>

              <!-- Step 3: Date, time, reason -->
              <div class="card">
                <div style="display:flex;align-items:center;gap:.65rem;margin-bottom:1rem;">
                  <div style="width:26px;height:26px;border-radius:50%;background:var(--mil);display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;color:white;">3</div>
                  <p class="section-heading" style="margin:0;">Fecha, hora y motivo</p>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:.75rem;">
                  <div>
                    <label style="font-size:.78rem;color:var(--tx3);font-weight:600;display:block;margin-bottom:.3rem;">FECHA</label>
                    <input type="date" [(ngModel)]="selectedDate">
                  </div>
                  <div>
                    <label style="font-size:.78rem;color:var(--tx3);font-weight:600;display:block;margin-bottom:.3rem;">VIGENCIA (días)</label>
                    <input type="number" [(ngModel)]="validityDays" min="1" max="365">
                  </div>
                </div>
                <label style="font-size:.78rem;color:var(--tx3);font-weight:600;display:block;margin-bottom:.4rem;">HORARIO DISPONIBLE</label>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.4rem;margin-bottom:.75rem;">
                  @for (slot of timeSlots; track slot) {
                    <button class="hora-slot"
                      [class.selected]="selectedTime() === slot"
                      [class.ocupado]="occupiedSlots.includes(slot)"
                      (click)="!occupiedSlots.includes(slot) && selectedTime.set(slot)">
                      {{ slot }}
                    </button>
                  }
                </div>
                <label style="font-size:.78rem;color:var(--tx3);font-weight:600;display:block;margin-bottom:.3rem;">MOTIVO DE CONSULTA</label>
                <textarea [(ngModel)]="reason" rows="2" placeholder="Describa el motivo de la consulta..."></textarea>
              </div>
            </div>

            <!-- Right column: summary -->
            <div style="display:flex;flex-direction:column;gap:1rem;position:sticky;top:1.5rem;">
              <div class="card-accent">
                <p class="section-heading">Resumen de cita</p>
                @if (selectedPatient()) {
                  <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.75rem;">
                    <app-avatar [initials]="selectedPatient()!.initials" size="38px" />
                    <div>
                      <div style="font-size:.9rem;font-weight:700;color:var(--tx);">{{ selectedPatient()!.name }}</div>
                      <div style="font-size:.75rem;color:var(--tx3);">CI: {{ selectedPatient()!.documentId }}</div>
                    </div>
                  </div>
                } @else {
                  <div style="color:var(--tx3);font-size:.82rem;margin-bottom:.75rem;">Sin paciente seleccionado</div>
                }
                <div style="display:flex;flex-direction:column;gap:.4rem;margin-bottom:.75rem;">
                  @if (selectedDate) {
                    <app-date-chip [date]="formatSelectedDate()" />
                  }
                  @if (selectedTime()) {
                    <app-date-chip [date]="selectedTime()" icon="clock" />
                  }
                  @if (selectedSpecialty()) {
                    <div style="font-size:.82rem;color:var(--mil);font-weight:600;"><i class="ti ti-stethoscope"></i> {{ selectedSpecialty() }}</div>
                  }
                  @if (reason) {
                    <div style="font-size:.82rem;color:var(--tx2);">{{ reason }}</div>
                  }
                  @if (appointmentType()) {
                    <app-badge [label]="appointmentType() === 'video' ? 'Videoconsulta' : 'Presencial'" [variant]="appointmentType() === 'video' ? 'purple' : 'green'" />
                  }
                </div>
                <button class="btn-primary" style="width:100%;justify-content:center;" (click)="confirm()" [disabled]="!canConfirm()">
                  <i class="ti ti-calendar-check"></i> Confirmar cita
                </button>
                @if (confirmed()) {
                  <div style="margin-top:.5rem;text-align:center;color:var(--mil);font-size:.85rem;font-weight:600;">
                    <i class="ti ti-check-circle"></i> ¡Cita agendada exitosamente!
                  </div>
                }
              </div>

              <!-- Today's appointments -->
              <div class="card">
                <p class="section-heading">Citas de hoy (20 may)</p>
                <div style="display:flex;flex-direction:column;gap:.5rem;">
                  @for (appt of todayAppointments(); track appt.id) {
                    <div style="display:flex;align-items:center;gap:.6rem;padding:.4rem 0;border-bottom:1px solid var(--border);">
                      <app-avatar [initials]="appt.patientInitials" size="30px" />
                      <div style="flex:1;">
                        <div style="font-size:.8rem;font-weight:600;color:var(--tx);">{{ appt.patientName }}</div>
                        <div style="font-size:.72rem;color:var(--tx3);">{{ appt.time }} · {{ appt.reason }}</div>
                      </div>
                      <app-badge [label]="appt.type === 'video' ? 'Video' : 'Presencial'" [variant]="appt.type === 'video' ? 'purple' : 'green'" />
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ReceptionComponent {
  private scheduleService = inject(ScheduleService);

  specialties = SPECIALTIES;
  timeSlots = TIME_SLOTS;
  occupiedSlots = OCCUPIED_SLOTS;

  searchQuery = '';
  reason = '';
  selectedDate = '';
  validityDays = 30;
  selectedDoctorId = '';

  selectedSpecialty = signal<string>('');
  selectedTime = signal<string>('');
  appointmentType = signal<AppointmentType>('in-person');
  selectedPatient = signal<Patient | null>(null);
  searchResults = signal<Patient[]>([]);
  confirmed = signal(false);

  filteredDoctors = computed(() => {
    const sp = this.selectedSpecialty();
    return sp ? DOCTORS.filter(d => d.specialty === sp) : DOCTORS;
  });

  todayAppointments = this.scheduleService.appointmentsByDate('d1', new Date('2025-05-20'));

  canConfirm = computed(() =>
    !!this.selectedPatient() && !!this.selectedTime() && !!this.selectedDate && !!this.reason.trim()
  );

  onSearch(term: string) {
    if (term.length < 2) { this.searchResults.set([]); return; }
    const t = term.toLowerCase();
    this.searchResults.set(
      PATIENTS.filter(p => p.name.toLowerCase().includes(t) || p.documentId.includes(term))
    );
  }

  selectPatient(p: Patient) {
    this.selectedPatient.set(p);
    this.searchResults.set([]);
    this.searchQuery = p.name;
  }

  formatSelectedDate(): string {
    if (!this.selectedDate) return '';
    const d = new Date(this.selectedDate + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  confirm() {
    if (!this.canConfirm()) return;
    const p = this.selectedPatient()!;
    const appointment: Appointment = {
      id: 'c' + Date.now(),
      patientId: p.id,
      patientName: p.name,
      patientInitials: p.initials,
      doctorId: this.selectedDoctorId || 'd1',
      doctorName: 'Dr. Vargas',
      date: new Date(this.selectedDate + 'T12:00:00'),
      time: this.selectedTime(),
      type: this.appointmentType(),
      reason: this.reason,
      status: 'confirmed',
      attachments: [],
      validityDays: this.validityDays,
    };
    this.scheduleService.add(appointment);
    this.confirmed.set(true);
    setTimeout(() => {
      this.confirmed.set(false);
      this.searchQuery = ''; this.reason = ''; this.selectedDate = ''; this.validityDays = 30; this.selectedDoctorId = '';
      this.selectedPatient.set(null); this.selectedTime.set(''); this.selectedSpecialty.set('');
      this.appointmentType.set('in-person');
    }, 2500);
  }
}
