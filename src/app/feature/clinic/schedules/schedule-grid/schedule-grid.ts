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
  // Error local de validación (mismas reglas que ProfessionalSchedule en el backend).
  error: string | null;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// Reglas de un bloque: sucursal elegida, horas cargadas, fin > inicio, 0 < slot <= duración.
function rowError(r: BlockRow): string | null {
  if (!r.branchId) return 'Elegí la sucursal del bloque.';
  if (!r.startTime || !r.endTime) return 'Completá la hora inicio y la hora fin.';
  if (r.endTime <= r.startTime) return 'La hora fin debe ser mayor que la hora inicio.';
  if (!Number.isInteger(r.slotMinutes) || r.slotMinutes <= 0) return 'Los minutos por turno deben ser un entero mayor a 0.';
  const blockMinutes = toMinutes(r.endTime) - toMinutes(r.startTime);
  if (r.slotMinutes > blockMinutes) {
    return `Los minutos por turno no pueden superar la duración del bloque (${blockMinutes} min).`;
  }
  return null;
}

// El profesional no puede estar en dos lugares a la vez: los bloques de un mismo día no se
// solapan aunque sean de sucursales distintas (contiguos 09-12 y 12-15 sí valen).
function validateRows(rows: BlockRow[]): BlockRow[] {
  const result = rows.map(r => ({ ...r, error: rowError(r) }));
  for (let i = 0; i < result.length; i++) {
    if (result[i].error) continue;
    const overlap = result.find((o, j) => j !== i && o.weekday === result[i].weekday
      && !rowError(o) && o.startTime < result[i].endTime && result[i].startTime < o.endTime);
    if (overlap) result[i].error = `Se superpone con el bloque ${overlap.startTime}–${overlap.endTime} del mismo día.`;
  }
  return result;
}

// Grilla semanal como lista editable de bloques (agrupados visualmente por día). Local state
// hasta que el usuario presione "Guardar": en ese momento el componente emite el array completo
// y la page dispara PUT. Validación local: mismas reglas que
// el backend (ver validateRows); si igual rechaza (422), la page muestra el motivo traducido.
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
    // Revalida solo las filas que ya mostraban error (quitar un bloque puede resolver un solape).
    this.rows.update(list => {
      const next = list.filter((_, i) => i !== index);
      return next.some(r => r.error) ? validateRows(next) : next;
    });
  }

  updateRow(index: number, patch: Partial<BlockRow>): void {
    // Se revalida todo: un cambio en un bloque puede crear o resolver un solape con otro.
    this.rows.update(list => validateRows(list.map((r, i) => (i === index ? { ...r, ...patch } : r))));
  }

  submit(): void {
    // Re-validar por si hay rows sin tocar que están inválidas desde hidratación.
    const current = validateRows(this.rows());
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

  // Borde rojo en los inputs del bloque con error (el motivo va debajo de la fila).
  rowClass(row: BlockRow, size: string): string {
    const border = row.error ? 'border-red-400' : 'border-border';
    return `${size} rounded-lg border ${border} bg-surface text-xs`;
  }
}
