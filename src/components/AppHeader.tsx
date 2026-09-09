import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from './Logo'
import { HistoryMenu } from './HistoryMenu'
import { PresenceCell } from './PresenceCell'
import { useI18n } from '../i18n/I18nContext'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { LOCALES } from '../i18n/translations'
import type { PresenceUser } from '../hooks/usePresence'
import type { ChangeRecord } from '../types'

function Icon({ path, size = 17 }: { path: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {path}
    </svg>
  )
}
const sunIcon = (
  <>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2.4M12 19.1v2.4M4.4 4.4l1.7 1.7M17.9 17.9l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.4 19.6l1.7-1.7M17.9 6.1l1.7-1.7" />
  </>
)
const moonIcon = <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z" />
const laptopIcon = (
  <>
    <rect x="3.5" y="4.5" width="17" height="11" rx="1.4" />
    <path d="M2 19h20" />
  </>
)
const historyIcon = (
  <>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v4.5h4.5" />
    <path d="M12 8v4.5l3 2" />
  </>
)
const undoIcon = (
  <>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  </>
)
const redoIcon = (
  <>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H10a6 6 0 0 0 0 12h3" />
  </>
)

interface AppHeaderProps {
  /** Contenido a la izquierda, después del logo (título de página, volver…). */
  start?: ReactNode
  presenceUsers?: PresenceUser[]
  /** Solo mis cambios; si se pasa, aparece el botón de historial. */
  myChanges?: ChangeRecord[]
  onRevert?: (change: ChangeRecord) => Promise<void>
  undoRedo?: { undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean }
}

export function AppHeader({ start, presenceUsers, myChanges, onRevert, undoRedo }: AppHeaderProps) {
  const { locale, setLocale, t } = useI18n()
  const { preference, setPreference } = useTheme()
  const { user, status, signOut } = useAuth()
  const [openMenu, setOpenMenu] = useState<'lang' | 'user' | 'history' | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const themeIcon = preference === 'dark' ? moonIcon : preference === 'light' ? sunIcon : laptopIcon
  const cycleTheme = () => setPreference(preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system')

  return (
    <header className="app-header">
      <div className="header-left">
        <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
          <Logo size={26} glow />
        </Link>
        {start}
      </div>

      <div className="header-right" ref={rootRef}>
        {presenceUsers && <PresenceCell users={presenceUsers} />}

        {undoRedo && (
          <>
            <button
              className="icon-btn icon-btn-chrome"
              onClick={undoRedo.undo}
              disabled={!undoRedo.canUndo}
              title={`${t('header.undo')} (Ctrl+Z)`}
            >
              <Icon path={undoIcon} />
            </button>
            <button
              className="icon-btn icon-btn-chrome"
              onClick={undoRedo.redo}
              disabled={!undoRedo.canRedo}
              title={`${t('header.redo')} (Ctrl+Y)`}
            >
              <Icon path={redoIcon} />
            </button>
          </>
        )}

        {myChanges && onRevert && (
          <div className="menu-anchor">
            <button
              className="icon-btn icon-btn-chrome"
              onClick={() => setOpenMenu(openMenu === 'history' ? null : 'history')}
              title={t('history.title')}
            >
              <Icon path={historyIcon} />
            </button>
            {openMenu === 'history' && <HistoryMenu changes={myChanges} onRevert={onRevert} onClose={() => setOpenMenu(null)} />}
          </div>
        )}

        <span className="header-divider" />

        <div className="menu-anchor">
          <button
            className="icon-btn icon-btn-chrome lang-btn"
            onClick={() => setOpenMenu(openMenu === 'lang' ? null : 'lang')}
            title={t('header.language')}
          >
            {locale.toUpperCase()}
          </button>
          {openMenu === 'lang' && (
            <div className="menu-panel" style={{ minWidth: 110 }}>
              {LOCALES.map((l) => (
                <button
                  key={l.code}
                  className={`menu-item ${l.code === locale ? 'menu-item-active' : ''}`}
                  onClick={() => {
                    setLocale(l.code)
                    setOpenMenu(null)
                  }}
                >
                  {l.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="icon-btn icon-btn-chrome" onClick={cycleTheme} title={t(`header.theme.${preference}`)}>
          <Icon path={themeIcon} />
        </button>

        {status === 'signed-in' && user && (
          <div className="menu-anchor">
            <button
              className="avatar avatar-me"
              onClick={() => setOpenMenu(openMenu === 'user' ? null : 'user')}
              title={user.email}
            >
              {user.initials}
            </button>
            {openMenu === 'user' && (
              <div className="menu-panel">
                <div className="menu-email">{user.email}</div>
                <Link to="/logs" className="menu-item" onClick={() => setOpenMenu(null)}>
                  {t('header.viewLogs')}
                </Link>
                <button
                  className="menu-item menu-item-danger"
                  onClick={() => {
                    setOpenMenu(null)
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
