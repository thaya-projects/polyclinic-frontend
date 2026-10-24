// Fase 10 T2: registro de auditoría, de solo lectura — nunca se edita ni
// se borra desde esta UI (prohibido en el ticket). tenant_id no se
// muestra ni se manda como filtro (sale del token, scopea el query solo
// del lado del backend).
export interface AuditLogEntry {
  id: string;
  // null = acción del sistema (ej. un worker), no de un usuario — se
  // tiene que mostrar un valor claro para este caso (criterio de
  // aceptación), no una celda vacía.
  actor_id: string | null;
  // T4: se asume que el backend ya lo resuelve (join contra app_user) en
  // vez de que el frontend haga un lookup aparte — null cuando actor_id
  // tiene valor pero el usuario ya no existe (otro "valor claro" posible).
  actor_name: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  payload: Record<string, unknown>;
  ip: string | null;
  created_at: string;
}

// GET /tenants/audit-log?from=&to=&entity=&page=&limit=
export interface AuditLogQuery {
  from?: string;
  to?: string;
  entity?: string;
  page: number;
  limit: number;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  total: number;
}

// `entity` es "text" en el schema, no un enum de DB — esta lista sale de
// las acciones que el propio schema dice que se auditan (login/logout →
// app_user, create/update tenant → tenant, etc.), no de datos mock.
export const AUDIT_LOG_ENTITIES = ['app_user', 'tenant', 'patient', 'appointment', 'encounter', 'invoice', 'payment'];
