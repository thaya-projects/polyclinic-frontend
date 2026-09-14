import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type StatusChipTone = 'ok' | 'wait' | 'neutral';

@Component({
  selector: 'app-status-chip',
  imports: [],
  template: `
    <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap" [class]="toneClass()">
      {{ label() }}
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusChip {
  label = input.required<string>();
  tone = input<StatusChipTone>('neutral');

  toneClass = computed(() => {
    switch (this.tone()) {
      case 'ok':   return 'bg-chip-ok-bg text-chip-ok-fg';
      case 'wait': return 'bg-chip-wait-bg text-chip-wait-fg';
      default:     return 'bg-icon-soft text-fg-muted';
    }
  });
}
