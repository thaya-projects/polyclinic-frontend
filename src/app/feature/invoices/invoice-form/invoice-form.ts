import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { InvoiceItemForm } from '../invoice-item-form/invoice-item-form';
import { InvoiceItemsPreview, InvoiceItemDraft } from '../invoice-items-preview/invoice-items-preview';
import { InvoiceOptionsService } from '../../../core/services/invoice-options.service';
import { PatientsService } from '../../../core/services/patients.service';
import { CURRENCIES } from '../../../core/constants/currencies.const';
import { Invoice, InvoiceDto } from '../../../core/models/invoice.model';
import { InvoiceItemDto } from '../../../core/models/invoice-item.model';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../shared/utils/form-validation.util';

export interface InvoiceSubmitPayload {
  invoice: InvoiceDto;
  items: InvoiceItemDto[];
}

let nextTempId = 1;

// No llama a ningún servicio para guardar — arma el payload y lo emite;
// el contenedor (InvoicesPage) decide cómo persistirlo (hoy: mock local;
// T5: HTTP real).
@Component({
  selector: 'app-invoice-form',
  imports: [ReactiveFormsModule, InvoiceItemForm, InvoiceItemsPreview],
  templateUrl: './invoice-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceForm {
  private fb = inject(FormBuilder);
  private optionsSvc = inject(InvoiceOptionsService);
  private patientsSvc = inject(PatientsService);

  // null => alta de factura nueva; con valor => edición de esa factura.
  invoice = input<Invoice | null>(null);
  saving = input(false);
  saveError = input<string | null>(null);

  submitted = output<InvoiceSubmitPayload>();
  cancelled = output<void>();

  readonly patients = this.patientsSvc.getAll();
  readonly branches = this.optionsSvc.branches();
  readonly currencies = CURRENCIES;
  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  // Criterio de aceptación: el formulario es editable solo en borrador —
  // una factura ya emitida/pagada/parcial/anulada se muestra de solo
  // lectura (regla del schema: "emitida/pagada/parcial/anulada: no
  // editar items", que acá extendemos a todo el form).
  readonly readonlyMode = computed(() => {
    const inv = this.invoice();
    return inv !== null && inv.status !== 'borrador';
  });

  form = this.fb.group({
    patient_id: ['', Validators.required],
    branch_id: [''],
    notes: [''],
    tax: [0, [Validators.required, Validators.min(0)]],
    currency: [''],
  });

  // El armado de items solo aplica al CREAR — en edición de un borrador
  // ya existente, los items se manejan desde su propia sección en el
  // detalle (mismo criterio que usamos en Fase 7 para no duplicar la
  // lógica de persistencia de items en dos lugares distintos).
  items = signal<InvoiceItemDraft[]>([]);

  readonly subtotalPreview = computed(() =>
    this.items().reduce((sum, i) => sum + i.dto.quantity * i.dto.unit_price, 0),
  );

  private readonly taxValue = toSignal(this.form.controls.tax.valueChanges, { initialValue: 0 });
  readonly totalPreview = computed(() => this.subtotalPreview() + (Number(this.taxValue()) || 0));

  private readonly selectedPatientId = toSignal(this.form.controls.patient_id.valueChanges, { initialValue: '' });
  readonly currentPatientId = computed(() => this.selectedPatientId() || this.invoice()?.patient_id || null);

  constructor() {
    effect(() => {
      const inv = this.invoice();
      this.form.patchValue(
        {
          patient_id: inv?.patient_id ?? '',
          branch_id: inv?.branch_id ?? '',
          notes: inv?.notes ?? '',
          tax: inv?.tax ?? 0,
          currency: inv?.currency ?? '',
        },
        { emitEvent: false },
      );
    });
  }

  onItemAdded(dto: InvoiceItemDto): void {
    this.items.update(list => [...list, { tempId: `draft-${nextTempId++}`, dto }]);
  }

  onItemRemoved(tempId: string): void {
    this.items.update(list => list.filter(i => i.tempId !== tempId));
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.submitted.emit({
      invoice: {
        patient_id: raw.patient_id!,
        branch_id: raw.branch_id || null,
        notes: raw.notes || null,
        tax: Number(raw.tax) || 0,
        currency: raw.currency || undefined,
      },
      items: this.items().map(i => i.dto),
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
