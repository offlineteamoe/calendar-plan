// Traducción automática de notas.
//
// Se usa Google Cloud Translation (v2) dentro del MISMO proyecto de Google
// Cloud que ya usa la app, a propósito: las notas son información interna y
// no deberían salir a un traductor público de terceros. La cuota gratuita
// (500.000 caracteres/mes) sobra para notas cortas.
//
// Si no hay API key configurada o la llamada falla, la nota se guarda igual
// con su texto original y la interfaz muestra ese texto: la traducción es una
// mejora, nunca un requisito para poder trabajar.

import { config } from '../config'
import type { Locale } from '../i18n/translations'

const ENDPOINT = 'https://translation.googleapis.com/language/translate/v2'
export const TRANSLATABLE_LOCALES: Locale[] = ['es', 'en', 'pt']

export type NoteText = Partial<Record<Locale, string>>

const ES_HINTS = /\b(el|la|los|las|de|que|para|con|una|por|pero|más|está|desde|hasta|cambio|pendiente|semana|pauta)\b/gi
const PT_HINTS = /\b(o|os|as|da|do|dos|das|não|você|está|para|com|uma|mês|semana|pauta|alteração)\b/gi
const EN_HINTS = /\b(the|and|for|with|from|this|that|will|week|change|pending|spend|budget|note)\b/gi

/**
 * Detección local (sin llamadas de red) entre es/en/pt: cuenta palabras
 * frecuentes y marcas propias del idioma. Es suficiente para elegir el
 * idioma origen de una nota corta y no gasta cuota de la API.
 */
export function detectLocale(text: string): Locale {
  const sample = text.slice(0, 400)
  const score: Record<Locale, number> = {
    es: (sample.match(ES_HINTS) ?? []).length,
    pt: (sample.match(PT_HINTS) ?? []).length,
    en: (sample.match(EN_HINTS) ?? []).length,
  }
  // Marcas ortográficas: ñ/¿/¡ son de español; ã/õ/ç tiran a portugués.
  if (/[ñ¿¡]/i.test(sample)) score.es += 2
  if (/[ãõç]/i.test(sample)) score.pt += 2

  let best: Locale = 'en'
  for (const locale of TRANSLATABLE_LOCALES) {
    if (score[locale] > score[best]) best = locale
  }
  // Sin señales claras asumimos inglés, que es el idioma por defecto de la app.
  return score[best] === 0 ? 'en' : best
}

async function translateOne(text: string, source: Locale, target: Locale): Promise<string | null> {
  const key = config.translateApiKey
  if (!key) return null
  try {
    const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source, target, format: 'text' }),
    })
    if (!res.ok) {
      console.warn('Traducción no disponible:', res.status, await res.text().catch(() => ''))
      return null
    }
    const data = (await res.json()) as { data?: { translations?: { translatedText?: string }[] } }
    return data.data?.translations?.[0]?.translatedText ?? null
  } catch (err) {
    console.warn('Traducción no disponible:', err)
    return null
  }
}

/**
 * Devuelve el texto en los tres idiomas. El original siempre queda tal cual
 * lo escribió la persona; los otros dos se traducen si se puede.
 */
export async function buildNoteText(text: string): Promise<{ source: Locale; text: NoteText }> {
  const source = detectLocale(text)
  const result: NoteText = { [source]: text }
  const targets = TRANSLATABLE_LOCALES.filter((l) => l !== source)

  const translated = await Promise.all(targets.map((t) => translateOne(text, source, t)))
  targets.forEach((target, i) => {
    const value = translated[i]
    if (value) result[target] = value
  })

  return { source, text: result }
}

export function isTranslationEnabled(): boolean {
  return Boolean(config.translateApiKey)
}

/** Texto de la nota en el idioma activo, con caída al original. */
export function pickNoteText(text: NoteText | undefined, fallback: string, locale: Locale): string {
  return text?.[locale] ?? fallback
}
