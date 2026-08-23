export interface PendingFeeApproval {
  userId: string;
  doctorName: string;
  specialtyName: string;
  clinicName: string;
  consultationFee: number;
  videoFee: number;
  updatedAt: string;
}

export interface UpdateFeesRequest {
  consultationFee: number;
  videoFee: number;
}
