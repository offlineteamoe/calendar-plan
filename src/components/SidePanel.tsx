import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPlanRows } from '../lib/store'
import { NotesTab } from './NotesTab'
import { ScenarioEditor } from './ScenarioEditor'
import type { Brand, Country } from '../types'
import { COUNTRY_LABELS } from '../types'
import { useI18n } from '../i18n/I18nContext'

type TabKey = 'resumen' | 'spend' | 'notes' | 'results' | 'creative'

const TAB_KEYS: { key: TabKey; labelKey: string }[] = [
  { key: 'resumen', labelKey: 'tabs.summary' },
  { key: 'spend', labelKey: 'tabs.spend' },
  { key: 'notes', labelKey: 'tabs.notes' },
  { key: 'results', labelKey: 'tabs.results' },
  { key: 'creative', labelKey: 'tabs.creative' },
]

interface Props {
  monthKey: string
  brand: Brand
  country: Country
}

export function SidePanel({ monthKey, brand, country }: Props) {
  const { t } = useI18n()
  const [tab, setTab] = useState<TabKey>('resumen')
  const planQuery = useQuery({ queryKey: ['plan', monthKey], queryFn: () => getPlanRows(monthKey) })

  const totalForSelection = (planQuery.data ?? [])
    .filter((r) => r.brand === brand && r.country === country)
    .reduce((sum, r) => sum + r.planned_spend, 0)

  return (
    <aside className="side-panel">
      <nav className="side-panel-tabs">
        {TAB_KEYS.map((tb) => (
          <button key={tb.key} className={tb.key === tab ? 'tab-active' : ''} onClick={() => setTab(tb.key)}>
            {t(tb.labelKey)}
          </button>
        ))}
      </nav>

      <div className="side-panel-body">
        {tab === 'resumen' && (
          <div className="tab-content">
            <h3>{t('tabs.summary')}</h3>
            <p className="muted">
              {brand} · {COUNTRY_LABELS[country]}
            </p>
            <div className="summary-figure">
              <span className="summary-value">${totalForSelection.toLocaleString()}</span>
              <span className="muted small">{t('summary.plannedThisMonth')}</span>
            </div>
            <ScenarioEditor monthKey={monthKey} brand={brand} />
          </div>
        )}
        {tab === 'spend' && (
          <div className="tab-content">
            <h3>{t('tabs.spend')}</h3>
            {['TV', 'Digital', 'Radio', 'Otro'].map((ch) => {
              const total = (planQuery.data ?? [])
                .filter((r) => r.brand === brand && r.country === country && r.channel === ch)
                .reduce((sum, r) => sum + r.planned_spend, 0)
              return (
                <div key={ch} className="spend-row">
                  <span>{ch}</span>
                  <span>${total.toLocaleString()}</span>
                </div>
              )
            })}
          </div>
        )}
        {tab === 'notes' && <NotesTab monthKey={monthKey} />}
        {tab === 'results' && (
          <div className="tab-content">
            <h3>{t('tabs.results')}</h3>
            <p className="muted">{t('phase2.empty', { label: t('tabs.results') })}</p>
          </div>
        )}
        {tab === 'creative' && (
          <div className="tab-content">
            <h3>{t('tabs.creative')}</h3>
            <p className="muted">{t('phase2.empty', { label: t('tabs.creative') })}</p>
          </div>
        )}
      </div>
    </aside>
  )
}
