// Modelo de datos. Cada tipo corresponde a una subcolección de Firestore
// bajo months/{monthKey}/… — ver src/lib/store.ts y firestore.rules.

export type Brand = 'OEA' | 'OEJR'

// LT_EXCL_MX_AR = bucket agregado de los países de LatAm que se compran como
// un solo bloque (igual que en el Excel). MX/AR/BR se compran por separado.
export type Country = 'MX' | 'AR' | 'BR' | 'LT_EXCL_MX_AR'

export const BRANDS: Brand[] = ['OEA', 'OEJR']
export const COUNTRIES: Country[] = ['MX', 'AR', 'BR', 'LT_EXCL_MX_AR']

export const COUNTRY_LABELS: Record<Country, string> = {
  MX: 'México',
  AR: 'Argentina',
  BR: 'Brasil',
  LT_EXCL_MX_AR: 'LatAm (excl. MX y AR)',
}

export const CHANNELS = ['TV', 'Digital', 'Radio', 'Otro'] as const
export type Channel = (typeof CHANNELS)[number]

export interface PlanRow {
  date: string // YYYY-MM-DD
  brand: Brand
  country: Country
  channel: string
  scenario_id: string
  planned_spend: number
  last_edited_by: string
  last_edited_at: string // ISO
}

export interface EscenarioRow {
  scenario_id: string
  week_start: string // lunes YYYY-MM-DD
  brand: Brand
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

/** Tipos de nota pedidos por el equipo, cada uno con su color en la UI. */
export type NotaKind = 'pendiente' | 'cambio' | 'info' | 'otro'
export const NOTA_KINDS: NotaKind[] = ['pendiente', 'cambio', 'info', 'otro']

export interface NotaRow {
  note_id: string
  kind: NotaKind
  /** Texto original, tal como lo escribió la persona. */
  content: string
  /** Idioma detectado del texto original. */
  source_lang: 'es' | 'en' | 'pt'
  /** El mismo texto por idioma: se traduce solo al guardar (ver lib/translate.ts). */
  text: Partial<Record<'es' | 'en' | 'pt', string>>
  /** Fecha/hora en que se generó la nota — automática, no la elige el usuario. */
  created_at: string // ISO
  created_by: string
  /** Contexto en el que se escribió (marca/país/canal visibles al guardar). */
  scope_label: string
  brand: Brand | ''
  country: Country | ''
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
 * Guarda `before`/`after` completos para poder revertir a un punto y para
 * alimentar deshacer/rehacer y el registro de actividad.
 */
export interface ChangeRecord {
  change_id: string
  month_key: string
  at: string // ISO
  user_email: string
  user_initials: string
  /** Subcolección afectada. */
  entity: 'plan' | 'nota' | 'escenario' | 'bloqueo'
  doc_id: string
  /** Qué se hizo. */
  action: 'create' | 'update' | 'delete'
  /** Dónde se hizo, legible: "12 sep · OEA · México · TV". */
  where_label: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  reverted: boolean
}

// Nombres de las subcolecciones de Firestore bajo months/{monthKey}/…
export const COLLECTIONS = {
  months: 'months',
  plan: 'plan',
  escenario: 'escenario',
  real: 'real',
  bloqueo: 'bloqueo',
  nota: 'nota',
  results: 'results',
  creative: 'creative',
  changes: 'changes',
} as const
