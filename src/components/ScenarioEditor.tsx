import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addEscenario, getEscenarios, setActiveEscenario } from '../lib/store'
import { logActivity } from '../hooks/useActivityFeed'
import type { Brand, EscenarioRow } from '../types'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/I18nContext'

interface Props {
  monthKey: string
  brand: Brand
}

/**
 * Escenarios semanales (ver plan, sección 4/6): opciones de $/semana con
 * descripción libre, una marcada "activa" por semana×marca. Simplificación
 * de Fase 1: acá solo se administran los escenarios; el reparto día-a-día y
 * por país que hoy hace el Excel vía fórmulas queda para cuando se conecten
 * datos reales de atribución (fase 2).
 */
export function ScenarioEditor({ monthKey, brand }: Props) {
  const { user } = useAuth()
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [weekStart, setWeekStart] = useState('')
  const [description, setDescription] = useState('')
  const [weeklySpend, setWeeklySpend] = useState('')

  const escenariosQuery = useQuery({
    queryKey: ['escenarios', monthKey, brand],
    queryFn: () => getEscenarios(monthKey),
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      const row: EscenarioRow = {
        scenario_id: crypto.randomUUID(),
        week_start: weekStart,
        brand,
        description,
        weekly_spend: Number(weeklySpend) || 0,
        is_active: false,
        created_by: user?.email ?? '',
        created_at: new Date().toISOString(),
      }
      await addEscenario(monthKey, row)
      await logActivity(monthKey, { type: 'scenario', sheetTab: 'Escenario', range: row.week_start, userEmail: user?.email ?? '', userInitials: user?.initials ?? '' })
    },
    onSuccess: () => {
      setDescription('')
      setWeeklySpend('')
      void queryClient.invalidateQueries({ queryKey: ['escenarios', monthKey, brand] })
    },
  })

  const activateMutation = useMutation({
    mutationFn: (row: EscenarioRow) => setActiveEscenario(monthKey, row.scenario_id, row.week_start, row.brand),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['escenarios', monthKey, brand] }),
  })

  const scenarios = (escenariosQuery.data ?? []).filter((s) => s.brand === brand)
  const byWeek = new Map<string, EscenarioRow[]>()
  for (const s of scenarios) {
    byWeek.set(s.week_start, [...(byWeek.get(s.week_start) ?? []), s])
  }

  return (
    <div className="tab-content">
      <h3>{t('scenario.title', { brand })}</h3>

      {[...byWeek.entries()].map(([week, list]) => (
        <div key={week} className="scenario-week">
          <div className="scenario-week-label">{t('scenario.week', { date: week })}</div>
          {list.map((s) => (
            <div key={s.scenario_id} className={`scenario-row ${s.is_active ? 'scenario-active' : ''}`}>
              <span>{s.description || t('scenario.noDescription')}</span>
              <span className="scenario-amount">${s.weekly_spend.toLocaleString()}</span>
              {s.is_active ? (
                <span className="status-pill status-active">{t('scenario.active')}</span>
              ) : (
                <button className="btn-link" onClick={() => activateMutation.mutate(s)}>
                  {t('scenario.markActive')}
                </button>
              )}
            </div>
          ))}
        </div>
      ))}
      {scenarios.length === 0 && <p className="muted">{t('scenario.empty', { brand })}</p>}

      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault()
          addMutation.mutate()
        }}
      >
        <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} required />
        <input type="text" placeholder={t('scenario.descriptionPh')} value={description} onChange={(e) => setDescription(e.target.value)} required />
        <input type="number" placeholder={t('scenario.weeklyPh')} value={weeklySpend} onChange={(e) => setWeeklySpend(e.target.value)} required min={0} />
        <button className="btn-secondary" type="submit" disabled={addMutation.isPending}>
          {addMutation.isPending ? t('scenario.adding') : t('scenario.add')}
        </button>
      </form>
    </div>
  )
}
