import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Appointment, AppointmentDto, AppointmentPatientOption, AppointmentServiceOption } from '../../../core/models/appointment.model';
import { Branch } from '../../../core/models/branch.model';
import { Professional } from '../../../core/models/professional.model';
import { Room } from '../../../core/models/room.model';
import { AppointmentOnlineFields } from '../appointment-online-fields/appointment-online-fields';
import { AppointmentSlotPicker } from '../appointment-slot-picker/appointment-slot-picker';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../shared/utils/form-validation.util';
import { applyServerError } from '../../../shared/utils/server-errors.util';
import { AppointmentPrefill, DURATION_PRESETS, PRESET_MINUTES, diffMinutes, durationValidator, presetFor, toDateOnly } from './appointment-form.util';

@Component({
  selector: 'app-appointment-form',
  imports: [ReactiveFormsModule, AppointmentOnlineFields, AppointmentSlotPicker, DatePipe],
  templateUrl: './appointment-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppointmentForm {
  private fb = inject(FormBuilder);
  private onlineFields = viewChild(AppointmentOnlineFields);

  // Desacoplado de la fuente de datos: recibe todas las opciones de los
  // selects ya resueltas, sin saber si vienen de un mock o de HTTP.
  branches = input.required<Branch[]>();
  professionals = input.required<Professional[]>();
  patients = input.required<AppointmentPatientOption[]>();
  services = input.required<AppointmentServiceOption[]>();
  rooms = input.required<Room[]>();

  // null => alta de cita nueva; con valor => edición de esa cita (T6).
  appointment = input<Appointment | null>(null);

  submitted = output<AppointmentDto>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;
  readonly durationPresets = DURATION_PRESETS;

  form = this.fb.group(
    {
      branch_id: ['', Validators.required],
      patient_id: ['', Validators.required],
      professional_id: ['', Validators.required],
      service_id: [''],
      room_id: [''],
      date: ['', Validators.required],
      starts_at: ['', Validators.required],
      durationPreset: this.fb.control('30', Validators.required),
      durationCustomMinutes: this.fb.control<number | null>(null),
      reason: [''],
      notes: [''],
    },
    { validators: durationValidator },
  );

  private readonly startsAtValue = toSignal(this.form.controls.starts_at.valueChanges, {
    initialValue: this.form.controls.starts_at.value,
  });
  private readonly presetValue = toSignal(this.form.controls.durationPreset.valueChanges, {
    initialValue: this.form.controls.durationPreset.value,
  });
  private readonly customMinutesValue = toSignal(this.form.controls.durationCustomMinutes.valueChanges, {
    initialValue: this.form.controls.durationCustomMinutes.value,
  });
  private readonly serviceIdValue = toSignal(this.form.controls.service_id.valueChanges, {
    initialValue: this.form.controls.service_id.value,
  });
  readonly professionalIdValue = toSignal(this.form.controls.professional_id.valueChanges, {
    initialValue: this.form.controls.professional_id.value,
  });
  readonly branchIdValue = toSignal(this.form.controls.branch_id.valueChanges, {
    initialValue: this.form.controls.branch_id.value,
  });
  readonly dateValue = toSignal(this.form.controls.date.valueChanges, {
    initialValue: this.form.controls.date.value,
  });
  // Hora "candidata" de un click en el calendario — el picker la autoselecciona
  // solo si de verdad aparece entre los huecos libres que calcula.
  readonly preferredStartsAt = signal<string | null>(null);

  readonly isCustomDuration = computed(() => this.presetValue() === 'custom');
  readonly durationMinutes = computed(() => {
    const preset = this.presetValue();
    return preset === 'custom' ? Number(this.customMinutesValue()) || 0 : Number(preset);
  });
  readonly endsAtPreview = computed(() => {
    const starts = this.startsAtValue();
    const minutes = this.durationMinutes();
    return starts && minutes ? new Date(new Date(starts).getTime() + minutes * 60000) : null;
  });

  constructor() {
    // branch_id/professional_id/date van en un patch aparte, SIN emitEvent:false,
    // porque el picker de horarios los necesita reactivos (profesionalIdValue/etc.).
    effect(() => {
      const a = this.appointment();
      const minutes = a ? diffMinutes(a.starts_at, a.ends_at) : 30;

      this.form.patchValue(
        {
          patient_id: a?.patient_id ?? '',
          service_id: a?.service_id ?? '',
          room_id: a?.room_id ?? '',
          starts_at: a?.starts_at ?? '',
          durationPreset: presetFor(minutes),
          durationCustomMinutes: PRESET_MINUTES.includes(minutes) ? null : minutes,
          reason: a?.reason ?? '',
          notes: a?.notes ?? '',
        },
        { emitEvent: false },
      );

      this.form.patchValue({
        branch_id: a?.branch_id ?? '',
        professional_id: a?.professional_id ?? '',
        date: a ? toDateOnly(a.starts_at) : '',
      });
    });

    // Al elegir un servicio, la duración sugerida sale de su duration_minutes.
    effect(() => {
      const serviceId = this.serviceIdValue();
      const service = this.services().find(s => s.id === serviceId);
      if (!service) return;
      this.form.patchValue({
        durationPreset: presetFor(service.duration_minutes),
        durationCustomMinutes: PRESET_MINUTES.includes(service.duration_minutes) ? null : service.duration_minutes,
      });
    });

    // Si el contexto (profesional/sucursal/fecha/duración) queda incompleto, el
    // horario elegido ya no tiene sentido. Mientras esté completo, es onSlotsReady()
    // el que decide si sigue siendo válido contra los libres recién calculados.
    effect(() => {
      const complete = !!this.professionalIdValue() && !!this.branchIdValue() && !!this.dateValue() && !!this.durationMinutes();
      if (!complete) this.form.controls.starts_at.setValue('');
    });
  }

  onSlotSelected(iso: string): void {
    this.form.controls.starts_at.setValue(iso);
  }

  // El picker reporta los libres recién calculados (tras cambiar profesional/
  // sucursal/fecha/duración). Si la hora ya elegida sigue entre ellos, se respeta;
  // si no, recién ahí se limpia. Si no había ninguna, se intenta la candidata
  // (click en el calendario) una sola vez.
  onSlotsReady(slots: Date[]): void {
    const current = this.form.controls.starts_at.value;
    if (current) {
      const stillValid = slots.some(s => s.toISOString() === new Date(current).toISOString());
      if (!stillValid) this.form.controls.starts_at.setValue('');
      return;
    }

    const preferred = this.preferredStartsAt();
    if (!preferred) return;
    const p = new Date(preferred);
    const match = slots.find(s => s.getHours() === p.getHours() && s.getMinutes() === p.getMinutes());
    if (match) {
      this.form.controls.starts_at.setValue(match.toISOString());
      this.preferredStartsAt.set(null);
    }
  }

  // Se llama explícitamente desde afuera (AppointmentsPage, click en celda libre del
  // calendario) justo después de crear el form — no es un @Input reactivo a propósito.
  applyPrefill(p: AppointmentPrefill): void {
    this.form.patchValue({
      branch_id: p.branch_id ?? this.form.controls.branch_id.value,
      professional_id: p.professional_id ?? this.form.controls.professional_id.value,
      date: p.date ?? this.form.controls.date.value,
    });
    if (p.starts_at) this.preferredStartsAt.set(p.starts_at);
  }

  // Error 400/422 del backend: lo marca en el input del campo que falló (incluye los campos
  // online, que viven en su propio subform). false = no es de un campo de este form.
  applyServerError(err: unknown): boolean {
    return applyServerError(this.form, err) || (this.onlineFields()?.applyServerError(err) ?? false);
  }

  patientLabel(patient: AppointmentPatientOption): string {
    return `${patient.first_name} ${patient.last_name}`;
  }

  submit(): void {
    const online = this.onlineFields();
    if (this.form.invalid || online?.form.invalid) {
      this.form.markAllAsTouched();
      online?.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const startsIso = new Date(raw.starts_at!).toISOString();
    const endsIso = new Date(new Date(startsIso).getTime() + this.durationMinutes() * 60000).toISOString();
    // Campos online (T3): vienen de AppointmentOnlineFields, componente
    // aparte integrado acá — este form no sabe nada de type/meeting_url/
    // meeting_provider más que leerlos al enviar.
    this.submitted.emit({
      branch_id: raw.branch_id!,
      patient_id: raw.patient_id!,
      professional_id: raw.professional_id!,
      service_id: raw.service_id || null,
      room_id: raw.room_id || null,
      starts_at: startsIso,
      ends_at: endsIso,
      reason: raw.reason || null,
      notes: raw.notes || null,
      ...online?.getValue(),
    } as AppointmentDto);
  }
}
