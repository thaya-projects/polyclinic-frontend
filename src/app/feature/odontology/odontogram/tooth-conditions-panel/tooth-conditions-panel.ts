import {
  ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal, untracked, viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToothConditionForm } from '../tooth-condition-form/tooth-condition-form';
import { ToothConditionList } from '../tooth-condition-list/tooth-condition-list';
import { TOOTH_CONDITIONS_REPOSITORY } from '../../../../core/services/tooth-conditions-repository';
import { Dentition } from '../../../../core/models/odontogram.model';
import { DentalCondition } from '../../../../core/models/dental-condition.model';
import {
  CreateToothConditionDto, ToothCondition, ToothSurface, UpdateToothConditionDto,
} from '../../../../core/models/tooth-condition.model';
import {
  TOOTH_CONDITION_WRITE_FORBIDDEN_MESSAGE, odontogramError,
} from '../../../../shared/utils/odontogram-error.util';

// Fase 6 T5 "marcar pieza": se proyecta en el slot [toothActions] de SelectedToothPanel. Contenedor
// de la pieza seleccionada: lista sus condiciones (de `items`, todas las del odontograma) y hace las
// altas / ediciones / bajas vía TOOTH_CONDITIONS_REPOSITORY (mock o HTTP). No guarda la lista: emite
// el resultado (added / updated / removed) y la página actualiza su estado, con lo que la grilla se
// repinta sin recargar. 404 (ya no existe) u otro 409 que no sea "histórico" → emite `stale` para que
// la página recargue.
//
// T6: odontograma histórico (`readOnly`, is_current = false) → solo el listado: sin formulario ni
// editar / eliminar. Si igual llega el 409 "historical snapshot" (dejó de ser current mientras se editaba)
// se muestra el aviso y se emite `historic` para que la página recargue el current.
@Component({
  selector: 'app-tooth-conditions-panel',
  imports: [ToothConditionForm, ToothConditionList],
  templateUrl: './tooth-conditions-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToothConditionsPanel {
  private repo = inject(TOOTH_CONDITIONS_REPOSITORY);
  private destroyRef = inject(DestroyRef);

  odontogramId = input.required<string>();
  dentition = input.required<Dentition>();
  tooth = input.required<number>();
  surface = input<ToothSurface | null>(null);
  catalog = input<DentalCondition[]>([]);
  items = input<ToothCondition[]>([]);
  readOnly = input(false);

  added = output<ToothCondition>();
  updated = output<ToothCondition>();
  removed = output<string>();
  stale = output<void>();
  historic = output<string>();

  private form = viewChild(ToothConditionForm);

  readonly editing = signal<ToothCondition | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly toothItems = computed(() => this.items().filter(i => i.tooth_fdi === this.tooth()));

  constructor() {
    // Cambiar de pieza (o de odontograma) cancela la edición en curso y limpia el error.
    effect(() => {
      this.tooth();
      this.odontogramId();
      untracked(() => {
        this.editing.set(null);
        this.error.set(null);
      });
    });
  }

  startEdit(item: ToothCondition): void {
    if (this.readOnly()) return;
    this.error.set(null);
    this.editing.set(item);
  }

  cancelEdit(): void {
    this.editing.set(null);
  }

  create(dto: CreateToothConditionDto): void {
    if (this.saving() || this.readOnly()) return;
    this.begin();
    this.repo.create(this.odontogramId(), dto).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: created => {
        this.saving.set(false);
        this.form()?.clear();
        this.added.emit(created);
      },
      error: (err: unknown) => this.fail(err, 'No se pudo marcar la condición.'),
    });
  }

  save(dto: UpdateToothConditionDto): void {
    const item = this.editing();
    if (!item || this.saving() || this.readOnly()) return;
    if (Object.keys(dto).length === 0) {
      this.editing.set(null);
      return;
    }
    this.begin();
    this.repo.update(this.odontogramId(), item.id, dto).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: updated => {
        this.saving.set(false);
        this.editing.set(null);
        this.updated.emit(updated);
      },
      error: (err: unknown) => this.fail(err, 'No se pudo guardar la condición.'),
    });
  }

  remove(item: ToothCondition): void {
    if (this.saving() || this.readOnly()) return;
    this.begin();
    this.repo.remove(this.odontogramId(), item.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        if (this.editing()?.id === item.id) this.editing.set(null);
        this.removed.emit(item.id);
      },
      error: (err: unknown) => this.fail(err, 'No se pudo quitar la condición.'),
    });
  }

  private begin(): void {
    this.saving.set(true);
    this.error.set(null);
  }

  private fail(err: unknown, fallback: string): void {
    this.saving.set(false);
    const { kind, message } = odontogramError(err, fallback, {
      operation: 'write', odontogramEnabled: this.repo.odontogramEnabled(), resource: 'tooth_condition',
    });
    // 422 de un campo del form: se marca en su input; el banner queda para lo que no es de un campo.
    if (kind === 'validation' && this.form()?.applyServerError(err, message)) {
      this.error.set(null);
      return;
    }
    this.error.set(kind === 'forbidden' ? TOOTH_CONDITION_WRITE_FORBIDDEN_MESSAGE : message);
    if (kind === 'not_found' || kind === 'conflict') {
      this.editing.set(null);
      this.stale.emit();
    }
    if (kind === 'historic') {
      this.editing.set(null);
      this.historic.emit(message);
    }
  }
}
