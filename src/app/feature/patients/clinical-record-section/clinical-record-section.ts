import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { ClinicalRecordForm } from '../clinical-record-form/clinical-record-form';
import { ClinicalRecordsService } from '../../../core/services/clinical-records.service';
import { ClinicalRecordDto } from '../../../core/models/clinical-record.model';
import { clinicalRecordSaveErrorMessage } from '../../../shared/utils/clinical-record-error.util';

@Component({
  selector: 'app-clinical-record-section',
  imports: [ClinicalRecordForm],
  templateUrl: './clinical-record-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClinicalRecordSection {
  private recordsSvc = inject(ClinicalRecordsService);

  patientId = input.required<string>();
  section = input<'clinical' | 'habits'>('clinical');

  readonly record = computed(() => this.recordsSvc.findByPatientId(this.patientId()));
  readonly listLoading = this.recordsSvc.loading;
  readonly listError = this.recordsSvc.error;

  private readonly form = viewChild(ClinicalRecordForm);

  saving = signal(false);
  saveError = signal<string | null>(null);
  savedJustNow = signal(false);
  private savedTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    // GET /tenants/patients/:id/clinical-record — se pide de nuevo cada
    // vez que cambia el paciente (la ficha se abre para otro).
    effect(() => {
      this.recordsSvc.loadForPatient(this.patientId());
    });
  }

  onSave(dto: ClinicalRecordDto): void {
    this.saving.set(true);
    this.saveError.set(null);
    this.recordsSvc.save(this.patientId(), dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.savedJustNow.set(true);
        clearTimeout(this.savedTimer);
        this.savedTimer = setTimeout(() => this.savedJustNow.set(false), 2000);
      },
      error: err => {
        this.saving.set(false);
        this.saveError.set(this.form()?.applyServerError(err) ? null : clinicalRecordSaveErrorMessage(err));
      },
    });
  }
}
