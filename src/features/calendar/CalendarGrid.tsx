import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getPlanRows, savePlanCell } from '../../lib/store'
import { getMonthWeeks, isInMonth, isoWeekNumber, weekdayLabels } from '../../lib/dateUtils'
import { COUNTRY_LABELS, type Brand, type Country, type PlanRow } from '../../types'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../i18n/I18nContext'

interface Props {
  monthKey: string
  brand: Brand
  country: Country
  channel: string
}

export function CalendarGrid({ monthKey, brand, country, channel }: Props) {
  const { user } = useAuth()
  const { t, locale } = useI18n()
  const queryClient = useQueryClient()
  const author = { email: user?.email ?? '', initials: user?.initials ?? '' }

  const planQuery = useQuery({ queryKey: ['plan', monthKey], queryFn: () => getPlanRows(monthKey) })

  const saveMutation = useMutation({
    mutationFn: ({ date, spend }: { date: string; spend: number }) => {
      const row: PlanRow = {
        date,
        brand,
        country,
        channel,
        scenario_id: '',
        planned_spend: spend,
        last_edited_by: author.email,
        last_edited_at: new Date().toISOString(),
      }
      return savePlanCell(monthKey, row, author, locale)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['plan', monthKey] })
      void queryClient.invalidateQueries({ queryKey: ['changes', monthKey] })
    },
  })

  const rows = planQuery.data ?? []
  const spendByDate = new Map<string, number>()
  let monthTotal = 0
  for (const r of rows) {
    if (r.brand !== brand || r.country !== country || r.channel !== channel) continue
    spendByDate.set(r.date, r.planned_spend)
    if (isInMonth(r.date, monthKey)) monthTotal += r.planned_spend
  }

  const weeks = getMonthWeeks(monthKey)
  const dayNames = weekdayLabels(locale)

  return (
    <div className="panel">
      <div className="cal-toolbar">
        <span className="cal-scope">
          <span className="pill">{brand}</span>
          {COUNTRY_LABELS[country]} · {channel}
        </span>
        <span className="row">
          {saveMutation.isPending && <span className="muted small">{t('calendar.saving')}</span>}
          <span className="muted small">{t('calendar.monthTotal')}</span>
          <span className="cal-total">${monthTotal.toLocaleString(locale)}</span>
        </span>
      </div>

      {saveMutation.isError && (
        <div className="callout callout-danger" style={{ margin: '10px 12px 0' }}>
          {t('calendar.saveError', { error: (saveMutation.error as Error).message })}
        </div>
      )}

      <div className="cal-grid">
        <div className="cal-row cal-head">
          <span />
          {dayNames.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        {weeks.map((week) => (
          <div className="cal-row cal-week" key={week.weekStart}>
            <span className="cal-wk">{isoWeekNumber(week.weekStart)}</span>
            {week.days.map((date) => {
              const inMonth = isInMonth(date, monthKey)
              const value = spendByDate.get(date)
              return (
                <div
                  key={date}
                  className={`cal-cell ${inMonth ? '' : 'is-outside'} ${value ? 'has-value' : ''}`}
                >
                  <span className="cal-day">{Number(date.slice(-2))}</span>
                  {inMonth && (
                    <input
                      key={`${date}-${value ?? ''}`}
                      type="number"
                      className="cal-input"
                      defaultValue={value ?? ''}
                      placeholder="—"
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
    </div>
  )
}
