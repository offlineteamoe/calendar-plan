import { useEffect, useRef, useState } from 'react'
import type { ActivityEvent } from '../hooks/useActivityFeed'
import { useI18n } from '../i18n/I18nContext'

const VISIBLE_MS = 5000

interface ToastItem extends ActivityEvent {
  shownAt: number
}

/** Pila de notificaciones flotantes, no invasivas, cuando otra persona guarda un cambio. */
export function ActivityToast({ events, myEmail }: { events: ActivityEvent[]; myEmail: string }) {
  const { t } = useI18n()
  const [queue, setQueue] = useState<ToastItem[]>([])
  const lastSeenId = useRef<string | null>(null)

  useEffect(() => {
    const latest = events[0]
    if (!latest || latest.id === lastSeenId.current) return
    lastSeenId.current = latest.id
    if (latest.userEmail === myEmail) return // no avisarme de mis propios cambios
    setQueue((q) => [...q.slice(-2), { ...latest, shownAt: Date.now() }])
  }, [events, myEmail])

  useEffect(() => {
    if (queue.length === 0) return
    const timer = setTimeout(() => setQueue((q) => q.slice(1)), VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [queue])

  if (queue.length === 0) return null

  return (
    <div className="activity-toast-stack" role="status">
      {queue.map((item) => {
        const who = item.userEmail.split('@')[0]
        const what = t(`toast.area.${item.sheetTab}`, {}) || item.sheetTab
        return (
          <div className="activity-toast" key={item.id}>
            <span className="activity-toast-avatar">{item.userInitials || who.slice(0, 2).toUpperCase()}</span>
            <span>{t('toast.updated', { who, what })}</span>
          </div>
        )
      })}
    </div>
  )
}
