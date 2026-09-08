import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getPlanRows, upsertPlanRow } from '../lib/store'
import { logActivity } from '../hooks/useActivityFeed'
import { getMonthWeeks, isInMonth, isoWeekNumber, weekdayLabel } from '../lib/dateUtils'
import type { Brand, Country, PlanRow } from '../types'
import { useAuth } from '../context/AuthContext'

const CHANNELS = ['TV', 'Digital', 'Radio', 'Otro']

interface Props {
  monthKey: string
  brand: Brand
  country: Country
}

export function CalendarGrid({ monthKey, brand, country }: Props) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [channel, setChannel] = useState(CHANNELS[0])

  const planQuery = useQuery({ queryKey: ['plan', monthKey], queryFn: () => getPlanRows(monthKey) })

  const saveMutation = useMutation({
    mutationFn: async ({ date, spend }: { date: string; spend: number }) => {
      const row: PlanRow = {
        date,
        brand,
        country,
        channel,
        scenario_id: '',
        planned_spend: spend,
        last_edited_by: user?.email ?? '',
        last_edited_at: new Date().toISOString(),
      }
      await upsertPlanRow(monthKey, row)
      await logActivity(monthKey, {
        type: 'plan_cell',
        sheetTab: 'Plan',
        range: `${date} · ${brand} · ${country} · ${channel}`,
        userEmail: user?.email ?? '',
        userInitials: user?.initials ?? '',
      })
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['plan', monthKey] }),
  })

  const rows = planQuery.data ?? []
  const spendByDate = new Map<string, number>()
  for (const r of rows) {
    if (r.brand !== brand || r.country !== country || r.channel !== channel) continue
    spendByDate.set(r.date, r.planned_spend)
  }

  const weeks = getMonthWeeks(monthKey)

  return (
    <div className="calendar-grid">
      <div className="calendar-grid-toolbar">
        <label>
          Canal
          <select value={channel} onChange={(e) => setChannel(e.target.value)}>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        {planQuery.isFetching && <span className="muted small">actualizando…</span>}
      </div>

      <div className="calendar-weekday-header">
        <span className="week-number-col" />
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i}>{weekdayLabel(i)}</span>
        ))}
      </div>

      {weeks.map((week) => (
        <div className="calendar-week-row" key={week.weekStart}>
          <span className="week-number-col">S{isoWeekNumber(week.weekStart)}</span>
          {week.days.map((date) => {
            const inMonth = isInMonth(date, monthKey)
            const value = spendByDate.get(date)
            return (
              <div key={date} className={`calendar-day-cell ${inMonth ? '' : 'calendar-day-outside'}`}>
                <span className="calendar-day-number">{Number(date.slice(-2))}</span>
                {inMonth && (
                  <input
                    key={`${date}-${value ?? ''}`}
                    type="number"
                    className="calendar-day-input"
                    defaultValue={value ?? ''}
                    placeholder="0"
                    min={0}
                    onBlur={(e) => {
                      const next = Number(e.target.value) || 0
                      if (next === (value ?? 0)) return
                      saveMutation.mutate({ date, spend: next })
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
