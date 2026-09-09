import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Logo } from './Logo'
import { useI18n } from '../i18n/I18nContext'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { LOCALES } from '../i18n/translations'
import type { PresenceUser } from '../hooks/usePresence'
import type { ActivityEvent } from '../hooks/useActivityFeed'

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.4M12 19.1v2.4M4.4 4.4l1.7 1.7M17.9 17.9l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.4 19.6l1.7-1.7M17.9 6.1l1.7-1.7" strokeLinecap="round" />
    </svg>
  )
}
function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z" strokeLinejoin="round" />
    </svg>
  )
}
function LaptopIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="4.5" width="17" height="11" rx="1.4" />
      <path d="M2 19h20" strokeLinecap="round" />
    </svg>
  )
}
function HistoryIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12a9 9 0 1 0 3-6.7" strokeLinecap="round" />
      <path d="M3 4v4.5h4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8v4.5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function timeAgo(ms: number, locale: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - ms) / 1000))
  if (seconds < 60) return locale === 'en' ? 'just now' : locale === 'pt' ? 'agora' : 'ahora'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.round(minutes / 60)}h`
}

const AREA_LABELS: Record<string, string> = { Plan: 'Plan', Nota: 'Nota', Escenario: 'Escenario', Bloqueo: 'Bloqueo' }

interface AppHeaderProps {
  start?: ReactNode
  presenceUsers?: PresenceUser[]
  historyEvents?: ActivityEvent[]
}

export function AppHeader({ start, presenceUsers, historyEvents }: AppHeaderProps) {
  const { locale, setLocale, t } = useI18n()
  const { preference, setPreference } = useTheme()
  const { user, status, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)
  const historyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) setHistoryOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const ThemeIcon = preference === 'dark' ? MoonIcon : preference === 'light' ? SunIcon : LaptopIcon
  const cycleTheme = () => {
    setPreference(preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system')
  }

  return (
    <header className="app-header">
      <div className="app-header-left">
        <Logo size={26} />
        {start && <div className="app-header-start">{start}</div>}
      </div>

      <div className="app-header-right">
        {presenceUsers && presenceUsers.length > 0 && (
          <div className="connected-users-cell">
            <span className="connected-users-label">{t('header.connectedUsers')}:</span>
            <div className="connected-users-avatars">
              {presenceUsers.map((u) => (
                <span key={u.uid} className="presence-avatar" title={`${u.name} · ${u.currentView}`}>
                  {u.initials}
                </span>
              ))}
            </div>
          </div>
        )}

        {historyEvents && (
          <div className="lang-switch" ref={historyRef}>
            <button className="icon-btn" onClick={() => setHistoryOpen((v) => !v)} title={t('header.history')}>
              <HistoryIcon />
            </button>
            {historyOpen && (
              <div className="dropdown-menu history-menu">
                <div className="history-menu-title">{t('header.history')}</div>
                {historyEvents.length === 0 && <p className="muted small history-empty">{t('header.historyEmpty')}</p>}
                {historyEvents.map((ev) => (
                  <div className="history-item" key={ev.id}>
                    <span className="history-item-avatar">{ev.userInitials || '·'}</span>
                    <div className="history-item-body">
                      <span>
                        {ev.userEmail.split('@')[0]} · {AREA_LABELS[ev.sheetTab] ?? ev.sheetTab}
                      </span>
                      <span className="muted small">{ev.range}</span>
                    </div>
                    <span className="muted small history-item-time">{timeAgo(ev.at, locale)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="lang-switch" ref={langRef}>
          <button className="icon-btn lang-btn" onClick={() => setLangOpen((v) => !v)} title={t('header.language')}>
            {locale.toUpperCase()}
          </button>
          {langOpen && (
            <div className="dropdown-menu lang-menu">
              {LOCALES.map((l) => (
                <button
                  key={l.code}
                  className={`dropdown-item ${l.code === locale ? 'dropdown-item-active' : ''}`}
                  onClick={() => {
                    setLocale(l.code)
                    setLangOpen(false)
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="icon-btn" onClick={cycleTheme} title={t(`header.theme.${preference}`)}>
          <ThemeIcon />
        </button>

        {status === 'signed-in' && user && (
          <div className="user-menu" ref={menuRef}>
            <button className="avatar-btn" onClick={() => setMenuOpen((v) => !v)} title={user.email}>
              {user.initials}
            </button>
            {menuOpen && (
              <div className="dropdown-menu user-dropdown">
                <div className="user-dropdown-email">{user.email}</div>
                <button className="dropdown-item" disabled title={t('common.comingSoon')}>
                  {t('header.viewLogs')}
                </button>
                <button
                  className="dropdown-item dropdown-item-danger"
                  onClick={() => {
                    setMenuOpen(false)
                    void signOut()
                  }}
                >
                  {t('header.logout')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
