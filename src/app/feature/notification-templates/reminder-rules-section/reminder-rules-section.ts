import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ReminderRulesTable, ReminderRuleRow } from '../reminder-rules-table/reminder-rules-table';
import { ReminderRuleForm } from '../reminder-rule-form/reminder-rule-form';
import { Modal } from '../../../shared/components/modal/modal';
import { ReminderRulesService } from '../../../core/services/reminder-rules.service';
import { NotificationTemplatesService } from '../../../core/services/notification-templates.service';
import { ReminderRule, ReminderRuleDto } from '../../../core/models/reminder-rule.model';
import { reminderRuleSaveErrorMessage } from '../../../shared/utils/reminder-rules-error.util';

@Component({
  selector: 'app-reminder-rules-section',
  imports: [ReminderRulesTable, ReminderRuleForm, Modal],
  templateUrl: './reminder-rules-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReminderRulesSection {
  private rulesSvc = inject(ReminderRulesService);
  // Las reglas ya cargadas por NotificationTemplatesSection (ambas viven
  // en la misma página); si se abre esta pestaña primero igual se carga.
  private templatesSvc = inject(NotificationTemplatesService);

  readonly rules = this.rulesSvc.getAll();
  readonly listLoading = this.rulesSvc.loading;
  readonly listError = this.rulesSvc.error;
  private templates = this.templatesSvc.getAll();

  creating = signal(false);
  selectedRuleId = signal<string | null>(null);
  saving = signal(false);
  actionError = signal<string | null>(null);

  readonly selectedRule = computed<ReminderRule | null>(() => {
    const id = this.selectedRuleId();
    return id ? (this.rules().find(r => r.id === id) ?? null) : null;
  });

  // Join local con las plantillas — solo para mostrar el nombre en la
  // tabla; reminder_rule.template_id sigue siendo la fuente de verdad.
  readonly ruleRows = computed<ReminderRuleRow[]>(() =>
    this.rules().map(rule => {
      const template = rule.template_id ? this.templates().find(t => t.id === rule.template_id) : null;
      return { ...rule, template_name: template?.name ?? 'Sin plantilla' };
    }),
  );

  constructor() {
    this.rulesSvc.load();
    this.templatesSvc.load();
  }

  openCreate(): void {
    this.actionError.set(null);
    this.creating.set(true);
  }

  closeCreate(): void {
    this.creating.set(false);
  }

  onCreate(dto: ReminderRuleDto): void {
    this.saving.set(true);
    this.actionError.set(null);
    this.rulesSvc.create(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.creating.set(false);
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(reminderRuleSaveErrorMessage(err));
      },
    });
  }

  openDetail(rule: ReminderRule): void {
    this.actionError.set(null);
    this.selectedRuleId.set(rule.id);
  }

  closeDetail(): void {
    this.selectedRuleId.set(null);
  }

  onSaveEdit(dto: ReminderRuleDto): void {
    const rule = this.selectedRule();
    if (!rule) return;
    this.saving.set(true);
    this.actionError.set(null);
    this.rulesSvc.update(rule.id, dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeDetail();
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(reminderRuleSaveErrorMessage(err));
      },
    });
  }
}
