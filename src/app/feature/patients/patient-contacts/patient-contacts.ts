import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { ContactsTable } from '../contacts-table/contacts-table';
import { ContactForm } from '../contact-form/contact-form';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { PatientContactsService } from '../../../core/services/patient-contacts.service';
import { PatientContact, PatientContactDto } from '../../../core/models/patient-contact.model';
import { contactRemoveErrorMessage, contactSaveErrorMessage } from '../../../shared/utils/patient-contacts-error.util';

@Component({
  selector: 'app-patient-contacts',
  imports: [ContactsTable, ContactForm, ConfirmDialog],
  templateUrl: './patient-contacts.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientContacts {
  private contactsSvc = inject(PatientContactsService);
  private allContacts = this.contactsSvc.getAll();
  private contactForm = viewChild(ContactForm);

  patientId = input.required<string>();

  readonly contacts = computed(() => this.allContacts().filter(c => c.patient_id === this.patientId()));
  readonly listLoading = this.contactsSvc.loading;
  readonly listError = this.contactsSvc.error;

  editingContact = signal<PatientContact | null>(null);
  saving = signal(false);
  saveError = signal<string | null>(null);

  contactToRemove = signal<PatientContact | null>(null);
  removing = signal(false);
  removeError = signal<string | null>(null);

  readonly removeMessage = computed(() => {
    const err = this.removeError();
    if (err) return err;
    const contact = this.contactToRemove();
    return contact ? `¿Seguro que querés eliminar a "${contact.full_name}" de los contactos?` : '';
  });

  constructor() {
    // GET /tenants/patients/:id/contacts — se pide de nuevo cada vez que
    // cambia el paciente (la ficha se abre para otro).
    effect(() => {
      this.contactsSvc.loadForPatient(this.patientId());
    });
  }

  onSave(dto: PatientContactDto): void {
    const editing = this.editingContact();
    this.saving.set(true);
    this.saveError.set(null);

    const request$ = editing
      ? this.contactsSvc.update(this.patientId(), editing.id, dto)
      : this.contactsSvc.create(this.patientId(), dto);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        // Solo limpia el form en alta — al editar no hay nada que "limpiar",
        // el form ya refleja lo que quedó guardado vía el input `contact`.
        if (!editing) this.contactForm()?.resetForCreate();
        this.editingContact.set(null);
      },
      error: err => {
        this.saving.set(false);
        // Error de un campo: se marca en su input; el banner queda para lo que no es de un campo.
        this.saveError.set(this.contactForm()?.applyServerError(err) ? null : contactSaveErrorMessage(err));
      },
    });
  }

  onEdit(contact: PatientContact): void {
    this.saveError.set(null);
    this.editingContact.set(contact);
  }

  onCancelEdit(): void {
    this.saveError.set(null);
    this.editingContact.set(null);
  }

  onSetPrimary(contact: PatientContact): void {
    this.contactsSvc.setPrimary(this.patientId(), contact.id).subscribe({
      error: err => this.saveError.set(contactSaveErrorMessage(err)),
    });
  }

  requestRemove(contact: PatientContact): void {
    this.contactToRemove.set(contact);
    this.removeError.set(null);
  }

  cancelRemove(): void {
    this.contactToRemove.set(null);
    this.removeError.set(null);
  }

  confirmRemove(): void {
    const contact = this.contactToRemove();
    if (!contact) return;

    this.removing.set(true);
    this.removeError.set(null);
    // Actualiza solo el cache local (PatientContactsService.remove), sin
    // recargar toda la página — criterio de aceptación de T5.
    this.contactsSvc.remove(this.patientId(), contact.id).subscribe({
      next: () => {
        this.removing.set(false);
        if (this.editingContact()?.id === contact.id) this.editingContact.set(null);
        this.contactToRemove.set(null);
      },
      error: err => {
        this.removing.set(false);
        this.removeError.set(contactRemoveErrorMessage(err));
      },
    });
  }
}
