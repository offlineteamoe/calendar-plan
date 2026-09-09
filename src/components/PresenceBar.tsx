import type { PresenceUser } from '../hooks/usePresence'

function timeAgo(ms: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - ms) / 1000))
  if (seconds < 10) return 'ahora'
  if (seconds < 60) return `hace ${seconds}s`
  return `hace ${Math.round(seconds / 60)}m`
}

/** Avatares de quién más tiene este mes abierto ahora — vacío si nadie más. */
export function PresenceBar({ users }: { users: PresenceUser[] }) {
  if (users.length === 0) return null
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
