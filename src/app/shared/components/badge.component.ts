import { Component, input } from '@angular/core';

@Component({
  selector: 'app-badge',
  standalone: true,
  template: `<span [style]="styles()">{{ label() }}</span>`,
})
export class BadgeComponent {
  variant = input<'green' | 'amber' | 'purple' | 'red' | 'muted'>('green');
  label = input.required<string>();

  styles() {
    const base = 'display:inline-flex;align-items:center;padding:.2rem .65rem;border-radius:20px;font-size:.72rem;font-weight:700;letter-spacing:.04em;';
    const map: Record<string, string> = {
      green: base + 'background:var(--mil-pale);color:var(--mil-text);',
      amber: base + 'background:var(--amber-pale);color:var(--amber);',
      purple: base + 'background:var(--purple-pale);color:var(--purple);',
      red: base + 'background:#fdeaea;color:var(--red);',
      muted: base + 'background:var(--bg2);color:var(--tx3);',
    };
    return map[this.variant()] ?? map['green'];
  }
}
