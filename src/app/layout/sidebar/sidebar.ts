import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { SessionService } from '../../core/services/session.service';
import { FeaturesService } from '../../core/services/features.service';
import { FeatureKey } from '../../core/models/features.model';

interface NavLeaf  {
  kind: 'leaf'; label: string; icon: string; route?: string; comingSoon?: boolean;
  // T6 FF: si viene, el sidebar oculta la entry cuando FeaturesService.enabled(key) es false.
  // Sin key, la entry es siempre visible (menús admin como Tenants/Planes).
  moduleKey?: FeatureKey;
}
interface NavGroup { kind: 'group'; label: string; icon: string; children: NavLeaf[]; }
type NavEntry = NavLeaf | NavGroup;

interface OpenFlyout { item: NavGroup; top: number; left: number; }

const COLLAPSE_KEY = 'mc_sidebar_collapsed';

// TODO: reemplazar por un nav dinámico según el rol del usuario cuando exista Auth.
const NAV_ITEMS: NavEntry[] = [
  { kind: 'leaf', label: 'Dashboard', icon: 'layout-dashboard', route: '/' },
  { kind: 'leaf', label: 'Tenants (Clínicas)', icon: 'building-hospital', route: '/admin/tenants' },
  { kind: 'leaf', label: 'Planes', icon: 'package', route: '/admin/plans' },
  // Fase 2 T7: sucursales del tenant. Cuando exista el layout de clínica se mueve al sidebar
  // de tenant y sale del super admin. Por ahora se muestra siempre.
  { kind: 'leaf', label: 'Sucursales', icon: 'building', route: '/branches' },
  { kind: 'leaf', label: 'Especialidades', icon: 'certificate', route: '/specialties' },
  { kind: 'leaf', label: 'Profesionales', icon: 'stethoscope', route: '/professionals' },
  { kind: 'leaf', label: 'Pacientes', icon: 'user-heart', route: '/patients' },
  // T6 FF (demo): entry gated por feature 'odontogram'. Aparece sólo si el tenant lo tiene
  // activo. Sirve de contrato de referencia — cuando el layout de clínica exista se moverá allí.
  { kind: 'leaf', label: 'Odontograma', icon: 'tooth', comingSoon: true, moduleKey: 'odontogram' },
  { kind: 'leaf', label: 'Configuración', icon: 'settings', comingSoon: true },
];

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  theme = inject(ThemeService);
  private session = inject(SessionService);

  private platformId = inject(PLATFORM_ID);
  private closeTimer?: ReturnType<typeof setTimeout>;

  private features = inject(FeaturesService);

  collapsed  = signal<boolean>(this.loadCollapsed());
  openFlyout = signal<OpenFlyout | null>(null);

  // T6 FF: filtra entries con moduleKey según FeaturesService. Si el mapa aún no cargó
  // (loaded=false), las entries gated quedan ocultas (default cerrado) para no filtrar por un
  // instante y luego esconder — mejor UX esperar al primer GET /tenants/me/features.
  readonly navItems = computed<NavEntry[]>(() => {
    const enabled = this.features.enabledMap();
    const loaded = this.features.loaded();
    return NAV_ITEMS
      .map(entry => {
        if (entry.kind === 'group') {
          return { ...entry, children: entry.children.filter(c => this.showLeaf(c, enabled, loaded)) };
        }
        return this.showLeaf(entry, enabled, loaded) ? entry : null;
      })
      .filter((e): e is NavEntry => e !== null && !(e.kind === 'group' && e.children.length === 0));
  });

  private showLeaf(leaf: NavLeaf, enabled: Record<string, boolean>, loaded: boolean): boolean {
    if (!leaf.moduleKey) return true;
    return loaded && enabled[leaf.moduleKey] === true;
  }

  private collapsedGroups = signal<Set<string>>(new Set());

  // ── Clases Tailwind (varían según collapsed(), se arman aquí en vez de
  //    repetir ternarios largos en el template) ──────────────────────
  readonly widthClass = computed(() =>
    this.collapsed() ? 'w-19 min-w-19' : 'w-55 min-w-55',
  );

  readonly navClass = computed(() => {
    const base = 'flex-1 flex flex-col gap-[0.15rem] overflow-y-auto p-2';
    return this.collapsed() ? `${base} items-center` : base;
  });

  readonly headerClass = computed(() => {
    const base = 'flex items-center gap-2.5 px-4 py-5 border-b border-white/10';
    return this.collapsed() ? `${base} justify-center px-2` : base;
  });

  readonly footerClass = computed(() => {
    const base = 'flex flex-col gap-[0.15rem] p-2 border-t border-white/10';
    return this.collapsed() ? `${base} items-center` : base;
  });

  readonly navLinkClass = computed(() => this.linkClasses('text-sidebar-fg-muted'));
  readonly navDisabledClass = computed(() => `${this.linkClasses('text-sidebar-fg-muted')} opacity-65 cursor-default`);
  readonly groupHeaderClass = computed(() => this.linkClasses('text-sidebar-fg-muted', true));
  readonly footerBtnClass = computed(() => this.linkClasses('text-sidebar-fg-muted', true));
  readonly logoutBtnClass = computed(() => this.linkClasses('text-red-400/80', true, 'hover:bg-red-500/15'));

  readonly navLinkChildClass =
    'flex items-center gap-2.5 w-full rounded-lg px-3 py-2.5 text-[0.82rem] font-medium text-sidebar-fg-muted no-underline transition-colors hover:bg-sidebar-hover hover:text-sidebar-fg';
  readonly navDisabledChildClass =
    'flex items-center gap-2.5 w-full rounded-lg px-3 py-2.5 text-[0.82rem] font-medium text-sidebar-fg-muted opacity-65 cursor-default';

  readonly flyoutLinkClass =
    'flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-[0.82rem] font-medium text-fg-muted no-underline transition-colors hover:bg-card-accent hover:text-fg';
  readonly flyoutDisabledClass =
    'flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-[0.82rem] font-medium text-fg-muted opacity-50 cursor-default';

  private linkClasses(color: string, isButton = false, hover?: string): string {
    const base = `flex items-center gap-2.5 rounded-lg text-sm font-medium no-underline transition-colors font-sans ${color} ${hover ?? 'hover:bg-sidebar-hover hover:text-sidebar-fg'}`;
    const buttonReset = isButton ? ' bg-transparent border-0 cursor-pointer text-left' : '';
    return this.collapsed()
      ? `${base}${buttonReset} justify-center w-11 px-2.5 py-2.5`
      : `${base}${buttonReset} w-full px-3 py-2.5`;
  }

  logout(): void {
    this.session.logout();
  }

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
}
