import {
  ChangeDetectionStrategy, Component, DestroyRef, Injector, PLATFORM_ID, afterNextRender, effect, inject, input, output, signal,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreatePrescriptionDto, PRESCRIPTION_LIMITS } from '../../../core/models/prescription.model';
import {
  PrescriptionItemFields, PrescriptionItemGroup, createPrescriptionItemGroup, noNullCharacter, prescriptionItemDto,
} from '../prescription-item-fields/prescription-item-fields';

let nextFormId = 0;

// Fase 4 Recetas T4: "Nueva receta" — PRESENTACIONAL. Notas generales (opcional, ≤ 2000) + ítems
// iniciales opcionales: arranca con una fila y se pueden agregar varias (hasta 50) o quitarlas todas
// antes de emitir. Cada fila exige `medication`. Emite el DTO (nunca patient_id, professional_id,
// issued_at ni tenant_id: los resuelve el backend).
// Guarda de reentrada propia (como MeasurementForm). Con cada alta exitosa (`createdSeq`) vuelve al
// estado inicial. `showSubmit` = false cuando los botones los pone el pie de un modal (submit()).
@Component({
  selector: 'app-prescription-form',
  imports: [ReactiveFormsModule, PrescriptionItemFields],
  templateUrl: './prescription-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrescriptionForm {
  private fb = inject(NonNullableFormBuilder);
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private platformId = inject(PLATFORM_ID);

  busy = input(false);
  saving = input(false);
  createdSeq = input(0);
  showSubmit = input(true);
  submitLabel = input('Emitir receta');

  submitted = output<CreatePrescriptionDto>();
  cancelled = output<void>();

  readonly id = `prescription-form-${++nextFormId}`;
  readonly notesLimit = PRESCRIPTION_LIMITS.notes;
  readonly maxItems = PRESCRIPTION_LIMITS.maxItems;

  readonly form = this.fb.group({
    notes: ['', [Validators.maxLength(PRESCRIPTION_LIMITS.notes), noNullCharacter]],
    items: this.fb.array<PrescriptionItemGroup>([createPrescriptionItemGroup(this.fb)]),
  });

  readonly submittedOnce = signal(false);
  readonly notesLength = signal(0);
  readonly rowCount = signal(1);
  // Ids estables por fila (para label/aria y el track del @for).
  readonly rowIds = signal<string[]>([this.newRowId()]);
  readonly tick = signal(0);
  // Aviso accesible al agregar/quitar filas.
  readonly liveMessage = signal('');

  private nextRow = 0;
  private emitLocked = false;

  constructor() {
    this.form.controls.notes.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.notesLength.set((value ?? '').length));
    this.form.statusChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.tick.update(n => n + 1));

    effect(() => {
      if (!this.busy()) this.emitLocked = false;
    });

    let lastSeq: number | null = null;
    effect(() => {
      const seq = this.createdSeq();
      if (lastSeq !== null && seq !== lastSeq) untracked(() => this.reset());
      lastSeq = seq;
    });
  }

  get rows(): PrescriptionItemGroup[] {
    return this.form.controls.items.controls;
  }

  rowPrefix(index: number): string {
    return `${this.id}-${this.rowIds()[index]}`;
  }

  notesInvalid(): boolean {
    this.tick();
    const control = this.form.controls.notes;
    return control.invalid && (control.touched || control.dirty || this.submittedOnce());
  }

  notesErrorText(): string {
    return this.form.controls.notes.hasError('nullChar')
      ? 'Las notas contienen un carácter inválido.'
      : `Las notas no pueden superar los ${this.notesLimit} caracteres.`;
  }

  // Hay filas con errores tras intentar emitir: resumen arriba del formulario.
  showRowsError(): boolean {
    this.tick();
    return this.submittedOnce() && this.form.controls.items.invalid;
  }

  addRow(): void {
    if (this.busy() || this.rows.length >= this.maxItems) return;
    this.form.controls.items.push(createPrescriptionItemGroup(this.fb));
    this.rowIds.update(ids => [...ids, this.newRowId()]);
    this.rowCount.set(this.rows.length);
    this.liveMessage.set(`Se agregó el medicamento ${this.rows.length}.`);
    const prefix = this.rowPrefix(this.rows.length - 1);
    afterNextRender(() => this.focus(`${prefix}-medication`), { injector: this.injector });
  }

  removeRow(index: number): void {
    if (this.busy() || index < 0 || index >= this.rows.length) return;
    this.form.controls.items.removeAt(index);
    this.rowIds.update(ids => ids.filter((_, i) => i !== index));
    this.rowCount.set(this.rows.length);
    this.liveMessage.set(`Se quitó el medicamento ${index + 1}.`);
    afterNextRender(() => this.focus(`${this.id}-add-row`), { injector: this.injector });
  }

  submit(): void {
    if (this.busy() || this.emitLocked) return;
    this.submittedOnce.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.tick.update(n => n + 1);
      return;
    }
    const notes = this.form.controls.notes.value.trim();
    const items = this.rows.map(row => prescriptionItemDto(row));
    const dto: CreatePrescriptionDto = { notes: notes || null, ...(items.length ? { items } : {}) };
    this.emitLocked = true;
    afterNextRender(() => {
      if (!this.busy()) this.emitLocked = false;
    }, { injector: this.injector });
    this.submitted.emit(dto);
  }

  // Vuelve al estado inicial: sin notas y con una fila vacía.
  reset(): void {
    const items = this.form.controls.items;
    items.clear();
    items.push(createPrescriptionItemGroup(this.fb));
    this.form.reset();
    this.rowIds.set([this.newRowId()]);
    this.rowCount.set(1);
    this.submittedOnce.set(false);
    this.notesLength.set(0);
    this.liveMessage.set('');
    this.tick.update(n => n + 1);
  }

  private newRowId(): string {
    return `row-${this.nextRow++}`;
  }

  private focus(id: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.getElementById(id)?.focus();
  }
}
