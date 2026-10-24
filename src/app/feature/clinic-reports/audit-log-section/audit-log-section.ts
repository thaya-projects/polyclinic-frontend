import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { AuditLogFilters } from '../audit-log-filters/audit-log-filters';
import { AuditLogTable, AuditLogRow } from '../audit-log-table/audit-log-table';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { Modal } from '../../../shared/components/modal/modal';
import { AuditLogService } from '../../../core/services/audit-log.service';
import { AUDIT_LOG_ENTITIES, AuditLogEntry } from '../../../core/models/audit-log.model';

const PAGE_SIZE = 10;

// Corresponde a GET /tenants/audit-log?from=&to=&entity=&page=&limit=.
// Solo lectura (criterio de aceptación) — sin ninguna acción de editar
// ni borrar en ningún lado.
@Component({
  selector: 'app-audit-log-section',
  imports: [AuditLogFilters, AuditLogTable, Pagination, Modal],
  templateUrl: './audit-log-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogSection {
  private auditSvc = inject(AuditLogService);

  readonly entities = AUDIT_LOG_ENTITIES;

  readonly pageData = this.auditSvc.page;
  readonly loading = this.auditSvc.loading;
  readonly error = this.auditSvc.error;
  readonly pageSize = PAGE_SIZE;

  from = signal('');
  to = signal('');
  entity = signal('');
  page = signal(1);

  selectedEntry = signal<AuditLogEntry | null>(null);

  // El nombre del actor ya viene resuelto del backend (T4) — acá solo se
  // arma el "valor claro" para los dos casos sin nombre (criterio de
  // aceptación): sin actor_id (acción de sistema) o con un actor_id cuyo
  // usuario ya no existe.
  readonly rows = computed<AuditLogRow[]>(() =>
    (this.pageData()?.items ?? []).map(entry => ({ ...entry, actor_name: this.resolveActorName(entry) })),
  );

  readonly total = computed(() => this.pageData()?.total ?? 0);

  readonly payloadJson = computed(() => {
    const entry = this.selectedEntry();
    return entry ? JSON.stringify(entry.payload, null, 2) : '';
  });

  constructor() {
    // Volver a la página 1 cada vez que cambian los filtros.
    effect(() => {
      this.from();
      this.to();
      this.entity();
      this.page.set(1);
    });

    effect(() => {
      this.auditSvc.load({ from: this.from() || undefined, to: this.to() || undefined, entity: this.entity() || undefined, page: this.page(), limit: this.pageSize });
    });
  }

  resolveActorName(entry: Pick<AuditLogEntry, 'actor_id' | 'actor_name'>): string {
    if (!entry.actor_id) return 'Sistema';
    return entry.actor_name ?? 'Usuario no disponible';
  }

  openDetail(entry: AuditLogEntry): void {
    this.selectedEntry.set(entry);
  }

  closeDetail(): void {
    this.selectedEntry.set(null);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
