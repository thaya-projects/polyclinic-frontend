import { ChangeDetectionStrategy, Component, effect, inject, input, output, viewChild } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Appointment, AppointmentDto, AppointmentPatientOption, AppointmentServiceOption } from '../../../core/models/appointment.model';
import { Branch } from '../../../core/models/branch.model';
import { Professional } from '../../../core/models/professional.model';
import { Room } from '../../../core/models/room.model';
import { AppointmentOnlineFields } from '../appointment-online-fields/appointment-online-fields';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../shared/utils/form-validation.util';
import { applyServerError } from '../../../shared/utils/server-errors.util';

// Mismas reglas que CreateAppointmentDTO/Appointment.Create del backend: sucursal, paciente,
// profesional e inicio obligatorios; fin obligatorio solo si no hay servicio (el backend lo
// calcula con la duración del servicio) y siempre posterior al inicio. El error queda en el
// control ends_at (no en el grupo) para mostrarlo debajo de ese input.
function endsAtValidator(group: AbstractControl): ValidationErrors | null {
  const endsCtrl = group.get('ends_at');
  if (!endsCtrl) return null;
  const starts = group.get('starts_at')?.value;
  const ends = endsCtrl.value;
  const hasService = !!group.get('service_id')?.value;

  const otherErrors = { ...endsCtrl.errors };
  delete otherErrors['dateRange'];
  delete otherErrors['required'];

  if (!ends && !hasService) otherErrors['required'] = true;
  else if (starts && ends && new Date(ends) <= new Date(starts)) otherErrors['dateRange'] = true;

  endsCtrl.setErrors(Object.keys(otherErrors).length ? otherErrors : null);
  return null;
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
  readonly isInvalid = isFieldInvalid;

  form = this.fb.group(
    {
      branch_id: ['', Validators.required],
      patient_id: ['', Validators.required],
      professional_id: ['', Validators.required],
      service_id: [''],
      room_id: [''],
      starts_at: ['', Validators.required],
      ends_at: [''],
      reason: [''],
      notes: [''],
    },
    { validators: endsAtValidator },
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

  errorMessage(control: AbstractControl | null): string {
    if (control?.errors?.['dateRange']) return 'La hora de fin tiene que ser posterior a la hora de inicio.';
    if (control === this.form.controls.ends_at && control.errors?.['required']) {
      return 'Ingresá la hora de fin o elegí un servicio (se calcula con su duración).';
    }
    return fieldErrorMessage(control);
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
    // Campos online (T3): vienen de AppointmentOnlineFields, componente
    // aparte integrado acá — este form no sabe nada de type/meeting_url/
    // meeting_provider más que leerlos al enviar.
    this.submitted.emit({
      ...raw,
      service_id: raw.service_id || null,
      room_id: raw.room_id || null,
      reason: raw.reason || null,
      notes: raw.notes || null,
      starts_at: fromDatetimeLocal(raw.starts_at!),
      ends_at: raw.ends_at ? fromDatetimeLocal(raw.ends_at) : null,
      ...online?.getValue(),
    } as AppointmentDto);
  }
}
