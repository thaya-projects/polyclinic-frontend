import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../core/layout/sidebar/sidebar.component';
import { TopbarComponent } from '../../../core/layout/topbar/topbar.component';
import { DataTableComponent, TableColumn } from '../../../shared/components/data-table.component';
import { UserAdminService } from '../../../core/services/user-admin.service';
import { SpecialtyAdminService } from '../../../core/services/specialty-admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserSummary } from '../../../core/models/user-admin.model';
import { SpecialtyDto } from '../../../core/models/specialty-admin.model';

type RoleFilter = 'all' | 'Doctor' | 'Secretary' | 'SupportDoctor' | 'ExternalTechnician';
type NewRole    = 'Doctor' | 'Secretary' | 'SupportDoctor';

const ROLE_FILTERS: { key: RoleFilter; label: string; icon: string }[] = [
  { key: 'all',               label: 'Todos',        icon: 'users'        },
  { key: 'Doctor',            label: 'Doctores',     icon: 'stethoscope'  },
  { key: 'Secretary',         label: 'Secretarias',  icon: 'headset'      },
  { key: 'SupportDoctor',     label: 'Doc. Apoyo',   icon: 'user-check'   },
  { key: 'ExternalTechnician',label: 'Técnicos ext.',icon: 'microscope'   },
];

const COLUMNS: TableColumn[] = [
  { key: 'fullName',     label: 'Nombre',         width: '200px' },
  { key: 'email',        label: 'Correo',         type: 'email'  },
  { key: 'role',         label: 'Rol',            type: 'role',  width: '130px' },
  { key: 'specialtyName',label: 'Especialidad'                   },
  { key: 'isActive',     label: 'Estado',         type: 'status', width: '100px', align: 'center' },
  { key: 'lastLogin',    label: 'Último acceso',  type: 'date',   width: '130px' },
];

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [SidebarComponent, TopbarComponent, DataTableComponent, FormsModule],
  styles: [`
    /* ── Role filter chips ── */
    .role-chips { display:flex;gap:.4rem;flex-wrap:wrap; }
    .rc {
      display:inline-flex;align-items:center;gap:.4rem;
      padding:.3rem .8rem;border-radius:8px;font-size:.78rem;font-weight:600;
      background:var(--surface2);border:1.5px solid var(--border2);color:var(--tx2);
      cursor:pointer;transition:all .15s;
    }
    .rc:hover { border-color:rgba(115,170,139,.5);color:var(--tx); }
    .rc.on { background:var(--mil);border-color:var(--mil);color:white; }

    /* ── Add button ── */
    .add-btn {
      height:38px;padding:0 1rem;background:var(--mil);color:white;border:none;
      border-radius:9px;font-size:.85rem;font-weight:700;cursor:pointer;
      display:inline-flex;align-items:center;gap:.4rem;
      transition:background .15s,transform .1s,box-shadow .15s;
      box-shadow:0 3px 10px rgba(115,170,139,.3);white-space:nowrap;
    }
    .add-btn:hover { background:var(--mil-dark);transform:translateY(-1px); }

    /* ── Modal overlay ── */
    .overlay {
      position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:900;
      display:flex;align-items:center;justify-content:center;padding:1rem;
      animation:fadein .15s ease;
    }
    @keyframes fadein { from{opacity:0} to{opacity:1} }
    .modal {
      background:var(--surface);border:1px solid var(--border);border-radius:16px;
      width:100%;max-width:560px;max-height:90vh;display:flex;flex-direction:column;
      box-shadow:0 20px 60px rgba(0,0,0,.25);
      animation:slideup .18s ease;
    }
    @keyframes slideup { from{transform:translateY(14px);opacity:0} to{transform:translateY(0);opacity:1} }
    .modal-hdr {
      display:flex;align-items:center;justify-content:space-between;
      padding:1.25rem 1.5rem;border-bottom:1px solid var(--border);
    }
    .modal-body { flex:1;overflow-y:auto;padding:1.5rem; }
    .modal-ftr { padding:1rem 1.5rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:.65rem; }
    .close-btn { background:none;border:none;cursor:pointer;color:var(--tx3);font-size:1.1rem;padding:.25rem;border-radius:6px;transition:color .12s; }
    .close-btn:hover { color:var(--tx); }

    /* ── Role selector tabs (inside modal) ── */
    .role-tabs { display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:1.5rem; }
    .rt {
      flex:1;min-width:100px;padding:.5rem;border-radius:9px;
      background:var(--surface2);border:1.5px solid var(--border2);
      font-size:.78rem;font-weight:600;color:var(--tx2);cursor:pointer;
      text-align:center;transition:all .15s;
    }
    .rt:hover { border-color:rgba(115,170,139,.5); }
    .rt.on { background:rgba(115,170,139,.1);border-color:var(--mil);color:var(--mil); }

    /* ── Form fields ── */
    .fgrid { display:grid;grid-template-columns:1fr 1fr;gap:.85rem; }
    .fgrid.single { grid-template-columns:1fr; }
    .flabel { font-size:.72rem;font-weight:700;color:var(--tx2);text-transform:uppercase;letter-spacing:.07em;display:block;margin-bottom:.4rem; }
    .fwrap {
      display:flex;align-items:center;
      background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:10px;
      transition:border-color .15s,box-shadow .15s;
    }
    .fwrap:focus-within { border-color:var(--mil);box-shadow:0 0 0 3px rgba(115,170,139,.12); }
    .fwrap input,.fwrap select {
      flex:1;height:40px;padding:0 .75rem;background:transparent;
      border:none;outline:none;font-size:.875rem;color:var(--tx);
    }
    .fwrap input::placeholder { color:#9ca3af; }
    .fwrap select { cursor:pointer; }
    .pw-toggle { background:none;border:none;cursor:pointer;color:var(--tx3);padding:0 .65rem;height:40px;display:flex;align-items:center;transition:color .12s; }
    .pw-toggle:hover { color:var(--mil); }
    .gen-btn { background:none;border:none;cursor:pointer;font-size:.72rem;font-weight:600;color:var(--mil);padding:0;margin-left:auto;transition:opacity .12s; }
    .gen-btn:hover { opacity:.7; }
    .divider { border:none;border-top:1px solid var(--border);margin:.85rem 0; }
    .section-sub { font-size:.72rem;font-weight:700;color:var(--mil);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.75rem; }

    /* ── Submit btn ── */
    .submit-btn {
      height:40px;padding:0 1.25rem;background:var(--mil);color:white;border:none;
      border-radius:9px;font-size:.88rem;font-weight:700;cursor:pointer;
      display:inline-flex;align-items:center;gap:.4rem;transition:background .15s;
    }
    .submit-btn:hover:not(:disabled) { background:var(--mil-dark); }
    .submit-btn:disabled { opacity:.6;cursor:not-allowed; }
    .cancel-btn {
      height:40px;padding:0 1rem;background:var(--surface2);border:1.5px solid var(--border2);
      color:var(--tx2);border-radius:9px;font-size:.88rem;font-weight:600;cursor:pointer;transition:background .15s;
    }
    .cancel-btn:hover { background:var(--card-accent); }

    /* ── Error box ── */
    .err { background:rgba(201,64,64,.08);border:1px solid rgba(201,64,64,.28);border-radius:8px;
           padding:.55rem .8rem;font-size:.82rem;color:var(--red);display:flex;align-items:center;gap:.4rem;margin-bottom:1rem; }

    /* ── Bar loader ── */
    @keyframes bar-b { 0%,100%{transform:scaleY(.25)} 50%{transform:scaleY(1)} }
    .bloader { display:inline-flex;align-items:center;gap:3px;height:16px; }
    .bloader span { display:block;width:3px;height:100%;background:white;border-radius:2px;transform-origin:bottom;animation:bar-b .8s ease-in-out infinite; }
    .bloader span:nth-child(1){animation-delay:0s;animation-duration:.7s}
    .bloader span:nth-child(2){animation-delay:.15s;animation-duration:.9s}
    .bloader span:nth-child(3){animation-delay:.05s;animation-duration:.6s}
    .bloader span:nth-child(4){animation-delay:.2s;animation-duration:.8s}
  `],
  template: `
    <div class="app-layout">
      <app-sidebar />
      <div class="main-content">
        <app-topbar title="Usuarios" subtitle="Gestión de equipo médico" />
        <div class="page-content">

          <app-data-table
            [columns]="COLS"
            [rows]="filtered()"
            [loading]="loading()"
            [total]="total()"
            [page]="page()"
            [pageSize]="PAGE_SIZE"
            idKey="userId"
            emptyMsg="No se encontraron usuarios con los filtros actuales."
            searchPlaceholder="Buscar por nombre o correo..."
            (searchChange)="onSearch($event)"
            (pageChange)="onPageChange($event)"
            (rowAction)="onRowAction($event)">

            <!-- Filtros por rol -->
            <div slot="filters" class="role-chips">
              @for (f of ROLE_FILTERS; track f.key) {
                <button class="rc" [class.on]="roleFilter() === f.key"
                  (click)="setRoleFilter(f.key)">
                  <i [class]="'ti ti-' + f.icon"></i>
                  {{ f.label }}
                </button>
              }
            </div>

            <!-- Botón agregar -->
            <div slot="actions">
              <button class="add-btn" (click)="openModal()">
                <i class="ti ti-user-plus"></i> Agregar usuario
              </button>
            </div>
          </app-data-table>

        </div>
      </div>
    </div>

    <!-- ══ MODAL ════════════════════════════════════════════════ -->
    @if (showModal()) {
      <div class="overlay" (click)="closeIfBackdrop($event)">
        <div class="modal" (click)="$event.stopPropagation()">

          <div class="modal-hdr">
            <div>
              <h3 style="margin:0 0 .15rem;font-size:1rem;font-weight:800;color:var(--tx);">Agregar usuario</h3>
              <p style="margin:0;font-size:.78rem;color:var(--tx3);">Selecciona el rol y completa el formulario</p>
            </div>
            <button class="close-btn" (click)="closeModal()"><i class="ti ti-x"></i></button>
          </div>

          <div class="modal-body">

            <!-- Role selector -->
            <div class="role-tabs">
              <button class="rt" [class.on]="newRole() === 'Doctor'"        (click)="newRole.set('Doctor')">
                <i class="ti ti-stethoscope" style="display:block;font-size:1.2rem;margin-bottom:.2rem;"></i>Doctor
              </button>
              <button class="rt" [class.on]="newRole() === 'Secretary'"     (click)="newRole.set('Secretary')">
                <i class="ti ti-headset" style="display:block;font-size:1.2rem;margin-bottom:.2rem;"></i>Secretaria
              </button>
              <button class="rt" [class.on]="newRole() === 'SupportDoctor'" (click)="newRole.set('SupportDoctor')">
                <i class="ti ti-user-check" style="display:block;font-size:1.2rem;margin-bottom:.2rem;"></i>Doc. Apoyo
              </button>
            </div>

            @if (modalError()) {
              <div class="err"><i class="ti ti-alert-circle" style="flex-shrink:0;"></i> {{ modalError() }}</div>
            }

            <!-- Common fields: name + email + password -->
            <p class="section-sub">Datos de acceso</p>
            <div class="fgrid" style="margin-bottom:.85rem;">
              <div>
                <label class="flabel">Nombre</label>
                <div class="fwrap"><input type="text" [(ngModel)]="form.firstName" placeholder="Carlos"></div>
              </div>
              <div>
                <label class="flabel">Apellido</label>
                <div class="fwrap"><input type="text" [(ngModel)]="form.lastName" placeholder="Pérez"></div>
              </div>
              <div>
                <label class="flabel">Correo electrónico</label>
                <div class="fwrap"><input type="email" [(ngModel)]="form.email" placeholder="usuario@clinica.com"></div>
              </div>
              <div>
                <div style="display:flex;align-items:center;margin-bottom:.4rem;">
                  <label class="flabel" style="margin:0;">Contraseña</label>
                  <button class="gen-btn" type="button" (click)="genPassword()">
                    <i class="ti ti-wand"></i> Generar
                  </button>
                </div>
                <div class="fwrap">
                  <input [type]="showPw() ? 'text' : 'password'" [(ngModel)]="form.password" placeholder="••••••••">
                  <button class="pw-toggle" type="button" (click)="showPw.update(v=>!v)" tabindex="-1">
                    <i [class]="'ti ti-' + (showPw() ? 'eye-off' : 'eye')"></i>
                  </button>
                </div>
              </div>
            </div>

            <hr class="divider">

            <!-- Specialty (Doctor, Secretary, SupportDoctor all need it) -->
            <p class="section-sub">Perfil profesional</p>
            <div class="fgrid" style="margin-bottom:.85rem;">
              <div>
                <label class="flabel">Especialidad</label>
                <div class="fwrap">
                  <select [(ngModel)]="form.specialtyId">
                    <option value="">Seleccionar...</option>
                    @for (s of specialties(); track s.specialtyId) {
                      <option [value]="s.specialtyId">{{ s.name }}</option>
                    }
                  </select>
                </div>
              </div>

              <!-- License: Doctor + SupportDoctor -->
              @if (newRole() === 'Doctor' || newRole() === 'SupportDoctor') {
                <div>
                  <label class="flabel">Núm. colegiatura</label>
                  <div class="fwrap"><input type="text" [(ngModel)]="form.licenseNumber" placeholder="MED-001234"></div>
                </div>
              }
            </div>

            <!-- Doctor-only fees -->
            @if (newRole() === 'Doctor') {
              <hr class="divider">
              <p class="section-sub">Honorarios y vigencia</p>
              <div class="fgrid">
                <div>
                  <label class="flabel">Tarifa consulta</label>
                  <div class="fwrap"><input type="number" [(ngModel)]="form.consultationFee" placeholder="500" min="0"></div>
                </div>
                <div>
                  <label class="flabel">Tarifa videoconsulta</label>
                  <div class="fwrap"><input type="number" [(ngModel)]="form.videoFee" placeholder="400" min="0"></div>
                </div>
                <div>
                  <label class="flabel">Días de vigencia reconsulta</label>
                  <div class="fwrap"><input type="number" [(ngModel)]="form.followUpValidityDays" placeholder="30" min="1"></div>
                </div>
                <div>
                  <label class="flabel">Bio (opcional)</label>
                  <div class="fwrap"><input type="text" [(ngModel)]="form.bio" placeholder="Especialista en..."></div>
                </div>
              </div>
            }

          </div>

          <div class="modal-ftr">
            <button class="cancel-btn" (click)="closeModal()">Cancelar</button>
            <button class="submit-btn" (click)="submitModal()" [disabled]="modalLoading()">
              @if (modalLoading()) {
                <div class="bloader"><span></span><span></span><span></span><span></span></div>
                Guardando...
              } @else {
                <i class="ti ti-check"></i> Crear usuario
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class UsersComponent implements OnInit {
  private userSvc     = inject(UserAdminService);
  private specSvc     = inject(SpecialtyAdminService);
  private auth        = inject(AuthService);

  readonly COLS         = COLUMNS;
  readonly ROLE_FILTERS = ROLE_FILTERS;
  readonly PAGE_SIZE    = 50;

  // ── List state ──────────────────────────────────────────────
  allUsers   = signal<UserSummary[]>([]);
  loading    = signal(true);
  total      = signal(0);
  page       = signal(1);
  roleFilter = signal<RoleFilter>('all');
  searchTerm = signal('');

  specialties = signal<SpecialtyDto[]>([]);

  filtered = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const rows = this.allUsers().filter(u => {
      if (!term) return true;
      return u.fullName.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
    });
    return rows as unknown as Record<string, unknown>[];
  });

  // ── Modal state ─────────────────────────────────────────────
  showModal    = signal(false);
  modalLoading = signal(false);
  modalError   = signal<string | null>(null);
  newRole      = signal<NewRole>('Doctor');
  showPw       = signal(false);

  form = {
    firstName: '', lastName: '', email: '', password: '',
    specialtyId: '', licenseNumber: '', bio: '',
    consultationFee: 0, videoFee: 0, followUpValidityDays: 30,
  };

  ngOnInit() {
    this.loadUsers();
    const clinicId = this.auth.user()?.clinicId;
    if (clinicId) {
      this.specSvc.getSpecialtiesByClinic(clinicId).subscribe({
        next: s => this.specialties.set(s),
        error: () => {},
      });
    }
  }

  loadUsers() {
    this.loading.set(true);
    const clinicId = this.auth.user()?.clinicId;
    if (!clinicId) { this.loading.set(false); return; }

    const role = this.roleFilter() === 'all' ? undefined : this.roleFilter();
    this.userSvc.getUsersByClinic(clinicId, role, this.page(), this.PAGE_SIZE).subscribe({
      next: res => {
        this.allUsers.set(res.items);
        this.total.set(res.totalCount);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setRoleFilter(f: RoleFilter) {
    this.roleFilter.set(f);
    this.page.set(1);
    this.loadUsers();
  }

  onSearch(term: string) { this.searchTerm.set(term); }

  onPageChange(p: number) {
    this.page.set(p);
    this.loadUsers();
  }

  onRowAction(evt: { action: string; row: Record<string, unknown> }) {
    const userId = evt.row['userId'] as string;
    if (evt.action === 'activate' || evt.action === 'deactivate') {
      this.userSvc.toggleUserStatus(userId, evt.action === 'activate').subscribe({
        next: () => this.loadUsers(),
        error: () => {},
      });
    }
  }

  // ── Modal ────────────────────────────────────────────────────
  openModal() {
    this.resetForm();
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  closeIfBackdrop(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('overlay')) this.closeModal();
  }

  genPassword() {
    const n = Math.floor(Math.random() * 9000) + 1000;
    const prefix: Record<NewRole, string> = { Doctor: 'Doctor', Secretary: 'Recep', SupportDoctor: 'Apoyo' };
    this.form.password = `${prefix[this.newRole()]}@${n}`;
    this.showPw.set(true);
  }

  submitModal() {
    const { firstName, lastName, email, password, specialtyId, licenseNumber } = this.form;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !specialtyId) {
      this.modalError.set('Completa todos los campos obligatorios.');
      return;
    }
    const clinicId = this.auth.user()?.clinicId ?? '';
    if (!clinicId) { this.modalError.set('No se encontró la clínica del usuario.'); return; }

    this.modalLoading.set(true);
    this.modalError.set(null);

    const role = this.newRole();
    let call$;

    if (role === 'Doctor') {
      call$ = this.userSvc.createDoctor({
        clinicId, specialtyId, firstName, lastName, email, password,
        licenseNumber: licenseNumber || 'PENDIENTE',
        consultationFee: this.form.consultationFee,
        videoFee: this.form.videoFee,
        followUpValidityDays: this.form.followUpValidityDays,
        bio: this.form.bio || undefined,
      });
    } else if (role === 'Secretary') {
      call$ = this.userSvc.createSecretary({ clinicId, specialtyId, firstName, lastName, email, password });
    } else {
      call$ = this.userSvc.createSupportDoctor({ clinicId, specialtyId, firstName, lastName, email, password, licenseNumber });
    }

    call$.subscribe({
      next: () => {
        this.modalLoading.set(false);
        this.closeModal();
        this.loadUsers();
      },
      error: err => {
        this.modalLoading.set(false);
        this.modalError.set(err?.error?.message ?? 'Error al crear el usuario.');
      },
    });
  }

  private resetForm() {
    this.form = {
      firstName: '', lastName: '', email: '', password: '',
      specialtyId: '', licenseNumber: '', bio: '',
      consultationFee: 500, videoFee: 400, followUpValidityDays: 30,
    };
    this.newRole.set('Doctor');
    this.modalError.set(null);
    this.showPw.set(false);
  }
}
