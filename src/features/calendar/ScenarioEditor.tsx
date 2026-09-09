import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addEscenario, getEscenarios, setActiveEscenario } from '../../lib/store'
import { currentWeekStart } from '../../lib/dateUtils'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../i18n/I18nContext'
import type { Brand, EscenarioRow } from '../../types'

/**
 * Escenarios semanales: opciones de $/semana con descripción, una activa por
 * semana×marca. El reparto día-a-día por país queda para la fase 2, cuando se
 * conecten los % de atribución reales.
 */
export function ScenarioEditor({ monthKey, brand }: { monthKey: string; brand: Brand }) {
  const { user } = useAuth()
  const { t, locale } = useI18n()
  const queryClient = useQueryClient()
  const [weekStart, setWeekStart] = useState(currentWeekStart)
  const [description, setDescription] = useState('')
  const [weeklySpend, setWeeklySpend] = useState('')
  const author = { email: user?.email ?? '', initials: user?.initials ?? '' }

  const scenariosQuery = useQuery({ queryKey: ['escenarios', monthKey], queryFn: () => getEscenarios(monthKey) })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['escenarios', monthKey] })
    void queryClient.invalidateQueries({ queryKey: ['changes', monthKey] })
  }

  const addMutation = useMutation({
    mutationFn: () =>
      addEscenario(
        monthKey,
        {
          scenario_id: crypto.randomUUID(),
          week_start: weekStart,
          brand,
          description: description.trim(),
          weekly_spend: Number(weeklySpend) || 0,
          is_active: false,
          created_by: author.email,
          created_at: new Date().toISOString(),
        },
        author,
      ),
    onSuccess: () => {
      setDescription('')
      setWeeklySpend('')
      invalidate()
    },
  })

  const activateMutation = useMutation({
    mutationFn: (row: EscenarioRow) => setActiveEscenario(monthKey, row, author),
    onSuccess: invalidate,
  })

  const scenarios = (scenariosQuery.data ?? []).filter((s) => s.brand === brand)
  const byWeek = new Map<string, EscenarioRow[]>()
  for (const s of scenarios) byWeek.set(s.week_start, [...(byWeek.get(s.week_start) ?? []), s])

  return (
    <div className="stack">
      <h3>{t('summary.scenarios')}</h3>

      {scenarios.length === 0 && <p className="muted small">{t('summary.scenariosEmpty', { brand })}</p>}

      {[...byWeek.entries()]
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([week, list]) => (
          <div className="scenario-group" key={week}>
            <div className="scenario-group-label">{week}</div>
            {list.map((s) => (
              <div key={s.scenario_id} className={`scenario-item ${s.is_active ? 'is-active' : ''}`}>
                <span>{s.description || '—'}</span>
                <span className="row">
                  <span className="tabular">${s.weekly_spend.toLocaleString(locale)}</span>
                  {s.is_active ? (
                    <span className="pill">{t('summary.active')}</span>
                  ) : (
                    <button className="btn-link" onClick={() => activateMutation.mutate(s)}>
                      {t('summary.markActive')}
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        ))}

      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          addMutation.mutate()
        }}
      >
        <div className="row">
          <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} required />
          <input
            type="number"
            placeholder={t('summary.weeklySpend')}
            value={weeklySpend}
            onChange={(e) => setWeeklySpend(e.target.value)}
            min={0}
            required
            style={{ maxWidth: 110 }}
          />
        </div>
        <input
          type="text"
          placeholder={t('summary.scenarioDescription')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <button className="btn btn-secondary btn-block" type="submit" disabled={addMutation.isPending}>
          {addMutation.isPending ? t('common.saving') : t('summary.addScenario')}
        </button>
        {addMutation.isError && <p className="error-text">{(addMutation.error as Error).message}</p>}
      </form>
    </div>
  )
}
