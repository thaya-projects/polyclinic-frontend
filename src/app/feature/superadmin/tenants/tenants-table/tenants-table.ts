import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../../shared/components/data-table/data-table-column.model';
import { DataTableCellDirective } from '../../../../shared/components/data-table/data-table-cell.directive';
import { StatusChip, StatusChipTone } from '../../../../shared/components/status-chip/status-chip';
import { Tenant, TenantStatus } from '../../../../core/models/tenant.model';

// Refleja Domain.Enums.SubscriptionStatus (backend) — status puede ser null si el tenant no
// tiene ninguna subscription todavía.
const STATUS_LABEL: Record<TenantStatus, string> = {
  trialing: 'Trial',
  active: 'Activa',
  past_due: 'Pago vencido',
  canceled: 'Cancelada',
  unpaid: 'Impaga',
};

const STATUS_TONE: Record<TenantStatus, StatusChipTone> = {
  trialing: 'wait',
  active: 'ok',
  past_due: 'neutral',
  canceled: 'neutral',
  unpaid: 'neutral',
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

  // plan es texto libre del backend (plan_name de la subscription real, no un enum fijo) — se
  // muestra tal cual, sin mapeo de labels.
  planLabel(plan: string | null): string {
    return plan ?? 'Sin plan';
  }

  statusLabel(status: TenantStatus | null): string {
    return status ? STATUS_LABEL[status] : 'Sin subscripción';
  }

  statusTone(status: TenantStatus | null): StatusChipTone {
    return status ? STATUS_TONE[status] : 'neutral';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
