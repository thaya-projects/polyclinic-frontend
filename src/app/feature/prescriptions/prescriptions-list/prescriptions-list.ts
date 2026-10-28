import {
  ChangeDetectionStrategy, Component, Injector, PLATFORM_ID, afterNextRender, computed, effect, inject, input, output, signal,
  untracked, viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PrescriptionItemForm } from '../prescription-item-form/prescription-item-form';
import { CreatePrescriptionItemDto, Prescription } from '../../../core/models/prescription.model';
import { PrescriptionItemError } from '../prescriptions.store';
import { formatIssuedAt } from '../prescription-format.util';

export interface PrescriptionItemRequest {
  prescriptionId: string;
  dto: CreatePrescriptionItemDto;
}

// Fase 4 Recetas T4: listado de recetas — PRESENTACIONAL (recibe la lista ya resuelta y en orden).
// Cada receta: fecha de emisión, profesional, notas, link al encuentro (opcional) y la tabla de
// ítems (medicamento, presentación, dosis, frecuencia, duración, indicaciones).
// "Agregar medicamento" por receta según `addItemReasons`:
//   null (el mapa)      → no se muestra en ninguna (solo lectura);
//   map[id] undefined   → no se muestra en esa receta;
//   map[id] === null    → habilitado;
//   map[id] === 'texto' → deshabilitado, con el motivo visible y asociado (aria-describedby).
// `addItemHints[id]`: pista informativa que NO deshabilita (ej. la ventana de 24 h según el reloj
// local), también asociada al botón.
// El formulario de ítem se abre debajo de la receta (uno por vez) y queda abierto tras cada alta
// para cargar varios medicamentos seguidos; se cierra con Cancelar o si la receta deja de admitir
// ítems. Al cerrarse, el foco vuelve a "Agregar medicamento" o, si quedó deshabilitado, al error.
@Component({
  selector: 'app-prescriptions-list',
  imports: [PrescriptionItemForm, RouterLink],
  templateUrl: './prescriptions-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrescriptionsList {
  private injector = inject(Injector);
  private platformId = inject(PLATFORM_ID);

  prescriptions = input.required<Prescription[]>();
  locale = input('es');
  professionalNames = input<Record<string, string>>({});
  showEncounterLink = input(false);
  addItemReasons = input<Record<string, string | null> | null>(null);
  addItemHints = input<Record<string, string>>({});
  busy = input(false);
  addingItemTo = input<string | null>(null);
  itemError = input<PrescriptionItemError | null>(null);
  itemAddedSeq = input(0);
  emptyMessage = input('Sin recetas emitidas.');
  // Nivel de encabezado de cada receta (h4 dentro de una sección, h3 en una página).
  headingLevel = input<3 | 4>(4);

  addItem = output<PrescriptionItemRequest>();

  readonly openFor = signal<string | null>(null);

  private readonly itemForm = viewChild(PrescriptionItemForm);
  // itemError de un campo que ya quedó marcado en su input: no se repite en el banner.
  readonly fieldItemError = signal<PrescriptionItemError | null>(null);

  readonly columns = [
    { key: 'medication', label: 'Medicamento' },
    { key: 'presentation', label: 'Presentación' },
    { key: 'dose', label: 'Dosis' },
    { key: 'frequency', label: 'Frecuencia' },
    { key: 'duration', label: 'Duración' },
    { key: 'instructions', label: 'Indicaciones' },
  ] as const;

  // Receta con el formulario abierto, solo si todavía admite ítems.
  readonly openPrescriptionId = computed(() => {
    const id = this.openFor();
    return id && this.reason(id) === null ? id : null;
  });

  constructor() {
    // 400/422 de un campo del medicamento: se marca en su input del formulario abierto.
    effect(() => {
      const err = this.itemError();
      untracked(() => {
        const applied = !!err?.field && err.prescriptionId === this.openPrescriptionId()
          && !!this.itemForm()?.applyServerError(err.field, err.message);
        this.fieldItemError.set(applied ? err : null);
      });
    });

    // Si la receta abierta deja de existir o de admitir ítems, se cierra el formulario.
    effect(() => {
      const id = this.openFor();
      const reasons = this.addItemReasons();
      const exists = this.prescriptions().some(p => p.id === id);
      if (id && (!exists || !reasons || reasons[id] !== null)) {
        untracked(() => {
          this.openFor.set(null);
          if (exists) this.restoreFocus(id);
        });
      }
    });
  }

  reason(id: string): string | null | undefined {
    const map = this.addItemReasons();
    return map ? map[id] : undefined;
  }

  hasButton(id: string): boolean {
    return this.reason(id) !== undefined;
  }

  toggle(id: string): void {
    if (this.reason(id) !== null) return;
    this.openFor.update(current => (current === id ? null : id));
  }

  close(): void {
    const id = this.openFor();
    if (!id) return;
    this.openFor.set(null);
    this.restoreFocus(id);
  }

  submitItem(prescriptionId: string, dto: CreatePrescriptionItemDto): void {
    if (this.busy() || this.reason(prescriptionId) !== null) return;
    this.addItem.emit({ prescriptionId, dto });
  }

  formatDate(iso: string): string {
    return formatIssuedAt(iso, this.locale());
  }

  title(p: Prescription): string {
    return `Receta del ${this.formatDate(p.issued_at)}`;
  }

  hint(id: string): string | null {
    return this.hasButton(id) ? this.addItemHints()[id] ?? null : null;
  }

  addButtonId(id: string): string {
    return `prescription-${id}-add-btn`;
  }

  itemErrorId(id: string): string {
    return `prescription-${id}-item-error`;
  }

  // Ids del motivo y/o la pista asociados a "Agregar medicamento".
  describedBy(id: string): string | null {
    const ids = [
      this.reason(id) ? `prescription-${id}-add-reason` : null,
      this.hint(id) ? `prescription-${id}-add-hint` : null,
    ].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  }

  // Tras cerrar el formulario: al botón si sigue habilitado; si no, al error de la receta.
  private restoreFocus(id: string): void {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      const button = document.getElementById(this.addButtonId(id)) as HTMLButtonElement | null;
      if (button && !button.disabled) {
        button.focus();
        return;
      }
      document.getElementById(this.itemErrorId(id))?.focus();
    }, { injector: this.injector });
  }

  headingId(p: Prescription): string {
    return `prescription-${p.id}-title`;
  }

  cell(item: Record<string, unknown>, key: string): string {
    const value = item[key];
    return typeof value === 'string' && value ? value : '—';
  }
}
