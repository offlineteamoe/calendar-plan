// Métricas de resultados: qué se suma, qué se divide y contra qué se compara.
//
// REGLA DE ORO: primero se suma, después se divide.
// El archivo de Drive guarda ocho cifras por día y territorio, todas sumables.
// CPL, conversión, %MNCC y Full CM % Short se calculan aquí, sobre el total del
// rango que la persona tenga filtrado. Guardar esas razones ya calculadas por
// día y promediarlas daría un número distinto —y equivocado—: el promedio de
// unas razones no es la razón del total.
//
// Todo lo de aquí es Brand TV Channels. Es el único channel grouping que esta
// pestaña mira, por decisión del equipo de medios.

import type { Brand, Country } from '../types'

/** Las ocho cifras sumables que produce `etl/build_calendar_results.py`. */
export type ResultField = 'leads' | 'spend' | 'media' | 'sales' | 'cash' | 'cm' | 'rev' | 'enr'

export const RESULT_FIELDS: ResultField[] = ['leads', 'spend', 'media', 'sales', 'cash', 'cm', 'rev', 'enr']

export interface ResultsDataset {
  schema: number
  generatedAt: string
  sourceRefreshedAt?: { y: number; m: number; d: number; hh: number; mm: number }
  channelGrouping: string
  mediaSpendTypes: string[]
  /** Índice denso de fechas: una por día, sin huecos. */
  dates: string[]
  /** "OEA|MX" → columnas alineadas con `dates`. */
  scopes: Record<string, Record<ResultField, number[]>>
  /** Lo añade `fetchDriveJson`: cuándo cambió el archivo en Drive. */
  driveModifiedTime?: string
}

export type Totals = Record<ResultField, number>

export function scopeKey(brand: Brand, country: Country): string {
  return `${brand}|${country}`
}

function emptyTotals(): Totals {
  return { leads: 0, spend: 0, media: 0, sales: 0, cash: 0, cm: 0, rev: 0, enr: 0 }
}

/** Índice fecha → posición, construido una vez por conjunto de datos. */
const indexCache = new WeakMap<ResultsDataset, Map<string, number>>()

function dateIndex(dataset: ResultsDataset): Map<string, number> {
  let index = indexCache.get(dataset)
  if (!index) {
    index = new Map(dataset.dates.map((d, i) => [d, i]))
    indexCache.set(dataset, index)
  }
  return index
}

export interface Slice {
  totals: Totals
  /** Cuántos de los días pedidos existen en los datos. Cero = fuera de cobertura. */
  covered: number
}

/**
 * Suma los días indicados sobre uno o varios calendarios.
 *
 * Varios calendarios es el caso de la vista LATAM, que junta LatAm (excl. MX y
 * AR) + México + Argentina.
 */
export function sumDays(dataset: ResultsDataset, keys: string[], dates: string[]): Slice {
  const index = dateIndex(dataset)
  const totals = emptyTotals()
  let covered = 0

  for (const date of dates) {
    const at = index.get(date)
    if (at === undefined) continue
    let touched = false
    for (const key of keys) {
      const columns = dataset.scopes[key]
      if (!columns) continue
      touched = true
      for (const field of RESULT_FIELDS) totals[field] += columns[field]?.[at] ?? 0
    }
    if (touched) covered += 1
  }

  return { totals, covered }
}

export interface Metrics {
  /** Branded Leads Elegibles. */
  leads: number
  /** Inversión de medios: solo los Types de medios dentro de Brand TV Channels. */
  mediaSpend: number
  /** Spend total del channel grouping — el divisor del CPL. */
  spend: number
  sales: number
  newCash: number
  fullCm: number
  cpl: number | null
  conversion: number | null
  mncc: number | null
  fullCmPct: number | null
}

export function deriveMetrics(totals: Totals): Metrics {
  return {
    leads: totals.leads,
    mediaSpend: totals.media,
    spend: totals.spend,
    sales: totals.sales,
    newCash: totals.cash,
    fullCm: totals.cm,
    cpl: totals.leads ? totals.spend / totals.leads : null,
    conversion: totals.leads ? totals.sales / totals.leads : null,
    // % MNCC: cuánto del New Cash queda después de pagar el medio.
    mncc: totals.cash ? (totals.cash - totals.spend) / totals.cash : null,
    fullCmPct: totals.rev ? totals.cm / totals.rev : null,
  }
}

// ---------------------------------------------------------------------------
// Ventanas de comparación
// ---------------------------------------------------------------------------

/**
 * Cada pestaña es un par de desplazamientos en días sobre la semana abierta.
 *
 * Todos son múltiplos de 7 a propósito: así el lunes se compara con un lunes.
 * El año anterior son 364 días (52 semanas), no 365 — un año natural correría
 * los días de la semana y rompería tanto la comparación como el filtro por día.
 */
export type ComparisonKey = 'wow' | 'yoy' | 'wow2025' | 'margin'

export const COMPARISONS: Record<Exclude<ComparisonKey, 'margin'>, { current: number; previous: number }> = {
  wow: { current: 0, previous: -7 },
  yoy: { current: 0, previous: -364 },
  wow2025: { current: -364, previous: -371 },
}

export function shiftDate(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Ayer. El día en curso no se mira: va a medias y sus cifras aún no son reales. */
export function yesterday(today: Date = new Date()): string {
  const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/**
 * Hasta dónde se puede leer: lo que alcancen los datos, y nunca más allá de
 * ayer. Las dos condiciones importan — el archivo podría traer el día en curso
 * si el ETL corrió a media tarde, y ese día todavía no está cerrado.
 */
export function usableEnd(dataset: ResultsDataset, today: Date = new Date()): string {
  const last = dataset.dates[dataset.dates.length - 1] ?? ''
  const limit = yesterday(today)
  return last < limit ? last : limit
}

/**
 * Los días de una semana desplazada, quedándose solo con los días de la semana
 * seleccionados (0 = lunes … 6 = domingo).
 */
export function windowDays(weekStart: string, offset: number, weekdays: Set<number>): string[] {
  const start = shiftDate(weekStart, offset)
  const days: string[] = []
  for (let i = 0; i < 7; i += 1) {
    if (!weekdays.has(i)) continue
    days.push(shiftDate(start, i))
  }
  return days
}

export interface ComparablePair {
  current: string[]
  previous: string[]
  /** Días pedidos que sí se pueden leer, de los que el filtro dejó activos. */
  usable: number
  requested: number
}

/**
 * Las dos ventanas de una semana, recortadas igual.
 *
 * Esto es lo que evita la comparación tramposa de la semana en curso: si hoy es
 * miércoles, la semana actual solo tiene lunes y martes cerrados, así que la
 * semana de referencia se recorta a lunes y martes también. Comparar dos días
 * contra siete haría que todo pareciera desplomarse cada lunes.
 */
export function comparableDays(
  weekStart: string,
  offsets: { current: number; previous: number },
  weekdays: Set<number>,
  end: string,
): ComparablePair {
  const current: string[] = []
  const previous: string[] = []
  let requested = 0

  for (let i = 0; i < 7; i += 1) {
    if (!weekdays.has(i)) continue
    requested += 1
    const day = shiftDate(weekStart, offsets.current + i)
    if (day > end) continue
    current.push(day)
    previous.push(shiftDate(weekStart, offsets.previous + i))
  }

  return { current, previous, usable: current.length, requested }
}

// ---------------------------------------------------------------------------
// Variación
// ---------------------------------------------------------------------------

/**
 * Cómo se lee la diferencia entre dos periodos.
 *
 * `points` distingue las razones (conversión, %MNCC, Full CM %) del resto: su
 * diferencia se dice en puntos porcentuales, nunca en "% de un %", que es una
 * cifra que no significa nada.
 *
 * `better` dice qué dirección pintar de verde. El CPL es el único al revés
 * —bajar es mejor—; la inversión de medios no lleva color porque subir o bajar
 * no es bueno ni malo por sí solo, es una decisión de plan.
 */
export interface Delta {
  absolute: number | null
  /** Variación relativa, para las magnitudes. */
  relative: number | null
  /** Diferencia en puntos, para las razones. */
  points: number | null
}

export function delta(current: number | null, previous: number | null, isRatio: boolean): Delta {
  if (current === null || previous === null) return { absolute: null, relative: null, points: null }
  const absolute = current - previous
  if (isRatio) return { absolute, relative: null, points: absolute }
  return { absolute, relative: previous === 0 ? null : absolute / Math.abs(previous), points: null }
}

export type MetricKey = 'leads' | 'mediaSpend' | 'cpl' | 'conversion' | 'mncc' | 'fullCmPct'

export interface MetricDefinition {
  key: MetricKey
  labelKey: string
  format: 'number' | 'money' | 'percent' | 'percent1'
  isRatio: boolean
  /** 'up' = verde al subir, 'down' = verde al bajar, 'none' = sin color. */
  good: 'up' | 'down' | 'none'
}

/**
 * Las seis métricas de las pestañas de comparación, en el orden en que el
 * equipo las lee: primero el par leads/inversión, luego la eficiencia.
 */
export const METRICS: MetricDefinition[] = [
  { key: 'leads', labelKey: 'results.metric.leads', format: 'number', isRatio: false, good: 'up' },
  { key: 'mediaSpend', labelKey: 'results.metric.mediaSpend', format: 'money', isRatio: false, good: 'none' },
  { key: 'cpl', labelKey: 'results.metric.cpl', format: 'money', isRatio: false, good: 'down' },
  { key: 'conversion', labelKey: 'results.metric.conversion', format: 'percent1', isRatio: true, good: 'up' },
  { key: 'mncc', labelKey: 'results.metric.mncc', format: 'percent', isRatio: true, good: 'up' },
  { key: 'fullCmPct', labelKey: 'results.metric.fullCmPct', format: 'percent', isRatio: true, good: 'up' },
]

/** Las de la pestaña de margen: el nivel, no la variación. */
export const MARGIN_METRICS: MetricDefinition[] = [
  { key: 'mncc', labelKey: 'results.metric.mncc', format: 'percent', isRatio: true, good: 'up' },
  { key: 'fullCmPct', labelKey: 'results.metric.fullCmPct', format: 'percent', isRatio: true, good: 'up' },
]

export function metricValue(metrics: Metrics, key: MetricKey): number | null {
  return metrics[key]
}

export function tone(definition: MetricDefinition, change: Delta): 'up' | 'down' | 'flat' | null {
  if (definition.good === 'none') return null
  const value = change.points ?? change.relative
  if (value === null || value === 0) return 'flat'
  const rising = value > 0
  const good = definition.good === 'up' ? rising : !rising
  return good ? 'up' : 'down'
}
