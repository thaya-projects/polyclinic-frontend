import { Component, PLATFORM_ID, computed, inject, input, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

interface NavLeaf  { kind: 'leaf';  label: string; icon: string; route?: string; comingSoon?: boolean; }
interface NavGroup { kind: 'group'; label: string; icon: string; children: NavLeaf[]; }
type NavEntry = NavLeaf | NavGroup;

interface OpenFlyout { item: NavGroup; top: number; left: number; }

const COLLAPSE_KEY = 'mc_sidebar_collapsed';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed()">
      <button class="sb-edge-handle" type="button" (click)="toggleCollapsed()"
        [attr.aria-label]="collapsed() ? 'Expandir menú' : 'Colapsar menú'">
        <i class="ti" [class.ti-chevron-right]="collapsed()" [class.ti-chevron-left]="!collapsed()"></i>
      </button>

      <div class="sb-header">
        <div class="sb-brand">
          <div class="sb-brand-icon"><i class="ti ti-heart-rate-monitor"></i></div>
          @if (!collapsed()) { <span class="sb-brand-name">MedConnect</span> }
        </div>
      </div>

      <nav class="sb-nav">
        @for (item of navItems(); track item.label) {
          @if (item.kind === 'leaf') {
            @if (item.comingSoon) {
              <span class="sb-link disabled" [title]="collapsed() ? item.label + ' — Próximamente' : 'Próximamente'">
                <i [class]="'ti ti-' + item.icon"></i>
                @if (!collapsed()) {
                  <span class="sb-label">{{ item.label }}</span>
                  <span class="soon-badge">Pronto</span>
                }
              </span>
            } @else {
              <a [routerLink]="item.route" routerLinkActive="sidebar-active" class="sb-link"
                 [title]="collapsed() ? item.label : null">
                <i [class]="'ti ti-' + item.icon"></i>
                @if (!collapsed()) { <span class="sb-label">{{ item.label }}</span> }
              </a>
            }
          } @else {
            <div class="sb-group"
              (mouseenter)="onGroupMouseEnter($event, item)"
              (mouseleave)="onGroupMouseLeave()">
              <button class="nav-group-hdr" type="button" (click)="onGroupHeaderClick($event, item)"
                [title]="collapsed() ? item.label : null">
                <i [class]="'ti ti-' + item.icon"></i>
                @if (!collapsed()) {
                  <span class="grow">{{ item.label }}</span>
                  <i class="ti ti-chevron-down chev" [class.rot]="isExpanded(item.label)"></i>
                }
              </button>
              @if (!collapsed() && isExpanded(item.label)) {
                <div class="nav-group-children">
                  @for (child of item.children; track child.label) {
                    @if (child.comingSoon) {
                      <span class="sb-link disabled child" title="Próximamente">
                        <i [class]="'ti ti-' + child.icon"></i>
                        <span class="sb-label">{{ child.label }}</span>
                        <span class="soon-badge">Pronto</span>
                      </span>
                    } @else {
                      <a [routerLink]="child.route" routerLinkActive="sidebar-active" class="sb-link child">
                        <i [class]="'ti ti-' + child.icon"></i>
                        <span class="sb-label">{{ child.label }}</span>
                      </a>
                    }
                  }
                </div>
              }
            </div>
          }
        }
      </nav>

      <div class="sb-footer">
        <button class="sb-link sb-footer-btn" type="button" (click)="theme.toggle()"
          [title]="collapsed() ? (theme.dark() ? 'Modo claro' : 'Modo oscuro') : null">
          <i [class]="'ti ti-' + (theme.dark() ? 'sun' : 'moon')"></i>
          @if (!collapsed()) { <span class="sb-label">{{ theme.dark() ? 'Modo claro' : 'Modo oscuro' }}</span> }
        </button>
        <button class="sb-link sb-footer-btn danger" type="button" (click)="auth.logout()"
          [title]="collapsed() ? 'Cerrar sesión' : null">
          <i class="ti ti-logout"></i>
          @if (!collapsed()) { <span class="sb-label">Cerrar sesión</span> }
        </button>
      </div>
    </aside>

    @if (openFlyout(); as fo) {
      <div class="sb-flyout" [style.top.px]="fo.top" [style.left.px]="fo.left"
        (mouseenter)="cancelClose()" (mouseleave)="scheduleClose()">
        <div class="sb-flyout-title">{{ fo.item.label }}</div>
        @for (child of fo.item.children; track child.label) {
          @if (child.comingSoon) {
            <span class="sb-flyout-link disabled" title="Próximamente">
              {{ child.label }}
              <span class="soon-badge">Pronto</span>
            </span>
          } @else {
            <a [routerLink]="child.route" routerLinkActive="sidebar-active" class="sb-flyout-link"
               (click)="openFlyout.set(null)">
              {{ child.label }}
            </a>
          }
        }
      </div>
    }
  `,
})
export class SidebarComponent {
  role  = input<'doctor' | 'reception' | 'patient' | 'admin'>('doctor');
  theme = inject(ThemeService);
  auth  = inject(AuthService);

  private platformId = inject(PLATFORM_ID);
  private closeTimer?: ReturnType<typeof setTimeout>;

  collapsed   = signal<boolean>(this.loadCollapsed());
  openFlyout  = signal<OpenFlyout | null>(null);

  private collapsedGroups = signal<Set<string>>(new Set());

  toggleCollapsed(): void {
    this.collapsed.update(v => !v);
    this.openFlyout.set(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(COLLAPSE_KEY, this.collapsed() ? '1' : '0');
    }
  }

  toggleGroup(label: string): void {
    this.collapsedGroups.update(current => {
      const next = new Set(current);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  isExpanded(label: string): boolean {
    return !this.collapsedGroups().has(label);
  }

  onGroupHeaderClick(event: MouseEvent, item: NavGroup): void {
    if (!this.collapsed()) {
      this.toggleGroup(item.label);
      return;
    }
    event.preventDefault();
    const current = this.openFlyout();
    if (current?.item.label === item.label) {
      this.openFlyout.set(null);
    } else {
      this.positionFlyout(event.currentTarget as HTMLElement, item);
    }
  }

  onGroupMouseEnter(event: MouseEvent, item: NavGroup): void {
    if (!this.collapsed()) return;
    this.cancelClose();
    this.positionFlyout(event.currentTarget as HTMLElement, item);
  }

  onGroupMouseLeave(): void {
    if (!this.collapsed()) return;
    this.scheduleClose();
  }

  cancelClose(): void {
    if (this.closeTimer) clearTimeout(this.closeTimer);
  }

  scheduleClose(): void {
    this.closeTimer = setTimeout(() => this.openFlyout.set(null), 150);
  }

  private positionFlyout(el: HTMLElement, item: NavGroup): void {
    const rect = el.getBoundingClientRect();
    this.openFlyout.set({ item, top: rect.top, left: rect.right + 8 });
  }

  private loadCollapsed(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  }

  navItems = computed((): NavEntry[] => {
    const authRole = this.auth.user()?.role?.toLowerCase();

    if (authRole === 'superadmin') return [
      { kind: 'group', label: 'Dashboard', icon: 'layout-dashboard', children: [
        { kind: 'leaf', label: 'Resumen general', icon: 'chart-pie',    route: '/dashboard/super-admin' },
        { kind: 'leaf', label: 'Métricas de uso',  icon: 'activity',     comingSoon: true },
        { kind: 'leaf', label: 'Alertas',          icon: 'bell',         comingSoon: true },
      ]},

      { kind: 'group', label: 'Clínicas (Tenants)', icon: 'building-hospital', children: [
        { kind: 'leaf', label: 'Listado de clínicas',    icon: 'list',    route: '/admin/clinics' },
        { kind: 'leaf', label: 'Crear nueva clínica',     icon: 'plus',            comingSoon: true },
        { kind: 'leaf', label: 'Ver detalle / Editar',    icon: 'edit',            comingSoon: true },
        { kind: 'leaf', label: 'Suspender / Reactivar',   icon: 'ban',             comingSoon: true },
        { kind: 'leaf', label: 'Impersonar',              icon: 'user-shield',     comingSoon: true },
        { kind: 'leaf', label: 'Historial de cambios',    icon: 'history',         comingSoon: true },
      ]},

      { kind: 'group', label: 'Suscripciones y Planes', icon: 'credit-card', children: [
        { kind: 'leaf', label: 'Planes de suscripción',   icon: 'list-details',    comingSoon: true },
        { kind: 'leaf', label: 'Suscripciones activas',   icon: 'checkbox',        comingSoon: true },
        { kind: 'leaf', label: 'Trials',                  icon: 'clock',           comingSoon: true },
        { kind: 'leaf', label: 'Facturas de suscripción', icon: 'receipt',         comingSoon: true },
        { kind: 'leaf', label: 'Cambios de plan',         icon: 'arrows-exchange', comingSoon: true },
      ]},

      { kind: 'group', label: 'Usuarios de Plataforma', icon: 'users-group', children: [
        { kind: 'leaf', label: 'Super Admins',            icon: 'shield',          comingSoon: true },
        { kind: 'leaf', label: 'Soporte / Staff interno', icon: 'headset',         comingSoon: true },
      ]},

      { kind: 'group', label: 'Catálogos Globales', icon: 'database', children: [
        { kind: 'leaf', label: 'Especialidades globales',        icon: 'stethoscope',    route: '/admin/specialties' },
        { kind: 'leaf', label: 'Condiciones dentales globales',  icon: 'dental',         comingSoon: true },
        { kind: 'leaf', label: 'Plantillas de notificación',     icon: 'template',       comingSoon: true },
        { kind: 'leaf', label: 'CIE-10',                         icon: 'clipboard-list', comingSoon: true },
        { kind: 'leaf', label: 'Formularios clínicos base',      icon: 'file-text',      comingSoon: true },
      ]},

      { kind: 'group', label: 'Configuración de Plataforma', icon: 'settings', children: [
        { kind: 'leaf', label: 'Feature flags globales',     icon: 'flag',            comingSoon: true },
        { kind: 'leaf', label: 'Configuración de pagos',     icon: 'credit-card',     comingSoon: true },
        { kind: 'leaf', label: 'WhatsApp / SMS providers',   icon: 'brand-whatsapp',  comingSoon: true },
        { kind: 'leaf', label: 'Locales e idiomas',          icon: 'language',        comingSoon: true },
        { kind: 'leaf', label: 'Parámetros generales',       icon: 'adjustments',     comingSoon: true },
      ]},

      { kind: 'group', label: 'Auditoría y Logs', icon: 'file-text', children: [
        { kind: 'leaf', label: 'Audit log global',    icon: 'file-search',    comingSoon: true },
        { kind: 'leaf', label: 'Logs de webhooks',    icon: 'webhook',        comingSoon: true },
        { kind: 'leaf', label: 'Errores del sistema', icon: 'alert-triangle', comingSoon: true },
      ]},

      { kind: 'group', label: 'Reportes', icon: 'chart-line', children: [
        { kind: 'leaf', label: 'Ingresos (MRR, ARR, por país)', icon: 'currency-dollar', comingSoon: true },
        { kind: 'leaf', label: 'Crecimiento de tenants',        icon: 'trending-up',     comingSoon: true },
        { kind: 'leaf', label: 'Uso por módulo',                icon: 'chart-bar',       comingSoon: true },
        { kind: 'leaf', label: 'Churn y retención',             icon: 'chart-donut',     comingSoon: true },
      ]},
    ];

    if (authRole === 'admin') return [
      { kind: 'leaf', label: 'Dashboard',      icon: 'layout-dashboard', route: '/dashboard/admin'    },
      { kind: 'leaf', label: 'Usuarios',       icon: 'user-plus',        route: '/admin'              },
      { kind: 'leaf', label: 'Especialidades', icon: 'stethoscope',      route: '/admin/specialties'  },
      { kind: 'leaf', label: 'Pacientes',      icon: 'user-heart',       route: '/admin/patients'     },
      { kind: 'leaf', label: 'Honorarios',     icon: 'coin',             route: '/admin/fees'         },
    ];

    if (authRole === 'secretary') return [
      { kind: 'leaf', label: 'Dashboard', icon: 'layout-dashboard', route: '/dashboard'  },
      { kind: 'leaf', label: 'Recepción', icon: 'calendar-plus',    route: '/reception'  },
      { kind: 'leaf', label: 'Pacientes', icon: 'user-heart',       route: '/admin/patients' },
    ];

    const r = this.role();
    if (r === 'doctor') return [
      { kind: 'leaf', label: 'Dashboard',      icon: 'layout-dashboard',   route: '/dashboard'              },
      { kind: 'leaf', label: 'Videoconsultas', icon: 'video',              route: '/video-consultation/c3'  },
      { kind: 'leaf', label: 'Recepción',      icon: 'calendar-plus',      route: '/reception'              },
    ];
    if (r === 'reception') return [
      { kind: 'leaf', label: 'Dashboard', icon: 'layout-dashboard', route: '/dashboard' },
      { kind: 'leaf', label: 'Recepción', icon: 'calendar-plus',    route: '/reception' },
    ];
    return [
      { kind: 'leaf', label: 'Mi Consulta', icon: 'user-heart',       route: '/patient'   },
      { kind: 'leaf', label: 'Dashboard',   icon: 'layout-dashboard', route: '/dashboard' },
    ];
  });
}
