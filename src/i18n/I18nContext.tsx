import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_LOCALE, translations, type Locale } from './translations'

const STORAGE_KEY = 'mpc_locale_v1'

function readStoredLocale(): Locale {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'es' || raw === 'en' || raw === 'pt') return raw
  } catch {
    /* localStorage no disponible — usamos el default */
  }
  return DEFAULT_LOCALE
}

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => String(vars[name] ?? ''))
}

/** Idioma para APIs de formato (Intl): "es" → "es-ES", etc. */
export function intlLocale(locale: Locale): string {
  return locale === 'es' ? 'es-ES' : locale === 'pt' ? 'pt-BR' : 'en-US'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale)

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* no pasa nada si no se puede persistir */
    }
  }, [])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = translations[locale]
      const template = dict[key] ?? translations[DEFAULT_LOCALE][key] ?? key
      return interpolate(template, vars)
    },
    [locale],
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n debe usarse dentro de <I18nProvider>')
  return ctx
}
