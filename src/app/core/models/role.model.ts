// Placeholder mínimo hasta que exista el schema real de auth/roles (ver doc).
// 'super_admin'  -> staff de la plataforma, ve el panel Super Admin completo.
// 'app_user'     -> usuario de un tenant (clínica), NO debe ver rutas de Super Admin.
export type AppRole = 'super_admin' | 'app_user';
