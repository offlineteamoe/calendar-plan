import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPlanRows } from '../lib/planningSheet'
import { NotesTab } from './NotesTab'
import { ScenarioEditor } from './ScenarioEditor'
import type { Brand, Country } from '../types'
import { COUNTRY_LABELS } from '../types'

type TabKey = 'resumen' | 'spend' | 'notes' | 'results' | 'creative'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'spend', label: 'Spend' },
  { key: 'notes', label: 'Notes' },
  { key: 'results', label: 'Results' },
  { key: 'creative', label: 'Creative' },
]

interface Props {
  monthKey: string
  spreadsheetId: string
  brand: Brand
  country: Country
}

function EmptyPhase2({ label }: { label: string }) {
  return <p className="muted">{label} todavía no tiene datos — llega en la fase 2, cuando se conecte el gasto real.</p>
}

export function SidePanel({ monthKey, spreadsheetId, brand, country }: Props) {
  const [tab, setTab] = useState<TabKey>('resumen')
  const planQuery = useQuery({ queryKey: ['plan', monthKey], queryFn: () => getPlanRows(spreadsheetId) })

  const totalForSelection = (planQuery.data ?? [])
    .filter((r) => r.brand === brand && r.country === country)
    .reduce((sum, r) => sum + r.planned_spend, 0)

  return (
    <aside className="side-panel">
      <nav className="side-panel-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={t.key === tab ? 'tab-active' : ''} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="side-panel-body">
        {tab === 'resumen' && (
          <div className="tab-content">
            <h3>Resumen</h3>
            <p className="muted">
              {brand} · {COUNTRY_LABELS[country]}
            </p>
            <div className="summary-figure">
              <span className="summary-value">${totalForSelection.toLocaleString()}</span>
              <span className="muted small">planificado este mes (todos los canales)</span>
            </div>
            <ScenarioEditor monthKey={monthKey} spreadsheetId={spreadsheetId} brand={brand} />
          </div>
        )}
        {tab === 'spend' && (
          <div className="tab-content">
            <h3>Spend por canal</h3>
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
        {tab === 'notes' && <NotesTab monthKey={monthKey} spreadsheetId={spreadsheetId} />}
        {tab === 'results' && (
          <div className="tab-content">
            <h3>Results</h3>
            <EmptyPhase2 label="Results" />
          </div>
        )}
        {tab === 'creative' && (
          <div className="tab-content">
            <h3>Creative</h3>
            <EmptyPhase2 label="Creative" />
          </div>
        )}
      </div>
    </aside>
  )
}
