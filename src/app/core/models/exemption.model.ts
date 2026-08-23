export interface CreateExemptionRequest {
  consultationId: string;
  reason: string;
}

export interface PaymentExemptionDto {
  exemptionId: string;
  consultationId: string;
  patientName: string;
  doctorName: string;
  originalFee: number;
  reason: string;
  authorizedByName: string;
  authorizedAt: string;
}
