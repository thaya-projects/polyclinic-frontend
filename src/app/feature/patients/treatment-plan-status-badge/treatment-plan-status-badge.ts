import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { StatusChip, StatusChipTone } from '../../../shared/components/status-chip/status-chip';
import { TreatmentPlanStatus } from '../../../core/models/treatment-plan.model';
import {
  TREATMENT_PLAN_STATUS_LABELS,
  TREATMENT_PLAN_STATUS_TONES,
} from '../../../core/constants/treatment-plan-status.const';

@Component({
  selector: 'app-treatment-plan-status-badge',
  imports: [StatusChip],
  templateUrl: './treatment-plan-status-badge.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreatmentPlanStatusBadge {
  status = input.required<TreatmentPlanStatus>();

  label = computed(() => TREATMENT_PLAN_STATUS_LABELS[this.status()]);
  tone = computed<StatusChipTone>(() => TREATMENT_PLAN_STATUS_TONES[this.status()]);
}
