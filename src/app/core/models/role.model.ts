// Código de rol de clínica tal como lo devuelve el backend real en
// roles[].code (GET /auth/me, POST /auth/login). Comparar siempre contra
// estos strings literales — nunca traducir a español para rutear/guardas.
// Nombrado "SessionRoleCode" (no "ClinicRole") para no chocar con
// ClinicRole, que es la entidad de negocio del catálogo de roles
// (core/models/clinic-role.model.ts) — son dos conceptos distintos.
export type SessionRoleCode = 'admin' | 'recepcion' | 'profesional';
