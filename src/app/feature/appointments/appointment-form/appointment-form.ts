import { ChangeDetectionStrategy, Component, effect, inject, input, output, viewChild } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { Appointment, AppointmentDto, AppointmentPatientOption, AppointmentServiceOption } from '../../../core/models/appointment.model';
import { Branch } from '../../../core/models/branch.model';
import { Professional } from '../../../core/models/professional.model';
import { Room } from '../../../core/models/room.model';
import { AppointmentOnlineFields } from '../appointment-online-fields/appointment-online-fields';
import { fieldInputClass } from '../../../shared/utils/form-validation.util';

// Único requisito de validación del ticket (T5): no se puede guardar con
// ends_at <= starts_at. El resto de los campos queda sin obligatoriedad
// a propósito (no la pide el ticket).
function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const starts = group.get('starts_at')?.value;
  const ends = group.get('ends_at')?.value;
  if (!starts || !ends) return null;
  return new Date(ends) <= new Date(starts) ? { dateRange: true } : null;
}

// <input type="datetime-local"> trabaja en hora local, sin segundos ni
// timezone ("2026-10-05T14:30") — el backend espera/devuelve ISO (T6).
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string {
  return new Date(value).toISOString();
}

@Component({
  selector: 'app-appointment-form',
  imports: [ReactiveFormsModule, AppointmentOnlineFields],
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

  form = this.fb.group(
    {
      branch_id: [''],
      patient_id: [''],
      professional_id: [''],
      service_id: [''],
      room_id: [''],
      starts_at: [''],
      ends_at: [''],
      reason: [''],
      notes: [''],
    },
    { validators: dateRangeValidator },
  );

  constructor() {
    effect(() => {
      const a = this.appointment();
      this.form.patchValue(
        {
          branch_id: a?.branch_id ?? '',
          patient_id: a?.patient_id ?? '',
          professional_id: a?.professional_id ?? '',
          service_id: a?.service_id ?? '',
          room_id: a?.room_id ?? '',
          starts_at: a ? toDatetimeLocal(a.starts_at) : '',
          ends_at: a ? toDatetimeLocal(a.ends_at) : '',
          reason: a?.reason ?? '',
          notes: a?.notes ?? '',
        },
        { emitEvent: false },
      );
    });
  }

  get hasDateRangeError(): boolean {
    return !!this.form.errors?.['dateRange'] && (this.form.controls.starts_at.touched || this.form.controls.ends_at.touched);
  }

  patientLabel(patient: AppointmentPatientOption): string {
    return `${patient.first_name} ${patient.last_name}`;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    // Campos online (T3): vienen de AppointmentOnlineFields, componente
    // aparte integrado acá — este form no sabe nada de type/meeting_url/
    // meeting_provider más que leerlos al enviar.
    const online = this.onlineFields()?.getValue();
    this.submitted.emit({
      ...raw,
      room_id: raw.room_id || null,
      reason: raw.reason || null,
      notes: raw.notes || null,
      starts_at: fromDatetimeLocal(raw.starts_at!),
      ends_at: fromDatetimeLocal(raw.ends_at!),
      ...online,
    } as AppointmentDto);
  }
}
