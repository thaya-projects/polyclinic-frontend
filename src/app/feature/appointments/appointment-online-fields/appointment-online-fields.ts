import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AppointmentType } from '../../../core/models/appointment.model';
import { APPOINTMENT_TYPES, APPOINTMENT_TYPE_LABELS } from '../../../core/constants/appointment-type.const';
import { fieldInputClass } from '../../../shared/utils/form-validation.util';

export interface AppointmentOnlineFieldsValue {
  type: AppointmentType;
  meeting_url: string | null;
  meeting_provider: string | null;
}

// Pensado para integrarse al form de AGENDA (AppointmentForm): no tiene
// botón propio ni emite nada solo — el padre lee getValue() cuando él
// mismo arma su DTO al enviar. Desacoplado de la fuente de datos: no sabe
// si la cita viene de un mock o de HTTP, solo recibe los valores
// iniciales para precargar (edición).
@Component({
  selector: 'app-appointment-online-fields',
  imports: [ReactiveFormsModule],
  templateUrl: './appointment-online-fields.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppointmentOnlineFields {
  private fb = inject(FormBuilder);

  initialType = input<AppointmentType>('in_person');
  initialMeetingUrl = input<string | null>(null);
  initialMeetingProvider = input<string | null>(null);

  readonly inputClass = fieldInputClass;
  readonly typeOptions = APPOINTMENT_TYPES;
  readonly typeLabels = APPOINTMENT_TYPE_LABELS;

  // Sin validación de formato de URL (v1, sin SDK de Zoom) ni campos
  // obligatorios — el ticket pide que nunca bloqueen el guardado.
  form = this.fb.group({
    type: this.fb.control<AppointmentType>('in_person'),
    meeting_url: [''],
    meeting_provider: [''],
  });

  private readonly selectedType = toSignal(this.form.controls.type.valueChanges, { initialValue: 'in_person' as AppointmentType });
  readonly showMeetingFields = computed(() => this.selectedType() === 'online' || this.selectedType() === 'hybrid');

  constructor() {
    // Precarga (edición): se repite cada vez que cambian los inputs, ej.
    // al abrir el form para otra cita.
    effect(() => {
      this.form.patchValue(
        {
          type: this.initialType(),
          meeting_url: this.initialMeetingUrl() ?? '',
          meeting_provider: this.initialMeetingProvider() ?? '',
        },
        { emitEvent: false },
      );
    });

    // Criterio de aceptación: al cambiar a "in_person" se limpian los
    // campos de reunión (además de ocultarse en el template).
    effect(() => {
      if (this.selectedType() === 'in_person') {
        this.form.patchValue({ meeting_url: '', meeting_provider: '' }, { emitEvent: false });
      }
    });
  }

  getValue(): AppointmentOnlineFieldsValue {
    const raw = this.form.getRawValue();
    const showMeeting = this.showMeetingFields();
    return {
      type: raw.type ?? 'in_person',
      meeting_url: showMeeting ? raw.meeting_url || null : null,
      meeting_provider: showMeeting ? raw.meeting_provider || null : null,
    };
  }
}
