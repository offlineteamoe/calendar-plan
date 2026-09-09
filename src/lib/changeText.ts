// Convierte un ChangeRecord en algo que una persona entienda sin traducir
// mentalmente: quién, cuándo, en qué parte de la app, en qué calendario y qué
// hizo exactamente.
//
// Los cambios nuevos traen `summary_key` + `summary_params` (una frase
// localizable). Los cambios guardados antes de que eso existiera no los
// tienen, así que hay un respaldo que arma la frase con la entidad y la
// acción — feo, pero legible, y no deja huecos en el historial viejo.

import type { ChangeRecord } from '../types'

type Translate = (key: string, params?: Record<string, string | number>) => string

export interface DescribedChange {
  /** "Aprobó el calendario OEA · México" */
  what: string
  /** "Notas · Septiembre 2026 · Versión A · OEA · México" */
  where: string
  /** Nombre corto de quien lo hizo. */
  who: string
  initials: string
}

function monthLabel(monthKey: string, locale: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  if (!y || !m) return ''
  const label = new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/**
 * Traduce los parámetros que son claves internas (una categoría de nota, por
 * ejemplo) antes de meterlos en la frase, para que no salga "kind: pendiente"
 * en una interfaz en inglés.
 */
function humanizeParams(change: ChangeRecord, t: Translate, locale: string): Record<string, string | number> {
  const raw = change.summary_params ?? {}
  const out: Record<string, string | number> = { ...raw }
  if (typeof raw.kind === 'string') out.kind = t(`notes.kind.${raw.kind}`).toLowerCase()
  if (typeof raw.from === 'string' && change.summary_key === 'ev.note.kind') {
    out.from = t(`notes.kind.${raw.from}`).toLowerCase()
  }
  if (typeof raw.amount === 'number') out.amount = raw.amount.toLocaleString(locale)
  if (typeof raw.month === 'string') out.month = monthLabel(raw.month, locale) || raw.month
  if (typeof raw.week === 'string' && raw.week) {
    out.week = new Date(`${raw.week}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  }
  return out
}

export function describeChange(change: ChangeRecord, t: Translate, locale: string): DescribedChange {
  const who = change.user_email.split('@')[0]
  const initials = change.user_initials || change.user_email.slice(0, 2).toUpperCase()

  const what = change.summary_key
    ? t(change.summary_key, humanizeParams(change, t, locale))
    : // Respaldo para los cambios anteriores a las frases naturales.
      t('ev.fallback', {
        action: t(`history.action.${change.action}`).toLowerCase(),
        entity: t(`history.entity.${change.entity}`).toLowerCase(),
      })

  const place = change.place_key ? t(change.place_key) : ''
  const month = monthLabel(change.month_key, locale)
  const where = [place, month, change.where_label]
    .filter((part) => part && part.trim() !== '' && part !== '_global')
    .join(' · ')

  return { what, where, who, initials }
}
