import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Branch } from '../../../../core/models/branch.model';
import {
  ScheduleBlock, ScheduleBlockInput, WEEKDAY_LABELS,
} from '../../../../core/models/schedule.model';

interface BlockRow {
  branchId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  // Error local de validación (end > start). Backend valida también.
  error: string | null;
}

// Grilla semanal como lista editable de bloques (agrupados visualmente por día). Local state
// hasta que el usuario presione "Guardar": en ese momento el componente emite el array completo
// y la page dispara PUT. Validación local: end_time > start_time.
@Component({
  selector: 'app-schedule-grid',
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './schedule-grid.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleGrid {
  initialBlocks = input.required<ScheduleBlock[]>();
  availableBranches = input.required<Branch[]>();
  saving = input<boolean>(false);

  save = output<ScheduleBlockInput[]>();

  readonly weekdayLabels = WEEKDAY_LABELS;
  readonly rows = signal<BlockRow[]>([]);

  readonly hasError = computed(() => this.rows().some(r => r.error !== null));
  readonly rowsByDay = computed(() => {
    const grouped: BlockRow[][] = Array.from({ length: 7 }, () => []);
    this.rows().forEach(r => grouped[r.weekday]?.push(r));
    return grouped;
  });

  constructor() {
    effect(() => {
      // Hidrata desde los bloques del backend. Cada vez que cambia initialBlocks reseteamos.
      const blocks = this.initialBlocks();
      const defaultBranch = this.availableBranches()[0]?.id ?? '';
      this.rows.set(blocks.map(b => ({
        branchId: b.branch_id || defaultBranch,
        weekday: b.weekday,
        startTime: b.start_time.substring(0, 5),
        endTime: b.end_time.substring(0, 5),
        slotMinutes: b.slot_minutes,
        error: null,
      })));
    });
  }

  addBlock(weekday: number): void {
    const defaultBranch = this.availableBranches()[0]?.id ?? '';
    this.rows.update(list => [...list, {
      branchId: defaultBranch,
      weekday,
      startTime: '08:00',
      endTime: '12:00',
      slotMinutes: 30,
      error: null,
    }]);
  }

  removeAt(index: number): void {
    this.rows.update(list => list.filter((_, i) => i !== index));
  }

  updateRow(index: number, patch: Partial<BlockRow>): void {
    this.rows.update(list => list.map((r, i) => {
      if (i !== index) return r;
      const next: BlockRow = { ...r, ...patch, error: null };
      if (next.endTime <= next.startTime) next.error = 'La hora fin debe ser mayor que la hora inicio.';
      return next;
    }));
  }

  submit(): void {
    // Re-validar por si hay rows sin tocar que están inválidas desde hidratación.
    const current = this.rows().map(r => ({
      ...r,
      error: r.endTime <= r.startTime ? 'La hora fin debe ser mayor que la hora inicio.' : null,
    }));
    this.rows.set(current);
    if (current.some(r => r.error !== null)) return;

    const items: ScheduleBlockInput[] = current.map(r => ({
      branch_id: r.branchId,
      weekday: r.weekday,
      start_time: `${r.startTime}:00`,
      end_time: `${r.endTime}:00`,
      slot_minutes: r.slotMinutes,
    }));
    this.save.emit(items);
  }

  // Helpers template.
  rowIndex(row: BlockRow): number {
    return this.rows().indexOf(row);
  }
}
