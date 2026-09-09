import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPlanRows } from '../../lib/store'
import { NotesPanel } from '../notes/NotesPanel'
import { ScenarioEditor } from './ScenarioEditor'
import { CHANNELS, COUNTRY_LABELS, type Brand, type Country } from '../../types'
import { useI18n } from '../../i18n/I18nContext'

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
  brand: Brand
  country: Country
  channel: string
}

export function SidePanel({ monthKey, brand, country, channel }: Props) {
  const { t, locale } = useI18n()
  const [tab, setTab] = useState<TabKey>('summary')
  const planQuery = useQuery({ queryKey: ['plan', monthKey], queryFn: () => getPlanRows(monthKey) })

  const rows = (planQuery.data ?? []).filter((r) => r.brand === brand && r.country === country)
  const total = rows.reduce((sum, r) => sum + r.planned_spend, 0)
  const byChannel = CHANNELS.map((ch) => ({
    channel: ch,
    total: rows.filter((r) => r.channel === ch).reduce((sum, r) => sum + r.planned_spend, 0),
  }))
  const maxChannel = Math.max(1, ...byChannel.map((c) => c.total))

  return (
    <aside className="panel">
      <nav className="tab-bar">
        {TABS.map((tb) => (
          <button key={tb.key} className={tb.key === tab ? 'is-active' : ''} onClick={() => setTab(tb.key)}>
            {t(tb.labelKey)}
          </button>
        ))}
      </nav>

      {tab === 'notes' ? (
        <NotesPanel monthKey={monthKey} brand={brand} country={country} channel={channel} />
      ) : (
        <div className="panel-body">
          {tab === 'summary' && (
            <div className="stack">
              <div className="stat-block">
                <span className="stat-value">${total.toLocaleString(locale)}</span>
                <span className="stat-label">{t('summary.plannedTotal')}</span>
                <span className="stat-label faint">
                  {t('summary.selection', { brand, country: COUNTRY_LABELS[country] })}
                </span>
              </div>
              <ScenarioEditor monthKey={monthKey} brand={brand} />
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

          {tab === 'results' && (
            <div className="stack">
              <h3>{t('tabs.results')}</h3>
              <p className="muted small">{t('phase2.empty')}</p>
            </div>
          )}

          {tab === 'creative' && (
            <div className="stack">
              <h3>{t('tabs.creative')}</h3>
              <p className="muted small">{t('phase2.empty')}</p>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
