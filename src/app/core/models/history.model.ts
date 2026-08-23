export interface HistoryEntry {
  id: string;
  patientId: string;
  date: Date;
  displayDate: string;
  notes: string;
  doctorName: string;
  type: 'in-person' | 'video';
}
