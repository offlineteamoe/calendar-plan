import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createMonth, deleteMonth, listMonths, setMonthStatus } from '../lib/store'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { AppHeader } from '../components/AppHeader'
import { AnimatedBackground } from '../components/AnimatedBackground'
import { NewMonthModal } from '../features/months/NewMonthModal'
import { DeleteMonthModal } from '../features/months/DeleteMonthModal'
import type { MonthEntry } from '../types'

function monthName(monthKey: string, locale: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  const label = new Date(year, month - 1, 1).toLocaleDateString(locale, { month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function MonthMenu({
  month,
  onArchiveToggle,
  onDelete,
}: {
  month: MonthEntry
  onArchiveToggle: () => void
  onDelete: () => void
}) {
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
    <div className="month-card-menu" ref={ref}>
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
        <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
          <button
            className="menu-item"
            onClick={() => {
              setOpen(false)
              onArchiveToggle()
            }}
          >
            {month.status === 'active' ? t('months.menu.archive') : t('months.menu.unarchive')}
          </button>
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
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentYear = new Date().getFullYear()
  const [activeYear, setActiveYear] = useState(currentYear)
  const [showNew, setShowNew] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MonthEntry | null>(null)

  const monthsQuery = useQuery({ queryKey: ['months'], queryFn: listMonths })
  const months = useMemo(() => monthsQuery.data ?? [], [monthsQuery.data])

  const createMutation = useMutation({
    mutationFn: (monthKey: string) => createMonth(monthKey, user?.email ?? ''),
    onSuccess: (entry) => {
      void queryClient.invalidateQueries({ queryKey: ['months'] })
      setShowNew(false)
      navigate(`/calendar/${entry.month_key}`)
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ monthKey, status }: { monthKey: string; status: MonthEntry['status'] }) =>
      setMonthStatus(monthKey, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['months'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (monthKey: string) => deleteMonth(monthKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['months'] })
      setDeleteTarget(null)
    },
  })

  const years = useMemo(() => {
    const set = new Set<number>([currentYear])
    for (const m of months) set.add(Number(m.month_key.slice(0, 4)))
    return [...set].sort((a, b) => b - a)
  }, [months, currentYear])

  const forYear = months.filter((m) => m.month_key.startsWith(String(activeYear)))
  const firstName = (user?.name ?? '').split(' ')[0]

  return (
    <div className="shell">
      <AppHeader />

      <div className="hero">
        <AnimatedBackground density={0.00006} />
        <div className="container hero-inner">
          <h1>{t('welcome.greeting', { name: firstName })}</h1>
          <p>{t('welcome.subtitle')}</p>
          <div className="hero-stats">
            <span className="hero-stat">
              <span className="hero-stat-value">{months.length}</span>
              <span className="hero-stat-label">{t('welcome.statMonths')}</span>
            </span>
            <span className="hero-stat">
              <span className="hero-stat-value">{months.filter((m) => m.status === 'active').length}</span>
              <span className="hero-stat-label">{t('welcome.statActive')}</span>
            </span>
            <span className="hero-stat">
              <span className="hero-stat-value">{currentYear}</span>
              <span className="hero-stat-label">{t('welcome.statYear')}</span>
            </span>
          </div>
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
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              + {t('months.new')}
            </button>
          </div>

          {monthsQuery.isLoading && <p className="muted">{t('months.loading')}</p>}
          {monthsQuery.isError && (
            <div className="callout callout-danger">
              {t('months.loadError')} {(monthsQuery.error as Error).message}
            </div>
          )}

          <div className="month-grid">
            {forYear.map((m) => (
              <div className={`month-card rise-in ${m.status === 'archived' ? 'is-archived' : ''}`} key={m.month_key}>
                <button className="month-card-btn" onClick={() => navigate(`/calendar/${m.month_key}`)}>
                  <span>
                    <span className="month-card-name">{monthName(m.month_key, locale)}</span>
                    <br />
                    <span className="month-card-year">{m.month_key}</span>
                  </span>
                  <span className={`pill ${m.status === 'archived' ? 'pill-neutral' : ''}`}>
                    {t(`months.status.${m.status}`)}
                  </span>
                </button>
                <MonthMenu
                  month={m}
                  onArchiveToggle={() =>
                    statusMutation.mutate({
                      monthKey: m.month_key,
                      status: m.status === 'active' ? 'archived' : 'active',
                    })
                  }
                  onDelete={() => setDeleteTarget(m)}
                />
              </div>
            ))}

            <button className="month-card-new" onClick={() => setShowNew(true)}>
              <span className="month-card-new-plus">+</span>
              {t('months.new')}
            </button>
          </div>

          {forYear.length === 0 && !monthsQuery.isLoading && !monthsQuery.isError && (
            <p className="muted">{t('months.empty', { year: activeYear })}</p>
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
