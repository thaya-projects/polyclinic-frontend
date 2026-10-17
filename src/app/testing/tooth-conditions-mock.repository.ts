import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { moduleDisabledError } from './module-problem';
import type { ToothConditionsRepository } from '../core/services/tooth-conditions-repository';
import { Dentition } from '../core/models/odontogram.model';
import {
  CreateToothConditionDto, DEFAULT_TOOTH_CONDITION_STATE, DEFAULT_TOOTH_SURFACE, TOOTH_CONDITION_STATES,
  TOOTH_SURFACES, ToothCondition, ToothConditionState, ToothSurface, UpdateToothConditionDto,
  isValidFdiForDentition,
} from '../core/models/tooth-condition.model';

export const MOCK_TOOTH_CONDITION_USER_ID = 'user-mock';

// Dentición de los odontogramas del MockOdontogramRepository (odo-1/odo-2 de pat-1, odo-3 de pat-3).
const SEED_DENTITIONS: Record<string, Dentition> = { 'odo-1': 'permanente', 'odo-2': 'permanente', 'odo-3': 'mixta' };

// condition_id del MockDentalConditionsRepository (dc-1 caries, dc-2 obturación, dc-3 corona, dc-4 ausente).
function seed(): ToothCondition[] {
  const mark = (
    id: string, odontogramId: string, fdi: number, surface: ToothSurface, conditionId: string,
    state: ToothConditionState, createdAt: string, note: string | null = null,
  ): ToothCondition => ({
    id, odontogram_id: odontogramId, tooth_fdi: fdi, surface, condition_id: conditionId, state, note,
    created_at: createdAt, created_by: MOCK_TOOTH_CONDITION_USER_ID,
  });
  return [
    mark('tc-1', 'odo-2', 16, 'oclusal', 'dc-1', 'existente', '2026-03-10T14:35:00Z'),
    mark('tc-2', 'odo-2', 36, 'whole', 'dc-3', 'realizado', '2026-03-10T14:36:00Z', 'Corona de porcelana'),
    mark('tc-3', 'odo-2', 46, 'whole', 'dc-4', 'existente', '2026-03-10T14:37:00Z'),
    mark('tc-4', 'odo-3', 54, 'oclusal', 'dc-2', 'planificado', '2026-05-20T10:05:00Z'),
  ];
}

function httpError(status: number, detail: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: { detail } }));
}

// Fase 6 T5: condiciones por pieza en memoria (NO providedIn root; el default del token es
// HttpToothConditionsRepository — este mock queda para tests/demo). Imita el contrato del backend:
//   list: las del odontograma, por created_at.
//   create: tooth_fdi FDI válido y según la dentición del odontograma (422, textos reales del backend) → condition_id requerido (422) →
//           surface / state válidos (422). Defaults: surface whole, state existente. note vacía = null.
//   update: 404 (inexistente o de otro odontograma) → PATCH parcial; note null = quitar. tooth_fdi inmutable.
//   remove: 404 → borra.
//   markHistoric(id): create / update / remove en ese odontograma → 409 (odontograma histórico).
//   Módulo "odontogram" apagado (setOdontogramEnabled(false)): toda llamada → 403 ProblemDetails de
//   ModuleDisabledException (code "module_disabled").
// La dentición se conoce para los odontogramas sembrados y los registrados con registerOdontogram();
// para un id desconocido (p. ej. uno real del backend en la demo) se acepta cualquier FDI válido
// (mixta). El front valida igual la dentición antes de llamar.
// Sin delays (los tests no necesitan timers falsos).
@Injectable()
export class MockToothConditionsRepository implements ToothConditionsRepository {
  private items: ToothCondition[] = seed();
  private dentitions: Record<string, Dentition> = { ...SEED_DENTITIONS };
  private nextId = 100;
  private moduleEnabled = true;
  private historic = new Set<string>();

  // Helper para tests/demo: prende o apaga el módulo "odontogram" del tenant.
  setOdontogramEnabled(enabled: boolean): void {
    this.moduleEnabled = enabled;
  }

  // Helper para tests/demo: fija la dentición de un odontograma (valida tooth_fdi al crear).
  registerOdontogram(odontogramId: string, dentition: Dentition): void {
    this.dentitions[odontogramId] = dentition;
  }

  // Helper para tests/demo: el odontograma pasa a histórico (is_current = false) → escrituras 409.
  markHistoric(odontogramId: string): void {
    this.historic.add(odontogramId);
  }

  odontogramEnabled(): boolean | null {
    return this.moduleEnabled;
  }

  list(odontogramId: string): Observable<ToothCondition[]> {
    if (!this.moduleEnabled) return moduleDisabled();
    return of(this.items
      .filter(i => i.odontogram_id === odontogramId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(i => ({ ...i })));
  }

  create(odontogramId: string, dto: CreateToothConditionDto): Observable<ToothCondition> {
    if (!this.moduleEnabled) return moduleDisabled();
    const dentition = this.dentitions[odontogramId] ?? 'mixta';
    if (this.historic.has(odontogramId)) return historic(odontogramId);
    if (!isValidFdiForDentition(dto.tooth_fdi, 'mixta')) {
      return httpError(422, `tooth_fdi ${dto.tooth_fdi} is not a valid FDI tooth number `
        + '(11-18, 21-28, 31-38, 41-48, 51-55, 61-65, 71-75, 81-85).');
    }
    if (!isValidFdiForDentition(dto.tooth_fdi, dentition)) {
      return httpError(422, `tooth_fdi ${dto.tooth_fdi} is not valid for a '${dentition}' dentition.`);
    }
    const conditionId = (dto.condition_id ?? '').trim();
    if (!conditionId) return httpError(422, 'condition_id is required.');
    const surface = dto.surface ?? DEFAULT_TOOTH_SURFACE;
    if (!TOOTH_SURFACES.includes(surface)) return invalidSurface();
    const state = dto.state ?? DEFAULT_TOOTH_CONDITION_STATE;
    if (!TOOTH_CONDITION_STATES.includes(state)) return invalidState();

    const created: ToothCondition = {
      id: `tc-${this.nextId++}`, odontogram_id: odontogramId, tooth_fdi: dto.tooth_fdi, surface,
      condition_id: conditionId, state, note: normalizeNote(dto.note), created_at: new Date().toISOString(),
      created_by: MOCK_TOOTH_CONDITION_USER_ID,
    };
    this.items = [...this.items, created];
    return of({ ...created });
  }

  update(odontogramId: string, toothConditionId: string, dto: UpdateToothConditionDto): Observable<ToothCondition> {
    if (!this.moduleEnabled) return moduleDisabled();
    const current = this.items.find(i => i.id === toothConditionId && i.odontogram_id === odontogramId);
    if (!current) return notFound(toothConditionId);
    if (this.historic.has(odontogramId)) return historic(odontogramId);
    if (dto.surface !== undefined && !TOOTH_SURFACES.includes(dto.surface)) return invalidSurface();
    if (dto.state !== undefined && !TOOTH_CONDITION_STATES.includes(dto.state)) return invalidState();
    if (dto.condition_id !== undefined && !dto.condition_id.trim()) return httpError(422, 'condition_id cannot be empty.');

    const updated: ToothCondition = {
      ...current,
      surface: dto.surface ?? current.surface,
      condition_id: dto.condition_id?.trim() ?? current.condition_id,
      state: dto.state ?? current.state,
      note: dto.note !== undefined ? normalizeNote(dto.note) : current.note,
    };
    this.items = this.items.map(i => (i.id === toothConditionId ? updated : i));
    return of({ ...updated });
  }

  remove(odontogramId: string, toothConditionId: string): Observable<void> {
    if (!this.moduleEnabled) return moduleDisabled();
    if (!this.items.some(i => i.id === toothConditionId && i.odontogram_id === odontogramId)) {
      return notFound(toothConditionId);
    }
    if (this.historic.has(odontogramId)) return historic(odontogramId);
    this.items = this.items.filter(i => i.id !== toothConditionId);
    return of(undefined);
  }
}

function notFound(id: string): Observable<never> {
  return httpError(404, `ToothCondition with id '${id}' was not found.`);
}

function historic(odontogramId: string): Observable<never> {
  return httpError(409,
    `Odontogram '${odontogramId}' is a historical snapshot (not current); its tooth conditions cannot be changed.`);
}

function invalidSurface(): Observable<never> {
  return httpError(422, `surface must be one of: ${TOOTH_SURFACES.join(', ')}.`);
}

function invalidState(): Observable<never> {
  return httpError(422, `state must be one of: ${TOOTH_CONDITION_STATES.join(', ')}.`);
}

function normalizeNote(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

// Módulo apagado: 403 ProblemDetails real de ModuleDisabledException (code module_disabled).
function moduleDisabled(): Observable<never> {
  return moduleDisabledError();
}
