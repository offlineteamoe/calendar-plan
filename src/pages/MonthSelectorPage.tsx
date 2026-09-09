import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createMonth, deleteMonth, listMonths, setMonthStatus } from '../lib/store'
import { useAuth } from '../context/AuthContext'
import type { MonthEntry } from '../types'
import { AppHeader } from '../components/AppHeader'
import { useI18n } from '../i18n/I18nContext'

function formatMonthLabel(monthKey: string, locale: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  const label = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
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
        <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
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
  const [newMonthKey, setNewMonthKey] = useState(() => new Date().toISOString().slice(0, 7))
  const [showNewMonthForm, setShowNewMonthForm] = useState(false)

  const monthsQuery = useQuery({ queryKey: ['months'], queryFn: listMonths })

  const createMonthMutation = useMutation({
    mutationFn: (monthKey: string) => createMonth(monthKey, user?.email ?? 'desconocido'),
    onSuccess: (entry) => {
      void queryClient.invalidateQueries({ queryKey: ['months'] })
      setShowNewMonthForm(false)
      onOpenMonth(entry)
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ monthKey, status }: { monthKey: string; status: MonthEntry['status'] }) => setMonthStatus(monthKey, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['months'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (monthKey: string) => deleteMonth(monthKey),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['months'] }),
  })

  return (
    <div className="app-shell">
      <AppHeader start={<h1 className="page-title">{t('months.title')}</h1>} />
      <div className="page">
        {monthsQuery.isLoading && <p>{t('months.loading')}</p>}
        {monthsQuery.isError && <p className="error-text">{t('months.loadError')}</p>}

        <ul className="month-list">
          {monthsQuery.data?.map((m) => (
            <li key={m.month_key}>
              <div className="month-card">
                <button className="month-card-main" onClick={() => onOpenMonth(m)}>
                  <span className="month-card-title">{formatMonthLabel(m.month_key, locale)}</span>
                  <span className={`status-pill status-${m.status}`}>{t(`months.status.${m.status}`)}</span>
                </button>
                <MonthCardMenu
                  month={m}
                  onArchiveToggle={() =>
                    statusMutation.mutate({ monthKey: m.month_key, status: m.status === 'active' ? 'archived' : 'active' })
                  }
                  onDelete={() => {
                    if (window.confirm(t('months.confirmDelete'))) deleteMutation.mutate(m.month_key)
                  }}
                />
              </div>
            </li>
          ))}
          {monthsQuery.data?.length === 0 && <p className="muted">{t('months.empty')}</p>}
        </ul>

        {showNewMonthForm ? (
          <div className="new-month-form">
            <label>
              {t('months.newLabel')}
              <input type="month" value={newMonthKey} onChange={(e) => setNewMonthKey(e.target.value)} />
            </label>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setShowNewMonthForm(false)}>
                {t('months.cancel')}
              </button>
              <button className="btn-primary" disabled={createMonthMutation.isPending} onClick={() => createMonthMutation.mutate(newMonthKey)}>
                {createMonthMutation.isPending ? t('months.creating') : t('months.create')}
              </button>
            </div>
            {createMonthMutation.isError && <p className="error-text">{(createMonthMutation.error as Error).message}</p>}
          </div>
        ) : (
          <button className="btn-primary" onClick={() => setShowNewMonthForm(true)}>
            {t('months.new')}
          </button>
        )}
      </div>
    </div>
  )
}
