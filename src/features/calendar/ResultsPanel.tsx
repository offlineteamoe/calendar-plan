import { useMemo, useState, type ReactNode } from 'react'
import type { Scope } from '../../lib/store'
import { WeekGrid } from './WeekGrid'
import { WeekCardsPanel } from './WeekCardsPanel'
import { useResultsData } from '../../hooks/useResultsData'
import { useI18n } from '../../i18n/I18nContext'
import { COLLECTIONS, LATAM_PARTS, type VersionEntry } from '../../types'
import { formatDateTime, weekdayLabels, type CalendarWeek } from '../../lib/dateUtils'
import {
  COMPARISONS,
  MARGIN_METRICS,
  METRICS,
  comparableDays,
  deriveMetrics,
  delta,
  metricValue,
  scopeKey,
  sumDays,
  tone,
  usableEnd,
  type Delta,
  type MetricDefinition,
  type ResultsDataset,
} from '../../lib/results'

type PanelTab = 'wow' | 'yoy' | 'wow2025' | 'margin' | 'comment'

const TABS: { key: PanelTab; labelKey: string }[] = [
  { key: 'wow', labelKey: 'results.tab.wow' },
  { key: 'yoy', labelKey: 'results.tab.yoy' },
  { key: 'wow2025', labelKey: 'results.tab.wow2025' },
  { key: 'margin', labelKey: 'results.tab.margin' },
  { key: 'comment', labelKey: 'results.tab.comment' },
]

const ALL_WEEKDAYS = new Set([0, 1, 2, 3, 4, 5, 6])

function formatValue(value: number | null, format: MetricDefinition['format'], locale: string): string {
  if (value === null || Number.isNaN(value)) return '—'
  switch (format) {
    case 'number':
      return Math.round(value).toLocaleString(locale)
    case 'money':
      // Cifras pequeñas (un CPL) piden los centavos; los miles de inversión, no.
      return `$${value.toLocaleString(locale, {
        minimumFractionDigits: Math.abs(value) < 100 ? 2 : 0,
        maximumFractionDigits: Math.abs(value) < 100 ? 2 : 0,
      })}`
    case 'percent':
      return `${(value * 100).toFixed(0)}%`
    case 'percent1':
      return `${(value * 100).toFixed(1)}%`
  }
}

function formatDelta(change: Delta, locale: string): string | null {
  if (change.points !== null) {
    const points = change.points * 100
    return `${points >= 0 ? '+' : '−'}${Math.abs(points).toFixed(1)} pp`
  }
  if (change.relative === null) return null
  const percent = change.relative * 100
  return `${percent >= 0 ? '+' : '−'}${Math.abs(percent).toLocaleString(locale, { maximumFractionDigits: 1 })}%`
}

interface CellProps {
  definition: MetricDefinition
  current: number | null
  /** `null` cuando el periodo de referencia no tiene datos: entonces no hay variación que mostrar. */
  previous: number | null
  label: string
  compareTitle: string
  locale: string
}

function MetricCell({ definition, current, previous, label, compareTitle, locale }: CellProps) {
  const change = delta(current, previous, definition.isRatio)
  const direction = tone(definition, change)
  const text = formatDelta(change, locale)

  const arrow = (change.points ?? change.relative ?? 0) >= 0 ? '▲' : '▼'

  // Etiqueta arriba, y valor y variación en la MISMA línea: dos líneas caben en
  // la altura de una semana aunque el mes tenga seis y la ventana sea baja.
  // Con tres, la etiqueta era lo primero que se recortaba, que es justo lo que
  // no se puede perder.
  return (
    <div className="result-cell" title={compareTitle}>
      <span className="result-cell-label">{label}</span>
      <span className="result-cell-row">
        <span className="result-cell-value">{formatValue(current, definition.format, locale)}</span>
        {text ? (
          <span className={`result-cell-delta is-${direction ?? 'neutral'}`}>
            {arrow} {text}
          </span>
        ) : (
          <span className="result-cell-delta is-neutral">—</span>
        )}
      </span>
    </div>
  )
}

/**
 * Las cifras de dinero que hay detrás de los dos porcentajes de margen. Van sin
 * color: que el New Cash suba o baje no se juzga solo, se lee junto al margen.
 */
const MARGIN_MONEY = [
  { key: 'newCash' as const, labelKey: 'results.metric.newCash' },
  { key: 'spend' as const, labelKey: 'results.metric.spend' },
  { key: 'fullCm' as const, labelKey: 'results.metric.fullCm' },
]

function MoneyCell({
  label,
  current,
  previous,
  compareTitle,
  locale,
}: {
  label: string
  current: number
  previous: number | null
  compareTitle: string
  locale: string
}) {
  const text = formatDelta(delta(current, previous, false), locale)
  return (
    <div className="result-cell" title={compareTitle}>
      <span className="result-cell-label">{label}</span>
      <span className="result-cell-row">
        <span className="result-cell-value">{formatValue(current, 'money', locale)}</span>
        <span className="result-cell-delta is-neutral">{text ?? '—'}</span>
      </span>
    </div>
  )
}

interface Props {
  monthKey: string
  scope: Scope
  version: VersionEntry
  weeks: CalendarWeek[]
  latamView: boolean
}

/**
 * Resultados reales por semana, leídos de los datos de Spotfire que el ETL deja
 * en Drive (ver docs/DATOS-DE-RESULTADOS.md).
 *
 * Tres pestañas son la misma tabla con otra comparación —semana anterior, mismo
 * periodo del año pasado, y ese mismo periodo del año pasado contra el suyo—,
 * así que comparten todo el cálculo y solo cambian dos números: el
 * desplazamiento de la ventana actual y el de la ventana de referencia.
 *
 * El filtro por día de la semana aplica a las dos ventanas a la vez. Por eso
 * todos los desplazamientos son múltiplos de 7: un lunes siempre se compara
 * contra un lunes.
 */
export function ResultsPanel({ monthKey, scope, version, weeks, latamView }: Props) {
  const { t, locale } = useI18n()
  const [tab, setTab] = useState<PanelTab>('wow')
  const [weekdays, setWeekdays] = useState<Set<number>>(ALL_WEEKDAYS)
  const { dataset, publishedAt, isLoading, isRefreshing, error, needsConnect, connect, connecting, refresh } =
    useResultsData()

  const dayNames = useMemo(() => weekdayLabels(locale), [locale])

  const keys = useMemo(
    () =>
      latamView
        ? LATAM_PARTS.map((country) => scopeKey(scope.brand, country))
        : [scopeKey(scope.brand, scope.country)],
    [latamView, scope.brand, scope.country],
  )

  const toggleWeekday = (index: number) => {
    setWeekdays((previous) => {
      const next = new Set(previous)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      // Quedarse sin ningún día dejaría la tabla entera en blanco sin que se
      // entienda por qué: el último que quede no se puede apagar.
      return next.size === 0 ? previous : next
    })
  }

  // Nunca más allá de ayer: el día en curso va a medias y sus cifras aún no son
  // reales.
  const coverageEnd = dataset ? usableEnd(dataset) : null

  // Filtro de días y cobertura viven en la banda del encabezado de semanas, y
  // las subpestañas en el subencabezado. Las dos bandas ya existen en el
  // calendario de la izquierda, así que las semanas de los dos lados siguen
  // cayendo a la misma altura.
  const weekHeader = (
    <span className="result-weekhead">
      <span className="week-col-title">
        {coverageEnd
          ? t('results.upTo', {
              date: new Date(coverageEnd + 'T00:00:00').toLocaleDateString(locale, {
                day: 'numeric',
                month: 'short',
              }),
            })
          : t(`results.tab.${tab === 'comment' ? 'comment' : tab}`)}
      </span>
      <span className="result-days">
        {dayNames.map((name, index) => (
          <button
            key={name + index}
            className={`result-day ${weekdays.has(index) ? 'is-on' : ''}`}
            onClick={() => toggleWeekday(index)}
            title={name}
          >
            {name.slice(0, 1).toUpperCase()}
          </button>
        ))}
      </span>
    </span>
  )

  return (
    <>
      <div className="aligned-subhead results-subhead">
        <nav className="subtab-bar">
          {TABS.map((item) => (
            <button key={item.key} className={item.key === tab ? 'is-active' : ''} onClick={() => setTab(item.key)}>
              {t(item.labelKey)}
            </button>
          ))}
        </nav>
        {tab !== 'comment' && (
          <button
            className="btn-link result-refresh"
            onClick={() => void refresh()}
            disabled={isRefreshing}
            title={publishedAt ? t('results.publishedAt', { when: formatDateTime(publishedAt, locale) }) : undefined}
          >
            {isRefreshing ? t('results.refreshing') : t('results.refresh')}
          </button>
        )}
      </div>

      {tab === 'comment' ? (
        <WeekCardsPanel
          monthKey={monthKey}
          scope={scope}
          version={version}
          weeks={weeks}
          kind={COLLECTIONS.results}
          title={t('results.tab.comment')}
          placeholder={t('weekCards.resultsPh')}
          withHeader={false}
        />
      ) : (
        <>
          {needsConnect && (
            <div className="result-notice">
              <p>{t('results.connectBody')}</p>
              <button className="btn btn-primary" disabled={connecting} onClick={() => void connect()}>
                {connecting ? t('login.connecting') : t('results.connectBtn')}
              </button>
            </div>
          )}

          {!needsConnect && error && <p className="error-text result-notice">{error.message}</p>}
          {isLoading && <p className="muted result-notice">{t('results.loading')}</p>}

          {dataset && (
            <WeeksTable
              dataset={dataset}
              keys={keys}
              weeks={weeks}
              weekdays={weekdays}
              end={coverageEnd ?? ''}
              header={weekHeader}
              tab={tab}
              locale={locale}
              t={t}
            />
          )}
        </>
      )}
    </>
  )
}

function WeeksTable({
  dataset,
  keys,
  weeks,
  weekdays,
  end,
  header,
  tab,
  locale,
  t,
}: {
  dataset: ResultsDataset
  keys: string[]
  weeks: CalendarWeek[]
  weekdays: Set<number>
  /** Último día que se puede leer: ni más allá de los datos ni más allá de ayer. */
  end: string
  header: ReactNode
  tab: Exclude<PanelTab, 'comment'>
  locale: string
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  // La pestaña de margen mira la semana tal cual y la compara con la anterior;
  // las otras tres son pares de ventanas declarados en COMPARISONS.
  const offsets = tab === 'margin' ? { current: 0, previous: -7 } : COMPARISONS[tab]
  const definitions = tab === 'margin' ? MARGIN_METRICS : METRICS

  return (
    <WeekGrid
      weeks={weeks}
      headerLabel={header}
      renderWeek={(week: CalendarWeek) => {
        // Las dos ventanas se recortan igual: si la semana en curso solo tiene
        // tres días cerrados, la de referencia también se queda en esos tres.
        const pair = comparableDays(week.weekStart, offsets, weekdays, end)
        const current = sumDays(dataset, keys, pair.current)
        const previous = sumDays(dataset, keys, pair.previous)

        if (current.covered === 0) {
          return <div className="result-empty">{t('results.noData')}</div>
        }

        const currentMetrics = deriveMetrics(current.totals)
        const previousMetrics = deriveMetrics(previous.totals)
        const partial = pair.usable < pair.requested

        const compareTitle = t('results.compareHint', {
          current: rangeLabel(pair.current, locale),
          previous: rangeLabel(pair.previous, locale),
        })

        return (
          <div className={`result-grid ${tab === 'margin' ? 'is-margin' : ''}`}>
            {partial && (
              <span className="result-partial" title={compareTitle}>
                {t('results.partial', { used: pair.usable, total: pair.requested })}
              </span>
            )}

            {definitions.map((definition) => (
              <MetricCell
                key={definition.key}
                definition={definition}
                current={metricValue(currentMetrics, definition.key)}
                previous={previous.covered > 0 ? metricValue(previousMetrics, definition.key) : null}
                label={t(definition.labelKey)}
                compareTitle={compareTitle}
                locale={locale}
              />
            ))}

            {tab === 'margin' &&
              MARGIN_MONEY.map((item) => (
                <MoneyCell
                  key={item.key}
                  label={t(item.labelKey)}
                  current={currentMetrics[item.key]}
                  previous={previous.covered > 0 ? previousMetrics[item.key] : null}
                  compareTitle={compareTitle}
                  locale={locale}
                />
              ))}
          </div>
        )
      }}
    />
  )
}

function rangeLabel(days: string[], locale: string): string {
  if (days.length === 0) return '—'
  const format = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  return days.length === 1 ? format(days[0]) : `${format(days[0])} – ${format(days[days.length - 1])}`
}
