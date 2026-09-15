// Tabla `user_role` (T1): role_id, branch_id (+ user_id, para saber de
// quién es cada asignación). branch_id null => todas las sucursales.
export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  branch_id: string | null;
}
