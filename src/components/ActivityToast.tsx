import { useEffect, useRef, useState } from 'react'
import type { ActivityEvent } from '../hooks/useActivityFeed'

const VISIBLE_MS = 5000

const TAB_LABELS: Record<string, string> = {
  Plan: 'el Plan',
  Nota: 'una nota',
  Escenario: 'un escenario',
  Bloqueo: 'un bloqueo',
}

/** Notificación breve cuando otra persona guarda un cambio en este mes. */
export function ActivityToast({ events, myEmail }: { events: ActivityEvent[]; myEmail: string }) {
  const [visible, setVisible] = useState<ActivityEvent | null>(null)
  const lastSeenId = useRef<string | null>(null)

  useEffect(() => {
    const latest = events[0]
    if (!latest || latest.id === lastSeenId.current) return
    lastSeenId.current = latest.id
    if (latest.userEmail === myEmail) return // no avisarme de mis propios cambios
    setVisible(latest)
    const timer = setTimeout(() => setVisible(null), VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [events, myEmail])

  if (!visible) return null

  const who = visible.userEmail.split('@')[0]
  const what = TAB_LABELS[visible.sheetTab] ?? 'algo'

  return (
    <div className="activity-toast" role="status">
      {who} actualizó {what}
    </div>
  )
}
