export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorName: string;
  date: Date;
  displayDate: string;
  medications: Medication[];
  active: boolean;
  daysRemaining: number;
}
