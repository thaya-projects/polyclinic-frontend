import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { ENCOUNTERS_REPOSITORY } from './encounters-repository';
import { CLINICAL_VOID_PERMISSION, EncounterPartyOption } from '../models/encounter.model';
import {
  INACTIVE_PROFESSIONAL_MESSAGE, NO_PROFESSIONAL_MESSAGE, PATIENTS_LOAD_ERROR_MESSAGE, PROFESSIONALS_LOAD_ERROR_MESSAGE,
} from '../../shared/utils/encounters-error.util';

export type ProfessionalOption = EncounterPartyOption & { active: boolean };
export type LookupState = 'idle' | 'loading' | 'ready' | 'error';
export type EncountersAccess = 'loading' | 'allowed' | 'denied' | 'error';

// Pacientes/profesionales para selects, filtros, nombres en vez de ids y para saber qué
// profesional (si alguno) está vinculado al usuario logueado. Sale de la misma abstracción que los
// encounters (mock o HTTP).
//
// Estados explícitos: mientras cargan los profesionales NO se concluye "no sos profesional", y si
// la carga falla se informa (con reintento) en vez de tratarlo como "sin profesional".
// Es root: se limpia en cada load() y al cerrar sesión (SessionService.clearSession → reset()), así
// no quedan datos de otra sesión/tenant.
@Injectable({ providedIn: 'root' })
export class EncounterLookupsService {
  private repo = inject(ENCOUNTERS_REPOSITORY);
  private platformId = inject(PLATFORM_ID);

  private readonly patientsSignal = signal<EncounterPartyOption[]>([]);
  // Pacientes conocidos por id: los de la lista + los resueltos de a uno (fuera de la 1ra página).
  private readonly patientCache = signal<Record<string, EncounterPartyOption>>({});
  private readonly professionalsSignal = signal<ProfessionalOption[]>([]);
  private readonly currentUserIdSignal = signal<string | null>(null);
  private readonly permissionsSignal = signal<string[]>([]);
  private readonly patientsStateSignal = signal<LookupState>('idle');
  private readonly professionalsStateSignal = signal<LookupState>('idle');

  private subscriptions = new Subscription();
  private requestedPatientIds = new Set<string>();

  readonly patients = this.patientsSignal.asReadonly();
  readonly professionals = this.professionalsSignal.asReadonly();
  readonly patientsState = this.patientsStateSignal.asReadonly();
  readonly professionalsState = this.professionalsStateSignal.asReadonly();
  readonly patientsError = computed(() => (this.patientsStateSignal() === 'error' ? PATIENTS_LOAD_ERROR_MESSAGE : null));
  readonly professionalsError = computed(() =>
    (this.professionalsStateSignal() === 'error' ? PROFESSIONALS_LOAD_ERROR_MESSAGE : null));
  readonly professionalsLoading = computed(() => {
    const state = this.professionalsStateSignal();
    return state === 'loading' || state === 'idle';
  });

  // Profesional vinculado al usuario logueado (professional.user_id == app_user), activo o no.
  readonly linkedProfessional = computed<ProfessionalOption | null>(() => {
    const userId = this.currentUserIdSignal();
    if (!userId || this.professionalsStateSignal() !== 'ready') return null;
    return this.professionalsSignal().find(p => p.user_id === userId) ?? null;
  });

  // Profesional HABILITADO del usuario: vinculado y activo. Solo él puede crear encounters a su
  // nombre y editar/firmar/anular los suyos.
  readonly currentProfessional = computed<ProfessionalOption | null>(() => {
    const linked = this.linkedProfessional();
    return linked?.active ? linked : null;
  });

  // Por qué no puede crear (null = puede). Mientras carga o si falló, el motivo es ese — nunca
  // "no sos profesional" sin haberlo podido verificar.
  readonly createDisabledReason = computed<string | null>(() => {
    switch (this.professionalsStateSignal()) {
      case 'idle':
      case 'loading': return 'Cargando…';
      case 'error': return PROFESSIONALS_LOAD_ERROR_MESSAGE;
    }
    const linked = this.linkedProfessional();
    if (!linked) return NO_PROFESSIONAL_MESSAGE;
    return linked.active ? null : INACTIVE_PROFESSIONAL_MESSAGE;
  });

  // 'clinical.void': leer encounters sin ser profesional + anulación administrativa de cualquiera.
  readonly hasClinicalVoid = computed(() => this.permissionsSignal().includes(CLINICAL_VOID_PERMISSION));

  // Mismo criterio que la policy "ClinicalRead" del backend: profesional ACTIVO del tenant o
  // clinical.void. Mientras no se sabe (cargando / error) no se concluye "denegado".
  readonly encountersAccess = computed<EncountersAccess>(() => {
    if (this.hasClinicalVoid()) return 'allowed';
    switch (this.professionalsStateSignal()) {
      case 'idle':
      case 'loading': return 'loading';
      case 'error': return 'error';
    }
    return this.currentProfessional() ? 'allowed' : 'denied';
  });

  readonly patientNameById = computed(() => toNameMap(Object.values(this.patientCache())));
  readonly professionalNameById = computed(() => toNameMap(this.professionalsSignal()));

  patientOption(id: string): EncounterPartyOption | null {
    return this.patientCache()[id] ?? null;
  }

  load(): void {
    this.loadPatients();
    this.loadProfessionals();
  }

  loadPatients(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.patientsSignal.set([]);
    this.patientsStateSignal.set('loading');
    this.subscriptions.add(this.repo.listPatients().subscribe({
      next: list => {
        this.patientsSignal.set(list);
        this.remember(list);
        this.patientsStateSignal.set('ready');
      },
      error: () => this.patientsStateSignal.set('error'),
    }));
  }

  // Solo profesionales + usuario actual (lo que necesita la ficha del paciente para "Nueva nota").
  loadProfessionals(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.professionalsSignal.set([]);
    this.currentUserIdSignal.set(this.repo.currentUserId());
    this.permissionsSignal.set(this.repo.currentUserPermissions());
    this.professionalsStateSignal.set('loading');
    this.subscriptions.add(this.repo.listProfessionals().subscribe({
      next: list => {
        this.professionalsSignal.set(list);
        this.professionalsStateSignal.set('ready');
      },
      error: () => this.professionalsStateSignal.set('error'),
    }));
  }

  // Para el sidebar/patients: carga solo si nunca se cargó en esta sesión.
  ensureProfessionalsLoaded(): void {
    if (this.professionalsStateSignal() === 'idle') this.loadProfessionals();
  }

  // Resuelve de a uno los pacientes que no vinieron en la primera página (GET /tenants/patients/:id).
  // Un 404 deja el id sin nombre ("—"); no se reintenta en la misma sesión.
  ensurePatients(ids: (string | null | undefined)[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const cache = this.patientCache();
    for (const id of new Set(ids)) {
      if (!id || cache[id] || this.requestedPatientIds.has(id)) continue;
      this.requestedPatientIds.add(id);
      this.subscriptions.add(this.repo.getPatient(id).subscribe({
        next: option => this.remember([option]),
        error: () => {},
      }));
    }
  }

  remember(options: EncounterPartyOption[]): void {
    if (options.length === 0) return;
    this.patientCache.update(cache => {
      const next = { ...cache };
      for (const option of options) next[option.id] = option;
      return next;
    });
  }

  // Cierre de sesión / cambio de tenant: corta requests en vuelo y vacía todo.
  reset(): void {
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();
    this.requestedPatientIds.clear();
    this.patientsSignal.set([]);
    this.patientCache.set({});
    this.professionalsSignal.set([]);
    this.currentUserIdSignal.set(null);
    this.permissionsSignal.set([]);
    this.patientsStateSignal.set('idle');
    this.professionalsStateSignal.set('idle');
  }

  // signed_by/voided_by son ids de app_user: se muestran con el nombre del profesional vinculado
  // a ese usuario si existe; si no, un id corto.
  userDisplayName(userId: string | null, currentUser?: { id: string; full_name: string } | null): string | null {
    if (!userId) return null;
    if (currentUser && currentUser.id === userId) return currentUser.full_name;
    const professional = this.professionalsSignal().find(p => p.user_id === userId);
    return professional?.name ?? `Usuario ${userId.slice(0, 8)}`;
  }
}

function toNameMap(list: EncounterPartyOption[]): Record<string, string> {
  return list.reduce<Record<string, string>>((acc, item) => {
    acc[item.id] = item.name;
    return acc;
  }, {});
}
