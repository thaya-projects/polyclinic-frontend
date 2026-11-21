import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CreateUnitOfMeasureDto, UnitOfMeasure } from '../../../core/models/unit-of-measure.model';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid, requiredNotBlankValidator } from '../../../shared/utils/form-validation.util';
import { applyServerError } from '../../../shared/utils/server-errors.util';
import { suggestUnitCode } from '../../../shared/utils/unit-code-suggestions.util';

@Component({
  selector: 'app-unit-of-measure-form',
  imports: [ReactiveFormsModule],
  templateUrl: './unit-of-measure-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitOfMeasureForm {
  private fb = inject(FormBuilder);

  // null => alta de unidad nueva; con valor => edición de esa unidad.
  unit = input<UnitOfMeasure | null>(null);

  submitted = output<CreateUnitOfMeasureDto>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  form = this.fb.group({
    code: [''],
    name: ['', requiredNotBlankValidator],
  });

  private readonly nameValue = toSignal(this.form.controls.name.valueChanges, {
    initialValue: this.form.controls.name.value,
  });

  constructor() {
    effect(() => {
      const u = this.unit();
      this.form.patchValue({ code: u?.code ?? '', name: u?.name ?? '' }, { emitEvent: false });
    });

    // Sugerencia por nombre (ej. "Quintales" -> "qq"), solo al crear. Si hay match conocido
    // pisa el código; si no, no toca lo que el usuario haya puesto.
    effect(() => {
      const name = this.nameValue();
      if (this.unit()) return;
      const suggestion = suggestUnitCode(name ?? '');
      if (suggestion) this.form.controls.code.setValue(suggestion, { emitEvent: false });
    });
  }

  applyServerError(err: unknown): boolean {
    return applyServerError(this.form, err);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.submitted.emit({
      code: raw.code?.trim() || null,
      name: (raw.name ?? '').trim(),
    });
  }
}
