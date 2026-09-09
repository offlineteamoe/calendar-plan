import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getWeekCards, saveWeekCard, type Scope } from '../../lib/store'
import { WeekGrid } from './WeekGrid'
import { useAuth } from '../../context/AuthContext'
import { useRole } from '../../hooks/useRole'
import { useI18n } from '../../i18n/I18nContext'
import { COLLECTIONS, type VersionEntry, type WeekCardRow } from '../../types'
import type { CalendarWeek } from '../../lib/dateUtils'

interface Props {
  monthKey: string
  scope: Scope
  version: VersionEntry
  weeks: CalendarWeek[]
  kind: typeof COLLECTIONS.results | typeof COLLECTIONS.creative
  placeholder: string
  title: string
}

/** Resultados / creativos: un cuadro por semana, alineado con el calendario. */
export function WeekCardsPanel({ monthKey, scope, version, weeks, kind, placeholder, title }: Props) {
  const { user } = useAuth()
  const { canEdit } = useRole()
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const author = useMemo(
    () => ({ email: user?.email ?? '', initials: user?.initials ?? '' }),
    [user?.email, user?.initials],
  )

  const cardsQuery = useQuery({
    queryKey: [kind, monthKey, scope.versionId],
    queryFn: () => getWeekCards(monthKey, kind, scope.versionId),
  })

  const saveMutation = useMutation({
    mutationFn: ({ weekStart, content }: { weekStart: string; content: string }) => {
      const row: WeekCardRow = {
        card_id: `${scope.versionId}_${scope.brand}_${scope.country}_${weekStart}`,
        version_id: scope.versionId,
        brand: scope.brand,
        country: scope.country,
        week_start: weekStart,
        content,
        updated_at: new Date().toISOString(),
        updated_by: author.email,
      }
      return saveWeekCard(monthKey, kind, scope, version.letter, row, author)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [kind, monthKey, scope.versionId] })
      void queryClient.invalidateQueries({ queryKey: ['changes', monthKey] })
    },
  })

  const cards = (cardsQuery.data ?? []).filter((c) => c.brand === scope.brand && c.country === scope.country)
  const byWeek = new Map(cards.map((c) => [c.week_start, c]))

  return (
    <>
      <div className="aligned-subhead">
        <span className="week-col-title">{title}</span>
        {saveMutation.isPending && <span className="muted small">{t('common.saving')}</span>}
      </div>

      {cardsQuery.isError && (
        <p className="error-text" style={{ padding: '8px 12px' }}>
          {(cardsQuery.error as Error).message}
        </p>
      )}

      <WeekGrid
        weeks={weeks}
        headerLabel={<span className="week-col-title">{title}</span>}
        renderWeek={(week: CalendarWeek) => {
          const card = byWeek.get(week.weekStart)
          if (!canEdit) {
            return <div className="week-card-read">{card?.content || '—'}</div>
          }
          return (
            <textarea
              key={`${week.weekStart}-${card?.updated_at ?? 'empty'}`}
              className="week-card-input"
              defaultValue={card?.content ?? ''}
              placeholder={placeholder}
              onBlur={(e) => {
                const next = e.target.value
                if (next === (card?.content ?? '')) return
                saveMutation.mutate({ weekStart: week.weekStart, content: next })
              }}
            />
          )
        }}
      />
    </>
  )
}
