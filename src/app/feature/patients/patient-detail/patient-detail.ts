import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { StatusChip } from '../../../shared/components/status-chip/status-chip';
import { PatientContacts } from '../patient-contacts/patient-contacts';
import { ClinicalRecordSection } from '../clinical-record-section/clinical-record-section';
import { TreatmentPlansSection } from '../treatment-plans-section/treatment-plans-section';
import { Patient } from '../../../core/models/patient.model';
import { documentTypeLabel, sexLabel } from '../../../core/constants/patient-options.const';

@Component({
  selector: 'app-patient-detail',
  imports: [StatusChip, PatientContacts, ClinicalRecordSection, TreatmentPlansSection],
  templateUrl: './patient-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientDetail {
  patient = input.required<Patient>();

  documentLabel(patient: Patient): string {
    return `${documentTypeLabel(patient.document_type)} ${patient.document_number}`.trim();
  }

  sexLabel(value: string): string {
    return value ? sexLabel(value) : '—';
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
