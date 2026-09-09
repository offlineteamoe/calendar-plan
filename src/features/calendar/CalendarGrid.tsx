import { useMutation, useQueryClient } from '@tanstack/react-query'
import { savePlanCell, type Scope } from '../../lib/store'
import { useLiveDocs } from '../../hooks/useLiveDocs'
import { getMonthWeeks, isInMonth, isoWeekNumber, weekdayLabels } from '../../lib/dateUtils'
import { COLLECTIONS, LATAM_PARTS, type PlanRow, type VersionEntry } from '../../types'
import { useAuth } from '../../context/AuthContext'
import { useRole } from '../../hooks/useRole'
import { useI18n } from '../../i18n/I18nContext'

interface Props {
  monthKey: string
  scope: Scope
  version: VersionEntry
  channel: string
  onChannelChange: (c: string) => void
  /** Vista agregada de LATAM: suma de LT excl. MX/AR + MX + AR, solo lectura. */
  latamView: boolean
}

export function CalendarGrid({ monthKey, scope, version, channel, latamView }: Props) {
  const { user } = useAuth()
  const { canEdit } = useRole()
  const { t, locale } = useI18n()
  const queryClient = useQueryClient()
  const author = { email: user?.email ?? '', initials: user?.initials ?? '' }

  const planQuery = useLiveDocs(monthKey, COLLECTIONS.plan, scope.versionId, (raw) => raw as unknown as PlanRow)

  const saveMutation = useMutation({
    mutationFn: ({ date, spend }: { date: string; spend: number }) => {
      const row: PlanRow = {
        version_id: scope.versionId,
        date,
        brand: scope.brand,
        country: scope.country,
        channel,
        scenario_id: '',
        planned_spend: spend,
        last_edited_by: author.email,
        last_edited_at: new Date().toISOString(),
      }
      return savePlanCell(monthKey, scope, version.letter, row, author, locale)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['changes', monthKey] }),
  })

  const rows = planQuery.data
  const spendByDate = new Map<string, number>()
  let monthTotal = 0
  for (const r of rows) {
    if (r.brand !== scope.brand || r.channel !== channel) continue
    const inScope = latamView ? LATAM_PARTS.includes(r.country) : r.country === scope.country
    if (!inScope) continue
    spendByDate.set(r.date, (spendByDate.get(r.date) ?? 0) + r.planned_spend)
    if (isInMonth(r.date, monthKey)) monthTotal += r.planned_spend
  }

  const weeks = getMonthWeeks(monthKey)
  const dayNames = weekdayLabels(locale)

  return (
    <>
      <div className="aligned-subhead cal-subhead">
        <span className="cal-channel">{channel}</span>
        {saveMutation.isPending && <span className="muted small">{t('calendar.saving')}</span>}
        <span className="cal-total-wrap">
          <span className="muted small">{t('calendar.monthTotal')}</span>
          <span className="cal-total">${monthTotal.toLocaleString(locale)}</span>
        </span>
      </div>

      {saveMutation.isError && (
        <div className="callout callout-danger" style={{ margin: '8px 12px 0' }}>
          {t('calendar.saveError', { error: (saveMutation.error as Error).message })}
        </div>
      )}

      <div className="cal-grid">
        <div className="cal-row aligned-weekhead">
          <span />
          {dayNames.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="aligned-weeks">
          {weeks.map((week) => (
            <div className="cal-row aligned-week" key={week.weekStart}>
              <span className="cal-wk">{isoWeekNumber(week.weekStart)}</span>
              {week.days.map((date) => {
                const inMonth = isInMonth(date, monthKey)
                const value = spendByDate.get(date)
                return (
                  <div key={date} className={`cal-cell ${inMonth ? '' : 'is-outside'} ${value ? 'has-value' : ''}`}>
                    <span className="cal-day">{Number(date.slice(-2))}</span>
                    {inMonth &&
                      (latamView || !canEdit ? (
                        <span className="cal-input cal-readonly">{value ? value.toLocaleString(locale) : '—'}</span>
                      ) : (
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
                      ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
