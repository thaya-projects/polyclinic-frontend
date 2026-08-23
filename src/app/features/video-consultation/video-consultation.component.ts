import { Component, computed, inject, signal, input } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ScheduleService } from '../../core/services/schedule.service';
import { HistoryService } from '../../core/services/history.service';
import { PrescriptionService } from '../../core/services/prescription.service';
import { SidebarComponent } from '../../core/layout/sidebar/sidebar.component';
import { TopbarComponent } from '../../core/layout/topbar/topbar.component';
import { DateChipComponent } from '../../shared/components/date-chip.component';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { HistoryEntry } from '../../core/models/history.model';
import { Medication, Prescription } from '../../core/models/prescription.model';

type Tab = 'attachments' | 'history' | 'prescription';

@Component({
  selector: 'app-video-consultation',
  standalone: true,
  imports: [SidebarComponent, TopbarComponent, DateChipComponent, AvatarComponent, FormsModule],
  template: `
    <div class="app-layout">
      <app-sidebar role="doctor" />
      <div class="main-content">
        <app-topbar title="Videoconsulta" [subtitle]="appointment()?.patientName ?? ''">
          <div style="display:flex;align-items:center;gap:.5rem;background:rgba(201,64,64,0.18);border-radius:20px;padding:.3rem .85rem;">
            <span class="pulse-live" style="width:8px;height:8px;border-radius:50%;background:var(--red);display:inline-block;"></span>
            <span style="font-size:.8rem;font-weight:700;color:#ffb3b3;">En vivo</span>
          </div>
        </app-topbar>

        <div class="page-content" style="padding:1rem;">
          <div style="display:flex;gap:1rem;height:calc(100vh - 80px);">

            <!-- Video area -->
            <div style="flex:1;display:flex;flex-direction:column;gap:.75rem;">
              <div style="flex:1;background:#0e1a13;border-radius:12px;position:relative;overflow:hidden;min-height:400px;">
                <div style="position:absolute;top:1rem;left:1rem;font-size:.85rem;font-weight:700;color:var(--mil);z-index:2;">
                  <i class="ti ti-heart-rate-monitor"></i> MedConnect
                </div>
                <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:.75rem;">
                  <div style="width:100px;height:100px;border-radius:50%;background:var(--mil);display:flex;align-items:center;justify-content:center;font-size:2.2rem;font-weight:700;color:white;border:3px solid var(--mil);">
                    {{ appointment()?.patientInitials ?? '?' }}
                  </div>
                  <span style="color:rgba(255,255,255,0.7);font-size:.9rem;">{{ appointment()?.patientName }}</span>
                </div>
                <div style="position:absolute;top:1rem;right:1rem;width:100px;height:75px;background:#1a3322;border-radius:8px;border:2px solid var(--mil);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:.25rem;">
                  <div style="width:36px;height:36px;border-radius:50%;background:var(--mil-dark);display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:700;color:white;">RV</div>
                  <span style="font-size:.6rem;color:rgba(255,255,255,0.6);">Dr. Vargas</span>
                </div>
                <div style="position:absolute;bottom:1rem;left:1rem;display:flex;align-items:center;gap:.4rem;">
                  <span class="pulse-live" style="width:6px;height:6px;border-radius:50%;background:#ff6b6b;display:inline-block;"></span>
                  <span style="font-size:.7rem;color:rgba(255,255,255,0.5);">REC</span>
                </div>
                <div style="position:absolute;bottom:1rem;right:1rem;font-size:.75rem;color:rgba(255,255,255,0.4);font-family:monospace;">
                  00:14:32
                </div>
              </div>

              <!-- Controls -->
              <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:.75rem 1rem;display:flex;align-items:center;justify-content:center;gap:.75rem;">
                <button (click)="micOn.update(v=>!v)"
                  [style.background]="micOn() ? 'var(--card-accent)' : 'var(--red)'"
                  style="width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;">
                  <i [class]="'ti ti-' + (micOn() ? 'microphone' : 'microphone-off')"
                    [style.color]="micOn() ? 'var(--mil)' : 'white'" style="font-size:1.1rem;"></i>
                </button>
                <button (click)="camOn.update(v=>!v)"
                  [style.background]="camOn() ? 'var(--card-accent)' : 'var(--red)'"
                  style="width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;">
                  <i [class]="'ti ti-' + (camOn() ? 'video' : 'video-off')"
                    [style.color]="camOn() ? 'var(--mil)' : 'white'" style="font-size:1.1rem;"></i>
                </button>
                <button (click)="router.navigate(['/dashboard'])"
                  style="width:52px;height:52px;border-radius:50%;border:none;background:var(--red);cursor:pointer;display:flex;align-items:center;justify-content:center;">
                  <i class="ti ti-phone-off" style="font-size:1.2rem;color:white;"></i>
                </button>
                <button style="width:44px;height:44px;border-radius:50%;border:none;background:var(--card-accent);cursor:pointer;display:flex;align-items:center;justify-content:center;">
                  <i class="ti ti-screen-share" style="font-size:1.1rem;color:var(--mil);"></i>
                </button>
              </div>
            </div>

            <!-- Side panel -->
            <div style="width:300px;min-width:300px;background:var(--surface);border:1px solid var(--border);border-radius:12px;display:flex;flex-direction:column;overflow:hidden;">
              <div style="background:var(--card-accent);padding:1rem;border-bottom:1px solid var(--card-accent-border);">
                <div style="display:flex;align-items:center;gap:.65rem;margin-bottom:.4rem;">
                  <app-avatar [initials]="appointment()?.patientInitials ?? '?'" size="42px" />
                  <div>
                    <div style="font-size:.9rem;font-weight:700;color:var(--mil);">{{ appointment()?.patientName }}</div>
                    <div style="font-size:.75rem;color:var(--tx3);">{{ appointment()?.reason }}</div>
                  </div>
                </div>
                <div style="display:flex;gap:.4rem;flex-wrap:wrap;">
                  <app-date-chip [date]="formatDate(appointment()?.date)" />
                  <app-date-chip [date]="appointment()?.time ?? ''" icon="clock" />
                </div>
              </div>

              <!-- Tabs -->
              <div style="display:flex;border-bottom:1px solid var(--border);">
                <button class="tab-btn" [class.active]="tab() === 'attachments'" (click)="tab.set('attachments')">Adjuntos</button>
                <button class="tab-btn" [class.active]="tab() === 'history'" (click)="tab.set('history')">Historia</button>
                <button class="tab-btn" [class.active]="tab() === 'prescription'" (click)="tab.set('prescription')">Receta</button>
              </div>

              <div style="flex:1;overflow-y:auto;padding:1rem;">
                @if (tab() === 'attachments') {
                  <p class="section-heading">Archivos adjuntos</p>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:1rem;">
                    @for (att of appointment()?.attachments ?? []; track att.id) {
                      <div class="att-box">
                        <i class="ti ti-photo" style="font-size:1.5rem;color:var(--mil);"></i>
                        <span style="font-size:.7rem;color:var(--tx2);text-align:center;word-break:break-word;">{{ att.name }}</span>
                      </div>
                    }
                    @if ((appointment()?.attachments ?? []).length === 0) {
                      <div style="grid-column:span 2;text-align:center;color:var(--tx3);font-size:.82rem;padding:1rem 0;">
                        Sin archivos adjuntos
                      </div>
                    }
                  </div>
                  @if (appointment()?.patientNote) {
                    <p class="section-heading">Nota del paciente</p>
                    <div class="card-accent" style="font-size:.82rem;font-style:italic;color:var(--tx2);line-height:1.5;">
                      "{{ appointment()?.patientNote }}"
                    </div>
                  }
                }

                @if (tab() === 'history') {
                  <p class="section-heading">Historial clínico</p>
                  <div style="display:flex;flex-direction:column;gap:.75rem;margin-bottom:1rem;">
                    @for (entry of patientHistory(); track entry.id) {
                      <div style="border-left:2px solid var(--mil);padding:.5rem .75rem;">
                        <div style="font-size:.78rem;font-weight:700;color:var(--mil);">{{ entry.displayDate }}</div>
                        <div style="font-size:.8rem;color:var(--tx);margin:.2rem 0;">{{ entry.notes }}</div>
                        <div style="font-size:.72rem;color:var(--tx3);">{{ entry.doctorName }} · {{ entry.type }}</div>
                      </div>
                    }
                  </div>
                  <p class="section-heading">Nueva nota</p>
                  <textarea [(ngModel)]="newNote" rows="3" placeholder="Observaciones de la consulta..." style="resize:vertical;"></textarea>
                  <button class="btn-primary" style="margin-top:.5rem;width:100%;justify-content:center;" (click)="saveNote()">
                    <i class="ti ti-device-floppy"></i> Guardar nota
                  </button>
                  @if (noteSaved()) {
                    <div style="margin-top:.5rem;color:var(--mil);font-size:.8rem;text-align:center;">
                      <i class="ti ti-check"></i> Nota guardada
                    </div>
                  }
                }

                @if (tab() === 'prescription') {
                  @if (latestPrescription()) {
                    <p class="section-heading">Última receta</p>
                    <div class="card-accent" style="margin-bottom:1rem;">
                      <div style="font-size:.75rem;color:var(--tx3);margin-bottom:.5rem;">{{ latestPrescription()!.displayDate }} · {{ latestPrescription()!.doctorName }}</div>
                      @for (med of latestPrescription()!.medications; track med.name) {
                        <div style="padding:.4rem 0;border-bottom:1px solid var(--border);font-size:.82rem;">
                          <div style="font-weight:600;color:var(--tx);">{{ med.name }}</div>
                          <div style="color:var(--tx3);">{{ med.frequency }} · {{ med.duration }}</div>
                        </div>
                      }
                    </div>
                  }
                  <p class="section-heading">Nueva receta</p>
                  <div style="display:flex;flex-direction:column;gap:.4rem;margin-bottom:.75rem;">
                    @for (med of newMedications(); track $index; let i = $index) {
                      <div style="background:var(--surface2);border-radius:8px;padding:.5rem .75rem;font-size:.8rem;display:flex;justify-content:space-between;align-items:flex-start;">
                        <div>
                          <div style="font-weight:600;color:var(--tx);">{{ med.name }}</div>
                          <div style="color:var(--tx3);">{{ med.dosage }} · {{ med.frequency }}</div>
                        </div>
                        <button (click)="removeMedication(i)" style="background:none;border:none;cursor:pointer;color:var(--red);padding:0;">
                          <i class="ti ti-x" style="font-size:.85rem;"></i>
                        </button>
                      </div>
                    }
                  </div>
                  <div style="display:flex;flex-direction:column;gap:.4rem;margin-bottom:.5rem;">
                    <input type="text" [(ngModel)]="medName" placeholder="Medicamento">
                    <input type="text" [(ngModel)]="medDosage" placeholder="Dosis (ej: 40mg)">
                    <input type="text" [(ngModel)]="medFrequency" placeholder="Frecuencia">
                    <input type="text" [(ngModel)]="medDuration" placeholder="Duración">
                    <button class="btn-secondary" (click)="addMedication()" style="justify-content:center;">
                      <i class="ti ti-plus"></i> Agregar medicamento
                    </button>
                  </div>
                  <button class="btn-primary" style="width:100%;justify-content:center;" (click)="issuePrescription()">
                    <i class="ti ti-file-certificate"></i> Emitir receta
                  </button>
                  @if (prescriptionIssued()) {
                    <div style="margin-top:.5rem;color:var(--mil);font-size:.8rem;text-align:center;">
                      <i class="ti ti-check"></i> Receta emitida exitosamente
                    </div>
                  }
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class VideoConsultationComponent {
  id = input<string>('c3');

  private scheduleService = inject(ScheduleService);
  private historyService = inject(HistoryService);
  private prescriptionService = inject(PrescriptionService);
  router = inject(Router);

  tab = signal<Tab>('attachments');
  micOn = signal(true);
  camOn = signal(true);
  newNote = '';
  noteSaved = signal(false);
  prescriptionIssued = signal(false);
  newMedications = signal<Medication[]>([]);

  medName = '';
  medDosage = '';
  medFrequency = '';
  medDuration = '';

  appointment = computed(() => {
    const id = this.id();
    return this.scheduleService.appointmentById(id)();
  });

  patientHistory = computed(() => {
    const pid = this.appointment()?.patientId;
    if (!pid) return [];
    return this.historyService.byPatient(pid)();
  });

  latestPrescription = computed(() => {
    const pid = this.appointment()?.patientId;
    if (!pid) return undefined;
    return this.prescriptionService.latestByPatient(pid)();
  });

  formatDate(date?: Date): string {
    if (!date) return '';
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  saveNote() {
    const appt = this.appointment();
    if (!appt || !this.newNote.trim()) return;
    const entry: HistoryEntry = {
      id: 'h' + Date.now(),
      patientId: appt.patientId,
      date: new Date(),
      displayDate: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
      notes: this.newNote.trim(),
      doctorName: 'Dr. Vargas',
      type: 'video',
    };
    this.historyService.add(entry);
    this.newNote = '';
    this.noteSaved.set(true);
    setTimeout(() => this.noteSaved.set(false), 2000);
  }

  addMedication() {
    if (!this.medName.trim()) return;
    this.newMedications.update(list => [...list, {
      name: this.medName.trim(),
      dosage: this.medDosage.trim(),
      frequency: this.medFrequency.trim(),
      duration: this.medDuration.trim(),
    }]);
    this.medName = ''; this.medDosage = ''; this.medFrequency = ''; this.medDuration = '';
  }

  removeMedication(index: number) {
    this.newMedications.update(list => list.filter((_, i) => i !== index));
  }

  issuePrescription() {
    const appt = this.appointment();
    if (!appt || this.newMedications().length === 0) return;
    const prescription: Prescription = {
      id: 'r' + Date.now(),
      patientId: appt.patientId,
      doctorName: 'Dr. Vargas',
      date: new Date(),
      displayDate: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
      medications: this.newMedications(),
      active: true,
      daysRemaining: 30,
    };
    this.prescriptionService.issue(prescription);
    this.newMedications.set([]);
    this.prescriptionIssued.set(true);
    setTimeout(() => this.prescriptionIssued.set(false), 2500);
  }
}
