// Modelo de datos: ver "4. Esquema de datos en el Sheet maestro" en el plan.
// Cada tipo corresponde 1:1 a una pestaña del Sheet mensual (fila 1 = encabezado,
// nombres de columna = nombres de campo en snake_case, en ese mismo orden).

export type Brand = 'OEA' | 'OEJR'

// LT_EXCL_MX_AR = bucket agregado de los 18 países de LatAm que se compran como
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
  week_start: string // YYYY-MM-DD, lunes de esa semana
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

export type NotaScope = 'week' | 'day' | 'brand' | 'country'
export type NotaCategory = 'promo' | 'channel_toggle' | 'rationale' | 'general'

export interface NotaRow {
  note_id: string
  scope: NotaScope
  week_start: string
  day: string // vacío si scope no es 'day'
  brand: Brand | ''
  country: Country | ''
  category: NotaCategory
  content: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface BloqueoRow {
  date: string
  country: Country
  reason: string
  redistribution_note: string
  created_by: string
  created_at: string
}

export interface ResultsRow {
  week_start: string
  brand: Brand
  country: Country
  metric: string
  value: number
  note: string
}

export interface CreativeRow {
  brand: Brand
  country: Country
  week_start: string
  asset_name: string
  asset_url: string
  status: string
  notes: string
}

/** Documento Firestore months/{month_key}. */
export interface MonthEntry {
  month_key: string // "2026-09"
  status: 'active' | 'archived'
  created_by: string
  created_at: string
}

// Nombres de las subcolecciones de Firestore bajo months/{monthKey}/... — un
// solo lugar para evitar strings mágicos repetidos por todo el código.
export const COLLECTIONS = {
  months: 'months',
  plan: 'plan',
  escenario: 'escenario',
  real: 'real',
  bloqueo: 'bloqueo',
  nota: 'nota',
  results: 'results',
  creative: 'creative',
} as const
