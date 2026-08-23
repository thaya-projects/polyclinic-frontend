import { Component, computed, inject, input } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  template: `
    <header style="background:var(--topbar-bg);padding:.85rem 1.5rem;display:flex;align-items:center;justify-content:space-between;min-height:60px;flex-shrink:0;">
      <div>
        <h1 style="margin:0;font-size:1.05rem;font-weight:700;color:var(--topbar-tx);">{{ title() }}</h1>
        @if (subtitle()) {
          <p style="margin:0;font-size:.78rem;color:var(--topbar-tx2);">{{ subtitle() }}</p>
        }
      </div>
      <div style="display:flex;align-items:center;gap:1rem;">
        <ng-content />
        <div style="display:flex;align-items:center;gap:.6rem;">
          <div style="width:34px;height:34px;background:rgba(255,255,255,0.22);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;color:white;">
            {{ userInitials() }}
          </div>
          <span style="font-size:.85rem;font-weight:600;color:var(--topbar-tx);">{{ userName() }}</span>
        </div>
      </div>
    </header>
  `,
})
export class TopbarComponent {
  private auth = inject(AuthService);

  title    = input.required<string>();
  subtitle = input<string>('');

  userName     = computed(() => this.auth.user()?.name     ?? 'Usuario');
  userInitials = computed(() => {
    const name = this.auth.user()?.name ?? '';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'US';
  });
}
