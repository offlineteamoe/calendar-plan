import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { MonthSelectorPage } from './pages/MonthSelectorPage'
import { CalendarPage } from './pages/CalendarPage'
import type { MonthEntry } from './types'

export default function App() {
  const { status } = useAuth()
  const [openMonth, setOpenMonth] = useState<MonthEntry | null>(null)

  if (status === 'loading') {
    return (
      <div className="app-shell">
        <div className="centered-page">
          <p className="muted">Cargando…</p>
        </div>
      </div>
    )
  }

  if (status !== 'signed-in') {
    return <LoginPage />
  }

  if (openMonth) {
    return <CalendarPage month={openMonth} onBack={() => setOpenMonth(null)} />
  }

  return <MonthSelectorPage onOpenMonth={setOpenMonth} />
}
