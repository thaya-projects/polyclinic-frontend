// Fase 4: profesional de la clínica (staff que atiende citas). Mínimo
// necesario para el picker del form de cita — sin agenda propia ni datos
// de otras tablas de Fase 4.
export interface Professional {
  id: string;
  full_name: string;
  specialty: string | null;
}
