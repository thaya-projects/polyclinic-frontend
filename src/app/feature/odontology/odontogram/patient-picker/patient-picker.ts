import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { OdontogramPatientOption } from '../../../../core/models/odontogram.model';

// Presentacional: buscador de paciente para entrar al odontograma desde el menú (sin paciente en la
// URL). La página hace la búsqueda; acá solo se escribe el término y se elige.
@Component({
  selector: 'app-patient-picker',
  templateUrl: './patient-picker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientPicker {
  patients = input.required<OdontogramPatientOption[]>();
  loading = input(false);
  search = model('');

  picked = output<OdontogramPatientOption>();

  onInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }
}
