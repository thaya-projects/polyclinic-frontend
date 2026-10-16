export interface Room {
  id: string;
  branch_id: string;
  name: string;
  is_active: boolean;
}

export interface CreateRoomDto {
  branch_id: string;
  name: string;
}

// PATCH parcial: null = no tocar. Soft delete vía is_active (no hay endpoint /deactivate).
export interface UpdateRoomDto {
  name?: string;
  branch_id?: string;
  is_active?: boolean;
}