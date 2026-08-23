import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, DEMO_USERS } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

const ROLE_LABEL: Record<string, string> = {
  SuperAdmin: 'Super Admin',
  Admin:      'Administrador',
  Doctor:     'Doctor',
  Secretary:  'Secretaria',
  Patient:    'Paciente',
};

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  styles: [`
    @keyframes fadeUp {
      from { opacity:0; transform:translateY(16px); }
      to   { opacity:1; transform:translateY(0); }
    }

    /* ── Rectangle-bounce-party loader ─────────── */
    @keyframes bar-bounce {
      0%, 100% { transform: scaleY(.25); }
      50%       { transform: scaleY(1); }
    }

    .bar-loader {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      height: 20px;
    }

    .bar-loader span {
      display: block;
      width: 3px;
      height: 100%;
      background: white;
      border-radius: 2px;
      transform-origin: bottom;
      animation: bar-bounce .8s ease-in-out infinite;
    }

    .bar-loader span:nth-child(1) { animation-delay: 0s;    animation-duration: .7s; }
    .bar-loader span:nth-child(2) { animation-delay: .15s;  animation-duration: .9s; }
    .bar-loader span:nth-child(3) { animation-delay: .05s;  animation-duration: .6s; }
    .bar-loader span:nth-child(4) { animation-delay: .25s;  animation-duration: .8s; }
    .bar-loader span:nth-child(5) { animation-delay: .1s;   animation-duration: .75s; }
    .bar-loader span:nth-child(6) { animation-delay: .2s;   animation-duration: .65s; }

    /* ── Layout ─────────────────────────────────── */
    .login-wrap {
      display: flex;
      min-height: 100vh;
      background: var(--bg);
    }

    /* ── Brand panel ───────────────────────────── */
    .brand-panel {
      width: 44%;
      background: linear-gradient(145deg, #4d7d61 0%, #73aa8b 55%, #8dbfa3 100%);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 2.5rem 3rem;
      position: relative;
      overflow: hidden;
    }

    .brand-panel::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 80% 20%, rgba(255,255,255,0.10) 0%, transparent 55%),
        radial-gradient(circle at 10% 85%, rgba(0,0,0,0.08) 0%, transparent 50%);
      pointer-events: none;
    }

    .brand-circle {
      position: absolute;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.12);
    }

    .brand-logo-box {
      width: 52px;
      height: 52px;
      background: rgba(255,255,255,0.2);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.3);
    }

    .brand-feature {
      display: flex;
      align-items: center;
      gap: .75rem;
      padding: .65rem .85rem;
      background: rgba(255,255,255,0.1);
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.15);
      backdrop-filter: blur(4px);
    }

    /* ── Form panel ────────────────────────────── */
    .form-panel {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 2.5rem;
      background: #ffffff;
    }

    .form-inner {
      width: 100%;
      max-width: 390px;
      animation: fadeUp .4s ease both;
    }

    /* ── Header ─────────────────────────────────── */
    .form-header {
      margin-bottom: 2rem;
    }

    .form-logo-row {
      display: flex;
      align-items: center;
      gap: .65rem;
      margin-bottom: 1.5rem;
    }

    .form-logo-icon {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #73aa8b, #4d7d61);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(115,170,139,.35);
    }

    .greeting-title {
      margin: 0 0 .3rem;
      font-size: 1.65rem;
      font-weight: 800;
      color: var(--tx);
      letter-spacing: -.03em;
      line-height: 1.1;
    }

    .greeting-sub {
      margin: 0;
      font-size: .875rem;
      color: var(--tx3);
      line-height: 1.5;
    }

    .greeting-accent {
      color: var(--mil);
      font-weight: 700;
    }

    /* ── Fields ─────────────────────────────────── */
    .field-wrap {
      position: relative;
      display: flex;
      align-items: center;
      background: #f9fafb;
      border: 1.5px solid #e5e7eb;
      border-radius: 12px;
      transition: border-color .15s, box-shadow .15s, background .15s;
    }

    .field-wrap:hover { border-color: rgba(115,170,139,.6); }

    .field-wrap:focus-within {
      border-color: var(--mil);
      background: #ffffff;
      box-shadow: 0 0 0 4px rgba(115,170,139,.13);
    }

    .field-wrap input {
      flex: 1;
      height: 46px;
      padding: 0 .75rem 0 2.5rem;
      background: transparent;
      border: none;
      outline: none;
      font-size: .9rem;
      color: var(--tx);
      min-width: 0;
    }

    .field-wrap input::placeholder { color: #9ca3af; }

    /* neutralizar autofill del navegador */
    .field-wrap input:-webkit-autofill,
    .field-wrap input:-webkit-autofill:hover,
    .field-wrap input:-webkit-autofill:focus {
      -webkit-box-shadow: 0 0 0 1000px #f9fafb inset !important;
      -webkit-text-fill-color: #1a2e22 !important;
      transition: background-color 5000s ease-in-out 0s;
    }

    .field-icon {
      position: absolute;
      left: .85rem;
      color: var(--tx3);
      font-size: 1rem;
      pointer-events: none;
      transition: color .15s;
      display: flex;
      align-items: center;
    }

    .field-wrap:focus-within .field-icon { color: var(--mil); }

    .toggle-pw {
      flex-shrink: 0;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--tx3);
      padding: 0 .85rem 0 .5rem;
      height: 46px;
      display: flex;
      align-items: center;
      transition: color .15s;
    }

    .toggle-pw:hover { color: var(--mil); }

    .forgot-link {
      background: none;
      border: none;
      cursor: pointer;
      font-size: .78rem;
      color: var(--mil);
      font-weight: 600;
      padding: 0;
      letter-spacing: .01em;
      transition: opacity .15s;
    }

    .forgot-link:hover { opacity: .72; }

    /* ── Remember me toggle ─────────────────────── */
    .remember-row {
      display: flex;
      align-items: center;
      gap: .6rem;
      margin-bottom: 1.25rem;
      cursor: pointer;
      user-select: none;
    }

    .remember-row input[type="checkbox"] { display: none; }

    .toggle-track {
      width: 36px;
      height: 20px;
      border-radius: 999px;
      background: var(--border2);
      position: relative;
      flex-shrink: 0;
      transition: background .2s;
    }

    .toggle-track::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: white;
      box-shadow: 0 1px 4px rgba(0,0,0,.2);
      transition: transform .2s;
    }

    .remember-row input:checked ~ .toggle-track {
      background: var(--mil);
    }

    .remember-row input:checked ~ .toggle-track::after {
      transform: translateX(16px);
    }

    .remember-label {
      font-size: .82rem;
      color: var(--tx2);
      font-weight: 500;
    }

    /* ── Submit ─────────────────────────────────── */
    .submit-btn {
      width: 100%;
      height: 48px;
      background: var(--mil);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: .95rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .6rem;
      transition: background .15s, transform .1s, box-shadow .15s;
      box-shadow: 0 4px 14px rgba(115,170,139,.35);
      letter-spacing: .01em;
    }

    .submit-btn:hover:not(:disabled) {
      background: var(--mil-dark);
      box-shadow: 0 6px 20px rgba(115,170,139,.4);
      transform: translateY(-1px);
    }

    .submit-btn:active:not(:disabled) { transform: translateY(0); }
    .submit-btn:disabled { opacity: .65; cursor: not-allowed; box-shadow: none; }

    /* ── Error ──────────────────────────────────── */
    .error-box {
      background: rgba(201,64,64,.08);
      border: 1px solid rgba(201,64,64,.3);
      border-radius: 10px;
      padding: .65rem .9rem;
      font-size: .84rem;
      color: var(--red);
      display: flex;
      align-items: center;
      gap: .5rem;
    }

    /* ── Theme toggle ───────────────────────────── */
    .theme-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--tx3);
      font-size: .8rem;
      display: inline-flex;
      align-items: center;
      gap: .4rem;
      padding: .3rem .6rem;
      border-radius: 6px;
      transition: color .15s, background .15s;
    }

    .theme-btn:hover { color: var(--tx2); background: var(--surface2); }

    @media (max-width: 720px) {
      .brand-panel { display: none; }
    }

    /* ── Demo credentials ───────────────────────── */
    .demo-box {
      margin-top: 1.5rem;
      padding: .85rem 1rem;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 12px;
    }

    .demo-title {
      margin: 0 0 .6rem;
      font-size: .7rem;
      font-weight: 700;
      color: var(--tx2);
      text-transform: uppercase;
      letter-spacing: .06em;
    }

    .demo-list { display: flex; flex-direction: column; gap: .3rem; }

    .demo-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .5rem;
      width: 100%;
      background: none;
      border: none;
      cursor: pointer;
      padding: .4rem .5rem;
      border-radius: 8px;
      text-align: left;
      font-family: inherit;
      transition: background .12s;
    }

    .demo-row:hover { background: var(--card-accent); }
    .demo-role  { font-size: .78rem; font-weight: 700; color: var(--tx); }
    .demo-email { font-size: .74rem; color: var(--tx3); }

    .demo-note {
      margin: .65rem 0 0;
      font-size: .72rem;
      color: var(--tx3);
    }

    .demo-note code {
      background: var(--card-accent);
      padding: .1rem .4rem;
      border-radius: 5px;
      color: var(--tx2);
    }
  `],
  template: `
    <div class="login-wrap">

      <!-- ── Brand panel ─────────────────────────── -->
      <div class="brand-panel">
        <span class="brand-circle" style="width:320px;height:320px;top:-80px;right:-80px;"></span>
        <span class="brand-circle" style="width:200px;height:200px;bottom:60px;left:-60px;"></span>
        <span class="brand-circle" style="width:100px;height:100px;bottom:200px;right:40px;"></span>

        <div style="position:relative;z-index:1;">
          <div class="brand-logo-box">
            <i class="ti ti-heart-rate-monitor" style="font-size:1.6rem;color:white;"></i>
          </div>
          <div style="margin-top:1.25rem;">
            <h1 style="margin:0;font-size:1.75rem;font-weight:800;color:white;letter-spacing:-.02em;">MedConnect</h1>
            <p style="margin:.4rem 0 0;font-size:.9rem;color:rgba(255,255,255,.75);line-height:1.5;">
              Videoconsultas médicas<br>seguras y en tiempo real
            </p>
          </div>
        </div>

        <div style="position:relative;z-index:1;display:flex;flex-direction:column;gap:.65rem;">
          <div class="brand-feature">
            <i class="ti ti-video" style="color:white;font-size:1.1rem;flex-shrink:0;"></i>
            <div>
              <div style="font-size:.82rem;font-weight:700;color:white;">Consultas por video</div>
              <div style="font-size:.75rem;color:rgba(255,255,255,.65);">Conexión directa paciente–médico</div>
            </div>
          </div>
          <div class="brand-feature">
            <i class="ti ti-file-certificate" style="color:white;font-size:1.1rem;flex-shrink:0;"></i>
            <div>
              <div style="font-size:.82rem;font-weight:700;color:white;">Recetas digitales</div>
              <div style="font-size:.75rem;color:rgba(255,255,255,.65);">Emitidas y firmadas al instante</div>
            </div>
          </div>
          <div class="brand-feature">
            <i class="ti ti-history" style="color:white;font-size:1.1rem;flex-shrink:0;"></i>
            <div>
              <div style="font-size:.82rem;font-weight:700;color:white;">Historial clínico</div>
              <div style="font-size:.75rem;color:rgba(255,255,255,.65);">Seguimiento completo del paciente</div>
            </div>
          </div>
        </div>

        <div style="position:relative;z-index:1;">
          <span style="font-size:.72rem;color:rgba(255,255,255,.45);">MedConnect v1.0 · 2025</span>
        </div>
      </div>

      <!-- ── Form panel ──────────────────────────── -->
      <div class="form-panel">
        <div class="form-inner">

          <!-- Header -->
          <div class="form-header">
            <h2 class="greeting-title">
              Bienvenido de <span class="greeting-accent">nuevo</span>
            </h2>
            <p class="greeting-sub">Ingresa tus credenciales para acceder a tu espacio médico.</p>
          </div>

          <!-- Error -->
          @if (auth.error()) {
            <div class="error-box" style="margin-bottom:1.25rem;">
              <i class="ti ti-alert-circle" style="flex-shrink:0;font-size:1rem;"></i>
              {{ auth.error() }}
            </div>
          }

          <!-- Fields -->
          <div style="display:flex;flex-direction:column;gap:1rem;margin-bottom:1.5rem;">

            <div>
              <label style="font-size:.75rem;font-weight:700;color:var(--tx2);text-transform:uppercase;letter-spacing:.07em;display:block;margin-bottom:.45rem;">
                Correo electrónico
              </label>
              <div class="field-wrap">
                <i class="ti ti-mail field-icon"></i>
                <input type="email" [(ngModel)]="email" placeholder="correo@ejemplo.com"
                  (keydown.enter)="submit()" autocomplete="email">
              </div>
            </div>

            <div>
              <label style="font-size:.75rem;font-weight:700;color:var(--tx2);text-transform:uppercase;letter-spacing:.07em;display:block;margin-bottom:.45rem;">
                Contraseña
              </label>
              <div class="field-wrap">
                <i class="ti ti-lock field-icon"></i>
                <input [type]="showPassword() ? 'text' : 'password'" [(ngModel)]="password"
                  placeholder="••••••••" (keydown.enter)="submit()" autocomplete="current-password">
                <button class="toggle-pw" (click)="showPassword.update(v=>!v)" tabindex="-1">
                  <i [class]="'ti ti-' + (showPassword() ? 'eye-off' : 'eye')" style="font-size:1rem;"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Remember me -->
          <label class="remember-row">
            <input type="checkbox" [checked]="rememberMe()" (change)="rememberMe.update(v=>!v)">
            <span class="toggle-track"></span>
            <span class="remember-label">Recordar mis credenciales</span>
          </label>

          <!-- Submit -->
          <button class="submit-btn" (click)="submit()" [disabled]="auth.loading()" style="margin-bottom:.85rem;">
            @if (auth.loading()) {
              <div class="bar-loader">
                <span></span><span></span><span></span><span></span><span></span><span></span>
              </div>
              Ingresando...
            } @else {
              <i class="ti ti-login" style="font-size:1.1rem;"></i>
              Ingresar
            }
          </button>

          <!-- Forgot password -->
          <div style="text-align:center;margin-bottom:1rem;">
            <button class="forgot-link" type="button">¿Olvidaste tu contraseña?</button>
          </div>

          <!-- Theme toggle -->
          <div style="text-align:center;margin-top:.5rem;">
            <button class="theme-btn" (click)="theme.toggle()">
              <i [class]="'ti ti-' + (theme.dark() ? 'sun' : 'moon')"></i>
              {{ theme.dark() ? 'Modo claro' : 'Modo oscuro' }}
            </button>
          </div>

          <!-- Demo credentials -->
          <div class="demo-box">
            <p class="demo-title">Usuarios de demo</p>
            <div class="demo-list">
              @for (u of demoUsers; track u.email) {
                <button type="button" class="demo-row" (click)="fillDemoUser(u)">
                  <span class="demo-role">{{ u.label }}</span>
                  <span class="demo-email">{{ u.email }}</span>
                </button>
              }
            </div>
            <p class="demo-note">Contraseña para todos: <code>demo123</code></p>
          </div>

        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  auth   = inject(AuthService);
  theme  = inject(ThemeService);
  router = inject(Router);

  email        = '';
  password     = '';
  showPassword = signal(false);
  rememberMe   = signal(false);

  readonly demoUsers = DEMO_USERS.map(u => ({ email: u.email, label: ROLE_LABEL[u.role] ?? u.role }));

  fillDemoUser(u: { email: string }) {
    this.email = u.email;
    this.password = 'demo123';
  }

  submit() {
    if (!this.email.trim() || !this.password) return;
    this.auth.login({ email: this.email.trim(), password: this.password }).subscribe({
      next: () => {
        const role = this.auth.user()?.role;
        const dest: Record<string, string> = {
          SuperAdmin:          '/dashboard/super-admin',
          Admin:               '/dashboard/admin',
          Doctor:              '/dashboard',
          SupportDoctor:       '/dashboard',
          Secretary:           '/reception',
          Patient:             '/patient',
          ExternalTechnician:  '/dashboard',
        };
        this.router.navigate([dest[role ?? ''] ?? '/dashboard']);
      },
      error: () => {},
    });
  }
}
