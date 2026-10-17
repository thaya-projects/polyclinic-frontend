import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
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
// El formulario de ítem se abre debajo de la receta (uno por vez) y queda abierto tras cada alta
// para cargar varios medicamentos seguidos; se cierra solo si la receta deja de admitir ítems.
@Component({
  selector: 'app-prescriptions-list',
  imports: [PrescriptionItemForm, RouterLink],
  templateUrl: './prescriptions-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrescriptionsList {
  prescriptions = input.required<Prescription[]>();
  locale = input('es');
  professionalNames = input<Record<string, string>>({});
  showEncounterLink = input(false);
  addItemReasons = input<Record<string, string | null> | null>(null);
  busy = input(false);
  addingItemTo = input<string | null>(null);
  itemError = input<PrescriptionItemError | null>(null);
  itemAddedSeq = input(0);
  emptyMessage = input('Sin recetas emitidas.');
  // Nivel de encabezado de cada receta (h4 dentro de una sección, h3 en una página).
  headingLevel = input<3 | 4>(4);

  addItem = output<PrescriptionItemRequest>();

  readonly openFor = signal<string | null>(null);

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
    // Si la receta abierta deja de existir o de admitir ítems, se cierra el formulario.
    effect(() => {
      const id = this.openFor();
      const reasons = this.addItemReasons();
      const exists = this.prescriptions().some(p => p.id === id);
      if (id && (!exists || !reasons || reasons[id] !== null)) untracked(() => this.openFor.set(null));
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
    this.openFor.set(null);
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

  headingId(p: Prescription): string {
    return `prescription-${p.id}-title`;
  }

  cell(item: Record<string, unknown>, key: string): string {
    const value = item[key];
    return typeof value === 'string' && value ? value : '—';
  }
}
