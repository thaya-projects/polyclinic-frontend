import { Patient } from '../models/patient.model';
import { Doctor } from '../models/doctor.model';
import { Appointment } from '../models/appointment.model';
import { HistoryEntry } from '../models/history.model';
import { Prescription } from '../models/prescription.model';

export const PATIENTS: Patient[] = [
  { id: 'p1', name: 'Rosa Mamani Quispe', documentId: '4521893', age: 42, specialty: 'Cardiología', initials: 'RM', status: 'active' },
  { id: 'p2', name: 'Andrés Condori', documentId: '7823401', age: 35, specialty: 'Cardiología', initials: 'AC', status: 'active' },
  { id: 'p3', name: 'Pedro Torrez', documentId: '6234781', age: 58, specialty: 'Cardiología', initials: 'PT', status: 'active' },
  { id: 'p4', name: 'María García', documentId: '5109234', age: 29, specialty: 'Traumatología', initials: 'MG', status: 'active' },
  { id: 'p5', name: 'Juan Flores', documentId: '3847201', age: 67, specialty: 'Neurología', initials: 'JF', status: 'active' },
];

export const DOCTORS: Doctor[] = [
  { id: 'd1', name: 'Dr. Roberto Vargas', specialty: 'Cardiología', initials: 'RV' },
  { id: 'd2', name: 'Dra. Carmen Solís', specialty: 'Traumatología', initials: 'CS' },
  { id: 'd3', name: 'Dr. Marco Huanca', specialty: 'Neurología', initials: 'MH' },
];

export const APPOINTMENTS: Appointment[] = [
  {
    id: 'c1', patientId: 'p4', patientName: 'María García', patientInitials: 'MG',
    doctorId: 'd1', doctorName: 'Dr. Vargas', date: new Date('2025-05-19'), time: '08:00',
    type: 'in-person', reason: 'Control rutinario', status: 'completed', attachments: []
  },
  {
    id: 'c2', patientId: 'p5', patientName: 'Juan Flores', patientInitials: 'JF',
    doctorId: 'd1', doctorName: 'Dr. Vargas', date: new Date('2025-05-19'), time: '09:00',
    type: 'in-person', reason: 'Dolor en pecho', status: 'completed', attachments: []
  },
  {
    id: 'c3', patientId: 'p1', patientName: 'Rosa Mamani', patientInitials: 'RM',
    doctorId: 'd1', doctorName: 'Dr. Vargas', date: new Date('2025-05-19'), time: '10:30',
    type: 'video', reason: 'Control post-operatorio', status: 'in-progress',
    attachments: [
      { id: 'a1', name: 'Radiografia.jpg', type: 'image', icon: 'photo' },
      { id: 'a2', name: 'Analisis.jpg', type: 'image', icon: 'photo' }
    ],
    patientNote: 'Me duele el pecho al hacer ejercicio desde hace 3 días. Adjunto las placas.',
    validityDays: 30
  },
  {
    id: 'c4', patientId: 'p2', patientName: 'Andrés Condori', patientInitials: 'AC',
    doctorId: 'd1', doctorName: 'Dr. Vargas', date: new Date('2025-05-20'), time: '08:30',
    type: 'in-person', reason: 'Revisión anual', status: 'confirmed', attachments: []
  },
  {
    id: 'c5', patientId: 'p2', patientName: 'Andrés Condori', patientInitials: 'AC',
    doctorId: 'd1', doctorName: 'Dr. Vargas', date: new Date('2025-05-20'), time: '11:00',
    type: 'video', reason: 'Revisión medicación', status: 'pending', attachments: [], validityDays: 30
  },
  {
    id: 'c6', patientId: 'p3', patientName: 'Pedro Torrez', patientInitials: 'PT',
    doctorId: 'd1', doctorName: 'Dr. Vargas', date: new Date('2025-05-20'), time: '14:00',
    type: 'video', reason: 'Seguimiento hipertensión', status: 'pending',
    attachments: [{ id: 'a3', name: 'Presion.jpg', type: 'image', icon: 'photo' }],
    validityDays: 30
  },
  {
    id: 'c7', patientId: 'p4', patientName: 'María García', patientInitials: 'MG',
    doctorId: 'd1', doctorName: 'Dr. Vargas', date: new Date('2025-05-21'), time: '09:00',
    type: 'in-person', reason: 'Control', status: 'confirmed', attachments: []
  },
  {
    id: 'c8', patientId: 'p3', patientName: 'Pedro Torrez', patientInitials: 'PT',
    doctorId: 'd1', doctorName: 'Dr. Vargas', date: new Date('2025-05-22'), time: '15:00',
    type: 'video', reason: 'Control mensual', status: 'confirmed', attachments: [], validityDays: 30
  },
];

export const HISTORY: HistoryEntry[] = [
  {
    id: 'h1', patientId: 'p1', date: new Date('2025-05-12'), displayDate: '12 may 2025',
    notes: 'Evolución favorable post-operatoria. Sin complicaciones.',
    doctorName: 'Dr. Vargas', type: 'in-person'
  },
  {
    id: 'h2', patientId: 'p1', date: new Date('2025-04-28'), displayDate: '28 abr 2025',
    notes: 'Cirugía coronaria exitosa. Reposo absoluto 2 semanas.',
    doctorName: 'Dr. Vargas', type: 'in-person'
  },
  {
    id: 'h3', patientId: 'p1', date: new Date('2025-04-15'), displayDate: '15 abr 2025',
    notes: 'Pre-operatorio. Exámenes dentro de parámetros normales.',
    doctorName: 'Dr. Vargas', type: 'video'
  },
];

export const PRESCRIPTIONS: Prescription[] = [
  {
    id: 'r1', patientId: 'p1', doctorName: 'Dr. Vargas',
    date: new Date('2025-05-12'), displayDate: '12 may 2025',
    medications: [
      { name: 'Atorvastatina 40mg', dosage: '40mg', frequency: '1 vez al día', duration: '30 días' },
      { name: 'Aspirina 100mg', dosage: '100mg', frequency: '1 vez al día', duration: '60 días' },
    ],
    active: true, daysRemaining: 18
  },
];
