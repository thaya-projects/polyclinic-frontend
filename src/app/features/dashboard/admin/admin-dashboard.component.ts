import { Component, OnInit, inject, signal } from '@angular/core';
import { SidebarComponent } from '../../../core/layout/sidebar/sidebar.component';
import { TopbarComponent } from '../../../core/layout/topbar/topbar.component';
import { DashboardAdminService } from '../../../core/services/dashboard-admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { ClinicDashboardDto } from '../../../core/models/dashboard.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [SidebarComponent, TopbarComponent],
  styles: [`
    .kpi-grid  { display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; margin-bottom:1.5rem; }
    .kpi-grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin-bottom:1.5rem; }
    .kpi-card  {
      background:var(--surface); border:1px solid var(--border);
      border-radius:12px; padding:1.1rem 1.25rem;
    }
    .kpi-icon {
      width:38px; height:38px; border-radius:10px;
      display:flex; align-items:center; justify-content:center;
      margin-bottom:.65rem;
    }
    .kpi-value { font-size:1.65rem; font-weight:800; color:var(--tx); line-height:1; }
    .kpi-label { font-size:.75rem; color:var(--tx3); margin-top:.25rem; }
    .kpi-sub   { font-size:.75rem; color:var(--tx3); margin-top:.2rem; }
    .kpi-warn  { color:var(--red); font-weight:700; }
    .tbl { width:100%; border-collapse:collapse; }
    .tbl th { font-size:.72rem; font-weight:700; color:var(--tx3); text-transform:uppercase;
              letter-spacing:.06em; padding:.5rem .75rem; border-bottom:1px solid var(--border); text-align:left; }
    .tbl td { font-size:.84rem; color:var(--tx); padding:.65rem .75rem; border-bottom:1px solid var(--border); }
    .tbl tr:last-child td { border-bottom:none; }
    .tbl tr:hover td { background:var(--surface2); }
    .dot-green { display:inline-block; width:7px; height:7px; border-radius:50%; background:var(--mil); margin-right:.35rem; }
    .dot-red   { display:inline-block; width:7px; height:7px; border-radius:50%; background:var(--red); margin-right:.35rem; }
    .skeleton {
      background: linear-gradient(90deg, var(--surface2) 25%, var(--border) 50%, var(--surface2) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      border-radius:6px; height:2rem;
    }
    @keyframes shimmer { from { background-position:200% 0; } to { background-position:-200% 0; } }
  `],
  template: `
    <div class="app-layout">
      <app-sidebar />
      <div class="main-content">
        <app-topbar
          [title]="data()?.clinicName ?? 'Panel Administrativo'"
          [subtitle]="data()?.city ?? 'Gestión de clínica'" />

        <div class="page-content">

          @if (error()) {
            <div style="background:rgba(201,64,64,.08);border:1px solid rgba(201,64,64,.3);border-radius:10px;padding:.75rem 1rem;margin-bottom:1.25rem;font-size:.85rem;color:var(--red);display:flex;gap:.5rem;align-items:center;">
              <i class="ti ti-alert-circle"></i> {{ error() }}
            </div>
          }

          <!-- ── Fila 1: Doctores + Especialidades + Pacientes + Consultas hoy ── -->
          <div class="kpi-grid">

            <div class="kpi-card">
              <div class="kpi-icon" style="background:rgba(115,170,139,.12);">
                <i class="ti ti-stethoscope" style="color:var(--mil);font-size:1.1rem;"></i>
              </div>
              @if (loading()) { <div class="skeleton"></div> } @else {
                <div class="kpi-value">{{ data()?.totalDoctors ?? '—' }}</div>
                <div class="kpi-label">Doctores</div>
                <div class="kpi-sub">{{ data()?.activeDoctors }} activos</div>
              }
            </div>

            <div class="kpi-card">
              <div class="kpi-icon" style="background:rgba(115,170,139,.12);">
                <i class="ti ti-heart-rate-monitor" style="color:var(--mil);font-size:1.1rem;"></i>
              </div>
              @if (loading()) { <div class="skeleton"></div> } @else {
                <div class="kpi-value">{{ data()?.totalSpecialties ?? '—' }}</div>
                <div class="kpi-label">Especialidades</div>
              }
            </div>

            <div class="kpi-card">
              <div class="kpi-icon" style="background:rgba(115,170,139,.12);">
                <i class="ti ti-users" style="color:var(--mil);font-size:1.1rem;"></i>
              </div>
              @if (loading()) { <div class="skeleton"></div> } @else {
                <div class="kpi-value">{{ data()?.totalPatients ?? '—' }}</div>
                <div class="kpi-label">Pacientes</div>
                <div class="kpi-sub">+{{ data()?.newPatientsThisMonth }} este mes</div>
              }
            </div>

            <div class="kpi-card" style="border-color:var(--mil);">
              <div class="kpi-icon" style="background:rgba(115,170,139,.12);">
                <i class="ti ti-calendar-check" style="color:var(--mil);font-size:1.1rem;"></i>
              </div>
              @if (loading()) { <div class="skeleton"></div> } @else {
                <div class="kpi-value" style="color:var(--mil);">{{ data()?.consultationsToday ?? '—' }}</div>
                <div class="kpi-label">Consultas hoy</div>
                <div class="kpi-sub">{{ data()?.videoConsultationsToday }} videoconsultas</div>
              }
            </div>
          </div>

          <!-- ── Fila 2: Pendientes + Confirmadas + Pagos pendientes ── -->
          <div class="kpi-grid3">

            <div class="kpi-card">
              <div class="kpi-icon" style="background:rgba(122,74,10,.08);">
                <i class="ti ti-clock-hour-3" style="color:var(--amber);font-size:1.1rem;"></i>
              </div>
              @if (loading()) { <div class="skeleton"></div> } @else {
                <div class="kpi-value">{{ data()?.pendingConsultations ?? '—' }}</div>
                <div class="kpi-label">Consultas pendientes</div>
                <div class="kpi-sub">{{ data()?.confirmedConsultations }} confirmadas</div>
              }
            </div>

            <div class="kpi-card">
              <div class="kpi-icon" style="background:rgba(201,64,64,.08);">
                <i class="ti ti-credit-card-off" style="color:var(--red);font-size:1.1rem;"></i>
              </div>
              @if (loading()) { <div class="skeleton"></div> } @else {
                <div class="kpi-value" [class.kpi-warn]="(data()?.pendingPaymentsCount ?? 0) > 0">
                  {{ data()?.pendingPaymentsCount ?? '—' }}
                </div>
                <div class="kpi-label">Pagos pendientes</div>
                <div class="kpi-sub" style="font-weight:600;">{{ formatMoney(data()?.pendingPaymentsAmount) }}</div>
              }
            </div>

            <div class="kpi-card">
              <div class="kpi-icon" style="background:rgba(122,74,10,.08);">
                <i class="ti ti-coin" style="color:var(--amber);font-size:1.1rem;"></i>
              </div>
              @if (loading()) { <div class="skeleton"></div> } @else {
                <div class="kpi-value" [class.kpi-warn]="(data()?.pendingFeeApprovals ?? 0) > 0">
                  {{ data()?.pendingFeeApprovals ?? '—' }}
                </div>
                <div class="kpi-label">Honorarios por aprobar</div>
              }
            </div>
          </div>

          <!-- ── Resumen de doctores ── -->
          <div class="card">
            <p class="section-heading">Resumen de doctores</p>
            @if (loading()) {
              <div style="display:flex;flex-direction:column;gap:.5rem;">
                @for (_ of [1,2,3]; track $index) {
                  <div class="skeleton" style="height:1.5rem;"></div>
                }
              </div>
            } @else if ((data()?.doctorSummary?.length ?? 0) === 0) {
              <div style="color:var(--tx3);font-size:.85rem;padding:.5rem 0;">Sin doctores registrados aún.</div>
            } @else {
              <table class="tbl">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Especialidad</th>
                    <th>Consultas hoy</th>
                    <th>Consulta</th>
                    <th>Video</th>
                    <th>Honorarios</th>
                  </tr>
                </thead>
                <tbody>
                  @for (d of data()!.doctorSummary; track d.doctorName) {
                    <tr>
                      <td style="font-weight:600;">{{ d.doctorName }}</td>
                      <td style="color:var(--tx3);">{{ d.specialtyName }}</td>
                      <td style="text-align:center;font-weight:700;color:var(--mil);">{{ d.consultationsToday }}</td>
                      <td>{{ formatMoney(d.consultationFee) }}</td>
                      <td>{{ formatMoney(d.videoFee) }}</td>
                      <td>
                        @if (d.feesApproved) {
                          <span style="font-size:.72rem;font-weight:700;color:var(--mil);">
                            <span class="dot-green"></span>Aprobado
                          </span>
                        } @else {
                          <span style="font-size:.72rem;font-weight:700;color:var(--red);">
                            <span class="dot-red"></span>Pendiente
                          </span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>

        </div>
      </div>
    </div>
  `,
})
export class AdminDashboardComponent implements OnInit {
  private svc  = inject(DashboardAdminService);
  private auth = inject(AuthService);

  data    = signal<ClinicDashboardDto | null>(null);
  loading = signal(true);
  error   = signal<string | null>(null);

  ngOnInit() {
    const clinicId = this.auth.user()?.clinicId;
    if (!clinicId) {
      this.error.set('No se encontró la clínica asociada a este usuario.');
      this.loading.set(false);
      return;
    }
    this.svc.getClinicDashboard(clinicId).subscribe({
      next:  d  => { this.data.set(d);  this.loading.set(false); },
      error: err => {
        this.error.set(err?.error?.message ?? 'Error al cargar el dashboard.');
        this.loading.set(false);
      },
    });
  }

  formatMoney(value?: number | null): string {
    if (value == null) return '—';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
  }
}
