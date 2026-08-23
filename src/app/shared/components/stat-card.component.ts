import { Component, input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  template: `
    <div [class]="accent() ? 'card-accent' : 'card'" style="display:flex;flex-direction:column;gap:.25rem;">
      <span style="font-size:.72rem;font-weight:600;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;">{{ label() }}</span>
      <span style="font-size:1.75rem;font-weight:700;color:var(--tx);">{{ value() }}</span>
    </div>
  `,
})
export class StatCardComponent {
  label = input.required<string>();
  value = input.required<string | number>();
  accent = input<boolean>(false);
}
