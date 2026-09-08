import type { PresenceUser } from '../hooks/usePresence'

function timeAgo(ms: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - ms) / 1000))
  if (seconds < 10) return 'ahora'
  if (seconds < 60) return `hace ${seconds}s`
  return `hace ${Math.round(seconds / 60)}m`
}

export function PresenceBar({ users }: { users: PresenceUser[] }) {
  if (users.length === 0) {
    return <div className="presence-bar muted">Nadie más está viendo este mes ahora mismo.</div>
  }
  return (
    <div className="presence-bar">
      {users.map((u) => (
        <span key={u.uid} className="presence-avatar" title={`${u.name} · ${u.currentView} · ${timeAgo(u.lastSeen)}`}>
          {u.initials}
        </span>
      ))}
    </div>
  )
}
