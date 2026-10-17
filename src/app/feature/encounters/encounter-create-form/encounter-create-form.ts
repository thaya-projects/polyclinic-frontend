import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ENCOUNTER_LIMITS, EncounterPartyOption } from '../../../core/models/encounter.model';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../shared/utils/form-validation.util';

const SEARCH_DEBOUNCE_MS = 280;

export interface EncounterCreateFormValue {
  patient_id: string;
  chief_complaint: string | null;
}

// Alta mínima: paciente (+ motivo opcional). El profesional NO se elige: es siempre el habilitado
// del usuario logueado (el backend responde 403 a cualquier otro) y la página lo agrega al body.
// clinical_record_id lo resuelve la página a partir del paciente; encounter_date queda en "ahora"
// (server). El resto de la nota se completa en el detalle.
//
// Pacientes: el select muestra `patients` (lo arma la página: primera página o resultados de la
// búsqueda + el preseleccionado). El buscador emite `patientSearch` con debounce (el backend busca
// con ?q= por nombre/documento) y vive FUERA del <form>, así un Enter ahí no envía el alta.
// Envío: un submit (oculto) para que Enter en el motivo envíe una vez; con `saving` el form queda
// deshabilitado y submit() no emite (la página además tiene su propia guarda de reentrada).
@Component({
  selector: 'app-encounter-create-form',
  imports: [ReactiveFormsModule],
  templateUrl: './encounter-create-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EncounterCreateForm {
  private fb = inject(FormBuilder);

  patients = input.required<EncounterPartyOption[]>();
  // Profesional habilitado del usuario actual; null = no puede crear.
  professional = input<EncounterPartyOption | null>(null);
  // Texto a mostrar cuando no hay profesional habilitado (cargando, error, sin vínculo, desactivado).
  disabledReason = input<string | null>(null);
  initialPatientId = input<string | null>(null);
  saving = input(false);

  submitted = output<EncounterCreateFormValue>();
  patientSearch = output<string>();

  readonly limits = ENCOUNTER_LIMITS;
  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  searchTerm = signal('');
  private searchDebounce?: ReturnType<typeof setTimeout>;

  form = this.fb.group({
    patient_id: ['', Validators.required],
    chief_complaint: ['', Validators.maxLength(ENCOUNTER_LIMITS.chief_complaint)],
  });

  constructor() {
    effect(() => {
      this.form.reset({ patient_id: this.initialPatientId() ?? '', chief_complaint: '' });
      this.searchTerm.set('');
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.searchDebounce));
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.patientSearch.emit(value), SEARCH_DEBOUNCE_MS);
  }

  submit(): void {
    if (this.saving() || !this.professional()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.submitted.emit({
      patient_id: raw.patient_id!,
      chief_complaint: raw.chief_complaint?.trim() ? raw.chief_complaint : null,
    });
  }
}
