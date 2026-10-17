import {
  ChangeDetectionStrategy, Component, DestroyRef, Injector, afterNextRender, effect, inject, input, output, signal, untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { Cie10Search } from '../cie10-search/cie10-search';
import { StatusChip } from '../../../shared/components/status-chip/status-chip';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { Cie10Entry, CreateDiagnosisDto, DIAGNOSIS_LIMITS, Diagnosis } from '../../../core/models/diagnosis.model';
import { fieldErrorMessage, isFieldInvalid } from '../../../shared/utils/form-validation.util';
import { DIAGNOSIS_REQUIRED_MESSAGE } from '../../../shared/utils/encounters-error.util';

// Description obligatoria salvo que haya un cie10_code elegido (el backend la completa del CIE-10).
function descriptionOrCode(group: AbstractControl): ValidationErrors | null {
  const code = group.get('cie10_code')?.value as string | null;
  const description = (group.get('description')?.value as string | null) ?? '';
  return code || description.trim() ? null : { descriptionOrCode: true };
}

// Fase 4 T4: sección "Diagnósticos" del detalle — componente PRESENTACIONAL. No sabe de dónde
// vienen los datos: recibe la lista y el estado, y emite intenciones (create/remove/retry). El
// buscador CIE-10 recibe la función `searchCie10` del contenedor.
// `editable` = el usuario es el profesional habilitado del encounter Y está open; si no, solo el
// listado (sin formulario ni eliminar).
// `busy` = hay cualquier operación en curso (de diagnósticos o de la nota: guardar/firmar/anular):
// Agregar, Eliminar y el buscador quedan deshabilitados a la vez.
// cie10_code solo se carga desde el buscador (con botón para quitarlo). Al elegir un código se
// sugiere su description solo si el campo está vacío o todavía tiene la sugerencia anterior: nunca
// pisa lo que escribió el usuario. Puede editarla o dejarla vacía (la completa el backend).
// Guarda de reentrada propia: después de emitir no vuelve a emitir hasta que el contenedor termine
// (busy pasa a false) — dos clics antes de la detección de cambios dan una sola intención.
@Component({
  selector: 'app-encounter-diagnoses',
  imports: [ReactiveFormsModule, Cie10Search, StatusChip, ConfirmDialog],
  templateUrl: './encounter-diagnoses.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EncounterDiagnoses {
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);

  diagnoses = input<Diagnosis[]>([]);
  loading = input(false);
  loadError = input<string | null>(null);
  loadRetryable = input(true);
  editable = input(false);
  creating = input(false);
  busy = input(false);
  deletingId = input<string | null>(null);
  error = input<string | null>(null);
  // Cambia con cada alta exitosa → se limpia el formulario.
  createdSeq = input(0);
  searchCie10 = input.required<(q: string) => Observable<Cie10Entry[]>>();

  create = output<CreateDiagnosisDto>();
  remove = output<string>();
  retry = output<void>();

  readonly limit = DIAGNOSIS_LIMITS.description;
  readonly requiredMessage = DIAGNOSIS_REQUIRED_MESSAGE;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  form = this.fb.group({
    cie10_code: this.fb.control<string | null>(null),
    description: ['', Validators.maxLength(DIAGNOSIS_LIMITS.description)],
    is_definitive: [false],
  }, { validators: descriptionOrCode });

  // Código elegido (para mostrar "code — description" del catálogo).
  readonly selected = signal<Cie10Entry | null>(null);
  readonly descriptionLength = signal(0);
  readonly submitted = signal(false);
  readonly confirmTarget = signal<Diagnosis | null>(null);

  // Última description sugerida desde el catálogo (para no pisar lo que escribió el usuario).
  private suggestedDescription: string | null = null;
  private emitLocked = false;

  constructor() {
    this.form.controls.description.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.descriptionLength.set((value ?? '').length));

    // Libera la guarda cuando la operación del contenedor terminó.
    effect(() => {
      if (!this.busy()) this.emitLocked = false;
    });

    let lastSeq: number | null = null;
    effect(() => {
      const seq = this.createdSeq();
      if (lastSeq !== null && seq !== lastSeq) untracked(() => this.resetForm());
      lastSeq = seq;
    });
  }

  onPicked(entry: Cie10Entry): void {
    const description = this.form.controls.description;
    const current = description.value ?? '';
    this.selected.set(entry);
    this.form.controls.cie10_code.setValue(entry.code);
    if (!current.trim() || current === this.suggestedDescription) {
      description.setValue(entry.description);
      description.markAsDirty();
      this.suggestedDescription = entry.description;
    }
  }

  clearCode(): void {
    const description = this.form.controls.description;
    if (this.suggestedDescription !== null && description.value === this.suggestedDescription) {
      description.setValue('');
    }
    this.suggestedDescription = null;
    this.selected.set(null);
    this.form.controls.cie10_code.setValue(null);
  }

  submit(): void {
    if (!this.editable() || this.busy() || this.emitLocked) return;
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const description = (raw.description ?? '').trim();
    this.lockUntilIdle();
    this.create.emit({
      cie10_code: raw.cie10_code || null,
      description: description || null,
      is_definitive: !!raw.is_definitive,
    });
  }

  askRemove(diagnosis: Diagnosis): void {
    if (!this.editable() || this.busy() || this.emitLocked) return;
    this.confirmTarget.set(diagnosis);
  }

  confirmRemove(): void {
    const target = this.confirmTarget();
    this.confirmTarget.set(null);
    if (!target || !this.editable() || this.busy() || this.emitLocked) return;
    this.lockUntilIdle();
    this.remove.emit(target.id);
  }

  cancelRemove(): void {
    this.confirmTarget.set(null);
  }

  showRequiredError(): boolean {
    return this.submitted() && this.form.hasError('descriptionOrCode');
  }

  confirmMessage(): string {
    const d = this.confirmTarget();
    if (!d) return '';
    const label = d.cie10_code ? `${d.cie10_code} — ${d.description}` : d.description;
    return `Se va a eliminar el diagnóstico "${label}".`;
  }

  // Si el contenedor rechaza la intención sin arrancar nada (busy nunca pasa a true), la guarda se
  // libera tras el próximo render.
  private lockUntilIdle(): void {
    this.emitLocked = true;
    afterNextRender(() => {
      if (!this.busy()) this.emitLocked = false;
    }, { injector: this.injector });
  }

  private resetForm(): void {
    this.suggestedDescription = null;
    this.form.reset({ cie10_code: null, description: '', is_definitive: false });
    this.selected.set(null);
    this.submitted.set(false);
    this.descriptionLength.set(0);
  }
}
