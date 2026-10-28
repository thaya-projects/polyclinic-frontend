import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormGroup } from '@angular/forms';

// Errores del backend llevados al campo que falló, nunca un "revisá los datos" genérico. El backend
// responde ProblemDetails con `detail` (mensaje en inglés) y, cuando el error es de un campo,
// `field` en snake_case (ExceptionHandlingMiddleware). Los 400 de model binding de ASP.NET traen en
// cambio `errors: { "$.campo": [...] }`. Los 404/409 de reglas de negocio no traen `field`: el
// texto conocido se traduce acá (KNOWN_MESSAGES) y, si corresponde, se infiere el campo.
export interface ServerError {
  field: string | null;
  message: string;
  // true cuando `message` ya nombra el dato ("Ya existe un servicio con el código X."): en un
  // banner no hace falta anteponer la etiqueta del campo.
  named?: boolean;
}

// Etiquetas para nombrar el campo en mensajes que no quedan pegados a un input (toast, banner).
const FIELD_LABELS: Record<string, string> = {
  first_name: 'Nombre',
  last_name: 'Apellido',
  full_name: 'Nombre completo',
  name: 'Nombre',
  code: 'Código',
  email: 'Correo',
  password: 'Contraseña',
  current_password: 'Contraseña actual',
  new_password: 'Contraseña nueva',
  phone: 'Teléfono',
  whatsapp_phone: 'WhatsApp',
  phone_alt: 'Teléfono alternativo',
  document_type: 'Tipo de documento',
  document_number: 'N° de documento',
  birth_date: 'Fecha de nacimiento',
  sex: 'Sexo',
  address: 'Dirección',
  description: 'Descripción',
  category: 'Categoría',
  quantity: 'Cantidad',
  unit_price: 'Precio unitario',
  unit_cost: 'Costo unitario',
  min_stock: 'Stock mínimo',
  base_price: 'Precio',
  amount: 'Monto',
  method: 'Medio de pago',
  reference: 'Referencia',
  tax: 'Impuesto',
  currency: 'Moneda',
  currency_code: 'Moneda',
  starts_at: 'Inicio',
  ends_at: 'Fin',
  duration_minutes: 'Duración',
  tooth_fdi: 'Pieza (FDI)',
  cie10_code: 'Código CIE-10',
  timezone: 'Zona horaria',
  license_number: 'Matrícula',
  branch_id: 'Sucursal',
  from_branch_id: 'Sucursal de origen',
  to_branch_id: 'Sucursal de destino',
  room_id: 'Consultorio',
  patient_id: 'Paciente',
  professional_id: 'Profesional',
  done_by_professional_id: 'Realizado por',
  service_id: 'Servicio',
  category_id: 'Categoría',
  specialty_id: 'Especialidad',
  specialty_ids: 'Especialidades',
  material_id: 'Material',
  user_id: 'Usuario',
  role_id: 'Rol',
  role_code: 'Rol',
  permissions: 'Permisos',
  items: 'Ítems',
  treatment_plan_item_id: 'Ítem del plan',
  clinical_record_id: 'Historia clínica',
  encounter_id: 'Encuentro',
  form_template_id: 'Plantilla clínica',
  chief_complaint: 'Motivo de consulta',
  anamnesis: 'Anamnesis',
  exam: 'Examen físico',
  encounter_date: 'Fecha de atención',
  reason: 'Motivo',
  cancelled_reason: 'Motivo de cancelación',
  to_status: 'Estado',
  status: 'Estado',
  type: 'Tipo',
  slot_minutes: 'Duración del turno',
  weekday: 'Día de la semana',
  start_time: 'Hora de inicio',
  end_time: 'Hora de fin',
  appointment_id: 'Cita',
  meeting_url: 'Enlace de la videollamada',
  meeting_provider: 'Plataforma de videollamada',
  condition_id: 'Condición',
  surface: 'Cara',
  surfaces: 'Caras',
  state: 'Estado',
  dentition: 'Dentición',
  note: 'Nota',
  notes: 'Notas',
  medication: 'Medicamento',
  presentation: 'Presentación',
  dose: 'Dosis',
  frequency: 'Frecuencia',
  duration: 'Duración',
  instructions: 'Indicaciones',
  unit: 'Unidad',
  value: 'Valor',
  measured_at: 'Fecha de medición',
  relationship: 'Relación',
  is_primary: 'Contacto principal',
  blood_type: 'Grupo sanguíneo',
  allergies: 'Alergias',
  chronic_conditions: 'Enfermedades crónicas',
  current_medications: 'Medicación actual',
  family_history: 'Antecedentes familiares',
  habits: 'Hábitos',
  channel: 'Canal',
  language: 'Idioma',
  body: 'Mensaje',
  variables: 'Variables',
  provider_template: 'Plantilla del proveedor',
  template_id: 'Plantilla',
  event_type: 'Evento',
  offset_minutes: 'Anticipación',
  color: 'Color',
  default_color: 'Color',
  version: 'Versión',
  schema: 'Formulario',
  slug: 'Identificador (slug)',
  country_code: 'País',
  default_currency: 'Moneda',
  default_timezone: 'Zona horaria',
  locale: 'Idioma',
  tax_id: 'NIT / identificación fiscal',
  legal_name: 'Razón social',
  billing_email: 'Correo de facturación',
  billing_address: 'Dirección de facturación',
  plan_id: 'Plan',
  trial_days: 'Días de prueba',
  days: 'Días',
  price_month: 'Precio mensual',
  max_professionals: 'Máximo de profesionales',
  max_branches: 'Máximo de sucursales',
  features: 'Funcionalidades',
  enabled_modules: 'Módulos',
  target_user_id: 'Usuario',
  from: 'Desde',
  to: 'Hasta',
  q: 'Búsqueda',
};

type Gender = 'm' | 'f';

// Entidades que nombran los mensajes del backend ("Specialty with id '…' was not found") → cómo se
// dice en español y qué campo del contrato las referencia.
const ENTITIES: Record<string, { label: string; gender: Gender; field: string | null }> = {
  Patient: { label: 'paciente', gender: 'm', field: 'patient_id' },
  Branch: { label: 'sucursal', gender: 'f', field: 'branch_id' },
  Room: { label: 'consultorio', gender: 'm', field: 'room_id' },
  Professional: { label: 'profesional', gender: 'm', field: 'professional_id' },
  Service: { label: 'servicio', gender: 'm', field: 'service_id' },
  ServiceCategory: { label: 'categoría', gender: 'f', field: 'category_id' },
  Specialty: { label: 'especialidad', gender: 'f', field: 'specialty_id' },
  ClinicalRecord: { label: 'historia clínica', gender: 'f', field: 'clinical_record_id' },
  ClinicalFormTemplate: { label: 'plantilla clínica', gender: 'f', field: 'form_template_id' },
  NotificationTemplate: { label: 'plantilla', gender: 'f', field: 'template_id' },
  TreatmentPlan: { label: 'plan de tratamiento', gender: 'm', field: null },
  TreatmentPlanItem: { label: 'ítem del plan', gender: 'm', field: 'treatment_plan_item_id' },
  Material: { label: 'material', gender: 'm', field: 'material_id' },
  AppUser: { label: 'usuario', gender: 'm', field: 'user_id' },
  'App user': { label: 'usuario', gender: 'm', field: 'user_id' },
  Role: { label: 'rol', gender: 'm', field: 'role_id' },
  SubscriptionPlan: { label: 'plan', gender: 'm', field: 'plan_id' },
  'Subscription plan': { label: 'plan', gender: 'm', field: 'plan_id' },
  Plan: { label: 'plan', gender: 'm', field: 'plan_id' },
  Appointment: { label: 'cita', gender: 'f', field: 'appointment_id' },
  Encounter: { label: 'encuentro', gender: 'm', field: 'encounter_id' },
  Invoice: { label: 'factura', gender: 'f', field: null },
  InvoiceItem: { label: 'ítem de la factura', gender: 'm', field: null },
  Tenant: { label: 'clínica', gender: 'f', field: null },
  DentalCondition: { label: 'condición dental', gender: 'f', field: 'condition_id' },
  ReminderRule: { label: 'regla de recordatorio', gender: 'f', field: null },
  PatientContact: { label: 'contacto', gender: 'm', field: null },
};

// "A service with code …" (DuplicateCode) → "un servicio".
const CODE_OWNERS: Record<string, string> = {
  specialty: 'una especialidad',
  service: 'un servicio',
  material: 'un material',
  'dental condition': 'una condición dental',
  role: 'un rol',
  'system role': 'un rol del sistema',
  'subscription plan': 'un plan',
};

const APPOINTMENT_STATUS: Record<string, string> = {
  scheduled: 'programada', confirmed: 'confirmada', checkedin: 'en sala de espera', checked_in: 'en sala de espera',
  inprogress: 'en atención', in_progress: 'en atención', completed: 'completada', cancelled: 'cancelada',
  noshow: 'marcada como ausente', no_show: 'marcada como ausente',
};

const INVOICE_STATUS: Record<string, string> = {
  borrador: 'en borrador', emitida: 'emitida', pagada: 'pagada', parcial: 'con pago parcial',
  anulada: 'anulada', vencida: 'vencida',
};

const SUBSCRIPTION_OPERATION: Record<string, string> = {
  cancel: 'cancelar', 'extend the trial of': 'extender la prueba de', extend: 'extender', change: 'cambiar',
  reactivate: 'reactivar', activate: 'activar', checkout: 'cobrar',
};

const WEEKDAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const article = (gender: Gender) => (gender === 'f' ? 'La' : 'El');
const ending = (gender: Gender) => (gender === 'f' ? 'a' : 'o');

interface KnownMessage {
  pattern: RegExp;
  message: (m: RegExpMatchArray) => string;
  field?: string | ((m: RegExpMatchArray) => string | null);
}

// Mensajes conocidos de Domain/Application (inglés, con GUIDs) → texto para el usuario que nombra
// el dato y el motivo. Van antes que los genéricos de MESSAGE_TRANSLATIONS.
const KNOWN_MESSAGES: KnownMessage[] = [
  // --- Texto inválido -----------------------------------------------------------------------
  { pattern: /^Request body cannot contain the null character/i,
    message: () => 'Uno de los textos tiene un carácter no permitido (carácter nulo). Borralo y volvé a escribirlo.' },
  { pattern: /^Text values cannot contain the null character/i,
    message: () => 'Uno de los textos tiene un carácter no permitido (carácter nulo). Borralo y volvé a escribirlo.' },
  { pattern: /^([\w.[\]]+) cannot contain the null character/i,
    message: () => 'El texto tiene un carácter no permitido (carácter nulo). Borralo y volvé a escribirlo.',
    field: m => m[1] },

  // --- Formatos ----------------------------------------------------------------------------
  { pattern: /^Timezone '(.+)' is not a recognized IANA time zone id/i,
    message: m => `"${m[1]}" no es una zona horaria válida (ej. America/La_Paz).`, field: 'timezone' },
  { pattern: /^Timezone '.+' does not match the tenant's branches timezone '(.+?)'/i,
    message: m => `Todas las sucursales de la clínica deben usar la misma zona horaria: elegí ${m[1]}.`,
    field: 'timezone' },
  { pattern: /^(\w+) must contain only lowercase letters, digits and underscores/i,
    message: () => 'Usá solo minúsculas, números y guion bajo, sin espacios ni acentos (ej. medicina_general).',
    field: m => m[1] },
  { pattern: /^(\w+) must contain only lowercase letters, digits and hyphens/i,
    message: () => 'Usá solo minúsculas, números y guiones, sin guion al inicio ni al final (ej. mi-clinica).',
    field: m => m[1] },
  { pattern: /^CurrencyCode must be a 3-letter ISO 4217 code/i,
    message: () => 'La moneda debe ser un código de 3 letras (ej. BOB, USD).', field: 'currency' },
  { pattern: /^CountryCode must be a 2-letter ISO 3166-1/i,
    message: () => 'El país debe ser un código de 2 letras (ej. BO, AR).', field: 'country_code' },
  { pattern: /^Color must be a hex value/i,
    message: () => 'El color debe tener el formato #RRGGBB (ej. #E53935).', field: 'default_color' },
  { pattern: /^Color is required/i, message: () => 'Elegí un color.', field: 'default_color' },
  { pattern: /^Email format is invalid/i,
    message: () => 'Ingresá un correo válido (ej. nombre@dominio.com).', field: 'email' },
  { pattern: /^Email is required\.?$/i, message: () => 'El correo es obligatorio.', field: 'email' },
  { pattern: /^A patient with document '([^:']+):(.+?)' already exists/i,
    message: m => `Ya existe un paciente con el documento ${m[1]} ${m[2]}.`, field: 'document_number' },
  { pattern: /^DocumentType is required when DocumentNumber is provided/i,
    message: () => 'Elegí el tipo de documento: es obligatorio cuando cargás un número de documento.',
    field: 'document_type' },

  // --- Fechas y horarios ---------------------------------------------------------------------
  { pattern: /^EndsAt must be greater than StartsAt/i,
    message: () => 'La hora de fin debe ser posterior a la de inicio.', field: 'ends_at' },
  { pattern: /^EndsAt is required when ServiceId is not provided/i,
    message: () => 'Indicá la hora de fin o elegí un servicio (su duración calcula el fin).', field: 'ends_at' },
  { pattern: /^ends_at must be strictly greater than starts_at/i,
    message: () => 'La fecha y hora de fin deben ser posteriores a las de inicio.', field: 'ends_at' },
  { pattern: /^end_time must be strictly greater than start_time/i,
    message: () => 'La hora de fin de cada bloque debe ser mayor que la hora de inicio.', field: 'end_time' },
  { pattern: /^Schedule blocks overlap on weekday (\d): (\S+) and (\S+?)\.?$/i,
    message: m => `Los bloques del ${WEEKDAY_NAMES[+m[1]] ?? m[1]} se superponen (${m[2]} y ${m[3]}).` },
  { pattern: /^slot_minutes must be a positive integer/i,
    message: () => 'Los minutos por turno deben ser mayores a 0.', field: 'slot_minutes' },
  { pattern: /^slot_minutes \((\d+)\) cannot exceed the block duration \(([\d.]+) minutes\)/i,
    message: m => `Los minutos por turno (${m[1]}) no pueden superar la duración del bloque (${m[2]} min).`,
    field: 'slot_minutes' },
  { pattern: /^Weekday must be between/i,
    message: () => 'Uno de los bloques tiene un día de la semana inválido.', field: 'weekday' },
  { pattern: /^(\w+) must include a UTC offset/i,
    message: () => 'La fecha debe incluir la zona horaria.', field: m => m[1] },
  { pattern: /^(\w+) cannot be earlier than 1900-01-01/i,
    message: () => 'La fecha no puede ser anterior a 1900.', field: m => m[1] },
  { pattern: /^(\w+) must be an ISO 8601 date-time/i,
    message: () => 'Ingresá fecha y hora (no solo la fecha).', field: m => m[1] },
  { pattern: /^(\w+) is not a valid date-time/i,
    message: () => 'Ingresá una fecha y hora válidas.', field: m => m[1] },
  { pattern: /^from cannot be later than to/i,
    message: () => 'La fecha "desde" no puede ser posterior a la fecha "hasta".', field: 'from' },
  { pattern: /^The requested date range .* exceeds the maximum of (\d+) days/i,
    message: m => `El rango de fechas no puede superar los ${m[1]} días.`, field: 'to' },

  // --- Citas ---------------------------------------------------------------------------------
  { pattern: /^Professional '.*' already has an appointment overlapping/i,
    message: () => 'El profesional ya tiene una cita que se superpone con ese horario. Elegí otro horario.',
    field: 'starts_at' },
  { pattern: /^Room '.*' does not belong to branch '.*'/i,
    message: () => 'El consultorio elegido no pertenece a la sucursal seleccionada.', field: 'room_id' },
  { pattern: /^Appointment cannot transition from '(\w+)' to '(\w+)'/i,
    message: m => `Una cita ${APPOINTMENT_STATUS[m[1].toLowerCase()] ?? m[1]} no puede pasar a `
      + `${APPOINTMENT_STATUS[m[2].toLowerCase()] ?? m[2]}.`,
    field: 'to_status' },
  { pattern: /^CancelledReason is required when ToStatus is Cancelled/i,
    message: () => 'Indicá el motivo de la cancelación.', field: 'cancelled_reason' },

  // --- Facturación ---------------------------------------------------------------------------
  { pattern: /^Invoice '.*' cannot be issued because it has no items/i,
    message: () => 'La factura no tiene ítems: agregá al menos uno antes de emitirla.' },
  { pattern: /^Invoice '.*' cannot be issued because it is in status '(\w+)'/i,
    message: m => `La factura está ${INVOICE_STATUS[m[1].toLowerCase()] ?? m[1]}: solo se pueden emitir facturas en borrador.` },
  { pattern: /^Invoice '.*' cannot be edited because it is in status '(\w+)'/i,
    message: m => `La factura está ${INVOICE_STATUS[m[1].toLowerCase()] ?? m[1]}: solo se pueden modificar facturas en borrador (ni sus datos ni sus ítems).` },
  { pattern: /^Invoice '.*' is already voided/i, message: () => 'La factura ya está anulada.' },
  { pattern: /^Invoice '.*' cannot be voided because it has registered payments/i,
    message: () => 'La factura tiene pagos registrados: no se puede anular.' },
  { pattern: /^Invoice '.*' does not accept payments while in status '(\w+)'/i,
    message: m => `La factura está ${INVOICE_STATUS[m[1].toLowerCase()] ?? m[1]}: solo se registran pagos en facturas emitidas o con pago parcial.` },
  { pattern: /^Payment of ([\d.,]+) exceeds the remaining balance of ([\d.,]+)/i,
    message: m => `El monto (${m[1]}) supera el saldo pendiente de la factura (${m[2]}).`, field: 'amount' },
  { pattern: /^Description is required when treatment_plan_item_id is not provided/i,
    message: () => 'Ingresá una descripción (o elegí un ítem del plan que la tenga).', field: 'description' },
  { pattern: /^No fiscal document provider is configured for country code '(.+)'/i,
    message: m => `No hay un proveedor de facturación fiscal configurado para el país de la clínica (${m[1]}).` },

  // --- Profesionales y usuarios ------------------------------------------------------------
  { pattern: /^Email is required when CreateLoginAccount is true/i,
    message: () => 'Para crear una cuenta de acceso, el correo es obligatorio.', field: 'email' },
  { pattern: /^Cannot combine CreateLoginAccount with an existing UserId/i,
    message: () => 'No podés vincular un usuario existente y crear una cuenta nueva a la vez: elegí una sola opción.',
    field: 'user_id' },
  { pattern: /^The following specialties are not visible to the current tenant/i,
    message: () => 'Una de las especialidades elegidas no existe o no pertenece a esta clínica.', field: 'specialty_ids' },
  { pattern: /^The following specialties are inactive and cannot be assigned/i,
    message: () => 'Una de las especialidades elegidas está desactivada: activala o elegí otra.', field: 'specialty_ids' },
  { pattern: /^App user '.*' does not belong to the current tenant/i,
    message: () => 'El usuario elegido no pertenece a esta clínica.', field: 'user_id' },
  { pattern: /^App user '.*' is already linked to another professional/i,
    message: () => 'Ese usuario ya está vinculado a otro profesional.', field: 'user_id' },
  { pattern: /^An app user with email '(.+)' already exists/i,
    message: m => `Ya existe una cuenta de usuario con el correo ${m[1]}.`, field: 'email' },
  { pattern: /^Current password for app user '.*' does not match/i,
    message: () => 'La contraseña actual no es correcta.', field: 'current_password' },
  { pattern: /^Professional with id '.*' is inactive/i,
    message: () => 'El profesional elegido está desactivado.', field: 'professional_id' },
  { pattern: /^Branch with id '.*' is inactive/i,
    message: () => 'La sucursal elegida está desactivada.', field: 'branch_id' },
  { pattern: /^Room with id '.*' is inactive/i,
    message: () => 'El consultorio elegido está desactivado.', field: 'room_id' },
  { pattern: /^Subscription plan with id '.*' is inactive/i,
    message: () => 'El plan elegido está desactivado.', field: 'plan_id' },
  { pattern: /^Cannot resolve done_by: professional '.*' has no linked user account/i,
    message: () => 'El profesional elegido no tiene una cuenta de usuario vinculada: no se puede registrar quién realizó el ítem.',
    field: 'done_by_professional_id' },

  // --- Roles -------------------------------------------------------------------------------
  { pattern: /^Role '.*' cannot be deleted because it has user_role assignments/i,
    message: () => 'No se puede eliminar el rol: hay usuarios que lo tienen asignado.' },
  { pattern: /^Role '.*' is a system role and cannot be edited or deleted/i,
    message: () => 'Es un rol del sistema: no se puede editar ni eliminar.' },
  { pattern: /^Role code '(.+)' is not a valid base role code/i,
    message: m => `"${m[1]}" no es un rol válido.`, field: 'role_code' },
  { pattern: /^User '.*' already has role '.*' for all branches/i,
    message: () => 'El usuario ya tiene ese rol asignado para todas las sucursales.' },
  { pattern: /^User '.*' already has role '.*' for branch '.*'/i,
    message: () => 'El usuario ya tiene ese rol asignado en esa sucursal.' },
  { pattern: /^Branch '.*' does not belong to the app_user's tenant/i,
    message: () => 'La sucursal elegida no pertenece a esta clínica.', field: 'branch_id' },

  // --- Catálogos y plantillas ----------------------------------------------------------------
  { pattern: /^A (?:global )?(specialty|service|material|dental condition|role|system role|subscription plan) with code '(.+?)' already exists/i,
    message: m => `Ya existe ${CODE_OWNERS[m[1].toLowerCase()] ?? 'un registro'} con el código "${m[2]}".`, field: 'code' },
  { pattern: /^A (?:global )?clinical form template with code '(.+?)' and version (\d+) already exists/i,
    message: m => `Ya existe una plantilla clínica con el código "${m[1]}" y la versión ${m[2]}.`, field: 'code' },
  { pattern: /^A (?:global )?notification template with channel '(.+?)' and code '(.+?)' already exists/i,
    message: m => `Ya existe una plantilla de ${m[1].toLowerCase() === 'whatsapp' ? 'WhatsApp' : m[1].toLowerCase()} con el código "${m[2]}".`,
    field: 'code' },
  { pattern: /^A tenant with slug '(.+)' already exists/i,
    message: m => `Ya existe una clínica con el identificador "${m[1]}".`, field: 'slug' },
  { pattern: /is a global template and cannot be edited by a tenant/i,
    message: () => 'Es una plantilla global del sistema: no se puede modificar desde la clínica.' },
  { pattern: /^(?:Dental condition|Specialty) with id '.*' is global and cannot be modified/i,
    message: () => 'Es un registro global del sistema: no se puede modificar desde la clínica.' },
  { pattern: /^NotificationTemplate '.*' does not match the reminder rule's channel/i,
    message: () => 'La plantilla elegida es de otro canal: elegí una plantilla del mismo canal que la regla.',
    field: 'template_id' },
  { pattern: /^Invalid reminder rule event_type '(.*)'/i,
    message: m => `"${m[1]}" no es un evento válido para un recordatorio.`, field: 'event_type' },
  { pattern: /^Invalid treatment plan status '(.*)'/i,
    message: m => `"${m[1]}" no es un estado válido para el plan.`, field: 'status' },
  { pattern: /^tooth_fdi\/surfaces requieren/i,
    message: () => 'La pieza y las caras solo se pueden cargar si la clínica tiene habilitado el módulo de odontograma.',
    field: 'tooth_fdi' },
  { pattern: /^Unknown module '(.+?)'/i, message: m => `"${m[1]}" no es un módulo válido.`, field: 'enabled_modules' },

  // --- Stock ---------------------------------------------------------------------------------
  { pattern: /^Material '.*' does not have enough stock in branch/i,
    message: () => 'No hay stock suficiente del material en esa sucursal para esta operación.', field: 'quantity' },
  { pattern: /^The requested operation would leave stock negative/i,
    message: () => 'La operación dejaría el stock en negativo.', field: 'quantity' },
  { pattern: /^FromBranchId and ToBranchId must be different/i,
    message: () => 'La sucursal de origen y la de destino deben ser distintas.', field: 'to_branch_id' },
  { pattern: /^transferencia_salida\/transferencia_entrada cannot be created directly/i,
    message: () => 'Las transferencias entre sucursales se registran con "Transferir stock", no como movimiento.',
    field: 'type' },

  // --- Archivos ------------------------------------------------------------------------------
  { pattern: /^SizeBytes must be greater than zero/i, message: () => 'El archivo está vacío.' },
  { pattern: /^SizeBytes cannot exceed (\d+) bytes/i,
    message: m => `El archivo supera el máximo de ${Math.round(+m[1] / (1024 * 1024))} MB.` },

  // --- Suscripciones -------------------------------------------------------------------------
  { pattern: /^Cannot (.+?) a subscription with status '(\w+)'/i,
    message: m => `No se puede ${SUBSCRIPTION_OPERATION[m[1].toLowerCase()] ?? m[1]} una suscripción en estado "${m[2]}".` },

  // --- Genéricos con sujeto ------------------------------------------------------------------
  { pattern: /^The resource was modified by another request/i,
    message: () => 'Otro usuario modificó este registro mientras lo editabas. Recargá e intentá de nuevo.' },
  // NotFoundException: "Specialty with id '…' was not found." → nombra lo que no existe y marca su campo.
  { pattern: /^(\w+(?: \w+)?) with id '.*' was not found/i,
    message: m => {
      const entity = ENTITIES[m[1]];
      if (!entity) return 'El registro seleccionado ya no existe.';
      return `${article(entity.gender)} ${entity.label} seleccionad${ending(entity.gender)} ya no existe (puede haber sido eliminad${ending(entity.gender)}).`;
    },
    field: m => ENTITIES[m[1]]?.field ?? null },
];

// Patrones genéricos de los mensajes en inglés: el texto no nombra el campo, lo agrega
// serverErrorText con la etiqueta (o queda debajo del input).
const MESSAGE_TRANSLATIONS: [RegExp, string][] = [
  [/E\.164|international format/i, 'Ingresá el número con código de país (ej. +591 71234567).'],
  [/email format is invalid/i, 'Ingresá un correo válido (ej. nombre@dominio.com).'],
  [/is required|cannot be empty|must not be empty|is missing|cannot be null/i, 'Este campo es obligatorio.'],
  [/cannot be in the future/i, 'La fecha no puede ser futura.'],
  [/cannot be in the past/i, 'La fecha no puede ser pasada.'],
  [/must be (greater than|positive|> ?0)|must be at least 1/i, 'El valor debe ser mayor a 0.'],
  [/cannot be negative|must be (zero or|>= ?0|non-negative)/i, 'El valor no puede ser negativo.'],
  [/(exceeds|cannot exceed|at most|too long|maximum length)/i, 'El valor supera el máximo permitido.'],
  [/(is not a valid|invalid) (id|guid)/i, 'El valor seleccionado no es válido.'],
  [/does not exist|not found/i, 'El valor seleccionado no existe.'],
  [/already exists|duplicate|unique constraint/i, 'Ya existe un registro con esos mismos datos.'],
  [/must be one of/i, 'Elegí una de las opciones de la lista.'],
  [/(format|is) (is )?invalid|is not valid|invalid/i, 'El formato no es válido.'],
];

// Límites con número: se conserva el valor ("No puede superar los 500 caracteres.").
const LIMIT_TRANSLATIONS: [RegExp, (n: string) => string][] = [
  [/(?:cannot exceed|at most|maximum(?: length)?(?: is| of)?|longer than)\s*(\d+)\s*char/i, n => `No puede superar los ${n} caracteres.`],
  [/(?:at least|minimum(?: length)?(?: is| of)?)\s*(\d+)\s*char/i, n => `Debe tener al menos ${n} caracteres.`],
  [/(?:cannot exceed|must be (?:less than or equal to|<=|at most))\s*([\d.]+)/i, n => `El valor máximo es ${n}.`],
  [/must be (?:greater than or equal to|>=|at least)\s*([\d.]+)/i, n => `El valor mínimo es ${n}.`],
];

function stripParameter(raw: string): string {
  return raw.replace(/\s*\(Parameter '[^']*'\)\s*$/, '').trim();
}

interface KnownMatch {
  message: string;
  field: string | null;
}

function matchKnownMessage(raw: string): KnownMatch | null {
  const message = stripParameter(raw);
  for (const known of KNOWN_MESSAGES) {
    const match = known.pattern.exec(message);
    if (!match) continue;
    const field = typeof known.field === 'function' ? known.field(match) : (known.field ?? null);
    return { message: known.message(match), field: field ? normalizeFieldName(field) : null };
  }
  return null;
}

export function translateServerMessage(raw: string): string {
  const known = matchKnownMessage(raw);
  if (known) return known.message;
  const message = stripParameter(raw);
  for (const [pattern, text] of LIMIT_TRANSLATIONS) {
    const match = pattern.exec(message);
    if (match) return text(match[1]);
  }
  for (const [pattern, text] of MESSAGE_TRANSLATIONS) {
    if (pattern.test(message)) return text;
  }
  return message;
}

function toSnakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

// ParamName que no es un campo del body: el VO ("value"), el DTO entero ("request"/"dto").
const NOT_A_FIELD = new Set(['', 'value', 'request', 'dto', 'incoming']);

function normalizeFieldName(field: string): string | null {
  const snake = toSnakeCase(field.trim());
  return NOT_A_FIELD.has(snake) ? null : snake;
}

// "$.items[0].unit_price" / "UnitPrice" / "request" -> "unit_price" / "unit_price" / null.
function normalizeFieldKey(key: string): string | null {
  const last = key.replace(/^\$\.?/, '').split('.').pop()?.replace(/\[\d+\]$/, '') ?? '';
  return normalizeFieldName(last);
}

// Sin `field` (los VOs lanzan con ParamName "value"), el sujeto suele venir al inicio del mensaje:
// "ClinicalRecordId cannot be empty." / "unit_price must be..." -> clinical_record_id / unit_price.
// Así el texto traducido nunca queda en un "Este campo es obligatorio" sin decir cuál.
function inferFieldFromMessage(detail: string): string | null {
  const match = /^([A-Za-z][A-Za-z0-9_]*)\s+(is|cannot|must|should|has|does|exceeds|already)\b/.exec(detail.trim());
  if (!match || /^(The|This|It|Value|Request|One|An?)$/i.test(match[1])) return null;
  const field = toSnakeCase(match[1]);
  return field === 'currency_code' ? 'currency' : field;
}

const ENUM_FIELDS = new Set([
  'sex', 'type', 'status', 'to_status', 'channel', 'method', 'category', 'dentition', 'surface', 'state',
  'source', 'event_type', 'document_type', 'relationship',
]);
const NUMERIC_FIELD = /(quantity|amount|price|cost|stock|minutes|days|tax|version|weekday|tooth_fdi|value|max_|offset)/;

// 400 de model binding: "The JSON value could not be converted to …" no dice nada al usuario; el
// motivo sale del tipo del campo.
function conversionMessage(field: string | null): string {
  if (!field) return 'Uno de los datos no tiene el formato esperado.';
  if (field.endsWith('_id') || field.endsWith('_ids')) return 'El valor seleccionado no es válido: elegilo de la lista.';
  if (ENUM_FIELDS.has(field)) return 'Elegí una de las opciones de la lista.';
  if (/_time$/.test(field)) return 'Ingresá una hora válida (HH:MM).';
  if (/(_at|date|^from$|^to$)/.test(field)) return 'Ingresá una fecha válida.';
  if (NUMERIC_FIELD.test(field)) return 'Ingresá un número válido.';
  return 'El valor no tiene el formato esperado.';
}

function modelBindingError(errors: Record<string, unknown>): ServerError | null {
  const entries = Object.entries(errors);
  // "request: The request field is required." acompaña a cualquier error de conversión: el que
  // importa es el del campo ("$.sex").
  const entry = entries.find(([key]) => key.startsWith('$.'))
    ?? entries.find(([key]) => normalizeFieldKey(key) !== null)
    ?? entries[0];
  if (!entry) return null;
  const [key, value] = entry;
  const first = Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');

  // "JSON deserialization for type '…' was missing required properties including: 'name'."
  const missing = /missing required properties,? including:?\s*'([^']+)'/i.exec(first);
  if (missing) return { field: normalizeFieldName(missing[1]), message: 'Este campo es obligatorio.' };

  const field = normalizeFieldKey(key);
  if (/could not be converted|JSON value|is an invalid|invalid start of a value/i.test(first)) {
    return { field, message: conversionMessage(field) };
  }
  return { field, message: translateServerMessage(first) };
}

function bodyOf(err: HttpErrorResponse): Record<string, unknown> | null {
  const body = err.error;
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
}

function rawDetail(body: Record<string, unknown>): string | null {
  if (typeof body['detail'] === 'string' && body['detail']) return body['detail'];
  if (typeof body['message'] === 'string' && body['message']) return body['message'];
  return null;
}

function fromDetail(body: Record<string, unknown>, detail: string): ServerError {
  const known = matchKnownMessage(detail);
  const bodyField = typeof body['field'] === 'string' ? normalizeFieldName(body['field']) : null;
  if (known) return { field: bodyField ?? known.field, message: known.message, named: true };
  return { field: bodyField ?? inferFieldFromMessage(detail), message: translateServerMessage(detail) };
}

// 400/422: validación (con o sin campo). 404/409: solo si el texto es uno conocido (ej. código
// repetido → campo `code`; especialidad elegida que ya no existe → `specialty_id`).
export function extractServerError(err: unknown): ServerError | null {
  if (!(err instanceof HttpErrorResponse)) return null;
  const body = bodyOf(err);
  if (!body) return null;

  if (err.status === 404 || err.status === 409) {
    const detail = rawDetail(body);
    return detail && matchKnownMessage(detail) ? fromDetail(body, detail) : null;
  }
  if (err.status !== 400 && err.status !== 422) return null;

  if (typeof body['detail'] === 'string' && body['detail']) return fromDetail(body, body['detail']);
  if (body['errors'] && typeof body['errors'] === 'object') {
    const error = modelBindingError(body['errors'] as Record<string, unknown>);
    if (error) return error;
  }
  if (typeof body['message'] === 'string' && body['message']) return fromDetail(body, body['message']);
  return null;
}

// Mensaje traducido de una regla de negocio conocida, para cualquier status (403/404/409/422):
// lo usan los *-error.util antes de su texto genérico por status.
export function knownServerMessage(err: unknown): string | null {
  if (!(err instanceof HttpErrorResponse) || err.status >= 500) return null;
  const body = bodyOf(err);
  const detail = body ? rawDetail(body) : null;
  return detail ? (matchKnownMessage(detail)?.message ?? null) : null;
}

export function fieldLabel(field: string): string {
  // "items[0].medication" → "Ítem 1 · Medicamento".
  const nested = /^(\w+)\[(\d+)\]\.(\w+)$/.exec(field);
  if (nested) return `Ítem ${+nested[2] + 1} · ${fieldLabel(nested[3])}`;
  return FIELD_LABELS[field] ?? field.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

// Mensaje para toast/banner: siempre nombra el campo cuando se conoce.
export function serverErrorText(error: ServerError): string {
  return error.field && !error.named ? `${fieldLabel(error.field)}: ${error.message}` : error.message;
}

// Marca en el form el control del campo que rechazó el backend (error `server`, que
// fieldErrorMessage muestra debajo del input). `aliases` mapea campos del backend a controles con otro nombre (ej. { phone: 'phone_number' }).
// Devuelve true si encontró el control (el caller puede omitir entonces el banner).
export function applyServerError(
  form: FormGroup,
  err: unknown,
  aliases: Record<string, string> = {},
): boolean {
  const error = extractServerError(err);
  if (!error?.field) return false;

  const control = findControl(form, aliases[error.field] ?? error.field);
  if (!control) return false;

  // Al editar el campo, Angular re-corre los validators y reemplaza `errors`: el `server` se va solo.
  control.setErrors({ ...(control.errors ?? {}), server: error.message });
  control.markAsTouched();
  return true;
}

function findControl(form: FormGroup, field: string): AbstractControl | null {
  const camel = field.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
  return form.get(field) ?? form.get(camel) ?? null;
}
