import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { MonthSelectorPage } from './pages/MonthSelectorPage'
import { CalendarPage } from './pages/CalendarPage'
import type { MonthIndexEntry } from './types'

export default function App() {
  const { status } = useAuth()
  const [openMonth, setOpenMonth] = useState<MonthIndexEntry | null>(null)

  if (status === 'loading') {
    return (
      <div className="centered-page">
        <p className="muted">Cargando…</p>
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
