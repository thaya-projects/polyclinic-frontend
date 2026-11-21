import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { InvoiceItemForm } from '../invoice-item-form/invoice-item-form';
import { InvoiceItemsPreview, InvoiceItemDraft } from '../invoice-items-preview/invoice-items-preview';
import { InvoiceOptionsService } from '../../../core/services/invoice-options.service';
import { PatientsService } from '../../../core/services/patients.service';
import { currencyOptions, resolveTenantCurrency } from '../../../core/constants/currencies.const';
import { AuthStore } from '../../../core/services/auth-store.service';
import { Invoice, InvoiceDto } from '../../../core/models/invoice.model';
import { InvoiceItemDto } from '../../../core/models/invoice-item.model';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../shared/utils/form-validation.util';
import { applyServerError } from '../../../shared/utils/server-errors.util';

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
  // "Facturar" desde el paciente (ej. un item de plan de tratamiento ya
  // completado): paciente fijo, sin selector, y el item ya precargado.
  lockedPatientId = input<string | null>(null);
  prefillItem = input<InvoiceItemDto | null>(null);
  // Moneda del origen del item precargado (ej. la del plan de tratamiento) —
  // el precio ya está en esa moneda, no en la default del tenant.
  prefillCurrency = input<string | null>(null);

  submitted = output<InvoiceSubmitPayload>();
  cancelled = output<void>();

  readonly patients = this.patientsSvc.getAll();
  readonly branches = this.optionsSvc.branches();
  // Moneda de la clínica preseleccionada; las demás quedan disponibles para cambiarla.
  readonly tenantCurrency = resolveTenantCurrency(inject(AuthStore).tenant());
  readonly currencies = currencyOptions(this.tenantCurrency);
  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  // Criterio de aceptación: el formulario es editable solo en borrador —
  // una factura ya emitida/pagada/parcial/anulada se muestra de solo
  // lectura (regla del schema: "emitida/pagada/parcial/anulada: no
  // editar items", que acá extendemos a todo el form).
  readonly readonlyMode = computed(() => {
    const inv = this.invoice();
    return inv !== null && inv.status !== 'draft';
  });

  form = this.fb.group({
    patient_id: ['', Validators.required],
    branch_id: [''],
    notes: [''],
    tax: [0, [Validators.required, Validators.min(0)]],
    currency: [this.tenantCurrency],
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
  readonly currentPatientId = computed(() =>
    this.selectedPatientId() || this.invoice()?.patient_id || this.lockedPatientId() || null);

  constructor() {
    effect(() => {
      const inv = this.invoice();
      const locked = this.lockedPatientId();
      this.form.patchValue(
        {
          patient_id: inv?.patient_id ?? locked ?? '',
          branch_id: inv?.branch_id ?? '',
          notes: inv?.notes ?? '',
          tax: inv?.tax ?? 0,
          currency: inv?.currency ?? this.prefillCurrency() ?? this.tenantCurrency,
        },
        { emitEvent: false },
      );
      if (locked) this.form.controls.patient_id.disable({ emitEvent: false });
    });

    const prefill = this.prefillItem();
    if (prefill) this.items.set([{ tempId: `draft-${nextTempId++}`, dto: prefill }]);
  }

  // Error 400/422 del backend: lo marca en el input del campo que falló. false = no es de un campo
  // de este form (el contenedor muestra el mensaje general).
  applyServerError(err: unknown): boolean {
    return applyServerError(this.form, err);
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
