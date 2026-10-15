import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { StatusChip, StatusChipTone } from '../../../shared/components/status-chip/status-chip';
import { ENCOUNTER_STATUS_LABEL, EncounterStatus } from '../../../core/models/encounter.model';

const STATUS_TONE: Record<EncounterStatus, StatusChipTone> = {
  open: 'wait',
  signed: 'ok',
  voided: 'danger',
};

@Component({
  selector: 'app-encounter-status-badge',
  imports: [StatusChip],
  template: `<app-status-chip [label]="label()" [tone]="tone()" [attr.data-status]="status()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EncounterStatusBadge {
  status = input.required<EncounterStatus>();

  label = computed(() => ENCOUNTER_STATUS_LABEL[this.status()]);
  tone = computed(() => STATUS_TONE[this.status()]);
}
