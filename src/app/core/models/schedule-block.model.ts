export interface CreateScheduleBlockRequest {
  from: string;
  to: string;
  reason?: string;
}

export interface ScheduleBlockDto {
  blockId: string;
  from: string;
  to: string;
  reason: string | null;
  durationHours: number;
}
