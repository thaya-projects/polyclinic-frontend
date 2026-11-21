import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ClinicReportsSummarySection } from '../clinic-reports-summary-section/clinic-reports-summary-section';
import { FinancialReportsSection } from '../financial-reports-section/financial-reports-section';
import { AuditLogSection } from '../audit-log-section/audit-log-section';
import { PageTitleService } from '../../../core/services/page-title.service';

type Tab = 'summary' | 'financial' | 'audit';

@Component({
  selector: 'app-clinic-reports-page',
  imports: [ClinicReportsSummarySection, FinancialReportsSection, AuditLogSection],
  templateUrl: './clinic-reports-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClinicReportsPage {
  activeTab = signal<Tab>('summary');

  constructor() {
    inject(PageTitleService).set('Reportes');
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }
}
