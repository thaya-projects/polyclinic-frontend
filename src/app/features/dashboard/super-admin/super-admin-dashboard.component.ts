import { Component, OnInit, inject, signal } from '@angular/core';
import { SidebarComponent } from '../../../core/layout/sidebar/sidebar.component';
import { TopbarComponent } from '../../../core/layout/topbar/topbar.component';
import { DashboardAdminService } from '../../../core/services/dashboard-admin.service';
import { SystemDashboardDto } from '../../../core/models/dashboard.model';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [SidebarComponent, TopbarComponent],
  styles: [`
    .kpi-grid  { display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; margin-bottom:1.5rem; }
    .kpi-grid2 { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin-bottom:1.5rem; }
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
    .badge-active {
      display:inline-flex; align-items:center; gap:.3rem;
      background:rgba(115,170,139,.12); color:var(--mil);
      border-radius:20px; padding:.2rem .65rem; font-size:.72rem; font-weight:700;
    }
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
        <app-topbar title="Panel SuperAdmin" subtitle="Vista global del sistema" />

        <div class="page-content">

          @if (error()) {
            <div style="background:rgba(201,64,64,.08);border:1px solid rgba(201,64,64,.3);border-radius:10px;padding:.75rem 1rem;margin-bottom:1.25rem;font-size:.85rem;color:var(--red);display:flex;gap:.5rem;align-items:center;">
              <i class="ti ti-alert-circle"></i> {{ error() }}
            </div>
          }

          <!-- ── Fila 1: Clínicas + Doctores + Pacientes + Consultas ── -->
          <div class="kpi-grid">

            <div class="kpi-card">
              <div class="kpi-icon" style="background:rgba(115,170,139,.12);">
                <i class="ti ti-building-hospital" style="color:var(--mil);font-size:1.1rem;"></i>
              </div>
              @if (loading()) { <div class="skeleton"></div> } @else {
                <div class="kpi-value">{{ data()?.totalClinics ?? '—' }}</div>
                <div class="kpi-label">Clínicas registradas</div>
                <div class="kpi-sub">{{ data()?.activeClinics }} activas</div>
              }
            </div>

            <div class="kpi-card">
              <div class="kpi-icon" style="background:rgba(115,170,139,.12);">
                <i class="ti ti-stethoscope" style="color:var(--mil);font-size:1.1rem;"></i>
              </div>
              @if (loading()) { <div class="skeleton"></div> } @else {
                <div class="kpi-value">{{ data()?.totalDoctors ?? '—' }}</div>
                <div class="kpi-label">Doctores registrados</div>
                <div class="kpi-sub">{{ data()?.activeDoctors }} activos</div>
              }
            </div>

            <div class="kpi-card">
              <div class="kpi-icon" style="background:rgba(115,170,139,.12);">
                <i class="ti ti-users" style="color:var(--mil);font-size:1.1rem;"></i>
              </div>
              @if (loading()) { <div class="skeleton"></div> } @else {
                <div class="kpi-value">{{ data()?.totalPatients ?? '—' }}</div>
                <div class="kpi-label">Pacientes en el sistema</div>
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

          <!-- ── Fila 2: Pagos pendientes + Honorarios pendientes + Vacío/acción ── -->
          <div class="kpi-grid2">

            <div class="kpi-card">
              <div class="kpi-icon" style="background:rgba(201,64,64,.08);">
                <i class="ti ti-credit-card-off" style="color:var(--red);font-size:1.1rem;"></i>
              </div>
              @if (loading()) { <div class="skeleton"></div> } @else {
                <div class="kpi-value" [class.kpi-warn]="(data()?.pendingPayments ?? 0) > 0">
                  {{ data()?.pendingPayments ?? '—' }}
                </div>
                <div class="kpi-label">Pagos pendientes</div>
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

            <div class="kpi-card" style="background:linear-gradient(135deg,rgba(115,170,139,.08),rgba(115,170,139,.02));border-color:rgba(115,170,139,.35);">
              <div class="kpi-icon" style="background:rgba(115,170,139,.15);">
                <i class="ti ti-chart-bar" style="color:var(--mil);font-size:1.1rem;"></i>
              </div>
              @if (loading()) { <div class="skeleton"></div> } @else {
                <div class="kpi-value" style="color:var(--mil);">
                  {{ (data()?.videoConsultationsToday ?? 0) + (data()?.consultationsToday ?? 0) }}
                </div>
                <div class="kpi-label">Actividad total hoy</div>
                <div class="kpi-sub">Presenciales + Video</div>
              }
            </div>
          </div>

          <!-- ── Clínicas recientes ── -->
          <div class="card">
            <p class="section-heading">Clínicas recientes</p>
            @if (loading()) {
              <div style="display:flex;flex-direction:column;gap:.5rem;">
                @for (_ of [1,2,3]; track $index) {
                  <div class="skeleton" style="height:1.5rem;"></div>
                }
              </div>
            } @else if ((data()?.recentClinics?.length ?? 0) === 0) {
              <div style="color:var(--tx3);font-size:.85rem;padding:.5rem 0;">Sin clínicas registradas aún.</div>
            } @else {
              <table class="tbl">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Ciudad</th>
                    <th>Fecha de registro</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of data()!.recentClinics; track c.clinicId) {
                    <tr>
                      <td style="font-weight:600;">{{ c.name }}</td>
                      <td>{{ c.city }}</td>
                      <td>{{ formatDate(c.createdAt) }}</td>
                      <td><span class="badge-active"><i class="ti ti-circle-filled" style="font-size:.5rem;"></i> Activa</span></td>
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
export class SuperAdminDashboardComponent implements OnInit {
  private svc = inject(DashboardAdminService);

  data    = signal<SystemDashboardDto | null>(null);
  loading = signal(true);
  error   = signal<string | null>(null);

  ngOnInit() {
    this.svc.getSystemDashboard().subscribe({
      next:  d  => { this.data.set(d);  this.loading.set(false); },
      error: err => {
        this.error.set(err?.error?.message ?? 'Error al cargar el dashboard.');
        this.loading.set(false);
      },
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
