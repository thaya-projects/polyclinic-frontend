import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { StatusChip, StatusChipTone } from '../../../../shared/components/status-chip/status-chip';
import { DentalCondition } from '../../../../core/models/dental-condition.model';
import {
  TOOTH_CONDITION_FALLBACK_COLOR, ToothCondition, ToothConditionState, toothConditionStateLabel, toothSurfaceLabel,
} from '../../../../core/models/tooth-condition.model';

export interface ToothConditionRow {
  item: ToothCondition;
  name: string;
  color: string;
  surface: string;
  state: string;
  tone: StatusChipTone;
}

const STATE_TONES: Record<ToothConditionState, StatusChipTone> = {
  existing: 'neutral', planned: 'wait', in_progress: 'wait', done: 'ok',
};

// Presentacional: condiciones ya marcadas en una pieza, con el color y el nombre del catálogo.
// Emite editar / eliminar; la eliminación pide una confirmación en línea antes de emitir.
@Component({
  selector: 'app-tooth-condition-list',
  imports: [StatusChip],
  templateUrl: './tooth-condition-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToothConditionList {
  items = input<ToothCondition[]>([]);
  catalog = input<DentalCondition[]>([]);
  editingId = input<string | null>(null);
  disabled = input(false);
  // Odontograma histórico: solo se listan, sin editar / eliminar.
  readOnly = input(false);

  edit = output<ToothCondition>();
  remove = output<ToothCondition>();

  // Fila con la eliminación pendiente de confirmar.
  readonly confirmingId = signal<string | null>(null);

  readonly rows = computed<ToothConditionRow[]>(() => {
    const byId = new Map(this.catalog().map(c => [c.id, c]));
    return this.items().map(item => {
      const condition = byId.get(item.condition_id);
      return {
        item,
        name: condition?.name ?? 'Condición no disponible',
        color: condition?.default_color ?? TOOTH_CONDITION_FALLBACK_COLOR,
        surface: toothSurfaceLabel(item.surface),
        state: toothConditionStateLabel(item.state),
        tone: STATE_TONES[item.state] ?? 'neutral',
      };
    });
  });

  askRemove(item: ToothCondition): void {
    this.confirmingId.set(item.id);
  }

  cancelRemove(): void {
    this.confirmingId.set(null);
  }

  confirmRemove(item: ToothCondition): void {
    this.confirmingId.set(null);
    this.remove.emit(item);
  }
}
