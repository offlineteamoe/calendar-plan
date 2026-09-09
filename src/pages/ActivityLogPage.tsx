import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listAllChanges } from '../lib/changelog'
import { AppHeader } from '../components/AppHeader'
import { useI18n } from '../i18n/I18nContext'
import { useRole } from '../hooks/useRole'
import { describeChange } from '../lib/changeText'
import { formatDateTime, timeAgo } from '../lib/dateUtils'

/** Registro de actividad de todos los usuarios, en todos los meses. */
export function ActivityLogPage() {
  const { t, locale } = useI18n()
  const { canEdit, isLoading: roleLoading } = useRole()
  const navigate = useNavigate()
  const [userFilter, setUserFilter] = useState('all')

  // Todo el registro, no una muestra: el punto de esta pantalla es poder
  // auditar sin huecos.
  const logQuery = useQuery({
    queryKey: ['all-changes'],
    queryFn: () => listAllChanges(1000),
    enabled: canEdit,
  })
  const changes = useMemo(() => logQuery.data ?? [], [logQuery.data])

  const users = useMemo(() => [...new Set(changes.map((c) => c.user_email))].sort(), [changes])
  const shown = userFilter === 'all' ? changes : changes.filter((c) => c.user_email === userFilter)

  // El registro completo es solo para administradores.
  if (!canEdit && !roleLoading) {
    return (
      <div className="shell">
        <AppHeader
          start={
            <>
              <button className="btn-link header-back" onClick={() => navigate('/')}>
                ← {t('header.backToMonths')}
              </button>
            </>
          }
        />
        <div className="centered">
          <div className="card" style={{ padding: 28, textAlign: 'center', maxWidth: 420 }}>
            <h2>{t('logs.deniedTitle')}</h2>
            <p className="muted" style={{ marginTop: 8 }}>
              {t('logs.deniedBody')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="shell">
      <AppHeader
        start={
          <>
            <button className="btn-link header-back" onClick={() => navigate('/')}>
              ← {t('header.backToMonths')}
            </button>
            <span className="header-divider" />
            <span className="header-title">{t('logs.title')}</span>
          </>
        }
      />

      <div className="shell-scroll">
        <div className="container">
          <div className="log-filters">
            <div>
              <h1 style={{ fontSize: 24 }}>{t('logs.title')}</h1>
              <p className="muted small">{t('logs.subtitle')}</p>
            </div>
            <label className="field" style={{ marginLeft: 'auto', minWidth: 220 }}>
              <span>{t('logs.filterUser')}</span>
              <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
                <option value="all">{t('logs.filterAll')}</option>
                {users.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {logQuery.isLoading && <p className="muted">{t('common.loading')}</p>}
          {logQuery.isError && (
            <div className="callout callout-danger">
              {t('logs.loadError', { error: (logQuery.error as Error).message })}
            </div>
          )}

          {!logQuery.isLoading && shown.length === 0 && !logQuery.isError && (
            <p className="menu-empty">{t('logs.empty')}</p>
          )}

          {shown.length > 0 && (
            <div className="card" style={{ overflow: 'hidden', marginBottom: 60 }}>
              <table className="log-table">
                <thead>
                  <tr>
                    <th>{t('logs.colUser')}</th>
                    <th>{t('logs.colAction')}</th>
                    <th>{t('logs.colWhere')}</th>
                    <th>{t('logs.colWhen')}</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((c) => {
                    const { what, where, who, initials } = describeChange(c, t, locale)
                    return (
                      <tr key={c.change_id}>
                        <td>
                          <span className="log-user">
                            <span className="avatar">{initials}</span>
                            {who}
                          </span>
                        </td>
                        <td>
                          {what}
                          {c.reverted && (
                            <span className="pill pill-neutral" style={{ marginLeft: 8 }}>
                              {t('logs.reverted')}
                            </span>
                          )}
                        </td>
                        <td className="muted">{where}</td>
                        <td className="muted small" title={formatDateTime(c.at, locale)}>
                          {timeAgo(c.at, locale)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
