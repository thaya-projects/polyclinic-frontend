import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../../shared/components/data-table/data-table-column.model';
import { DataTableCellDirective } from '../../../../shared/components/data-table/data-table-cell.directive';
import { StatusChip, StatusChipTone } from '../../../../shared/components/status-chip/status-chip';
import { Tenant, TenantPlan, TenantStatus } from '../../../../core/models/tenant.model';

const PLAN_LABEL: Record<TenantPlan, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const STATUS_LABEL: Record<TenantStatus, string> = {
  active: 'Activo',
  trial: 'Trial',
  suspended: 'Suspendido',
  cancelled: 'Cancelado',
};

const STATUS_TONE: Record<TenantStatus, StatusChipTone> = {
  active: 'ok',
  trial: 'wait',
  suspended: 'neutral',
  cancelled: 'neutral',
};

@Component({
  selector: 'app-tenants-table',
  imports: [DataTable, DataTableCellDirective, StatusChip],
  templateUrl: './tenants-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantsTable {
  tenants = input.required<Tenant[]>();

  view = output<Tenant>();

  // app-data-table trabaja con filas genéricas; Tenant no tiene index
  // signature, así que se castea una sola vez acá para el binding.
  rows = computed(() => this.tenants() as unknown as Record<string, unknown>[]);

  readonly columns: DataTableColumn[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'slug', label: 'Slug' },
    { key: 'countryCode', label: 'País', align: 'center', width: '90px' },
    { key: 'plan', label: 'Plan' },
    { key: 'status', label: 'Estado' },
    { key: 'isActive', label: 'Activo', align: 'center', width: '90px' },
    { key: 'createdAt', label: 'Creado' },
    { key: 'actions', label: '', align: 'right', width: '90px' },
  ];

  planLabel(plan: TenantPlan): string {
    return PLAN_LABEL[plan];
  }

  statusLabel(status: TenantStatus): string {
    return STATUS_LABEL[status];
  }

  statusTone(status: TenantStatus): StatusChipTone {
    return STATUS_TONE[status];
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
