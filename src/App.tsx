import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { MonthsPage } from './pages/MonthsPage'
import { CalendarPage } from './pages/CalendarPage'
import { ActivityLogPage } from './pages/ActivityLogPage'
import { AnimatedBackground } from './components/AnimatedBackground'

/**
 * Cada pantalla es una URL propia (hash routing, que es lo que soporta
 * GitHub Pages sin reescrituras del servidor):
 *   #/login              → acceso
 *   #/                   → meses
 *   #/calendar/2026-09   → calendario de ese mes
 *   #/logs               → registro de actividad
 */
export default function App() {
  const { status } = useAuth()

  if (status === 'booting') {
    return (
      <div className="login-shell">
        <AnimatedBackground />
        <div className="login-body">
          <p style={{ color: 'rgba(238,243,255,0.7)' }}>…</p>
        </div>
      </div>
    )
  }

  if (status !== 'signed-in') {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/" element={<MonthsPage />} />
      <Route path="/calendar/:monthKey" element={<CalendarPage />} />
      <Route path="/logs" element={<ActivityLogPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
