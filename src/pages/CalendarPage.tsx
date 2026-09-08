import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePresence } from '../hooks/usePresence'
import { useActivityFeed } from '../hooks/useActivityFeed'
import { PresenceBar } from '../components/PresenceBar'
import { ActivityToast } from '../components/ActivityToast'
import { CalendarGrid } from '../components/CalendarGrid'
import { SidePanel } from '../components/SidePanel'
import { BRANDS, COUNTRIES, COUNTRY_LABELS, type Brand, type Country, type MonthEntry } from '../types'

interface Props {
  month: MonthEntry
  onBack: () => void
}

export function CalendarPage({ month, onBack }: Props) {
  const { user } = useAuth()
  const [brand, setBrand] = useState<Brand>(BRANDS[0])
  const [country, setCountry] = useState<Country>(COUNTRIES[0])

  const currentView = `${brand}-${country}`
  const presenceUsers = usePresence(
    month.month_key,
    user ? { uid: user.uid, name: user.name, email: user.email, initials: user.initials } : null,
    currentView,
  )
  const activityEvents = useActivityFeed(month.month_key)

  return (
    <div className="calendar-page">
      <header className="page-header">
        <div>
          <button className="btn-link" onClick={onBack}>
            ← Meses
          </button>
          <h1>{month.month_key}</h1>
        </div>
        <PresenceBar users={presenceUsers} />
      </header>

      <div className="calendar-page-toolbar">
        <div className="selector-group">
          <label>
            Marca
            <select value={brand} onChange={(e) => setBrand(e.target.value as Brand)}>
              {BRANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <label>
            País / región
            <select value={country} onChange={(e) => setCountry(e.target.value as Country)}>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {COUNTRY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="calendar-page-body">
        <CalendarGrid monthKey={month.month_key} brand={brand} country={country} />
        <SidePanel monthKey={month.month_key} brand={brand} country={country} />
      </div>

      <ActivityToast events={activityEvents} myEmail={user?.email ?? ''} />
    </div>
  )
}
