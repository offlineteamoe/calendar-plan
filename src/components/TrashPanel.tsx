import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { listTrashedMonths, purgeExpiredTrash, restoreMonth } from '../lib/store'
import { formatDateTime } from '../lib/dateUtils'
import { TRASH_RETENTION_DAYS, type MonthEntry } from '../types'

function monthName(monthKey: string, locale: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  if (!year || !month) return monthKey
  const label = new Date(year, month - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function daysLeft(deletedAt: string | undefined): number {
  if (!deletedAt) return TRASH_RETENTION_DAYS
  const elapsed = (Date.now() - new Date(deletedAt).getTime()) / 86_400_000
  return Math.max(0, Math.ceil(TRASH_RETENTION_DAYS - elapsed))
}

/**
 * Papelera de meses eliminados, solo para administradores.
 *
 * Un mes eliminado no se borra: se marca y se esconde de la lista. Restaurarlo
 * lo devuelve con todo su contenido intacto, porque nunca se movió de sitio.
 *
 * Dos meses con la misma clave pueden convivir aquí —se borró septiembre, se
 * creó otro, se borró también— por eso cada uno muestra cuándo se creó, cuál
 * fue su última actividad y quién lo eliminó.
 */
export function TrashPanel() {
  const { t, locale } = useI18n()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const trashQuery = useQuery({
    queryKey: ['trashed-months'],
    queryFn: listTrashedMonths,
    staleTime: 60_000,
  })

  const author = { email: user?.email ?? '', initials: user?.initials ?? '' }

  const restoreMutation = useMutation({
    mutationFn: (month: MonthEntry) => restoreMonth(month, author),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['months'] })
      void queryClient.invalidateQueries({ queryKey: ['versions-by-month'] })
      void queryClient.invalidateQueries({ queryKey: ['trashed-months'] })
    },
  })

  const items = trashQuery.data ?? []

  const toggle = () => {
    setOpen((wasOpen) => {
      // La purga por antigüedad se hace al abrir: no hay servidor que pueda
      // hacerlo en segundo plano, y aquí no cuesta nada si no hay nada
      // caducado.
      if (!wasOpen) {
        void purgeExpiredTrash(author).then((purged) => {
          if (purged > 0) void queryClient.invalidateQueries({ queryKey: ['trashed-months'] })
        })
      }
      return !wasOpen
    })
  }

  return (
    <div className="menu-anchor" ref={ref}>
      <button
        className="icon-btn icon-btn-chrome trash-btn"
        onClick={toggle}
        title={t('trash.title')}
        aria-label={t('trash.title')}
      >
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 7h16M10 4.5h4M9 7v12M15 7v12M6 7l.8 13a1.5 1.5 0 0 0 1.5 1.4h7.4a1.5 1.5 0 0 0 1.5-1.4L18 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {items.length > 0 && <span className="trash-badge">{items.length}</span>}
      </button>

      {open && (
        <div className="menu-panel trash-panel">
          <div className="menu-head">
            <h3>{t('trash.title')}</h3>
            <span className="muted small">{t('trash.retention', { days: TRASH_RETENTION_DAYS })}</span>
          </div>

          <div className="trash-scroll">
            {trashQuery.isLoading && <p className="menu-empty">{t('common.loading')}</p>}
            {!trashQuery.isLoading && items.length === 0 && <p className="menu-empty">{t('trash.empty')}</p>}

            {items.map((month) => (
              <div className="trash-item" key={month.month_id}>
                <div className="trash-item-body">
                  <span className="trash-item-name">{monthName(month.month_key, locale)}</span>
                  <span className="trash-item-meta">
                    {t('trash.createdAt')} {month.created_at ? formatDateTime(month.created_at, locale) : '—'}
                  </span>
                  <span className="trash-item-meta">
                    {t('trash.lastActivity')}{' '}
                    {month.last_activity_at ? formatDateTime(month.last_activity_at, locale) : '—'}
                  </span>
                  <span className="trash-item-meta">
                    {t('trash.deletedBy', {
                      who: month.deleted_by ? month.deleted_by.split('@')[0] : '—',
                      when: month.deleted_at ? formatDateTime(month.deleted_at, locale) : '—',
                    })}
                  </span>
                  <span className="trash-item-left">{t('trash.daysLeft', { days: daysLeft(month.deleted_at) })}</span>
                </div>
                <button
                  className="btn btn-secondary trash-restore"
                  disabled={restoreMutation.isPending}
                  onClick={() => restoreMutation.mutate(month)}
                >
                  {t('trash.restore')}
                </button>
              </div>
            ))}

            {restoreMutation.isError && (
              <p className="error-text" style={{ padding: '0 12px 10px' }}>
                {(restoreMutation.error as Error).message}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
