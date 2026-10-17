import { InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateOdontogramDto, Odontogram, OdontogramPatientOption } from '../models/odontogram.model';
import { HttpOdontogramRepository } from './odontogram-http.repository';

// Fase 6 T5: abstracción de la fuente de datos del odontograma. Las pantallas solo conocen este
// contrato (vía ODONTOGRAM_REPOSITORY), nunca HttpClient ni el mock — así T5 corre con
// MockOdontogramRepository y T6 enchufa HttpOdontogramRepository sin tocar componentes.
//
// Los errores viajan como HttpErrorResponse en ambas implementaciones (el mock los fabrica con el
// mismo status y detail que el backend), para que el manejo de 401/403/404/409/422 sea uno solo.
export interface OdontogramRepository {
  // Odontograma current del paciente. Sin current → 404 ("has no current odontogram"); paciente
  // inexistente o de otro tenant → 404 (Patient not found).
  getCurrent(patientId: string): Observable<Odontogram>;
  // Cualquiera (current o snapshot histórico). Inexistente / otro tenant → 404.
  getById(id: string): Observable<Odontogram>;
  // Nuevo current: el anterior (si había) queda is_current = false. Carrera de current → 409;
  // clinical_record_id faltante / de otro paciente → 422.
  create(patientId: string, dto: CreateOdontogramDto): Observable<Odontogram>;

  // El alta exige clinical_record_id: se resuelve desde el paciente (1-1, fase 3).
  resolveClinicalRecordId(patientId: string): Observable<string>;

  // Lookups de paciente: encabezado de la pantalla y selector cuando se entra sin paciente.
  getPatient(id: string): Observable<OdontogramPatientOption>;
  listPatients(q?: string): Observable<OdontogramPatientOption[]>;

  // Estado del módulo "odontogram" para la sesión (null = todavía desconocido). Sirve de respaldo
  // cuando el 403 del módulo apagado llega sin body (ver odontogram-error.util).
  odontogramEnabled(): boolean | null;
}

// T6: la implementación HTTP es la default. Para correr contra el mock (demo/tests):
//   providers: [{ provide: ODONTOGRAM_REPOSITORY, useClass: MockOdontogramRepository }]
//   (MockOdontogramRepository vive en src/app/testing/).
export const ODONTOGRAM_REPOSITORY = new InjectionToken<OdontogramRepository>(
  'ODONTOGRAM_REPOSITORY',
  { providedIn: 'root', factory: () => inject(HttpOdontogramRepository) },
);
