import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MeasurementForm } from '../../measurements/measurement-form/measurement-form';
import { CreateMeasurementDto, Measurement, MeasurementType, measurementTypeLabel } from '../../../core/models/measurement.model';
import { formatMeasuredAt, formatMeasurementValue } from '../../measurements/measurement-format.util';

// Fase 4 T3: sección compacta "Signos vitales" del detalle del encounter — PRESENTACIONAL. Recibe
// las mediciones de ese encounter y emite intenciones (create/retry). El formulario va precargado
// con el encounter_id (`encounterId`).
// `editable` = mismo cálculo que diagnósticos (profesional del encounter, activo, encounter open);
// si no, solo el listado.
// `busy` = cualquier operación en curso (mediciones, diagnósticos o la nota): el alta queda
// deshabilitada. La guarda de reentrada vive en MeasurementForm.
@Component({
  selector: 'app-encounter-measurements',
  imports: [MeasurementForm],
  templateUrl: './encounter-measurements.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EncounterMeasurements {
  encounterId = input.required<string>();
  measurements = input<Measurement[]>([]);
  types = input<MeasurementType[]>([]);
  typesError = input<string | null>(null);
  locale = input('es');
  loading = input(false);
  loadError = input<string | null>(null);
  loadRetryable = input(true);
  editable = input(false);
  saving = input(false);
  busy = input(false);
  error = input<string | null>(null);
  createdSeq = input(0);
  // Hay más mediciones del encounter que las mostradas (la sección pide una sola página).
  total = input(0);

  create = output<CreateMeasurementDto>();
  retry = output<void>();
  retryTypes = output<void>();

  readonly typeLabel = measurementTypeLabel;

  formatDate(iso: string): string {
    return formatMeasuredAt(iso, this.locale());
  }

  formatValue(value: number): string {
    return formatMeasurementValue(value, this.locale());
  }
}
