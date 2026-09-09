import { useAuth } from '../context/AuthContext'
import { getAllowedDomain } from '../lib/firebaseClient'
import { missingConfigKeys } from '../config'
import { AnimatedBackground } from '../components/AnimatedBackground'
import { LogoMark } from '../components/Logo'
import { useI18n } from '../i18n/I18nContext'
import { useTheme } from '../context/ThemeContext'
import { LOCALES } from '../i18n/translations'

export function LoginPage() {
  const { status, error, signIn } = useAuth()
  const { t, locale, setLocale } = useI18n()
  const { preference, setPreference } = useTheme()
  const missing = missingConfigKeys()

  return (
    <div className="login-shell">
      <AnimatedBackground />

      <div className="login-header">
        {LOCALES.map((l) => (
          <button
            key={l.code}
            className={`icon-btn icon-btn-chrome lang-btn ${l.code === locale ? 'menu-item-active' : ''}`}
            onClick={() => setLocale(l.code)}
          >
            {l.label}
          </button>
        ))}
        <button
          className="icon-btn icon-btn-chrome"
          onClick={() => setPreference(preference === 'dark' ? 'light' : 'dark')}
          title={t(`header.theme.${preference}`)}
        >
          {preference === 'dark' ? '☾' : '☀'}
        </button>
      </div>

      <div className="login-body">
        <div className="login-card">
          <span className="login-badge">
            <LogoMark size={18} />
            {t('login.badge')}
          </span>
          <h1>{t('app.name')}</h1>
          <p className="login-sub">{t('login.title')}</p>

          {missing.length > 0 ? (
            <div className="callout callout-warn">
              <strong>{t('login.missingConfigTitle')}</strong>
              <div>{t('login.missingConfigBody', { vars: missing.join(', ') })}</div>
            </div>
          ) : (
            <>
              <button className="btn btn-primary" onClick={() => void signIn()} disabled={status === 'loading'}>
                {status === 'loading' ? t('login.connecting') : t('login.continueWithGoogle')}
              </button>
              <p className="login-domain">{t('app.domainOnly', { domain: getAllowedDomain() })}</p>
            </>
          )}

          {error && <p className="error-text">{error}</p>}
        </div>
      </div>
    </div>
  )
}
