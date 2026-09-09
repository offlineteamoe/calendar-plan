import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { describeChange } from '../lib/changeText'
import { timeAgo, formatDateTime } from '../lib/dateUtils'
import { useI18n } from '../i18n/I18nContext'
import { useRole } from '../hooks/useRole'
import type { ChangeRecord } from '../types'

const SEEN_KEY = 'activity-seen-at'

function readSeen(): string {
  try {
    return localStorage.getItem(SEEN_KEY) ?? new Date().toISOString()
  } catch {
    return new Date().toISOString()
  }
}

/**
 * Campanita de actividad: acumula lo que hace el equipo y lo muestra en un
 * panel desplegable con scroll. Reemplaza a los avisos flotantes, que
 * obligaban a leer rápido y se perdían si no estabas mirando.
 *
 * Lo no leído se cuenta contra la última vez que se abrió el panel, guardada
 * en el navegador, para que recargar la página no vuelva a marcar como nuevo
 * lo que ya viste.
 */
export function NotificationBell({ changes, myEmail }: { changes: ChangeRecord[]; myEmail: string }) {
  const { t, locale } = useI18n()
  const { canEdit } = useRole()
  const [open, setOpen] = useState(false)
  const [seenAt, setSeenAt] = useState<string>(readSeen)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Lo propio nunca cuenta como novedad: ya sabes lo que acabas de hacer.
  const unread = useMemo(
    () => changes.filter((c) => c.user_email !== myEmail && c.at > seenAt).length,
    [changes, myEmail, seenAt],
  )

  const markSeen = () => {
    const now = new Date().toISOString()
    setSeenAt(now)
    try {
      localStorage.setItem(SEEN_KEY, now)
    } catch {
      // Modo incógnito o almacenamiento bloqueado: se pierde la marca al
      // recargar, pero la campanita sigue funcionando.
    }
  }

  const toggle = () => {
    setOpen((wasOpen) => {
      if (!wasOpen) markSeen()
      return !wasOpen
    })
  }

  return (
    <div className="menu-anchor" ref={ref}>
      <button
        className={`icon-btn icon-btn-chrome bell-btn ${unread > 0 ? 'has-unread' : ''}`}
        onClick={toggle}
        title={t('activity.title')}
        aria-label={t('activity.title')}
      >
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unread > 0 && <span className="bell-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <div className="menu-panel activity-panel">
          <div className="menu-head">
            <h3>{t('activity.title')}</h3>
            {canEdit && (
              <Link className="btn-link" to="/logs" onClick={() => setOpen(false)}>
                {t('activity.seeAll')}
              </Link>
            )}
          </div>

          <div className="activity-scroll">
            {changes.length === 0 && <p className="menu-empty">{t('activity.empty')}</p>}
            {changes.map((change) => {
              const { what, where, who, initials } = describeChange(change, t, locale)
              const mine = change.user_email === myEmail
              return (
                <div className={`activity-item ${mine ? 'is-mine' : ''}`} key={change.change_id}>
                  <span className="avatar activity-avatar">{initials}</span>
                  <div className="activity-body">
                    <div className="activity-top">
                      <span className="activity-who">{mine ? t('activity.you') : who}</span>
                      <span className="activity-when" title={formatDateTime(change.at, locale)}>
                        {timeAgo(change.at, locale)}
                      </span>
                    </div>
                    <p className="activity-what">{what}</p>
                    {where && <p className="activity-where">{where}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
