import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EncounterStatusBadge } from '../encounter-status-badge/encounter-status-badge';
import { ENCOUNTER_LIMITS, Encounter, EncounterNotePatch } from '../../../core/models/encounter.model';
import { fieldErrorMessage, isFieldInvalid } from '../../../shared/utils/form-validation.util';
import { formatEncounterDateTime } from '../encounter-format.util';

const TEXTAREA_BASE =
  'w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-muted focus:ring-3 focus:outline-none';

type NoteField = 'chief_complaint' | 'anamnesis' | 'exam';

// Fase 4 T6: nota de evolución — componente PRESENTACIONAL. No sabe de dónde viene el encounter
// (mock o HTTP): recibe el encounter ya resuelto y emite intenciones (save/sign/voidRequested).
// Reglas de estado (si `canEdit`, o sea el usuario es el profesional del encounter):
//   open   → campos editables, Guardar + Firmar + Anular.
//   signed → campos de solo lectura, solo Anular.
//   voided → campos de solo lectura, sin acciones.
// Si !canEdit → siempre solo lectura y sin acciones (el backend igual respondería 403), salvo
// `adminVoid` (permiso clinical.void): solo lectura + "Anular (administrativo)" en open/signed.
// Mientras hay una operación en curso (guardar/firmar/anular) los campos quedan bloqueados: lo que
// se escribiera en ese lapso se perdería al llegar la respuesta.
// `draft`: cambios del usuario a re-aplicar sobre el encounter recibido (409 al guardar: se recarga
// la versión nueva pero no se pierde lo escrito).
@Component({
  selector: 'app-encounter-note',
  imports: [ReactiveFormsModule, EncounterStatusBadge],
  templateUrl: './encounter-note.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EncounterNote {
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  encounter = input.required<Encounter>();
  patientName = input('');
  professionalName = input('');
  signedByName = input<string | null>(null);
  voidedByName = input<string | null>(null);
  saving = input(false);
  signing = input(false);
  voiding = input(false);
  canEdit = input(true);
  adminVoid = input(false);
  draft = input<EncounterNotePatch | null>(null);
  // Aviso cuando !canEdit (no es el profesional del encuentro, o su profesional está desactivado).
  readOnlyReason = input('Solo el profesional del encuentro puede editar, firmar o anular esta nota.');

  // Sin version: la agrega el contenedor con la del encounter mostrado.
  save = output<EncounterNotePatch>();
  sign = output<void>();
  voidRequested = output<void>();

  readonly limits = ENCOUNTER_LIMITS;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;
  readonly formatDate = formatEncounterDateTime;

  readonly readOnly = computed(() => !this.canEdit() || this.encounter().status !== 'open');
  readonly canSign = computed(() => this.canEdit() && this.encounter().status === 'open');
  readonly canVoid = computed(() => (this.canEdit() || this.adminVoid()) && this.encounter().status !== 'voided');
  readonly voidLabel = computed(() => (this.canEdit() ? 'Anular' : 'Anular (administrativo)'));
  readonly busy = computed(() => this.saving() || this.signing() || this.voiding());
  // Lo que bindea [readOnly] de los textareas.
  readonly fieldsLocked = computed(() => this.readOnly() || this.busy());

  form = this.fb.group({
    chief_complaint: ['', Validators.maxLength(ENCOUNTER_LIMITS.chief_complaint)],
    anamnesis: ['', Validators.maxLength(ENCOUNTER_LIMITS.anamnesis)],
    exam: ['', Validators.maxLength(ENCOUNTER_LIMITS.exam)],
  });

  // Contadores de caracteres + "hay cambios sin guardar" como signals (OnPush).
  private readonly values = signal({ chief_complaint: '', anamnesis: '', exam: '' });
  readonly dirty = signal(false);

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.syncSignals());

    // Cada encounter nuevo (carga, guardado, firma, anulación, recarga por 409) pisa el form:
    // la fuente de verdad es siempre la última respuesta del backend. Si hay `draft` (y la nota
    // sigue editable) se re-aplica encima y queda como cambio sin guardar.
    effect(() => {
      const e = this.encounter();
      const draft = this.draft();
      const editable = !this.readOnly();
      this.form.reset({
        chief_complaint: e.chief_complaint ?? '',
        anamnesis: e.anamnesis ?? '',
        exam: e.exam ?? '',
      }, { emitEvent: false });
      if (draft && editable) {
        for (const field of ['chief_complaint', 'anamnesis', 'exam'] as const) {
          if (draft[field] === undefined) continue;
          const control = this.form.controls[field];
          control.setValue(draft[field] ?? '', { emitEvent: false });
          control.markAsDirty();
        }
      }
      this.syncSignals();
    });
  }

  count(field: NoteField): number {
    return this.values()[field].length;
  }

  textareaClass(field: NoteField): string {
    const control = this.form.controls[field];
    const state = isFieldInvalid(control)
      ? 'border-red-400 focus:border-red-400 focus:ring-red-400/18'
      : 'border-border focus:border-brand focus:ring-brand/18';
    const ro = this.fieldsLocked() ? ' bg-surface-alt/40 cursor-default' : '';
    return `${TEXTAREA_BASE} ${state}${ro}`;
  }

  submit(): void {
    if (this.readOnly() || this.busy()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const e = this.encounter();
    const raw = this.form.getRawValue();
    const patch: EncounterNotePatch = {};
    // PATCH parcial: solo lo que cambió. Vacío → null (vaciar el campo).
    for (const field of ['chief_complaint', 'anamnesis', 'exam'] as const) {
      const value = (raw[field] ?? '').trim() ? raw[field]! : null;
      if (value !== (e[field] ?? null)) patch[field] = value;
    }
    if (Object.keys(patch).length === 0) {
      this.form.markAsPristine();
      this.syncSignals();
      return;
    }
    this.save.emit(patch);
  }

  requestSign(): void {
    if (!this.canSign() || this.dirty() || this.busy()) return;
    this.sign.emit();
  }

  requestVoid(): void {
    if (!this.canVoid() || this.busy()) return;
    this.voidRequested.emit();
  }

  private syncSignals(): void {
    const raw = this.form.getRawValue();
    this.values.set({
      chief_complaint: raw.chief_complaint ?? '',
      anamnesis: raw.anamnesis ?? '',
      exam: raw.exam ?? '',
    });
    this.dirty.set(this.form.dirty);
  }
}
