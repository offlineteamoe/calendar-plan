import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createMonth, deleteMonth, listMonths, setMonthStatus } from '../lib/store'
import { useAuth } from '../context/AuthContext'
import type { MonthEntry } from '../types'
import { AppHeader } from '../components/AppHeader'
import { NewMonthModal } from '../components/NewMonthModal'
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal'
import { useI18n } from '../i18n/I18nContext'

function formatMonthLabel(monthKey: string, locale: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  const label = date.toLocaleDateString(locale, { month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function MonthCardMenu({ month, onArchiveToggle, onDelete }: { month: MonthEntry; onArchiveToggle: () => void; onDelete: () => void }) {
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
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label="menu"
      >
        ⋮
      </button>
      {open && (
        <div className="dropdown-menu month-card-dropdown" onClick={(e) => e.stopPropagation()}>
          <button
            className="dropdown-item"
            onClick={() => {
              setOpen(false)
              onArchiveToggle()
            }}
          >
            {month.status === 'active' ? t('months.menu.archive') : t('months.menu.unarchive')}
          </button>
          <button
            className="dropdown-item dropdown-item-danger"
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

export function MonthSelectorPage({ onOpenMonth }: { onOpenMonth: (entry: MonthEntry) => void }) {
  const { user } = useAuth()
  const { t, locale } = useI18n()
  const queryClient = useQueryClient()
  const [showNewMonthModal, setShowNewMonthModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MonthEntry | null>(null)
  const currentYear = new Date().getFullYear()
  const [activeYear, setActiveYear] = useState(currentYear)

  const monthsQuery = useQuery({ queryKey: ['months'], queryFn: listMonths })

  const createMonthMutation = useMutation({
    mutationFn: (monthKey: string) => createMonth(monthKey, user?.email ?? 'desconocido'),
    onSuccess: (entry) => {
      void queryClient.invalidateQueries({ queryKey: ['months'] })
      setShowNewMonthModal(false)
      onOpenMonth(entry)
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ monthKey, status }: { monthKey: string; status: MonthEntry['status'] }) => setMonthStatus(monthKey, status),
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
    for (const m of monthsQuery.data ?? []) set.add(Number(m.month_key.slice(0, 4)))
    return [...set].sort((a, b) => b - a)
  }, [monthsQuery.data, currentYear])

  const monthsForYear = (monthsQuery.data ?? []).filter((m) => m.month_key.startsWith(String(activeYear)))
  const firstName = (user?.name ?? '').split(' ')[0]

  return (
    <div className="app-shell">
      <AppHeader />

      <div className="hero">
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />
        <div className="hero-blob hero-blob-3" />
        <div className="hero-content">
          <h1>{t('welcome.title', { name: firstName })}</h1>
          <p>{t('welcome.subtitle')}</p>
        </div>
      </div>

      <div className="page">
        <div className="year-tabs">
          {years.map((y) => (
            <button key={y} className={y === activeYear ? 'year-tab-active' : ''} onClick={() => setActiveYear(y)}>
              {y}
            </button>
          ))}
        </div>

        {monthsQuery.isLoading && <p>{t('months.loading')}</p>}
        {monthsQuery.isError && <p className="error-text">{t('months.loadError')}</p>}

        <div className="month-grid">
          {monthsForYear.map((m) => (
            <div className="month-tile" key={m.month_key}>
              <button className="month-tile-main" onClick={() => onOpenMonth(m)}>
                <span className="month-tile-name">{formatMonthLabel(m.month_key, locale)}</span>
                <span className={`status-pill status-${m.status}`}>{t(`months.status.${m.status}`)}</span>
              </button>
              <MonthCardMenu
                month={m}
                onArchiveToggle={() => statusMutation.mutate({ monthKey: m.month_key, status: m.status === 'active' ? 'archived' : 'active' })}
                onDelete={() => setDeleteTarget(m)}
              />
            </div>
          ))}

          <button className="month-tile month-tile-new" onClick={() => setShowNewMonthModal(true)}>
            <span className="month-tile-new-icon">+</span>
            <span>{t('months.new')}</span>
          </button>
        </div>

        {monthsForYear.length === 0 && !monthsQuery.isLoading && !monthsQuery.isError && (
          <p className="muted">{t('months.empty', { year: activeYear })}</p>
        )}
      </div>

      {showNewMonthModal && (
        <NewMonthModal
          onClose={() => setShowNewMonthModal(false)}
          onConfirm={(monthKey) => createMonthMutation.mutate(monthKey)}
          isPending={createMonthMutation.isPending}
          errorMessage={createMonthMutation.isError ? (createMonthMutation.error as Error).message : undefined}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          monthLabel={formatMonthLabel(deleteTarget.month_key, locale)}
          onClose={() => setDeleteTarget(null)}
          onConfirmed={() => deleteMutation.mutate(deleteTarget.month_key)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
