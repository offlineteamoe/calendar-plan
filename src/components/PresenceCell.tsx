import { useState } from 'react'
import type { PresenceUser } from '../hooks/usePresence'
import { useI18n } from '../i18n/I18nContext'
import { timeAgo } from '../lib/dateUtils'

/**
 * Celda de usuarios conectados. Al pasar el mouse sobre un avatar aparece una
 * tarjeta propia (no el tooltip nativo del navegador) con nombre completo,
 * correo en tono sutil y en qué parte de la app está esa persona ahora.
 */
export function PresenceCell({ users }: { users: PresenceUser[] }) {
  const { t, locale } = useI18n()
  const [hovered, setHovered] = useState<string | null>(null)

  if (users.length === 0) return null

  return (
    <div className="presence-cell">
      <span className="presence-avatars">
        {users.slice(0, 6).map((u) => (
          <span
            key={u.uid}
            className="presence-avatar-wrap"
            onMouseEnter={() => setHovered(u.uid)}
            onMouseLeave={() => setHovered((cur) => (cur === u.uid ? null : cur))}
          >
            <span className="avatar">{u.initials}</span>
            {hovered === u.uid && (
              <span className="user-card">
                <span className="user-card-top">
                  <span className="avatar">{u.initials}</span>
                  <span className="user-card-id">
                    <span className="user-card-name">{u.name}</span>
                    <span className="user-card-email">{u.email}</span>
                  </span>
                </span>
                <span className="user-card-row">
                  <span className="user-card-key">{t('presence.location')}</span>
                  <span className="user-card-value">{u.currentView || '—'}</span>
                </span>
                <span className="user-card-row">
                  <span className="user-card-key">{t('presence.lastSeen')}</span>
                  <span className="user-card-value">{timeAgo(new Date(u.lastSeen).toISOString(), locale)}</span>
                </span>
                <span className="user-card-live">
                  <span className="live-dot" />
                  {t('presence.online')}
                </span>
              </span>
            )}
          </span>
        ))}
      </span>
      <span className="presence-cell-label">
        {t('header.connectedUsers')}: {users.length}
      </span>
    </div>
  )
}
