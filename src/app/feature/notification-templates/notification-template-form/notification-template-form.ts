import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  NotificationTemplate,
  NotificationTemplateDto,
  NotificationChannel,
} from '../../../core/models/notification-template.model';
import { NOTIFICATION_CHANNELS, NOTIFICATION_CHANNEL_LABELS, NOTIFICATION_LANGUAGES } from '../../../core/constants/notification-channel.const';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid, requiredNotBlankValidator } from '../../../shared/utils/form-validation.util';
import { applyServerError } from '../../../shared/utils/server-errors.util';

// No llama a ningún servicio — arma el payload y lo emite; el contenedor
// (NotificationTemplatesPage) decide cómo persistirlo.
@Component({
  selector: 'app-notification-template-form',
  imports: [ReactiveFormsModule],
  templateUrl: './notification-template-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationTemplateForm {
  private fb = inject(FormBuilder);

  // null => alta de plantilla nueva; con valor => edición de esa plantilla.
  template = input<NotificationTemplate | null>(null);
  saving = input(false);
  saveError = input<string | null>(null);

  submitted = output<NotificationTemplateDto>();
  cancelled = output<void>();

  readonly channels = NOTIFICATION_CHANNELS;
  readonly channelLabels = NOTIFICATION_CHANNEL_LABELS;
  readonly languages = NOTIFICATION_LANGUAGES;

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  // Criterio de aceptación: las plantillas globales se muestran de solo
  // lectura (tenant_id null = de la plataforma, no se edita acá).
  readonly readonlyMode = computed(() => {
    const t = this.template();
    return t !== null && t.tenant_id === null;
  });

  form = this.fb.group({
    channel: this.fb.control<NotificationChannel>('whatsapp', Validators.required),
    code: ['', requiredNotBlankValidator],
    name: ['', requiredNotBlankValidator],
    body: [''],
    language: ['es'],
    variables: [''],
  });

  constructor() {
    effect(() => {
      const t = this.template();
      this.form.patchValue(
        {
          channel: t?.channel ?? 'whatsapp',
          code: t?.code ?? '',
          name: t?.name ?? '',
          body: t?.body ?? '',
          language: t?.language ?? 'es',
          variables: t?.variables.join(', ') ?? '',
        },
        { emitEvent: false },
      );
    });
  }

  // Error 400/422 del backend: lo marca en el input del campo que falló. false = no es de un campo
  // de este form (el contenedor muestra el mensaje general).
  applyServerError(err: unknown): boolean {
    return applyServerError(this.form, err);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.submitted.emit({
      channel: raw.channel!,
      code: raw.code!.trim(),
      name: raw.name!.trim(),
      body: raw.body ?? '',
      language: raw.language ?? 'es',
      variables: (raw.variables ?? '')
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0),
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
