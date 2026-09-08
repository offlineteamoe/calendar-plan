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

export interface MetaEntry {
  key: string
  value: string
}

/** Fila del Sheet "Index" raíz: mapea mes -> spreadsheet. */
export interface MonthIndexEntry {
  month_key: string // "2026-09"
  spreadsheet_id: string
  drive_folder_id: string
  status: 'active' | 'archived'
  created_by: string
  created_at: string
}

// Nombre de cada pestaña tal como aparece en el Sheet — un solo lugar para evitar
// strings mágicos repetidos por todo el código.
export const SHEET_TABS = {
  plan: 'Plan',
  escenario: 'Escenario',
  real: 'Real',
  bloqueo: 'Bloqueo',
  nota: 'Nota',
  results: 'Results',
  creative: 'Creative',
  meta: '_Meta',
} as const

export type SheetTabName = (typeof SHEET_TABS)[keyof typeof SHEET_TABS]

// Encabezados en el orden exacto de columnas — usados tanto para leer/escribir
// filas como para saber qué rango limpiar al clonar un mes (ver planningSheet.ts).
export const TAB_HEADERS: Record<SheetTabName, string[]> = {
  [SHEET_TABS.plan]: [
    'date',
    'brand',
    'country',
    'channel',
    'scenario_id',
    'planned_spend',
    'last_edited_by',
    'last_edited_at',
  ],
  [SHEET_TABS.escenario]: [
    'scenario_id',
    'week_start',
    'brand',
    'description',
    'weekly_spend',
    'is_active',
    'created_by',
    'created_at',
  ],
  [SHEET_TABS.real]: [
    'date',
    'brand',
    'country',
    'channel',
    'actual_spend',
    'leads',
    'enrollments',
    'cm',
    'ltv',
    'source_ref',
    'synced_at',
  ],
  [SHEET_TABS.bloqueo]: ['date', 'country', 'reason', 'redistribution_note', 'created_by', 'created_at'],
  [SHEET_TABS.nota]: [
    'note_id',
    'scope',
    'week_start',
    'day',
    'brand',
    'country',
    'category',
    'content',
    'created_by',
    'created_at',
    'updated_at',
  ],
  [SHEET_TABS.results]: ['week_start', 'brand', 'country', 'metric', 'value', 'note'],
  [SHEET_TABS.creative]: ['brand', 'country', 'week_start', 'asset_name', 'asset_url', 'status', 'notes'],
  [SHEET_TABS.meta]: ['key', 'value'],
}
