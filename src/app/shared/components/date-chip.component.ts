import { Component, input } from '@angular/core';

@Component({
  selector: 'app-date-chip',
  standalone: true,
  template: `
    <span style="display:inline-flex;align-items:center;gap:.35rem;background:var(--card-accent);color:var(--date-tx);border:1px solid var(--card-accent-border);border-radius:20px;padding:.3rem .75rem;font-size:.8rem;font-weight:600;">
      <i [class]="'ti ti-' + icon()" style="font-size:.9rem;"></i>
      {{ date() }}
    </span>
  `,
})
export class DateChipComponent {
  date = input.required<string>();
  icon = input<string>('calendar');
}
