import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { usePresence } from '../hooks/usePresence'
import { useChanges } from '../hooks/useChanges'
import { useUndoRedo } from '../hooks/useUndoRedo'
import { AppHeader } from '../components/AppHeader'
import { ChangeToasts } from '../components/ChangeToasts'
import { CalendarGrid } from '../features/calendar/CalendarGrid'
import { FiltersPanel } from '../features/calendar/FiltersPanel'
import { SidePanel } from '../features/calendar/SidePanel'
import { applyChangeState } from '../lib/changelog'
import { getMonth } from '../lib/store'
import { BRANDS, CHANNELS, COUNTRIES, COUNTRY_LABELS, type Brand, type ChangeRecord, type Country } from '../types'

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
  const [mobileTab, setMobileTab] = useState<MobileTab>('calendar')
  const [collapsed, setCollapsed] = useState(false)

  const monthQuery = useQuery({ queryKey: ['month', monthKey], queryFn: () => getMonth(monthKey), enabled: !!monthKey })

  const monthLabel = (() => {
    const [y, m] = monthKey.split('-').map(Number)
    if (!y || !m) return monthKey
    const label = new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    return label.charAt(0).toUpperCase() + label.slice(1)
  })()

  // "Dónde está" cada usuario, en texto legible para la tarjeta de presencia.
  const whereLabel = `${monthLabel} · ${brand} · ${COUNTRY_LABELS[country]}`

  const presence = usePresence(
    monthKey,
    user ? { uid: user.uid, name: user.name, email: user.email, initials: user.initials } : null,
    whereLabel,
  ).filter((p) => p.uid !== user?.uid)

  const changes = useChanges(monthKey)
  const myChanges = changes.filter((c) => c.user_email === user?.email)

  const refreshData = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['plan', monthKey] })
    void queryClient.invalidateQueries({ queryKey: ['notas', monthKey] })
    void queryClient.invalidateQueries({ queryKey: ['escenarios', monthKey] })
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

  // Solo es "no encontrado" si la consulta funcionó y el mes no existe;
  // si falló (permisos, red) hay que decirlo, no fingir que no existe.
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
          <CalendarGrid monthKey={monthKey} brand={brand} country={country} channel={channel} />
        </div>

        <div className={`col ${mobileTab === 'detail' ? '' : 'is-mobile-hidden'}`}>
          <SidePanel monthKey={monthKey} brand={brand} country={country} channel={channel} />
        </div>
      </div>

      <ChangeToasts changes={changes} myEmail={user?.email ?? ''} />
    </div>
  )
}
