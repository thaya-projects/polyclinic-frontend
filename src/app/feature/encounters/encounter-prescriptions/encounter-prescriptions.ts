import { ChangeDetectionStrategy, Component, PLATFORM_ID, afterNextRender, effect, inject, Injector, input, output, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PrescriptionForm } from '../../prescriptions/prescription-form/prescription-form';
import { PrescriptionItemRequest, PrescriptionsList } from '../../prescriptions/prescriptions-list/prescriptions-list';
import { CreatePrescriptionDto, Prescription } from '../../../core/models/prescription.model';
import { PrescriptionItemError } from '../../prescriptions/prescriptions.store';

// Fase 4 Recetas T4: sección "Recetas" del detalle del encuentro — PRESENTACIONAL. Recibe las
// recetas de ese encuentro (issued_at asc) y emite intenciones (create/addItem/retry).
// `editable` = mismo cálculo que diagnósticos y signos vitales (profesional del encuentro, activo,
// encuentro open); si no, solo el listado (sin "Nueva receta" ni "Agregar medicamento").
// `busy` = cualquier operación en curso (recetas, mediciones, diagnósticos o la nota): las altas
// quedan deshabilitadas. Las guardas de reentrada viven en los formularios.
// "Nueva receta" abre el formulario inline; se cierra solo tras un alta exitosa (`createdSeq`) o con
// Cancelar (emite `cancelled`: el contenedor limpia el error del alta), y entonces el foco vuelve al botón.
@Component({
  selector: 'app-encounter-prescriptions',
  imports: [PrescriptionForm, PrescriptionsList],
  templateUrl: './encounter-prescriptions.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EncounterPrescriptions {
  private injector = inject(Injector);
  private platformId = inject(PLATFORM_ID);

  prescriptions = input<Prescription[]>([]);
  locale = input('es');
  professionalNames = input<Record<string, string>>({});
  loading = input(false);
  loadError = input<string | null>(null);
  loadRetryable = input(true);
  editable = input(false);
  saving = input(false);
  busy = input(false);
  error = input<string | null>(null);
  createdSeq = input(0);
  addItemReasons = input<Record<string, string | null> | null>(null);
  addingItemTo = input<string | null>(null);
  itemError = input<PrescriptionItemError | null>(null);
  itemAddedSeq = input(0);

  create = output<CreatePrescriptionDto>();
  addItem = output<PrescriptionItemRequest>();
  retry = output<void>();
  cancelled = output<void>();

  readonly formOpen = signal(false);

  constructor() {
    let lastSeq: number | null = null;
    effect(() => {
      const seq = this.createdSeq();
      if (lastSeq !== null && seq !== lastSeq) untracked(() => this.closeForm());
      lastSeq = seq;
    });
    // Pasó a solo lectura (ej. 409: el encuentro se firmó en otro lado): se cierra el formulario.
    effect(() => {
      if (!this.editable()) untracked(() => this.formOpen.set(false));
    });
  }

  openForm(): void {
    if (!this.editable() || this.busy()) return;
    this.formOpen.set(true);
    afterNextRender(() => this.focus('encounter-prescription-form-anchor'), { injector: this.injector });
  }

  cancelForm(): void {
    this.cancelled.emit();
    this.closeForm();
  }

  closeForm(): void {
    if (!this.formOpen()) return;
    this.formOpen.set(false);
    afterNextRender(() => this.focus('btn-new-prescription'), { injector: this.injector });
  }

  private focus(id: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.getElementById(id)?.focus();
  }
}
