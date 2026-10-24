import {
  ChangeDetectionStrategy, Component, DestroyRef, Injector, PLATFORM_ID, afterNextRender, effect, inject, input, output, signal,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CreatePrescriptionItemDto } from '../../../core/models/prescription.model';
import {
  PrescriptionItemFields, createPrescriptionItemGroup, prescriptionItemDto,
} from '../prescription-item-fields/prescription-item-fields';

let nextFormId = 0;

// Fase 4 Recetas T4: "Agregar medicamento" a una receta ya emitida — PRESENTACIONAL. Emite el DTO
// del ítem; no guarda sin `medication` (obligatorio, aunque se escriban solo espacios).
// Guarda de reentrada propia: tras emitir no vuelve a emitir hasta que el contenedor termine (busy
// pasa a false). Con cada alta exitosa (`createdSeq`) se limpia y queda abierto para cargar otro
// medicamento en la misma receta. Al abrirse, el foco va al campo "Medicamento".
@Component({
  selector: 'app-prescription-item-form',
  imports: [ReactiveFormsModule, PrescriptionItemFields],
  templateUrl: './prescription-item-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrescriptionItemForm {
  private fb = inject(NonNullableFormBuilder);
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private platformId = inject(PLATFORM_ID);

  busy = input(false);
  saving = input(false);
  createdSeq = input(0);
  // Texto accesible del formulario (ej. "Agregar medicamento a la receta del 10 oct 2026").
  label = input('Agregar medicamento');

  submitted = output<CreatePrescriptionItemDto>();
  cancelled = output<void>();

  readonly id = `prescription-item-form-${++nextFormId}`;
  readonly form = createPrescriptionItemGroup(this.fb);
  readonly submittedOnce = signal(false);
  readonly tick = signal(0);

  private emitLocked = false;

  constructor() {
    this.form.statusChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.tick.update(n => n + 1));

    effect(() => {
      if (!this.busy()) this.emitLocked = false;
    });

    let lastSeq: number | null = null;
    effect(() => {
      const seq = this.createdSeq();
      if (lastSeq !== null && seq !== lastSeq) untracked(() => this.reset(true));
      lastSeq = seq;
    });

    afterNextRender(() => this.focusMedication());
  }

  submit(): void {
    if (this.busy() || this.emitLocked) return;
    this.submittedOnce.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.tick.update(n => n + 1);
      return;
    }
    this.emitLocked = true;
    afterNextRender(() => {
      if (!this.busy()) this.emitLocked = false;
    }, { injector: this.injector });
    this.submitted.emit(prescriptionItemDto(this.form));
  }

  reset(focus = false): void {
    this.form.reset();
    this.submittedOnce.set(false);
    this.tick.update(n => n + 1);
    if (focus) afterNextRender(() => this.focusMedication(), { injector: this.injector });
  }

  private focusMedication(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.getElementById(`${this.id}-medication`)?.focus();
  }
}
