import { useAuth } from '../context/AuthContext'
import { getAllowedDomain } from '../lib/firebaseClient'
import { missingConfigKeys } from '../config'
import { AppHeader } from '../components/AppHeader'
import { Logo } from '../components/Logo'
import { useI18n } from '../i18n/I18nContext'

export function LoginPage() {
  const { status, error, signIn } = useAuth()
  const { t } = useI18n()
  const missing = missingConfigKeys()

  return (
    <div className="app-shell">
      <AppHeader />
      <div className="centered-page">
        <div className="login-card">
          <Logo size={40} withWordmark={false} />
          <h1>Plan de Pauta</h1>
          <p className="muted">{t('app.tagline')}</p>

          {missing.length > 0 ? (
            <div className="callout callout-warning">
              <strong>{t('login.missingConfigTitle')}</strong>
              <p>{t('login.missingConfigBody', { vars: missing.join(', ') })}</p>
            </div>
          ) : (
            <>
              <button className="btn-primary" onClick={() => void signIn()} disabled={status === 'loading'}>
                {status === 'loading' ? t('login.connecting') : t('login.continueWithGoogle')}
              </button>
              <p className="muted small">{t('app.domainOnly', { domain: getAllowedDomain() })}</p>
            </>
          )}

          {error && <p className="error-text">{error}</p>}
        </div>
      </div>
    </div>
  )
}
