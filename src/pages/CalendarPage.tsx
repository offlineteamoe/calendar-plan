import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { usePresence } from '../hooks/usePresence'
import { useChanges } from '../hooks/useChanges'
import { useUndoRedo } from '../hooks/useUndoRedo'
import { useVersions } from '../hooks/useVersions'
import { AppHeader } from '../components/AppHeader'
import { CalendarGrid } from '../features/calendar/CalendarGrid'
import { CalendarScopeBar } from '../features/calendar/CalendarScopeBar'
import { FiltersPanel } from '../features/calendar/FiltersPanel'
import { SidePanel } from '../features/calendar/SidePanel'
import { applyChangeState } from '../lib/changelog'
import { createVersionFrom, getMonth, setVersionStatus, type Scope } from '../lib/store'
import { getMonthWeeks } from '../lib/dateUtils'
import {
  BRANDS,
  calendarStatus,
  CHANNELS,
  COUNTRIES,
  COUNTRY_LABELS,
  LATAM_PARTS,
  type Brand,
  type ChangeRecord,
  type Country,
  type VersionEntry,
} from '../types'

type MobileTab = 'calendar' | 'detail'

export function CalendarPage() {
  const { monthKey = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t, locale } = useI18n()
  const queryClient = useQueryClient()

  const [brand, setBrand] = useState<Brand>(BRANDS[0])
  const [country, setCountry] = useState<Country>(COUNTRIES[0])
  const [channel, setChannel] = useState<string>(CHANNELS[0])
  const [versionId, setVersionId] = useState<string | null>(null)
  const [latamView, setLatamView] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>('calendar')
  const [collapsed, setCollapsed] = useState(false)

  const monthQuery = useQuery({ queryKey: ['month', monthKey], queryFn: () => getMonth(monthKey), enabled: !!monthKey })
  // En vivo: si otra persona aprueba o devuelve a maybe un calendario, se ve
  // aquí sin recargar.
  const { versions } = useVersions(monthKey)
  const version: VersionEntry | null = useMemo(() => {
    if (versions.length === 0) return null
    return versions.find((v) => v.version_id === versionId) ?? versions[versions.length - 1]
  }, [versions, versionId])

  // Fuera de las regiones que componen LATAM, la vista agregada no aplica.
  useEffect(() => {
    if (!LATAM_PARTS.includes(country)) setLatamView(false)
  }, [country])

  const weeks = useMemo(() => getMonthWeeks(monthKey), [monthKey])

  const monthLabel = useMemo(() => {
    const [y, m] = monthKey.split('-').map(Number)
    if (!y || !m) return monthKey
    const label = new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }, [monthKey, locale])

  const scope: Scope | null = version ? { versionId: version.version_id, brand, country } : null

  const whereLabel = `${monthLabel} · ${version?.letter ?? '—'} · ${brand} · ${
    latamView ? 'LATAM' : COUNTRY_LABELS[country]
  }`

  const presence = usePresence(
    monthKey,
    user ? { uid: user.uid, name: user.name, email: user.email, initials: user.initials } : null,
    whereLabel,
  ).filter((p) => p.uid !== user?.uid)

  const changes = useChanges(monthKey)
  const lastForeignChange = changes.find((c) => c.user_email !== user?.email)?.change_id ?? null
  const myChanges = useMemo(() => changes.filter((c) => c.user_email === user?.email), [changes, user?.email])

  const refreshData = useCallback(() => {
    for (const key of ['plan', 'notas', 'escenarios', 'results', 'creative']) {
      void queryClient.invalidateQueries({ queryKey: [key, monthKey] })
    }
  }, [queryClient, monthKey])

  const author = useMemo(
    () => ({ email: user?.email ?? '', initials: user?.initials ?? '' }),
    [user?.email, user?.initials],
  )
  const undoRedo = useUndoRedo({ myEmail: user?.email ?? '', author, changes, onApplied: refreshData })

  const revertTo = useCallback(
    async (change: ChangeRecord) => {
      await applyChangeState(change, 'undo', author)
      refreshData()
    },
    [author, refreshData],
  )

  const status = version ? calendarStatus(version, brand, country) : 'maybe'

  useEffect(() => {
    if (!lastForeignChange) return
    refreshData()
  }, [lastForeignChange, refreshData])

  const statusMutation = useMutation({
    mutationFn: () => {
      if (!version || !scope) throw new Error('sin version')
      return setVersionStatus(monthKey, version, scope, status === 'approved' ? 'maybe' : 'approved', author)
    },
  })

  const newVersionMutation = useMutation({
    mutationFn: () => {
      if (!version) throw new Error('sin version')
      return createVersionFrom(monthKey, version, author)
    },
    onSuccess: (created) => {
      setVersionId(created.version_id)
      refreshData()
    },
  })

  if (monthQuery.isSuccess && !monthQuery.data) {
    return (
      <div className="shell">
        <AppHeader />
        <div className="centered">
          <div className="card" style={{ padding: 28, textAlign: 'center' }}>
            <h2>{t('notFound.title')}</h2>
            <Link to="/" className="btn btn-secondary" style={{ marginTop: 14, display: 'inline-flex' }}>
              {t('notFound.back')}
            </Link>
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
            <span className="header-title">{monthLabel}</span>
          </>
        }
        presenceUsers={presence}
        monthKey={monthKey}
        myChanges={myChanges}
        onRevert={revertTo}
        undoRedo={undoRedo}
      />

      <div className="mobile-switch">
        <button className={mobileTab === 'calendar' ? 'is-active' : ''} onClick={() => setMobileTab('calendar')}>
          {t('mobile.calendarTab')}
        </button>
        <button className={mobileTab === 'detail' ? 'is-active' : ''} onClick={() => setMobileTab('detail')}>
          {t('mobile.detailTab')}
        </button>
      </div>

      <div className={`calendar-layout ${collapsed ? 'is-collapsed' : ''}`}>
        <div className="col">
          <FiltersPanel
            brand={brand}
            country={country}
            channel={channel}
            onBrandChange={setBrand}
            onCountryChange={setCountry}
            onChannelChange={setChannel}
            collapsed={collapsed}
            onToggleCollapsed={() => setCollapsed((v) => !v)}
          />
        </div>

        <div className={`col ${mobileTab === 'calendar' ? '' : 'is-mobile-hidden'}`}>
          <div className="panel">
            {version && scope ? (
              <>
                <CalendarScopeBar
                  brand={brand}
                  country={country}
                  versions={versions}
                  version={version}
                  status={status}
                  onSelectVersion={(v) => setVersionId(v.version_id)}
                  onToggleStatus={() => statusMutation.mutate()}
                  onCreateVersion={() => newVersionMutation.mutate()}
                  creatingVersion={newVersionMutation.isPending}
                  latamView={latamView}
                  onToggleLatamView={() => setLatamView((v) => !v)}
                  latamAvailable={LATAM_PARTS.includes(country)}
                />
                <CalendarGrid
                  monthKey={monthKey}
                  scope={scope}
                  version={version}
                  channel={channel}
                  onChannelChange={setChannel}
                  latamView={latamView}
                />
              </>
            ) : (
              <div className="panel-body">
                <p className="muted">{t('common.loading')}</p>
              </div>
            )}
          </div>
        </div>

        <div className={`col ${mobileTab === 'detail' ? '' : 'is-mobile-hidden'}`}>
          {version && scope ? (
            <SidePanel monthKey={monthKey} scope={scope} version={version} weeks={weeks} latamView={latamView} />
          ) : (
            <aside className="panel">
              <div className="panel-body">
                <p className="muted">{t('common.loading')}</p>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
