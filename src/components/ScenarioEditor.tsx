import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addEscenario, getEscenarios, setActiveEscenario } from '../lib/planningSheet'
import { logActivity } from '../hooks/useActivityFeed'
import type { Brand, EscenarioRow } from '../types'
import { useAuth } from '../context/AuthContext'

interface Props {
  monthKey: string
  spreadsheetId: string
  brand: Brand
}

/**
 * Escenarios semanales (ver plan, sección 4/6): opciones de $/semana con
 * descripción libre, una marcada "activa" por semana×marca. Simplificación
 * de Fase 1: acá solo se administran los escenarios; el reparto día-a-día y
 * por país que hoy hace el Excel vía fórmulas queda para cuando se conecten
 * datos reales de atribución (fase 2).
 */
export function ScenarioEditor({ monthKey, spreadsheetId, brand }: Props) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [weekStart, setWeekStart] = useState('')
  const [description, setDescription] = useState('')
  const [weeklySpend, setWeeklySpend] = useState('')

  const escenariosQuery = useQuery({
    queryKey: ['escenarios', monthKey, brand],
    queryFn: () => getEscenarios(spreadsheetId),
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
      await addEscenario(spreadsheetId, row)
      await logActivity(monthKey, { type: 'scenario', sheetTab: 'Escenario', range: row.week_start, userEmail: user?.email ?? '', userInitials: user?.initials ?? '' })
    },
    onSuccess: () => {
      setDescription('')
      setWeeklySpend('')
      void queryClient.invalidateQueries({ queryKey: ['escenarios', monthKey, brand] })
    },
  })

  const activateMutation = useMutation({
    mutationFn: (row: EscenarioRow) => setActiveEscenario(spreadsheetId, row.scenario_id, row.week_start, row.brand),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['escenarios', monthKey, brand] }),
  })

  const scenarios = (escenariosQuery.data ?? []).filter((s) => s.brand === brand)
  const byWeek = new Map<string, EscenarioRow[]>()
  for (const s of scenarios) {
    byWeek.set(s.week_start, [...(byWeek.get(s.week_start) ?? []), s])
  }

  return (
    <div className="tab-content">
      <h3>Escenarios semanales — {brand}</h3>

      {[...byWeek.entries()].map(([week, list]) => (
        <div key={week} className="scenario-week">
          <div className="scenario-week-label">Semana del {week}</div>
          {list.map((s) => (
            <div key={s.scenario_id} className={`scenario-row ${s.is_active ? 'scenario-active' : ''}`}>
              <span>{s.description || '(sin descripción)'}</span>
              <span className="scenario-amount">${s.weekly_spend.toLocaleString()}</span>
              {s.is_active ? (
                <span className="status-pill status-active">activo</span>
              ) : (
                <button className="btn-link" onClick={() => activateMutation.mutate(s)}>
                  marcar activo
                </button>
              )}
            </div>
          ))}
        </div>
      ))}
      {scenarios.length === 0 && <p className="muted">Todavía no hay escenarios para {brand} este mes.</p>}

      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault()
          addMutation.mutate()
        }}
      >
        <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} required title="Lunes de la semana" />
        <input
          type="text"
          placeholder="Descripción (ej. High CAM Off 1 SpotxH)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="$/semana"
          value={weeklySpend}
          onChange={(e) => setWeeklySpend(e.target.value)}
          required
          min={0}
        />
        <button className="btn-secondary" type="submit" disabled={addMutation.isPending}>
          {addMutation.isPending ? 'Guardando…' : 'Agregar escenario'}
        </button>
      </form>
    </div>
  )
}
