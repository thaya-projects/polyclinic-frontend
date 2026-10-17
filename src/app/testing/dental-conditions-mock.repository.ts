import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import type { DentalConditionsRepository } from '../core/services/dental-conditions-repository';
import {
  CreateDentalConditionDto, DENTAL_CONDITION_LIMITS, DentalCondition, UpdateDentalConditionDto,
} from '../core/models/dental-condition.model';
import { argumentError } from './cie10-mock.catalog';

export const MOCK_DENTAL_TENANT_ID = 'tenant-mock';

// Globales del DentalConditionSeeder + una propia del tenant.
function seed(): DentalCondition[] {
  const global = (id: string, code: string, name: string, category: string, color: string): DentalCondition =>
    ({ id, tenant_id: null, code, name, category, default_color: color });
  return [
    global('dc-1', 'caries', 'Caries', 'patologia', '#E53935'),
    global('dc-2', 'obturacion', 'Obturación', 'restauracion', '#1E88E5'),
    global('dc-3', 'corona', 'Corona', 'restauracion', '#FBC02D'),
    global('dc-4', 'ausente', 'Ausente', 'estado', '#757575'),
    global('dc-5', 'endodoncia', 'Endodoncia', 'tratamiento', '#8E24AA'),
    global('dc-6', 'implante', 'Implante', 'tratamiento', '#43A047'),
    {
      id: 'dc-own-1', tenant_id: MOCK_DENTAL_TENANT_ID, code: 'sellante', name: 'Sellante',
      category: 'tratamiento', default_color: '#00ACC1',
    },
  ];
}

function httpError(status: number, detail: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: { detail } }));
}

// Fase 6 T5: catálogo en memoria para demo/tests (NO providedIn root). Imita a
// CatalogDentalConditionService / DentalConditionCode / HexColor:
//   list: globales primero, luego propias, por code.
//   create: code trim+lowercase (requerido, ≤ 50, [a-z0-9_]) → name requerido → color #RRGGBB
//           (normalizado a mayúsculas) → code repetido entre las propias 409 (igual a una global es válido).
//   update: 404 → global 403 → name null 422 → color 422. category/color vacíos = null.
//   Módulo "odontogram" apagado (setOdontogramEnabled(false)): toda llamada → 403 sin body, como
//   OdontogramFeatureGuardMiddleware.
// Sin delays (los tests no necesitan timers falsos).
@Injectable()
export class MockDentalConditionsRepository implements DentalConditionsRepository {
  private conditions: DentalCondition[] = seed();
  private nextId = 100;
  private moduleEnabled = true;

  // Helper para tests/demo: prende o apaga el módulo "odontogram" del tenant.
  setOdontogramEnabled(enabled: boolean): void {
    this.moduleEnabled = enabled;
  }

  odontogramEnabled(): boolean | null {
    return this.moduleEnabled;
  }

  list(): Observable<DentalCondition[]> {
    if (!this.moduleEnabled) return moduleDisabled();
    const sorted = [...this.conditions].sort((a, b) =>
      Number(a.tenant_id !== null) - Number(b.tenant_id !== null) || a.code.localeCompare(b.code));
    return of(sorted.map(c => ({ ...c })));
  }

  create(dto: CreateDentalConditionDto): Observable<DentalCondition> {
    if (!this.moduleEnabled) return moduleDisabled();
    const code = (dto.code ?? '').trim().toLowerCase();
    if (!code) return argumentError('Code is required.', 'value');
    if (code.length > DENTAL_CONDITION_LIMITS.codeMaxLength) {
      return argumentError(`Code cannot exceed ${DENTAL_CONDITION_LIMITS.codeMaxLength} characters.`, 'value');
    }
    if (!DENTAL_CONDITION_LIMITS.codeFormat.test(code)) {
      return argumentError('Code must contain only lowercase letters, digits and underscores.', 'value');
    }
    if (this.conditions.some(c => c.tenant_id === MOCK_DENTAL_TENANT_ID && c.code === code)) {
      return httpError(409,
        `A dental condition with code '${code}' already exists for tenant '${MOCK_DENTAL_TENANT_ID}'.`);
    }
    const name = (dto.name ?? '').trim();
    if (!name) return argumentError('Name is required.', 'name');
    const color = normalizeColor(dto.default_color);
    if (color === false) return argumentError('Color must be a hex value in the form #RRGGBB.', 'value');

    const created: DentalCondition = {
      id: `dc-${this.nextId++}`, tenant_id: MOCK_DENTAL_TENANT_ID, code, name,
      category: normalizeOptional(dto.category), default_color: color,
    };
    this.conditions = [...this.conditions, created];
    return of({ ...created });
  }

  update(id: string, dto: UpdateDentalConditionDto): Observable<DentalCondition> {
    if (!this.moduleEnabled) return moduleDisabled();
    const current = this.conditions.find(c => c.id === id && (c.tenant_id === null || c.tenant_id === MOCK_DENTAL_TENANT_ID));
    if (!current) return httpError(404, `Dental condition with id '${id}' was not found.`);
    if (current.tenant_id === null) {
      return httpError(403, `Dental condition with id '${id}' is global and cannot be modified.`);
    }
    if ((dto as { name?: string | null }).name === null) return argumentError('name cannot be null.', 'name');
    const name = dto.name !== undefined ? dto.name.trim() : current.name;
    if (!name) return argumentError('Name is required.', 'name');
    const color = dto.default_color !== undefined ? normalizeColor(dto.default_color) : current.default_color;
    if (color === false) return argumentError('Color must be a hex value in the form #RRGGBB.', 'value');

    const updated: DentalCondition = {
      ...current, name, default_color: color,
      category: dto.category !== undefined ? normalizeOptional(dto.category) : current.category,
    };
    this.conditions = this.conditions.map(c => (c.id === id ? updated : c));
    return of({ ...updated });
  }
}

// El middleware corta antes de ExceptionHandlingMiddleware: 403 sin ProblemDetails.
function moduleDisabled(): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status: 403, error: null }));
}

function normalizeOptional(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

// null = sin color; false = formato inválido.
function normalizeColor(value: string | null | undefined): string | null | false {
  const trimmed = normalizeOptional(value);
  if (trimmed === null) return null;
  const upper = trimmed.toUpperCase();
  return DENTAL_CONDITION_LIMITS.colorFormat.test(upper) ? upper : false;
}
