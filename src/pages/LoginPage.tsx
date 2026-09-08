import { useAuth } from '../context/AuthContext'
import { getAllowedDomain } from '../lib/firebaseClient'
import { missingConfigKeys } from '../config'

export function LoginPage() {
  const { status, error, signIn } = useAuth()
  const missing = missingConfigKeys()

  return (
    <div className="centered-page">
      <div className="login-card">
        <h1>Plan de Pauta</h1>
        <p className="muted">Calendario de planificación de medios offline — Open English</p>

        {missing.length > 0 ? (
          <div className="callout callout-warning">
            <strong>Falta configuración.</strong>
            <p>
              No están definidas estas variables de entorno: <code>{missing.join(', ')}</code>. Copia{' '}
              <code>.env.example</code> a <code>.env.local</code> y completa los valores (ver README).
            </p>
          </div>
        ) : (
          <>
            <button className="btn-primary" onClick={() => void signIn()} disabled={status === 'loading'}>
              {status === 'loading' ? 'Conectando…' : 'Continuar con Google'}
            </button>
            <p className="muted small">Solo cuentas @{getAllowedDomain()}</p>
          </>
        )}

        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  )
}
