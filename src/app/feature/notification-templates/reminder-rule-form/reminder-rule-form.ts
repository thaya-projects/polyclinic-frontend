import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { NotificationTemplatesService } from '../../../core/services/notification-templates.service';
import { ReminderRule, ReminderRuleDto, ReminderEventType } from '../../../core/models/reminder-rule.model';
import { NotificationChannel } from '../../../core/models/notification-template.model';
import { REMINDER_EVENT_TYPES, REMINDER_EVENT_TYPE_LABELS } from '../../../core/constants/reminder-event-type.const';
import { NOTIFICATION_CHANNELS, NOTIFICATION_CHANNEL_LABELS } from '../../../core/constants/notification-channel.const';
import {
  OFFSET_UNITS,
  OFFSET_UNIT_LABELS,
  OffsetDirection,
  OffsetUnit,
  formatOffset,
  fromOffsetMinutes,
  toOffsetMinutes,
} from '../../../shared/utils/reminder-offset.util';
import { fieldInputClass } from '../../../shared/utils/form-validation.util';

// No llama a ningún servicio para guardar — arma el payload y lo emite;
// el contenedor (NotificationTemplatesPage) decide cómo persistirlo.
@Component({
  selector: 'app-reminder-rule-form',
  imports: [ReactiveFormsModule],
  templateUrl: './reminder-rule-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReminderRuleForm {
  private fb = inject(FormBuilder);
  private templatesSvc = inject(NotificationTemplatesService);

  // null => alta de regla nueva; con valor => edición de esa regla.
  rule = input<ReminderRule | null>(null);
  saving = input(false);
  saveError = input<string | null>(null);

  submitted = output<ReminderRuleDto>();
  cancelled = output<void>();

  readonly eventTypes = REMINDER_EVENT_TYPES;
  readonly eventTypeLabels = REMINDER_EVENT_TYPE_LABELS;
  readonly channels = NOTIFICATION_CHANNELS;
  readonly channelLabels = NOTIFICATION_CHANNEL_LABELS;
  readonly units = OFFSET_UNITS;
  readonly unitLabels = OFFSET_UNIT_LABELS;
  readonly inputClass = fieldInputClass;

  private allTemplates = this.templatesSvc.getAll();

  form = this.fb.group({
    event_type: this.fb.control<ReminderEventType>('appointment_reminder', Validators.required),
    channel: this.fb.control<NotificationChannel>('whatsapp', Validators.required),
    offset_value: [0, [Validators.required, Validators.min(0)]],
    offset_unit: this.fb.control<OffsetUnit>('hours'),
    offset_direction: this.fb.control<OffsetDirection>('before'),
    template_id: [''],
  });

  private readonly selectedChannel = toSignal(this.form.controls.channel.valueChanges, { initialValue: 'whatsapp' as NotificationChannel });
  private readonly offsetValue = toSignal(this.form.controls.offset_value.valueChanges, { initialValue: 0 });
  private readonly offsetUnit = toSignal(this.form.controls.offset_unit.valueChanges, { initialValue: 'hours' as OffsetUnit });
  private readonly offsetDirection = toSignal(this.form.controls.offset_direction.valueChanges, { initialValue: 'before' as OffsetDirection });

  // Criterio de aceptación: el selector de plantilla solo ofrece
  // plantillas del mismo canal. Solo activas: no tiene sentido asignar
  // una plantilla deshabilitada a una regla nueva.
  readonly templateOptions = computed(() =>
    this.allTemplates().filter(t => t.channel === this.selectedChannel() && t.is_active),
  );

  // Vista previa en vivo de lo que se va a guardar — ayuda a confirmar
  // que "24 horas antes" realmente arma -1440 antes de guardar.
  readonly offsetPreview = computed(() => {
    const minutes = toOffsetMinutes(
      Number(this.offsetValue()) || 0,
      this.offsetUnit() ?? 'hours',
      this.offsetDirection() ?? 'before',
    );
    return `${formatOffset(minutes)} (${minutes} min)`;
  });

  constructor() {
    effect(() => {
      const r = this.rule();
      if (r) {
        const { value, unit, direction } = fromOffsetMinutes(r.offset_minutes);
        this.form.patchValue(
          {
            event_type: r.event_type,
            channel: r.channel,
            offset_value: value,
            offset_unit: unit,
            offset_direction: direction,
            template_id: r.template_id ?? '',
          },
          { emitEvent: false },
        );
      }
    });

    // Si se cambia de canal y la plantilla elegida ya no pertenece a ese
    // canal, se limpia — evita guardar una combinación inválida.
    effect(() => {
      const channel = this.selectedChannel();
      const currentId = this.form.controls.template_id.value;
      const stillValid = this.allTemplates().some(t => t.id === currentId && t.channel === channel);
      if (currentId && !stillValid) this.form.patchValue({ template_id: '' }, { emitEvent: false });
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.submitted.emit({
      event_type: raw.event_type!,
      channel: raw.channel!,
      offset_minutes: toOffsetMinutes(raw.offset_value!, raw.offset_unit!, raw.offset_direction!),
      template_id: raw.template_id || null,
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
