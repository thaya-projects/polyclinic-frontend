import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NotificationTemplatesSection } from '../notification-templates-section/notification-templates-section';
import { ReminderRulesSection } from '../reminder-rules-section/reminder-rules-section';
import { NotificationsSection } from '../notifications-section/notifications-section';
import { InboundMessagesSection } from '../inbound-messages-section/inbound-messages-section';
import { PageTitleService } from '../../../core/services/page-title.service';

type Tab = 'templates' | 'rules' | 'notifications' | 'inbound';

// Página delgada: cada pestaña delega todo su estado/HTTP a su propia
// sección (NotificationTemplatesSection, ReminderRulesSection, etc.) —
// evita que este archivo crezca con la lógica de las 4 pantallas juntas.
@Component({
  selector: 'app-notification-templates-page',
  imports: [NotificationTemplatesSection, ReminderRulesSection, NotificationsSection, InboundMessagesSection],
  templateUrl: './notification-templates-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationTemplatesPage {
  activeTab = signal<Tab>('templates');

  constructor() {
    inject(PageTitleService).set('Notificaciones');
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }
}
