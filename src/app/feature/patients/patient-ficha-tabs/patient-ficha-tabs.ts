import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { EncounterLookupsService } from '../../../core/services/encounter-lookups.service';
import { FeaturesService } from '../../../core/services/features.service';

export type PatientDetailTab = 'personal' | 'clinical' | 'habits' | 'notes' | 'contacts' | 'plans';
export type PatientQuickAction = 'encounters' | 'measurements' | 'prescriptions' | 'odontogram';

// Ocultos a pedido (no listos para mostrarse todavía) — en false para
// volver a mostrarlos, sin tocar nada más.
const ENCOUNTER_QUICK_ACTIONS_VISIBLE = false;

export const PATIENT_DETAIL_TABS: { key: PatientDetailTab; label: string }[] = [
  { key: 'personal', label: 'Datos personales' },
  { key: 'clinical', label: 'Historia clínica' },
  { key: 'habits', label: 'Hábitos' },
  { key: 'notes', label: 'Notas' },
  { key: 'contacts', label: 'Contactos' },
  { key: 'plans', label: 'Planes de tratamiento' },
];

// Barra única (pestañas de la ficha + accesos rápidos) reutilizada en la ficha
// misma Y en las 4 páginas a las que llevan los accesos rápidos (Encuentros,
// Signos vitales, Recetas, Odontograma), para que esa navegación no se pierda
// al salir de la ficha. Las pestañas de contenido nunca navegan solas: emiten
// `contentTabClick` y cada host decide (la ficha cambia de sección in-place;
// las demás páginas vuelven a /patients/:id). Los accesos rápidos sí navegan
// solos acá porque su destino es siempre el mismo en todos los hosts.
@Component({
  selector: 'app-patient-ficha-tabs',
  imports: [],
  templateUrl: './patient-ficha-tabs.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientFichaTabs {
  private router = inject(Router);
  private encounterLookups = inject(EncounterLookupsService);
  private features = inject(FeaturesService);

  patientId = input.required<string>();
  // Solo la ficha conoce esto de entrada; en las otras páginas no hay data real del
  // paciente a mano y se asume activo (el backend igual revalida al crear).
  patientActive = input(true);
  activeContentTab = input<PatientDetailTab | null>(null);
  activeQuickAction = input<PatientQuickAction | null>(null);

  contentTabClick = output<PatientDetailTab>();

  readonly tabs = PATIENT_DETAIL_TABS;
  readonly encountersAccess = this.encounterLookups.encountersAccess;
  readonly showEncounterButtons = computed(() => ENCOUNTER_QUICK_ACTIONS_VISIBLE && this.encountersAccess() !== 'denied');
  readonly encountersButtonDisabledReason = computed(() => {
    switch (this.encountersAccess()) {
      case 'loading': return 'Cargando…';
      case 'error': return this.encounterLookups.professionalsError() ?? 'No se pudo verificar el acceso.';
      default: return null;
    }
  });
  readonly odontogramEnabled = computed(() => this.features.enabledMap()['odontogram'] === true);
  readonly newEncounterDisabledReason = computed(() => {
    if (!this.patientActive()) return 'Paciente inactivo';
    return this.encountersButtonDisabledReason() ?? this.encounterLookups.createDisabledReason();
  });

  constructor() {
    this.encounterLookups.loadProfessionals();
  }

  goToEncounters(create = false): void {
    if (this.encountersButtonDisabledReason() || !this.showEncounterButtons()) return;
    if (create && this.newEncounterDisabledReason()) return;
    this.router.navigate(['/encounters'], {
      queryParams: create ? { patient_id: this.patientId(), new: 1 } : { patient_id: this.patientId() },
    });
  }

  goToOdontogram(): void {
    this.router.navigate(['/patients', this.patientId(), 'odontogram']);
  }

  goToMeasurements(): void {
    if (this.encountersButtonDisabledReason() || !this.showEncounterButtons()) return;
    this.router.navigate(['/patients', this.patientId(), 'measurements']);
  }

  goToPrescriptions(): void {
    if (this.encountersButtonDisabledReason() || !this.showEncounterButtons()) return;
    this.router.navigate(['/patients', this.patientId(), 'prescriptions']);
  }
}
