import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NotificationTemplatesTable } from '../notification-templates-table/notification-templates-table';
import { NotificationTemplateForm } from '../notification-template-form/notification-template-form';
import { Modal } from '../../../shared/components/modal/modal';
import { NotificationTemplatesService } from '../../../core/services/notification-templates.service';
import { NotificationTemplate, NotificationTemplateDto } from '../../../core/models/notification-template.model';
import { notificationTemplateSaveErrorMessage } from '../../../shared/utils/notification-templates-error.util';

@Component({
  selector: 'app-notification-templates-section',
  imports: [NotificationTemplatesTable, NotificationTemplateForm, Modal],
  templateUrl: './notification-templates-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationTemplatesSection {
  private templatesSvc = inject(NotificationTemplatesService);

  readonly templates = this.templatesSvc.getAll();
  readonly listLoading = this.templatesSvc.loading;
  readonly listError = this.templatesSvc.error;

  creating = signal(false);
  selectedTemplateId = signal<string | null>(null);
  saving = signal(false);
  actionError = signal<string | null>(null);

  readonly selectedTemplate = computed<NotificationTemplate | null>(() => {
    const id = this.selectedTemplateId();
    return id ? (this.templates().find(t => t.id === id) ?? null) : null;
  });

  constructor() {
    this.templatesSvc.load();
  }

  openCreate(): void {
    this.actionError.set(null);
    this.creating.set(true);
  }

  closeCreate(): void {
    this.creating.set(false);
  }

  // POST /tenants/notification-templates
  onCreate(dto: NotificationTemplateDto): void {
    this.saving.set(true);
    this.actionError.set(null);
    this.templatesSvc.create(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.creating.set(false);
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(notificationTemplateSaveErrorMessage(err));
      },
    });
  }

  openDetail(template: NotificationTemplate): void {
    this.actionError.set(null);
    this.selectedTemplateId.set(template.id);
  }

  closeDetail(): void {
    this.selectedTemplateId.set(null);
  }

  // PATCH /tenants/notification-templates/:id — solo se llama para
  // plantillas de la clínica; para una global, el form ya se muestra de
  // solo lectura y no emite `submitted`.
  onSaveEdit(dto: NotificationTemplateDto): void {
    const template = this.selectedTemplate();
    if (!template) return;
    this.saving.set(true);
    this.actionError.set(null);
    this.templatesSvc.update(template.id, dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeDetail();
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(notificationTemplateSaveErrorMessage(err));
      },
    });
  }
}
