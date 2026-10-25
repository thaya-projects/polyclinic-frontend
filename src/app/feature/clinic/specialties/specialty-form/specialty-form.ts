import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreateSpecialtyDto, Specialty, UpdateSpecialtyDto } from '../../../../core/models/specialty.model';
import {
  fieldErrorMessage, fieldInputClass, isFieldInvalid, requiredNotBlankValidator,
} from '../../../../shared/utils/form-validation.util';
import { applyServerError } from '../../../../shared/utils/server-errors.util';

// Reutilizable: si `specialty` viene → edit (emit saved). Si null → create (emit created).
// Code no editable en modo edit (clave natural).
@Component({
  selector: 'app-specialty-form',
  imports: [ReactiveFormsModule],
  templateUrl: './specialty-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecialtyForm {
  private fb = inject(FormBuilder);

  specialty = input<Specialty | null>(null);

  created = output<CreateSpecialtyDto>();
  saved = output<UpdateSpecialtyDto>();
  cancelled = output<void>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  readonly isEdit = computed(() => this.specialty() !== null);

  // fieldErrorMessage describe el patrón de los slugs (con guiones); el código de especialidad usa
  // guion bajo.
  codeErrorMessage(): string {
    const code = this.form.controls.code;
    return code.hasError('pattern') && !code.hasError('server')
      ? 'Solo minúsculas, números y guion bajo (ej: medicina_general).'
      : fieldErrorMessage(code);
  }

  form = this.fb.group({
    // Mismo patrón que Specialty.CodePattern del backend.
    code: ['', [requiredNotBlankValidator, Validators.pattern(/^[a-z0-9_]+$/)]],
    name: ['', requiredNotBlankValidator],
  });

  constructor() {
    effect(() => {
      const s = this.specialty();
      if (s) {
        this.form.patchValue({ code: s.code, name: s.name }, { emitEvent: false });
        this.form.controls.code.disable({ emitEvent: false });
      } else {
        // Reset explícito al pasar de edit → create (o al primer render en create): sin esto,
        // el form conserva los valores del edit anterior y el usuario ve datos ajenos.
        this.form.controls.code.enable({ emitEvent: false });
        this.form.reset({ code: '', name: '' }, { emitEvent: false });
      }
    });
  }

  // Error 400/422 del backend: lo marca en el input del campo que falló. false = no es de un campo
  // de este form (el caller muestra el mensaje general).
  applyServerError(err: unknown): boolean {
    return applyServerError(this.form, err);
  }

  // 409 del alta (SpecialtyCodeAlreadyExistsException): el código ya está en uso en la clínica.
  markCodeTaken(): void {
    const code = this.form.controls.code;
    code.setErrors({ ...(code.errors ?? {}), server: 'Ya existe una especialidad con ese código. Elegí otro.' });
    code.markAsTouched();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();

    const initial = this.specialty();
    if (initial) {
      // Diff-only: solo name puede cambiar (code inmutable, is_active se maneja aparte).
      const dto: UpdateSpecialtyDto = {};
      if (raw.name !== initial.name) dto.name = raw.name!;
      this.saved.emit(dto);
      return;
    }

    this.created.emit({ code: raw.code!.trim(), name: raw.name! });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
