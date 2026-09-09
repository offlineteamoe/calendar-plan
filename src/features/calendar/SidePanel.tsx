import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPlanRows, type Scope } from '../../lib/store'
import { NotesPanel } from '../notes/NotesPanel'
import { ScenarioEditor } from './ScenarioEditor'
import { WeekCardsPanel } from './WeekCardsPanel'
import { CHANNELS, COLLECTIONS, COUNTRY_LABELS, LATAM_PARTS, type VersionEntry } from '../../types'
import { useI18n } from '../../i18n/I18nContext'
import type { CalendarWeek } from '../../lib/dateUtils'

type TabKey = 'summary' | 'notes' | 'spend' | 'results' | 'creative'

const TABS: { key: TabKey; labelKey: string }[] = [
  { key: 'summary', labelKey: 'tabs.summary' },
  { key: 'notes', labelKey: 'tabs.notes' },
  { key: 'spend', labelKey: 'tabs.spend' },
  { key: 'results', labelKey: 'tabs.results' },
  { key: 'creative', labelKey: 'tabs.creative' },
]

interface Props {
  monthKey: string
  scope: Scope
  version: VersionEntry
  weeks: CalendarWeek[]
  latamView: boolean
}

export function SidePanel({ monthKey, scope, version, weeks, latamView }: Props) {
  const { t, locale } = useI18n()
  const [tab, setTab] = useState<TabKey>('summary')

  const planQuery = useQuery({
    queryKey: ['plan', monthKey, scope.versionId],
    queryFn: () => getPlanRows(monthKey, scope.versionId),
  })

  const rows = (planQuery.data ?? []).filter((r) => {
    if (r.brand !== scope.brand) return false
    return latamView ? LATAM_PARTS.includes(r.country) : r.country === scope.country
  })
  const total = rows.reduce((sum, r) => sum + r.planned_spend, 0)
  const byChannel = CHANNELS.map((ch) => ({
    channel: ch,
    total: rows.filter((r) => r.channel === ch).reduce((sum, r) => sum + r.planned_spend, 0),
  }))
  const maxChannel = Math.max(1, ...byChannel.map((c) => c.total))

  return (
    <aside className="panel">
      <nav className="tab-bar aligned-head">
        {TABS.map((tb) => (
          <button key={tb.key} className={tb.key === tab ? 'is-active' : ''} onClick={() => setTab(tb.key)}>
            {t(tb.labelKey)}
          </button>
        ))}
      </nav>

      {tab === 'notes' && <NotesPanel monthKey={monthKey} scope={scope} version={version} weeks={weeks} />}

      {tab === 'results' && (
        <WeekCardsPanel
          monthKey={monthKey}
          scope={scope}
          version={version}
          weeks={weeks}
          kind={COLLECTIONS.results}
          title={t('tabs.results')}
          placeholder={t('weekCards.resultsPh')}
        />
      )}

      {tab === 'creative' && (
        <WeekCardsPanel
          monthKey={monthKey}
          scope={scope}
          version={version}
          weeks={weeks}
          kind={COLLECTIONS.creative}
          title={t('tabs.creative')}
          placeholder={t('weekCards.creativePh')}
        />
      )}

      {(tab === 'summary' || tab === 'spend') && (
        <>
          <div className="aligned-subhead">
            <span className="week-col-title">
              {latamView ? t('latam.viewing') : COUNTRY_LABELS[scope.country]} · {scope.brand}
            </span>
          </div>
          <div className="panel-body">
            {tab === 'summary' && (
              <div className="stack">
                <div className="stat-block">
                  <span className="stat-value">${total.toLocaleString(locale)}</span>
                  <span className="stat-label">{t('summary.plannedTotal')}</span>
                </div>
                {!latamView && <ScenarioEditor monthKey={monthKey} scope={scope} version={version} />}
              </div>
            )}

            {tab === 'spend' && (
              <div className="stack">
                <h3>{t('summary.byChannel')}</h3>
                {byChannel.map((c) => (
                  <div className="bar-row" key={c.channel}>
                    <div className="bar-row-top">
                      <span>{c.channel}</span>
                      <span className="tabular">${c.total.toLocaleString(locale)}</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${Math.round((c.total / maxChannel) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
