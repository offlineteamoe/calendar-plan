import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePresence } from '../hooks/usePresence'
import { useActivityFeed } from '../hooks/useActivityFeed'
import { PresenceBar } from '../components/PresenceBar'
import { ActivityToast } from '../components/ActivityToast'
import { CalendarGrid } from '../components/CalendarGrid'
import { SidePanel } from '../components/SidePanel'
import { FiltersPanel } from '../components/FiltersPanel'
import { AppHeader } from '../components/AppHeader'
import { BRANDS, COUNTRIES, type Brand, type Country, type MonthEntry } from '../types'
import { useI18n } from '../i18n/I18nContext'

const CHANNELS = ['TV', 'Digital', 'Radio', 'Otro']

interface Props {
  month: MonthEntry
  onBack: () => void
}

type MobileTab = 'calendar' | 'detail'

export function CalendarPage({ month, onBack }: Props) {
  const { user } = useAuth()
  const { t } = useI18n()
  const [brand, setBrand] = useState<Brand>(BRANDS[0])
  const [country, setCountry] = useState<Country>(COUNTRIES[0])
  const [channel, setChannel] = useState(CHANNELS[0])
  const [mobileTab, setMobileTab] = useState<MobileTab>('calendar')

  const currentView = `${brand}-${country}`
  const presenceUsers = usePresence(
    month.month_key,
    user ? { uid: user.uid, name: user.name, email: user.email, initials: user.initials } : null,
    currentView,
  )
  const activityEvents = useActivityFeed(month.month_key)

  return (
    <div className="app-shell">
      <AppHeader
        start={
          <div className="calendar-header-start">
            <button className="btn-link" onClick={onBack}>
              ← {t('calendar.back')}
            </button>
            <h1 className="page-title">{month.month_key}</h1>
          </div>
        }
        extra={<PresenceBar users={presenceUsers} />}
      />

      <div className="mobile-tabs">
        <button className={mobileTab === 'calendar' ? 'mobile-tab-active' : ''} onClick={() => setMobileTab('calendar')}>
          {t('mobile.calendarTab')}
        </button>
        <button className={mobileTab === 'detail' ? 'mobile-tab-active' : ''} onClick={() => setMobileTab('detail')}>
          {t('mobile.detailTab')}
        </button>
      </div>

      <div className="calendar-layout">
        <FiltersPanel
          brand={brand}
          country={country}
          channel={channel}
          onBrandChange={setBrand}
          onCountryChange={setCountry}
          onChannelChange={setChannel}
        />

        <div className={`cal-slot ${mobileTab === 'calendar' ? '' : 'mobile-hidden'}`}>
          <CalendarGrid monthKey={month.month_key} brand={brand} country={country} channel={channel} />
        </div>

        <div className={`detail-slot ${mobileTab === 'detail' ? '' : 'mobile-hidden'}`}>
          <SidePanel monthKey={month.month_key} brand={brand} country={country} />
        </div>
      </div>

      <ActivityToast events={activityEvents} myEmail={user?.email ?? ''} />
    </div>
  )
}
