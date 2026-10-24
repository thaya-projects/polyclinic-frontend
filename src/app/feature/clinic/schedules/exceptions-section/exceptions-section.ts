import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Modal } from '../../../../shared/components/modal/modal';
import { Branch } from '../../../../core/models/branch.model';
import { Professional } from '../../../../core/models/professional.model';
import {
  CreateScheduleExceptionDto, ScheduleException,
} from '../../../../core/models/schedule.model';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../../shared/utils/form-validation.util';

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

  form = this.fb.group({
    professional_id: [''],
    branch_id: [''],
    starts_at: ['', Validators.required],
    ends_at: ['', Validators.required],
    reason: [''],
  });

  openModal(): void {
    this.form.reset({ professional_id: '', branch_id: '', starts_at: '', ends_at: '', reason: '' });
    this.localError.set(null);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  submit(): void {
    this.localError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    if (raw.ends_at! <= raw.starts_at!) {
      this.localError.set('La fecha fin debe ser mayor que la fecha inicio.');
      return;
    }

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
