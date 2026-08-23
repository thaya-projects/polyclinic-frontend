import { Component, input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  standalone: true,
  template: `<div [style]="styles()">{{ initials() }}</div>`,
})
export class AvatarComponent {
  initials = input.required<string>();
  variant = input<'green' | 'purple' | 'amber' | 'default'>('green');
  size = input<string>('36px');

  styles() {
    const s = this.size();
    const map: Record<string, string> = {
      green: 'background:var(--mil);color:white;',
      purple: 'background:var(--purple-pale);color:var(--purple);',
      amber: 'background:var(--amber-pale);color:var(--amber);',
      default: 'background:var(--bg3);color:var(--tx2);',
    };
    const color = map[this.variant()] ?? map['green'];
    return `${color}width:${s};height:${s};min-width:${s};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:calc(${s} * 0.38);font-weight:700;`;
  }
}
