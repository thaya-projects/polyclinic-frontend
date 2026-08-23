import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../core/layout/sidebar/sidebar.component';
import { TopbarComponent } from '../../core/layout/topbar/topbar.component';
import { RegistrationService } from '../../core/services/registration.service';
import { Specialty } from '../../core/models/registration.model';

type AdminTab = 'doctor' | 'patient' | 'receptionist';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [SidebarComponent, TopbarComponent, FormsModule],
  styles: [`
    @keyframes bar-bounce {
      0%, 100% { transform: scaleY(.25); }
      50%       { transform: scaleY(1); }
    }
    .bar-loader { display:inline-flex; align-items:center; gap:3px; height:18px; }
    .bar-loader span { display:block; width:3px; height:100%; background:white; border-radius:2px;
      transform-origin:bottom; animation:bar-bounce .8s ease-in-out infinite; }
    .bar-loader span:nth-child(1) { animation-delay:0s;    animation-duration:.7s; }
    .bar-loader span:nth-child(2) { animation-delay:.15s;  animation-duration:.9s; }
    .bar-loader span:nth-child(3) { animation-delay:.05s;  animation-duration:.6s; }
    .bar-loader span:nth-child(4) { animation-delay:.25s;  animation-duration:.8s; }
    .bar-loader span:nth-child(5) { animation-delay:.1s;   animation-duration:.75s; }

    /* ── Form card ───────────────────────────────── */
    .form-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 2rem;
      max-width: 560px;
    }

    /* ── Step indicator ──────────────────────────── */
    .step-row {
      display: flex;
      align-items: center;
      gap: 0;
      margin-bottom: 2rem;
    }
    .step-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .35rem;
    }
    .step-dot {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: .8rem;
      font-weight: 700;
      border: 2px solid var(--border2);
      background: var(--surface);
      color: var(--tx3);
      transition: all .2s;
    }
    .step-item.active .step-dot {
      border-color: var(--mil);
      background: var(--mil);
      color: white;
    }
    .step-item.done .step-dot {
      border-color: var(--mil);
      background: var(--mil);
      color: white;
    }
    .step-label {
      font-size: .72rem;
      font-weight: 600;
      color: var(--tx3);
      white-space: nowrap;
    }
    .step-item.active .step-label,
    .step-item.done .step-label { color: var(--mil); }
    .step-line {
      flex: 1;
      height: 2px;
      background: var(--border2);
      margin: 0 .5rem;
      margin-bottom: 1.4rem;
      transition: background .2s;
    }
    .step-line.done { background: var(--mil); }

    /* ── Field ───────────────────────────────────── */
    .field-group { display:flex; flex-direction:column; gap:.85rem; margin-bottom:1.5rem; }
    .field-label {
      font-size: .72rem;
      font-weight: 700;
      color: var(--tx2);
      text-transform: uppercase;
      letter-spacing: .07em;
      display: block;
      margin-bottom: .4rem;
    }
    .field-wrap {
      position: relative;
      display: flex;
      align-items: center;
      background: #f9fafb;
      border: 1.5px solid #e5e7eb;
      border-radius: 10px;
      transition: border-color .15s, box-shadow .15s;
    }
    .field-wrap:hover { border-color: rgba(115,170,139,.6); }
    .field-wrap:focus-within {
      border-color: var(--mil);
      box-shadow: 0 0 0 3px rgba(115,170,139,.13);
    }
    .field-wrap input,
    .field-wrap select {
      flex: 1;
      height: 42px;
      padding: 0 .75rem 0 2.4rem;
      background: transparent;
      border: none;
      outline: none;
      font-size: .875rem;
      color: var(--tx);
      min-width: 0;
    }
    .field-wrap select { cursor: pointer; }
    .field-wrap input::placeholder { color: #9ca3af; }
    .field-icon {
      position: absolute;
      left: .8rem;
      color: var(--tx3);
      font-size: .95rem;
      pointer-events: none;
      display: flex;
      align-items: center;
      transition: color .15s;
    }
    .field-wrap:focus-within .field-icon { color: var(--mil); }
    .field-no-icon input,
    .field-no-icon select { padding-left: .75rem; }
    .pw-toggle {
      flex-shrink: 0;
      background: none; border: none; cursor: pointer;
      color: var(--tx3); padding: 0 .75rem;
      height: 42px; display:flex; align-items:center;
      transition: color .15s;
    }
    .pw-toggle:hover { color: var(--mil); }

    /* ── Inline specialty form ───────────────────── */
    .inline-form {
      background: var(--card-accent);
      border: 1px solid var(--card-accent-border);
      border-radius: 10px;
      padding: .9rem 1rem;
      margin-top: .5rem;
    }

    /* ── Toggle (remember-me style) ─────────────── */
    .toggle-row { display:flex; align-items:center; gap:.6rem; cursor:pointer; user-select:none; }
    .toggle-row input[type="checkbox"] { display:none; }
    .toggle-track {
      width:36px; height:20px; border-radius:999px;
      background:var(--border2); position:relative; flex-shrink:0; transition:background .2s;
    }
    .toggle-track::after {
      content:''; position:absolute; top:3px; left:3px;
      width:14px; height:14px; border-radius:50%;
      background:white; box-shadow:0 1px 4px rgba(0,0,0,.2); transition:transform .2s;
    }
    .toggle-row input:checked ~ .toggle-track { background:var(--mil); }
    .toggle-row input:checked ~ .toggle-track::after { transform:translateX(16px); }
    .toggle-label { font-size:.82rem; color:var(--tx2); font-weight:500; }

    /* ── Buttons ─────────────────────────────────── */
    .btn-primary-form {
      height: 44px;
      background: var(--mil);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: .9rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: .5rem;
      transition: background .15s, transform .1s, box-shadow .15s;
      box-shadow: 0 3px 10px rgba(115,170,139,.3);
      padding: 0 1.5rem;
    }
    .btn-primary-form:hover:not(:disabled) {
      background: var(--mil-dark);
      transform: translateY(-1px);
      box-shadow: 0 5px 14px rgba(115,170,139,.35);
    }
    .btn-primary-form:disabled { opacity:.6; cursor:not-allowed; box-shadow:none; }
    .btn-secondary-form {
      height: 44px;
      background: var(--surface2);
      color: var(--tx2);
      border: 1.5px solid var(--border2);
      border-radius: 10px;
      font-size: .9rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: .5rem;
      transition: background .15s;
      padding: 0 1.25rem;
    }
    .btn-secondary-form:hover { background: var(--card-accent); }
    .gen-pw-btn {
      background: none; border: none; cursor: pointer;
      font-size: .75rem; color: var(--mil); font-weight: 600;
      padding: 0; transition: opacity .15s;
    }
    .gen-pw-btn:hover { opacity: .72; }

    /* ── Error / Success ─────────────────────────── */
    .error-box {
      background: rgba(201,64,64,.08);
      border: 1px solid rgba(201,64,64,.28);
      border-radius: 10px;
      padding: .65rem .9rem;
      font-size: .84rem;
      color: var(--red);
      display: flex;
      align-items: center;
      gap: .5rem;
      margin-bottom: 1.25rem;
    }
    .success-card {
      max-width: 560px;
      background: var(--surface);
      border: 1.5px solid var(--mil);
      border-radius: 16px;
      padding: 2rem;
      text-align: center;
    }
    .success-icon {
      width: 56px; height: 56px;
      background: rgba(115,170,139,.12);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 1rem;
    }
    .info-chip {
      display: inline-flex;
      align-items: center;
      gap: .4rem;
      background: var(--card-accent);
      border: 1px solid var(--card-accent-border);
      border-radius: 8px;
      padding: .35rem .75rem;
      font-size: .8rem;
      color: var(--tx2);
    }
  `],
  template: `
    <div class="app-layout">
      <app-sidebar />
      <div class="main-content">
        <app-topbar title="Gestión de Usuarios" subtitle="Panel de Administrador" />
        <div class="page-content">

          <!-- Tab bar -->
          <div style="display:flex;align-items:center;gap:.25rem;border-bottom:2px solid var(--border);margin-bottom:1.75rem;">
            <button class="tab-btn" [class.active]="tab()==='doctor'"
              (click)="switchTab('doctor')">
              <i class="ti ti-stethoscope" style="margin-right:.35rem;"></i>Doctores
            </button>
            <button class="tab-btn" [class.active]="tab()==='patient'"
              (click)="switchTab('patient')">
              <i class="ti ti-user-heart" style="margin-right:.35rem;"></i>Pacientes
            </button>
            <button class="tab-btn" [class.active]="tab()==='receptionist'"
              (click)="switchTab('receptionist')">
              <i class="ti ti-headset" style="margin-right:.35rem;"></i>Recepcionistas
            </button>
          </div>

          <!-- ══ SUCCESS STATE ══════════════════════════ -->
          @if (successInfo()) {
            <div class="success-card">
              <div class="success-icon">
                <i class="ti ti-circle-check" style="font-size:1.75rem;color:var(--mil);"></i>
              </div>
              <h3 style="margin:0 0 .35rem;font-size:1.15rem;font-weight:800;color:var(--tx);">
                Usuario creado exitosamente
              </h3>
              <p style="margin:0 0 1.25rem;font-size:.875rem;color:var(--tx3);">
                El acceso ha sido configurado y el perfil está listo.
              </p>
              <div style="display:flex;justify-content:center;flex-wrap:wrap;gap:.5rem;margin-bottom:1.5rem;">
                <span class="info-chip">
                  <i class="ti ti-user" style="color:var(--mil);"></i>
                  {{ successInfo()!.name }}
                </span>
                <span class="info-chip">
                  <i class="ti ti-mail" style="color:var(--mil);"></i>
                  {{ successInfo()!.email }}
                </span>
                <span class="info-chip">
                  <i class="ti ti-shield" style="color:var(--mil);"></i>
                  {{ successInfo()!.role }}
                </span>
              </div>
              <button class="btn-primary-form" style="width:100%;max-width:260px;" (click)="reset()">
                <i class="ti ti-plus"></i> Registrar otro usuario
              </button>
            </div>
          }

          <!-- ══ DOCTOR TAB ═════════════════════════════ -->
          @if (tab() === 'doctor' && !successInfo()) {
            <div class="form-card">
              <h3 style="margin:0 0 .25rem;font-size:1rem;font-weight:800;color:var(--tx);">
                Registrar Doctor
              </h3>
              <p style="margin:0 0 1.75rem;font-size:.82rem;color:var(--tx3);">
                Primero se crea la cuenta de acceso y luego el perfil médico.
              </p>

              <!-- Step indicator -->
              <div class="step-row">
                <div class="step-item" [class.active]="doctorStep()===1" [class.done]="doctorStep()>1">
                  <div class="step-dot">
                    @if (doctorStep() > 1) { <i class="ti ti-check" style="font-size:.9rem;"></i> }
                    @else { 1 }
                  </div>
                  <span class="step-label">Cuenta</span>
                </div>
                <div class="step-line" [class.done]="doctorStep()>1"></div>
                <div class="step-item" [class.active]="doctorStep()===2">
                  <div class="step-dot">2</div>
                  <span class="step-label">Perfil médico</span>
                </div>
              </div>

              @if (error()) {
                <div class="error-box">
                  <i class="ti ti-alert-circle" style="flex-shrink:0;"></i> {{ error() }}
                </div>
              }

              <!-- Step 1: Account -->
              @if (doctorStep() === 1) {
                <div class="field-group">
                  <div>
                    <label class="field-label">Nombre completo</label>
                    <div class="field-wrap">
                      <i class="ti ti-user field-icon"></i>
                      <input type="text" [(ngModel)]="doc.fullName" placeholder="Dr. Carlos Pérez">
                    </div>
                  </div>
                  <div>
                    <label class="field-label">Correo electrónico</label>
                    <div class="field-wrap">
                      <i class="ti ti-mail field-icon"></i>
                      <input type="email" [(ngModel)]="doc.email" placeholder="dr.perez@policlinica.com">
                    </div>
                  </div>
                  <div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem;">
                      <label class="field-label" style="margin:0;">Contraseña</label>
                      <button class="gen-pw-btn" type="button" (click)="generatePassword('doc')">
                        <i class="ti ti-wand"></i> Generar
                      </button>
                    </div>
                    <div class="field-wrap">
                      <i class="ti ti-lock field-icon"></i>
                      <input [type]="showDocPw() ? 'text' : 'password'" [(ngModel)]="doc.password"
                        placeholder="Doctor@1234">
                      <button class="pw-toggle" type="button" (click)="showDocPw.update(v=>!v)" tabindex="-1">
                        <i [class]="'ti ti-' + (showDocPw() ? 'eye-off' : 'eye')"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <div style="display:flex;justify-content:flex-end;">
                  <button class="btn-primary-form" (click)="submitDoctorStep1()" [disabled]="loading()">
                    @if (loading()) {
                      <div class="bar-loader"><span></span><span></span><span></span><span></span><span></span></div>
                      Creando cuenta...
                    } @else {
                      Siguiente <i class="ti ti-arrow-right"></i>
                    }
                  </button>
                </div>
              }

              <!-- Step 2: Medical profile -->
              @if (doctorStep() === 2) {
                <div class="field-group">
                  <div>
                    <label class="field-label">Número de colegiatura</label>
                    <div class="field-wrap">
                      <i class="ti ti-id-badge field-icon"></i>
                      <input type="text" [(ngModel)]="doc.licenseNumber" placeholder="MED-001234">
                    </div>
                  </div>
                  <div>
                    <label class="field-label">Teléfono</label>
                    <div class="field-wrap">
                      <i class="ti ti-phone field-icon"></i>
                      <input type="tel" [(ngModel)]="doc.phone" placeholder="+52-555-1234">
                    </div>
                  </div>
                  <div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem;">
                      <label class="field-label" style="margin:0;">Especialidad</label>
                      <button class="gen-pw-btn" type="button" (click)="showNewSpec.update(v=>!v)">
                        <i class="ti ti-plus"></i> Nueva especialidad
                      </button>
                    </div>
                    <div class="field-wrap field-no-icon">
                      <i class="ti ti-heart-rate-monitor field-icon"></i>
                      <select [(ngModel)]="doc.specialtyId">
                        <option value="" disabled>Seleccionar especialidad...</option>
                        @for (s of specialties(); track s.id) {
                          <option [value]="s.id">{{ s.name }}</option>
                        }
                      </select>
                    </div>
                    @if (showNewSpec()) {
                      <div class="inline-form" style="margin-top:.65rem;">
                        <p style="margin:0 0 .65rem;font-size:.75rem;font-weight:700;color:var(--mil);text-transform:uppercase;letter-spacing:.05em;">
                          Nueva especialidad
                        </p>
                        <div style="display:flex;flex-direction:column;gap:.5rem;">
                          <div class="field-wrap field-no-icon">
                            <input type="text" [(ngModel)]="newSpec.name" placeholder="Nombre (ej. Cardiología)" style="padding-left:.75rem;">
                          </div>
                          <div class="field-wrap field-no-icon">
                            <input type="text" [(ngModel)]="newSpec.description" placeholder="Descripción breve" style="padding-left:.75rem;">
                          </div>
                          <button class="btn-primary-form" style="align-self:flex-end;height:38px;font-size:.82rem;"
                            (click)="submitNewSpecialty()" [disabled]="loading()">
                            Agregar especialidad
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <button class="btn-secondary-form" (click)="doctorStep.set(1)">
                    <i class="ti ti-arrow-left"></i> Atrás
                  </button>
                  <button class="btn-primary-form" (click)="submitDoctorStep2()" [disabled]="loading()">
                    @if (loading()) {
                      <div class="bar-loader"><span></span><span></span><span></span><span></span><span></span></div>
                      Creando perfil...
                    } @else {
                      <i class="ti ti-check"></i> Crear doctor
                    }
                  </button>
                </div>
              }
            </div>
          }

          <!-- ══ PATIENT TAB ════════════════════════════ -->
          @if (tab() === 'patient' && !successInfo()) {
            <div class="form-card">
              <h3 style="margin:0 0 .25rem;font-size:1rem;font-weight:800;color:var(--tx);">
                Registrar Paciente
              </h3>
              <p style="margin:0 0 1.25rem;font-size:.82rem;color:var(--tx3);">
                Completa el expediente. El acceso al sistema es opcional.
              </p>

              <!-- Login toggle -->
              <div style="background:var(--card-accent);border:1px solid var(--card-accent-border);border-radius:10px;padding:.85rem 1rem;margin-bottom:1.5rem;">
                <label class="toggle-row">
                  <input type="checkbox" [checked]="patHasLogin()" (change)="patHasLogin.update(v=>!v)">
                  <span class="toggle-track"></span>
                  <div>
                    <span class="toggle-label">Crear credenciales de acceso al sistema</span>
                    <p style="margin:.15rem 0 0;font-size:.72rem;color:var(--tx3);">
                      El paciente podrá iniciar sesión para ver sus consultas
                    </p>
                  </div>
                </label>
              </div>

              @if (error()) {
                <div class="error-box">
                  <i class="ti ti-alert-circle" style="flex-shrink:0;"></i> {{ error() }}
                </div>
              }

              <div class="field-group">
                <div>
                  <label class="field-label">Nombre completo</label>
                  <div class="field-wrap">
                    <i class="ti ti-user field-icon"></i>
                    <input type="text" [(ngModel)]="pat.fullName" placeholder="Juan Martínez">
                  </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:.85rem;">
                  <div>
                    <label class="field-label">Fecha de nacimiento</label>
                    <div class="field-wrap">
                      <i class="ti ti-calendar field-icon"></i>
                      <input type="date" [(ngModel)]="pat.dateOfBirth">
                    </div>
                  </div>
                  <div>
                    <label class="field-label">Género</label>
                    <div class="field-wrap">
                      <i class="ti ti-gender-bigender field-icon"></i>
                      <select [(ngModel)]="pat.gender">
                        <option value="Male">Masculino</option>
                        <option value="Female">Femenino</option>
                        <option value="Other">Otro</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <label class="field-label">Correo electrónico</label>
                  <div class="field-wrap">
                    <i class="ti ti-mail field-icon"></i>
                    <input type="email" [(ngModel)]="pat.email" placeholder="paciente@gmail.com">
                  </div>
                </div>
                <div>
                  <label class="field-label">Teléfono</label>
                  <div class="field-wrap">
                    <i class="ti ti-phone field-icon"></i>
                    <input type="tel" [(ngModel)]="pat.phone" placeholder="+52-555-9876">
                  </div>
                </div>
                <div>
                  <label class="field-label">Dirección</label>
                  <div class="field-wrap">
                    <i class="ti ti-map-pin field-icon"></i>
                    <input type="text" [(ngModel)]="pat.address" placeholder="Calle Principal 123, Ciudad">
                  </div>
                </div>
                @if (patHasLogin()) {
                  <div style="border-top:1px solid var(--border);padding-top:.85rem;">
                    <p class="section-heading" style="margin-bottom:.85rem;">Credenciales de acceso</p>
                    <div style="display:flex;flex-direction:column;gap:.85rem;">
                      <div>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem;">
                          <label class="field-label" style="margin:0;">Contraseña</label>
                          <button class="gen-pw-btn" type="button" (click)="generatePassword('pat')">
                            <i class="ti ti-wand"></i> Generar
                          </button>
                        </div>
                        <div class="field-wrap">
                          <i class="ti ti-lock field-icon"></i>
                          <input [type]="showPatPw() ? 'text' : 'password'" [(ngModel)]="pat.password"
                            placeholder="Paciente@1234">
                          <button class="pw-toggle" type="button" (click)="showPatPw.update(v=>!v)" tabindex="-1">
                            <i [class]="'ti ti-' + (showPatPw() ? 'eye-off' : 'eye')"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>
              <div style="display:flex;justify-content:flex-end;">
                <button class="btn-primary-form" (click)="submitPatient()" [disabled]="loading()">
                  @if (loading()) {
                    <div class="bar-loader"><span></span><span></span><span></span><span></span><span></span></div>
                    Registrando...
                  } @else {
                    <i class="ti ti-check"></i> Registrar paciente
                  }
                </button>
              </div>
            </div>
          }

          <!-- ══ RECEPTIONIST TAB ═══════════════════════ -->
          @if (tab() === 'receptionist' && !successInfo()) {
            <div class="form-card">
              <h3 style="margin:0 0 .25rem;font-size:1rem;font-weight:800;color:var(--tx);">
                Registrar Recepcionista
              </h3>
              <p style="margin:0 0 1.75rem;font-size:.82rem;color:var(--tx3);">
                La recepcionista podrá gestionar citas y registrar pacientes.
              </p>

              @if (error()) {
                <div class="error-box">
                  <i class="ti ti-alert-circle" style="flex-shrink:0;"></i> {{ error() }}
                </div>
              }

              <div class="field-group">
                <div>
                  <label class="field-label">Nombre completo</label>
                  <div class="field-wrap">
                    <i class="ti ti-user field-icon"></i>
                    <input type="text" [(ngModel)]="rec.fullName" placeholder="María García">
                  </div>
                </div>
                <div>
                  <label class="field-label">Correo electrónico</label>
                  <div class="field-wrap">
                    <i class="ti ti-mail field-icon"></i>
                    <input type="email" [(ngModel)]="rec.email" placeholder="recepcion@policlinica.com">
                  </div>
                </div>
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem;">
                    <label class="field-label" style="margin:0;">Contraseña</label>
                    <button class="gen-pw-btn" type="button" (click)="generatePassword('rec')">
                      <i class="ti ti-wand"></i> Generar
                    </button>
                  </div>
                  <div class="field-wrap">
                    <i class="ti ti-lock field-icon"></i>
                    <input [type]="showRecPw() ? 'text' : 'password'" [(ngModel)]="rec.password"
                      placeholder="Recep@1234">
                    <button class="pw-toggle" type="button" (click)="showRecPw.update(v=>!v)" tabindex="-1">
                      <i [class]="'ti ti-' + (showRecPw() ? 'eye-off' : 'eye')"></i>
                    </button>
                  </div>
                </div>
              </div>
              <div style="display:flex;justify-content:flex-end;">
                <button class="btn-primary-form" (click)="submitReceptionist()" [disabled]="loading()">
                  @if (loading()) {
                    <div class="bar-loader"><span></span><span></span><span></span><span></span><span></span></div>
                    Registrando...
                  } @else {
                    <i class="ti ti-check"></i> Registrar recepcionista
                  }
                </button>
              </div>
            </div>
          }

        </div>
      </div>
    </div>
  `,
})
export class AdminComponent implements OnInit {
  private regService = inject(RegistrationService);

  tab         = signal<AdminTab>('doctor');
  doctorStep  = signal<1 | 2>(1);
  loading     = signal(false);
  error       = signal<string | null>(null);
  successInfo = signal<{ name: string; email: string; role: string } | null>(null);

  // Doctor form
  doc = { fullName: '', email: '', password: '', licenseNumber: '', phone: '', specialtyId: '' };
  showDocPw = signal(false);

  // Patient form
  pat = { fullName: '', email: '', password: '', dateOfBirth: '', gender: 'Male' as 'Male' | 'Female' | 'Other', phone: '', address: '' };
  patHasLogin = signal(false);
  showPatPw   = signal(false);

  // Receptionist form
  rec = { fullName: '', email: '', password: '' };
  showRecPw = signal(false);

  // Specialties
  specialties  = signal<Specialty[]>([]);
  showNewSpec  = signal(false);
  newSpec      = { name: '', description: '' };

  ngOnInit() {
    this.regService.getSpecialties().subscribe({ next: s => this.specialties.set(s), error: () => {} });
  }

  switchTab(t: AdminTab) {
    this.tab.set(t);
    this.error.set(null);
    this.successInfo.set(null);
    this.doctorStep.set(1);
  }

  reset() {
    this.successInfo.set(null);
    this.error.set(null);
    this.doc = { fullName: '', email: '', password: '', licenseNumber: '', phone: '', specialtyId: '' };
    this.pat = { fullName: '', email: '', password: '', dateOfBirth: '', gender: 'Male', phone: '', address: '' };
    this.rec = { fullName: '', email: '', password: '' };
    this.doctorStep.set(1);
    this.patHasLogin.set(false);
  }

  generatePassword(target: 'doc' | 'pat' | 'rec') {
    const num   = Math.floor(Math.random() * 9000) + 1000;
    const prefixes = { doc: 'Doctor', pat: 'Paciente', rec: 'Recep' };
    const pw    = `${prefixes[target]}@${num}`;
    if (target === 'doc') { this.doc.password = pw; this.showDocPw.set(true); }
    if (target === 'pat') { this.pat.password = pw; this.showPatPw.set(true); }
    if (target === 'rec') { this.rec.password = pw; this.showRecPw.set(true); }
  }

  submitDoctorStep1() {
    const { fullName, email, password } = this.doc;
    if (!fullName.trim() || !email.trim() || !password) {
      this.error.set('Completa todos los campos para continuar.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.regService.registerUser({ email, password, fullName, role: 'Doctor' }).subscribe({
      next: () => { this.loading.set(false); this.doctorStep.set(2); },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Error al crear la cuenta. Verifica los datos.');
      },
    });
  }

  submitDoctorStep2() {
    const { fullName, email, licenseNumber, phone, specialtyId } = this.doc;
    if (!licenseNumber.trim() || !phone.trim() || !specialtyId) {
      this.error.set('Completa número de colegiatura, teléfono y especialidad.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.regService.createDoctorProfile({ fullName, email, licenseNumber, phone, specialtyId }).subscribe({
      next: () => {
        this.loading.set(false);
        this.successInfo.set({ name: fullName, email, role: 'Doctor' });
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Error al crear el perfil médico.');
      },
    });
  }

  submitPatient() {
    const { fullName, email, password, dateOfBirth, gender, phone, address } = this.pat;
    if (!fullName.trim() || !email.trim() || !dateOfBirth || !phone.trim() || !address.trim()) {
      this.error.set('Completa todos los campos del expediente.');
      return;
    }
    if (this.patHasLogin() && !password) {
      this.error.set('Ingresa una contraseña para el acceso al sistema.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    const createRecord = () => {
      this.regService.createPatientRecord({ fullName, email, dateOfBirth, gender, phone, address }).subscribe({
        next: () => {
          this.loading.set(false);
          this.successInfo.set({ name: fullName, email, role: 'Paciente' });
        },
        error: err => {
          this.loading.set(false);
          this.error.set(err?.error?.message ?? 'Error al crear el expediente del paciente.');
        },
      });
    };

    if (this.patHasLogin()) {
      this.regService.registerUser({ email, password, fullName, role: 'Patient' }).subscribe({
        next: () => createRecord(),
        error: err => {
          this.loading.set(false);
          this.error.set(err?.error?.message ?? 'Error al crear la cuenta de acceso.');
        },
      });
    } else {
      createRecord();
    }
  }

  submitReceptionist() {
    const { fullName, email, password } = this.rec;
    if (!fullName.trim() || !email.trim() || !password) {
      this.error.set('Completa todos los campos.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.regService.registerUser({ email, password, fullName, role: 'Receptionist' }).subscribe({
      next: () => {
        this.loading.set(false);
        this.successInfo.set({ name: fullName, email, role: 'Recepcionista' });
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Error al registrar la recepcionista.');
      },
    });
  }

  submitNewSpecialty() {
    const { name, description } = this.newSpec;
    if (!name.trim()) return;
    this.loading.set(true);
    this.regService.createSpecialty(name.trim(), description.trim()).subscribe({
      next: specialty => {
        this.loading.set(false);
        this.specialties.update(list => [...list, specialty]);
        this.doc.specialtyId = specialty.id;
        this.newSpec = { name: '', description: '' };
        this.showNewSpec.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Error al crear la especialidad.');
      },
    });
  }
}
