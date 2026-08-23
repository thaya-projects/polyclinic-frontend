export interface Patient {
  id: string;
  name: string;
  documentId: string;
  age: number;
  specialty: string;
  initials: string;
  status: 'active' | 'inactive';
}
