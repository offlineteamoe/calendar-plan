import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createMonth, deleteMonth, listMonths, listVersionsByMonth } from '../lib/store'
import { useAuth } from '../context/AuthContext'
import { useRole } from '../hooks/useRole'
import { useI18n } from '../i18n/I18nContext'
import { AppHeader } from '../components/AppHeader'
import { AnimatedBackground } from '../components/AnimatedBackground'
import { NewMonthModal } from '../features/months/NewMonthModal'
import { DeleteMonthModal } from '../features/months/DeleteMonthModal'
import {
  COUNTRY_LABELS,
  monthPhase,
  type MonthEntry,
  type MonthPhase,
  type VersionEntry,
} from '../types'

const PHASES: MonthPhase[] = ['current', 'planning', 'closed']

function monthName(monthKey: string, locale: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  const label = new Date(year, month - 1, 1).toLocaleDateString(locale, { month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

interface Approval {
  total: number
  pending: number
  firstPending: string | null
}

/**
 * Resumen de aprobación del mes. Cada versión ya pertenece a un calendario
 * concreto (marca + región), así que basta con contarlas: cuántas siguen en
 * "maybe" y cuál es la primera, para saber de un vistazo que ahí falta algo
 * sin tener que entrar al mes.
 */
function approvalOf(versions: VersionEntry[]): Approval {
  const pendingOnes = versions.filter((v) => v.status !== 'approved')
  const first = pendingOnes[0]
  return {
    total: versions.length,
    pending: pendingOnes.length,
    firstPending: first ? `${first.letter} · ${first.brand} · ${COUNTRY_LABELS[first.country]}` : null,
  }
}

function MonthMenu({ onDelete }: { onDelete: () => void }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="month-row-menu" ref={ref}>
      <button
        className="icon-btn"
        aria-label="menu"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        ⋯
      </button>
      {open && (
        <div className="menu-panel menu-panel-right" onClick={(e) => e.stopPropagation()}>
          <button
            className="menu-item menu-item-danger"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
          >
            {t('months.menu.delete')}
          </button>
        </div>
      )}
    </div>
  )
}

export function MonthsPage() {
  const { user } = useAuth()
  const { canEdit } = useRole()
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentYear = new Date().getFullYear()
  const [activeYear, setActiveYear] = useState(currentYear)
  const [phaseFilter, setPhaseFilter] = useState<MonthPhase | 'all'>('all')
  const [showNew, setShowNew] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MonthEntry | null>(null)

  const monthsQuery = useQuery({ queryKey: ['months'], queryFn: listMonths })
  const versionsQuery = useQuery({ queryKey: ['versions-by-month'], queryFn: listVersionsByMonth })
  const months = useMemo(() => monthsQuery.data ?? [], [monthsQuery.data])

  const author = useMemo(
    () => ({ email: user?.email ?? '', initials: user?.initials ?? '' }),
    [user?.email, user?.initials],
  )

  const createMutation = useMutation({
    mutationFn: (monthKey: string) => createMonth(monthKey, author),
    onSuccess: (entry) => {
      void queryClient.invalidateQueries({ queryKey: ['months'] })
      void queryClient.invalidateQueries({ queryKey: ['versions-by-month'] })
      setShowNew(false)
      navigate(`/calendar/${entry.month_key}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (monthKey: string) => deleteMonth(monthKey, author),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['months'] })
      void queryClient.invalidateQueries({ queryKey: ['versions-by-month'] })
      setDeleteTarget(null)
    },
  })

  const years = useMemo(() => {
    const set = new Set<number>([currentYear])
    for (const m of months) set.add(Number(m.month_key.slice(0, 4)))
    return [...set].sort((a, b) => b - a)
  }, [months, currentYear])

  const forYear = useMemo(
    () =>
      months
        .filter((m) => m.month_key.startsWith(String(activeYear)))
        .sort((a, b) => (a.month_key < b.month_key ? -1 : 1)),
    [months, activeYear],
  )

  const phaseCounts = useMemo(() => {
    const map = new Map<MonthPhase | 'all', number>([['all', forYear.length]])
    for (const p of PHASES) map.set(p, forYear.filter((m) => monthPhase(m.month_key) === p).length)
    return map
  }, [forYear])

  const visible = phaseFilter === 'all' ? forYear : forYear.filter((m) => monthPhase(m.month_key) === phaseFilter)
  const firstName = (user?.name ?? '').split(' ')[0]

  return (
    <div className="shell">
      <AppHeader />

      <div className="hero hero-compact">
        <AnimatedBackground density={0.00006} />
        <div className="container hero-inner">
          <h1>{t('welcome.greeting', { name: firstName })}</h1>
          <p>{t('welcome.subtitle')}</p>
        </div>
      </div>

      <div className="shell-scroll">
        <div className="container">
          <div className="months-toolbar">
            <div className="year-tabs">
              {years.map((y) => (
                <button key={y} className={y === activeYear ? 'is-active' : ''} onClick={() => setActiveYear(y)}>
                  {y}
                </button>
              ))}
            </div>

            <div className="phase-filters">
              <button
                className={`kind-chip ${phaseFilter === 'all' ? 'is-active' : ''}`}
                onClick={() => setPhaseFilter('all')}
              >
                {t('months.filter.all')} {phaseCounts.get('all') ?? 0}
              </button>
              {PHASES.map((p) => (
                <button
                  key={p}
                  className={`kind-chip phase-${p} ${phaseFilter === p ? 'is-active' : ''}`}
                  onClick={() => setPhaseFilter(p)}
                >
                  <span className="note-tab-dot" style={{ background: 'var(--nc)' }} />
                  {t(`months.phase.${p}`)} {phaseCounts.get(p) ?? 0}
                </button>
              ))}
            </div>

            {canEdit && (
              <button className="btn btn-primary months-new" onClick={() => setShowNew(true)}>
                + {t('months.new')}
              </button>
            )}
          </div>

          {monthsQuery.isLoading && <p className="muted">{t('months.loading')}</p>}
          {monthsQuery.isError && (
            <div className="callout callout-danger">
              {t('months.loadError')} {(monthsQuery.error as Error).message}
            </div>
          )}

          <div className="month-rows">
            {visible.map((m) => {
              const phase = monthPhase(m.month_key)
              const approval = approvalOf(versionsQuery.data?.get(m.month_key) ?? [])
              return (
                <div className="month-row rise-in" key={m.month_key}>
                  <button className="month-row-btn" onClick={() => navigate(`/calendar/${m.month_key}`)}>
                    <span className="month-row-id">
                      <span className="month-row-name">{monthName(m.month_key, locale)}</span>
                      <span className="month-row-year">{m.month_key}</span>
                    </span>

                    <span className={`phase-pill phase-${phase}`}>{t(`months.phase.${phase}`)}</span>

                    <span className="month-row-approval">
                      {versionsQuery.isLoading ? (
                        <span className="muted small">{t('common.loading')}</span>
                      ) : approval.total === 0 ? (
                        <>
                          <span className="dot dot-idle" />
                          {t('months.notStarted')}
                        </>
                      ) : approval.pending === 0 ? (
                        <>
                          <span className="dot dot-ok" />
                          {t('months.allApproved')}
                        </>
                      ) : (
                        <>
                          <span className="dot dot-warn" />
                          {t('months.pendingApproval', {
                            count: approval.pending,
                            where: approval.firstPending ?? '',
                          })}
                        </>
                      )}
                    </span>

                    <span className="month-row-go" aria-hidden>
                      →
                    </span>
                  </button>
                  {canEdit && <MonthMenu onDelete={() => setDeleteTarget(m)} />}
                </div>
              )
            })}
          </div>

          {visible.length === 0 && !monthsQuery.isLoading && !monthsQuery.isError && (
            <div className="months-empty">
              <p className="muted">{t('months.empty', { year: activeYear })}</p>
              {canEdit && phaseFilter === 'all' && (
                <button className="btn btn-primary" onClick={() => setShowNew(true)}>
                  + {t('months.new')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showNew && (
        <NewMonthModal
          existingKeys={months.map((m) => m.month_key)}
          onClose={() => setShowNew(false)}
          onConfirm={(monthKey) => createMutation.mutate(monthKey)}
          isPending={createMutation.isPending}
          errorMessage={createMutation.isError ? (createMutation.error as Error).message : undefined}
        />
      )}

      {deleteTarget && (
        <DeleteMonthModal
          monthLabel={monthName(deleteTarget.month_key, locale)}
          onClose={() => setDeleteTarget(null)}
          onConfirmed={() => deleteMutation.mutate(deleteTarget.month_key)}
          isPending={deleteMutation.isPending}
          errorMessage={deleteMutation.isError ? (deleteMutation.error as Error).message : undefined}
        />
      )}
    </div>
  )
}
