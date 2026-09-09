import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Logo } from './Logo'
import { useI18n } from '../i18n/I18nContext'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { LOCALES } from '../i18n/translations'

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

interface AppHeaderProps {
  start?: ReactNode
  extra?: ReactNode
}

export function AppHeader({ start, extra }: AppHeaderProps) {
  const { locale, setLocale, t } = useI18n()
  const { preference, setPreference } = useTheme()
  const { user, status, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
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
        {extra}

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
                <button className="dropdown-item" disabled title={t('common.comingSoon')}>
                  {t('header.history')}
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
