// Modelo de datos. Cada tipo corresponde a una subcolección de Firestore
// bajo months/{monthKey}/… — ver src/lib/store.ts y firestore.rules.
//
// Todo lo editable (plan, notas, escenarios, resultados, creativos) está
// alcanzado por VERSIÓN de calendario + marca + región: lo que se escribe en
// OEA/México versión A no aparece en OEJR/Argentina ni en la versión B.

export type Brand = 'OEA' | 'OEJR'

// LT_EXCL_MX_AR = bucket agregado de los países de LatAm que se compran como
// un solo bloque (igual que en el Excel). MX/AR/BR se compran por separado.
export type Country = 'MX' | 'AR' | 'BR' | 'LT_EXCL_MX_AR'

export const BRANDS: Brand[] = ['OEA', 'OEJR']

// Orden pedido por el equipo: LatAm (excl. MX y AR) primero, luego México,
// Argentina y Brasil.
export const COUNTRIES: Country[] = ['LT_EXCL_MX_AR', 'MX', 'AR', 'BR']

export const COUNTRY_LABELS: Record<Country, string> = {
  LT_EXCL_MX_AR: 'LatAm (excl. MX y AR)',
  MX: 'México',
  AR: 'Argentina',
  BR: 'Brasil',
}

/** Regiones que suma la vista agregada de LATAM (Brasil se compra aparte). */
export const LATAM_PARTS: Country[] = ['LT_EXCL_MX_AR', 'MX', 'AR']

export const CHANNELS = ['TV', 'Digital', 'Radio', 'Otro'] as const
export type Channel = (typeof CHANNELS)[number]

/** Estado de una versión de calendario. */
export type VersionStatus = 'maybe' | 'approved'

/**
 * Una versión pertenece a UN calendario: mes + marca + región. OEA/México y
 * OEJR/Argentina no comparten versiones, igual que no comparten plan ni notas.
 * El documento vive en `months/{mes}/versions/{brand}_{country}_{letra}`.
 */
export interface VersionEntry {
  version_id: string
  brand: Brand
  country: Country
  /** Letra visible dentro de ese calendario: A, B, C… */
  letter: string
  /** Nombre corto que le da el equipo ("Plan agresivo TV"). Opcional. */
  name?: string
  /** Para qué es esta versión y en qué se diferencia de las demás. */
  description?: string
  status: VersionStatus
  created_by: string
  created_at: string
  /** Letra de la versión de la que se copió, si aplica. */
  copied_from: string | null
}

/** Id del documento de una versión: el calendario va delante de la letra. */
export function versionDocId(brand: Brand, country: Country, letter: string): string {
  return `${brand}_${country}_${letter}`
}

/** Fase del mes, deducida del calendario real — no es un estado que alguien deba mantener a mano. */
export type MonthPhase = 'planning' | 'current' | 'closed'

export function monthPhase(monthKey: string, today: Date = new Date()): MonthPhase {
  const now = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  if (monthKey === now) return 'current'
  return monthKey > now ? 'planning' : 'closed'
}

/**
 * Campos legibles que `store.ts` estampa en cada documento al escribir.
 * No los necesita la app (ya conoce el contexto), pero hacen que cada
 * documento se explique solo cuando lo lea algo externo — el MCP que
 * consultará "cómo fue septiembre 2026 para OEA México" no debería tener que
 * cruzar colecciones para saber de qué mes y qué versión es una fila.
 */
export interface ReadableStamp {
  month_key: string
  version_letter: string
  country_label: string
  brand: Brand
  country: Country
}

/** Versión del esquema que se guarda en meta/schema (ver docs/DATA-MODEL.md). */
export const SCHEMA_VERSION = 2

export interface PlanRow {
  version_id: string
  date: string // YYYY-MM-DD
  brand: Brand
  country: Country
  channel: string
  scenario_id: string
  planned_spend: number
  last_edited_by: string
  last_edited_at: string // ISO
  month_key?: string
  version_letter?: string
  country_label?: string
}

export interface EscenarioRow {
  version_id: string
  scenario_id: string
  week_start: string // lunes YYYY-MM-DD
  brand: Brand
  country: Country
  description: string
  weekly_spend: number
  is_active: boolean
  created_by: string
  created_at: string
}

export interface RealRow {
  date: string
  brand: Brand
  country: Country
  channel: string
  actual_spend: number
  leads: number
  enrollments: number
  cm: number
  ltv: number
  source_ref: string
  synced_at: string
}

/**
 * Tipos de nota, cada uno con su color en la UI.
 * `observacion` es la categoría exclusiva de los usuarios de consulta: es la
 * única que pueden crear, y la ven tanto ellos como los administradores.
 */
export type NotaKind = 'pendiente' | 'cambio' | 'info' | 'otro' | 'observacion'

/** Todas las categorías, para filtrar y mostrar. */
export const NOTA_KINDS: NotaKind[] = ['pendiente', 'cambio', 'info', 'otro', 'observacion']

/** Las que puede crear un administrador. */
export const NOTA_KINDS_ADMIN: NotaKind[] = ['pendiente', 'cambio', 'info', 'otro']

/** La única que puede crear un usuario de consulta. */
export const NOTA_KIND_VIEWER: NotaKind = 'observacion'

/** Una nota es general del mes o de una semana concreta. */
export type NotaScope = 'general' | 'week'

export interface NotaRow {
  note_id: string
  version_id: string
  brand: Brand
  country: Country
  kind: NotaKind
  scope: NotaScope
  /** Lunes de la semana, solo cuando scope === 'week'. */
  week_start: string
  /** Texto original, tal como lo escribió la persona. */
  content: string
  source_lang: 'es' | 'en' | 'pt'
  /** El mismo texto por idioma: se traduce solo al guardar (lib/translate.ts). */
  text: Partial<Record<'es' | 'en' | 'pt', string>>
  /** Fecha/hora en que se generó — automática, no la elige el usuario. */
  created_at: string // ISO
  created_by: string
  /** Rol de quien la escribió al momento de escribirla. */
  created_by_role?: 'admin' | 'viewer'
  /** Última edición. El historial completo vive en la colección `changes`. */
  updated_at?: string
  updated_by?: string
  scope_label: string
  month_key?: string
  version_letter?: string
  country_label?: string
  /** Lunes de la semana en texto legible, para lecturas externas. */
  week_label?: string
}

/** Resultados y creativos: una tarjeta por semana, alineada al calendario. */
export interface WeekCardRow {
  card_id: string
  version_id: string
  brand: Brand
  country: Country
  week_start: string
  content: string
  updated_at: string
  updated_by: string
  month_key?: string
  version_letter?: string
  country_label?: string
}

export interface BloqueoRow {
  date: string
  country: Country
  reason: string
  redistribution_note: string
  created_by: string
  created_at: string
}

/** Documento Firestore months/{month_key}. */
export interface MonthEntry {
  month_key: string // "2026-09"
  status: 'active' | 'archived'
  created_by: string
  created_at: string
}

/**
 * Registro de un cambio, en months/{monthKey}/changes/{change_id}.
 * Guarda `before`/`after` completos para revertir a un punto y para
 * alimentar deshacer/rehacer y el registro de actividad.
 */
export interface ChangeRecord {
  change_id: string
  month_key: string
  at: string // ISO
  user_email: string
  user_initials: string
  entity: 'plan' | 'nota' | 'escenario' | 'bloqueo' | 'version' | 'results' | 'creative'
  doc_id: string
  action: 'create' | 'update' | 'delete'
  /** Dónde se hizo, legible: "A · OEA · México · 12 sep · TV". */
  where_label: string
  /**
   * Qué se hizo, en lenguaje natural. `summary_key` es una clave de i18n y
   * `summary_params` sus valores, para que la frase se arme en el idioma de
   * quien la lee y no quede un "update · version" que no le dice nada a nadie.
   */
  summary_key?: string
  summary_params?: Record<string, string | number>
  /** Zona de la app donde ocurrió: calendario, notas, resultados… */
  place_key?: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  reverted: boolean
}

// Subcolecciones bajo months/{monthKey}/…
export const COLLECTIONS = {
  months: 'months',
  versions: 'versions',
  plan: 'plan',
  escenario: 'escenario',
  real: 'real',
  bloqueo: 'bloqueo',
  nota: 'nota',
  results: 'results',
  creative: 'creative',
  changes: 'changes',
} as const
