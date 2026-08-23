import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface TableColumn {
  key: string;
  label: string;
  width?: string;
  type?: 'text' | 'role' | 'status' | 'date' | 'email';
  align?: 'left' | 'center' | 'right';
}

const ROLE_LABEL: Record<string, string> = {
  Doctor: 'Doctor', SupportDoctor: 'Doc. Apoyo', Secretary: 'Secretaria',
  Admin: 'Admin', SuperAdmin: 'SuperAdmin', Patient: 'Paciente',
  ExternalTechnician: 'Técnico ext.',
};
const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  Doctor:             { bg: 'var(--purple-pale)',    color: 'var(--purple)' },
  SupportDoctor:      { bg: 'var(--purple-pale)',    color: 'var(--purple)' },
  Secretary:          { bg: 'var(--amber-pale)',     color: 'var(--amber)'  },
  Admin:              { bg: 'rgba(115,170,139,.12)', color: 'var(--mil)'    },
  SuperAdmin:         { bg: 'rgba(115,170,139,.12)', color: 'var(--mil)'    },
  Patient:            { bg: 'rgba(115,170,139,.06)', color: 'var(--tx2)'    },
  ExternalTechnician: { bg: 'var(--surface2)',       color: 'var(--tx3)'    },
};

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [FormsModule],
  styles: [`
    .wrap { background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden; }

    /* ── Header ── */
    .hdr { padding:1rem 1.25rem;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:.75rem;flex-wrap:wrap; }
    .search-box {
      position:relative;flex:1;min-width:220px;display:flex;align-items:center;
      background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:9px;
      transition:border-color .15s,box-shadow .15s;
    }
    body.dark .search-box { background:#222;border-color:rgba(255,255,255,.12); }
    .search-box:focus-within { border-color:var(--mil);box-shadow:0 0 0 3px rgba(115,170,139,.12); }
    .search-box i { position:absolute;left:.75rem;color:var(--tx3);font-size:.95rem;pointer-events:none; }
    .search-box input {
      flex:1;height:38px;padding:0 .75rem 0 2.35rem;background:transparent;
      border:none;outline:none;font-size:.875rem;color:var(--tx);
    }
    .search-box input::placeholder { color:#9ca3af; }

    /* ── Table ── */
    table { width:100%;border-collapse:collapse; }
    thead th {
      font-size:.7rem;font-weight:700;color:var(--tx3);text-transform:uppercase;
      letter-spacing:.07em;padding:.65rem 1rem;background:var(--surface2);
      border-bottom:1px solid var(--border);white-space:nowrap;
    }
    tbody td { font-size:.85rem;color:var(--tx);padding:.7rem 1rem;border-bottom:1px solid var(--border); }
    tbody tr:last-child td { border-bottom:none; }
    tbody tr:hover td { background:var(--surface2);transition:background .1s; }

    /* ── Cell types ── */
    .chip { display:inline-flex;align-items:center;gap:.28rem;padding:.18rem .65rem;border-radius:20px;font-size:.72rem;font-weight:700; }
    .dot  { width:6px;height:6px;border-radius:50%;flex-shrink:0; }

    /* ── Actions ── */
    .act-btn {
      background:none;border:none;cursor:pointer;color:var(--tx3);
      padding:.28rem .38rem;border-radius:6px;font-size:.95rem;transition:all .12s;
    }
    .act-btn:hover         { color:var(--mil);background:var(--card-accent); }
    .act-btn.danger:hover  { color:var(--red);background:rgba(201,64,64,.08); }

    /* ── Empty / skeleton ── */
    .empty-cell { text-align:center;padding:2.5rem!important;color:var(--tx3); }
    .sk { background:linear-gradient(90deg,var(--surface2) 25%,var(--border) 50%,var(--surface2) 75%);
          background-size:200% 100%;animation:sh 1.3s infinite;border-radius:6px;height:.95rem; }
    @keyframes sh { from{background-position:200% 0} to{background-position:-200% 0} }

    /* ── Pagination ── */
    .pag { display:flex;align-items:center;justify-content:space-between;padding:.7rem 1.25rem;border-top:1px solid var(--border); }
    .pag-info { font-size:.77rem;color:var(--tx3); }
    .pag-btns { display:flex;gap:.3rem; }
    .pb {
      height:30px;min-width:30px;padding:0 .5rem;border-radius:7px;
      background:var(--surface2);border:1px solid var(--border);
      font-size:.78rem;font-weight:600;color:var(--tx2);cursor:pointer;transition:all .12s;
      display:flex;align-items:center;justify-content:center;
    }
    .pb:hover:not(:disabled) { background:var(--card-accent);border-color:var(--mil);color:var(--mil); }
    .pb.on  { background:var(--mil);border-color:var(--mil);color:white; }
    .pb:disabled { opacity:.4;cursor:not-allowed; }
  `],
  template: `
    <div class="wrap">

      <!-- Header: search + projected filters + projected actions -->
      <div class="hdr">
        <div class="search-box">
          <i class="ti ti-search"></i>
          <input [placeholder]="searchPlaceholder()" [(ngModel)]="searchTerm"
            (ngModelChange)="searchChange.emit($event)" />
        </div>
        <ng-content select="[slot=filters]"></ng-content>
        <ng-content select="[slot=actions]"></ng-content>
      </div>

      <!-- Table -->
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              @for (col of columns(); track col.key) {
                <th [style.width]="col.width ?? 'auto'" [style.textAlign]="col.align ?? 'left'">
                  {{ col.label }}
                </th>
              }
              @if (showActions()) {
                <th style="width:88px;text-align:center;">Acciones</th>
              }
            </tr>
          </thead>
          <tbody>

            <!-- Loading skeleton -->
            @if (loading()) {
              @for (_ of skRows; track $index) {
                <tr>
                  @for (col of columns(); track col.key) {
                    <td><div class="sk" style="width:65%;"></div></td>
                  }
                  @if (showActions()) {
                    <td><div class="sk" style="width:50px;margin:0 auto;"></div></td>
                  }
                </tr>
              }

            <!-- Empty state -->
            } @else if (rows().length === 0) {
              <tr>
                <td class="empty-cell" [colSpan]="columns().length + (showActions() ? 1 : 0)">
                  <i class="ti ti-inbox" style="font-size:1.5rem;display:block;margin-bottom:.4rem;"></i>
                  {{ emptyMsg() }}
                </td>
              </tr>

            <!-- Data rows -->
            } @else {
              @for (row of rows(); track row[idKey()]) {
                <tr>
                  @for (col of columns(); track col.key) {
                    <td [style.textAlign]="col.align ?? 'left'">
                      @switch (col.type) {
                        @case ('role') {
                          <span class="chip"
                            [style.background]="rStyle(cell(row, col.key)).bg"
                            [style.color]="rStyle(cell(row, col.key)).color">
                            <span class="dot" [style.background]="rStyle(cell(row, col.key)).color"></span>
                            {{ rLabel(cell(row, col.key)) }}
                          </span>
                        }
                        @case ('status') {
                          @if (cell(row, col.key)) {
                            <span class="chip" style="background:rgba(115,170,139,.12);color:var(--mil);">
                              <span class="dot" style="background:var(--mil);"></span>Activo
                            </span>
                          } @else {
                            <span class="chip" style="background:rgba(201,64,64,.08);color:var(--red);">
                              <span class="dot" style="background:var(--red);"></span>Inactivo
                            </span>
                          }
                        }
                        @case ('date') {
                          {{ fmtDate(cell(row, col.key)) }}
                        }
                        @default {
                          {{ cell(row, col.key) ?? '—' }}
                        }
                      }
                    </td>
                  }
                  @if (showActions()) {
                    <td style="text-align:center;white-space:nowrap;">
                      <button class="act-btn" title="Ver detalle"
                        (click)="rowAction.emit({ action: 'view', row })">
                        <i class="ti ti-eye"></i>
                      </button>
                      @if (row['isActive']) {
                        <button class="act-btn danger" title="Desactivar"
                          (click)="rowAction.emit({ action: 'deactivate', row })">
                          <i class="ti ti-ban"></i>
                        </button>
                      } @else {
                        <button class="act-btn" title="Activar"
                          (click)="rowAction.emit({ action: 'activate', row })">
                          <i class="ti ti-circle-check"></i>
                        </button>
                      }
                    </td>
                  }
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      @if (!loading() && total() > pageSize()) {
        <div class="pag">
          <span class="pag-info">
            {{ start() }}–{{ end() }} de {{ total() }} registros
          </span>
          <div class="pag-btns">
            <button class="pb" [disabled]="page() <= 1"
              (click)="pageChange.emit(page() - 1)">
              <i class="ti ti-chevron-left"></i>
            </button>
            @for (p of pageNums(); track p) {
              <button class="pb" [class.on]="p === page()"
                (click)="pageChange.emit(p)">{{ p }}</button>
            }
            <button class="pb" [disabled]="page() >= totalPages()"
              (click)="pageChange.emit(page() + 1)">
              <i class="ti ti-chevron-right"></i>
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class DataTableComponent {
  columns         = input.required<TableColumn[]>();
  rows            = input<Record<string, unknown>[]>([]);
  loading         = input(false);
  total           = input(0);
  page            = input(1);
  pageSize        = input(20);
  emptyMsg        = input('Sin resultados');
  searchPlaceholder = input('Buscar...');
  showActions     = input(true);
  idKey           = input('id');

  searchChange = output<string>();
  pageChange   = output<number>();
  rowAction    = output<{ action: string; row: Record<string, unknown> }>();

  searchTerm = signal('');
  readonly skRows = Array(5).fill(0);

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  start      = computed(() => (this.page() - 1) * this.pageSize() + 1);
  end        = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

  pageNums = computed(() => {
    const t = this.totalPages(), c = this.page();
    const nums: number[] = [];
    for (let i = Math.max(1, c - 2); i <= Math.min(t, c + 2); i++) nums.push(i);
    return nums;
  });

  cell(row: Record<string, unknown>, key: string): unknown {
    return key.split('.').reduce((o: unknown, k) => (o as Record<string, unknown>)?.[k], row);
  }

  rLabel(role: unknown): string { return ROLE_LABEL[role as string] ?? String(role); }
  rStyle(role: unknown): { bg: string; color: string } {
    return ROLE_STYLE[role as string] ?? { bg: 'var(--surface2)', color: 'var(--tx3)' };
  }

  fmtDate(val: unknown): string {
    if (!val) return 'Nunca';
    try { return new Date(val as string).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return '—'; }
  }
}
