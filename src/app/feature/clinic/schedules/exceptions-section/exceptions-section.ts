import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { Modal } from '../../../../shared/components/modal/modal';
import { Branch } from '../../../../core/models/branch.model';
import { Professional } from '../../../../core/models/professional.model';
import {
  CreateScheduleExceptionDto, ScheduleException,
} from '../../../../core/models/schedule.model';
import {
  INPUT_BASE_CLASS, fieldErrorMessage, fieldInputClass, isFieldInvalid, requiredNotBlankValidator,
} from '../../../../shared/utils/form-validation.util';
import { applyServerError } from '../../../../shared/utils/server-errors.util';

const END_BEFORE_START_MESSAGE = 'La fecha fin debe ser mayor que la fecha inicio.';

// ends_at > starts_at (mismo criterio que ScheduleException.Create): el error queda en el grupo y se
// muestra debajo de "Hasta".
function endAfterStartValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('starts_at')?.value as string | null;
  const end = group.get('ends_at')?.value as string | null;
  return start && end && end <= start ? { endBeforeStart: true } : null;
}

// Lista de excepciones + modal para crear. Validación local: ends_at > starts_at.
@Component({
  selector: 'app-exceptions-section',
  imports: [ReactiveFormsModule, Modal, DatePipe],
  templateUrl: './exceptions-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExceptionsSection {
  private fb = inject(FormBuilder);

  exceptions = input.required<ScheduleException[]>();
  branches = input.required<Branch[]>();
  professionals = input.required<Professional[]>();
  loading = input<boolean>(false);
  saving = input<boolean>(false);
  removingId = input<string | null>(null);
  error = input<string | null>(null);

  create = output<CreateScheduleExceptionDto>();
  remove = output<string>();

  modalOpen = signal(false);
  localError = signal<string | null>(null);

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  // Mapas de id→nombre para renderizar.
  readonly branchNameById = computed(() =>
    this.branches().reduce<Record<string, string>>((acc, b) => (acc[b.id] = b.name, acc), {}));
  readonly professionalNameById = computed(() =>
    this.professionals().reduce<Record<string, string>>((acc, p) => (acc[p.id] = p.full_name, acc), {}));

  readonly endBeforeStartMessage = END_BEFORE_START_MESSAGE;

  form = this.fb.group({
    professional_id: [''],
    branch_id: [''],
    starts_at: ['', requiredNotBlankValidator],
    ends_at: ['', requiredNotBlankValidator],
    reason: [''],
  }, { validators: endAfterStartValidator });

  openModal(): void {
    this.form.reset({ professional_id: '', branch_id: '', starts_at: '', ends_at: '', reason: '' });
    this.localError.set(null);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  // "Hasta" en rojo también cuando el rango está invertido (error del grupo).
  showEndBeforeStart(): boolean {
    const end = this.form.controls.ends_at;
    return this.form.hasError('endBeforeStart') && (end.touched || end.dirty);
  }

  endsAtClass(): string {
    return this.showEndBeforeStart() && !isFieldInvalid(this.form.controls.ends_at)
      ? `${INPUT_BASE_CLASS} border-red-400 focus:border-red-400 focus:ring-red-400/18`
      : fieldInputClass(this.form.controls.ends_at);
  }

  // Error 400/422 del backend: lo marca en el input del campo que falló. false = no es de un campo
  // de este form (el caller muestra el mensaje con showError).
  applyServerError(err: unknown): boolean {
    return applyServerError(this.form, err);
  }

  showError(message: string): void {
    this.localError.set(message);
  }

  submit(): void {
    this.localError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();

    // Datetime-local no incluye zona — asumimos UTC consistente con el backend que trabaja en UTC.
    const dto: CreateScheduleExceptionDto = {
      professional_id: raw.professional_id || null,
      branch_id: raw.branch_id || null,
      starts_at: new Date(raw.starts_at!).toISOString(),
      ends_at: new Date(raw.ends_at!).toISOString(),
      reason: raw.reason?.trim() || null,
    };
    this.create.emit(dto);
  }

  scopeLabel(e: ScheduleException): string {
    const parts: string[] = [];
    if (e.professional_id) parts.push(this.professionalNameById()[e.professional_id] ?? '—');
    if (e.branch_id) parts.push(this.branchNameById()[e.branch_id] ?? '—');
    return parts.length === 0 ? 'Global' : parts.join(' · ');
  }
}
