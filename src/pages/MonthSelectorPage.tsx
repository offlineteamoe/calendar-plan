import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createMonth, listMonths } from '../lib/store'
import { useAuth } from '../context/AuthContext'
import type { MonthEntry } from '../types'

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  const label = date.toLocaleDateString('es', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function MonthSelectorPage({ onOpenMonth }: { onOpenMonth: (entry: MonthEntry) => void }) {
  const { user, signOut } = useAuth()
  const queryClient = useQueryClient()
  const [newMonthKey, setNewMonthKey] = useState(() => new Date().toISOString().slice(0, 7))
  const [showNewMonthForm, setShowNewMonthForm] = useState(false)

  const monthsQuery = useQuery({ queryKey: ['months'], queryFn: listMonths })

  const createMonthMutation = useMutation({
    mutationFn: (monthKey: string) => createMonth(monthKey, user?.email ?? 'desconocido'),
    onSuccess: (entry) => {
      void queryClient.invalidateQueries({ queryKey: ['months'] })
      setShowNewMonthForm(false)
      onOpenMonth(entry)
    },
  })

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Planes mensuales</h1>
          <p className="muted">{user?.email}</p>
        </div>
        <button className="btn-link" onClick={() => void signOut()}>
          Cerrar sesión
        </button>
      </header>

      {monthsQuery.isLoading && <p>Cargando meses…</p>}
      {monthsQuery.isError && <p className="error-text">No se pudo leer la lista de meses. Revisa la configuración.</p>}

      <ul className="month-list">
        {monthsQuery.data?.map((m) => (
          <li key={m.month_key}>
            <button className="month-card" onClick={() => onOpenMonth(m)}>
              <span className="month-card-title">{formatMonthLabel(m.month_key)}</span>
              <span className={`status-pill status-${m.status}`}>{m.status}</span>
            </button>
          </li>
        ))}
        {monthsQuery.data?.length === 0 && <p className="muted">Todavía no hay ningún mes creado.</p>}
      </ul>

      {showNewMonthForm ? (
        <div className="new-month-form">
          <label>
            Mes
            <input type="month" value={newMonthKey} onChange={(e) => setNewMonthKey(e.target.value)} />
          </label>
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setShowNewMonthForm(false)}>
              Cancelar
            </button>
            <button
              className="btn-primary"
              disabled={createMonthMutation.isPending}
              onClick={() => createMonthMutation.mutate(newMonthKey)}
            >
              {createMonthMutation.isPending ? 'Creando…' : 'Crear mes'}
            </button>
          </div>
          {createMonthMutation.isError && (
            <p className="error-text">{(createMonthMutation.error as Error).message}</p>
          )}
        </div>
      ) : (
        <button className="btn-primary" onClick={() => setShowNewMonthForm(true)}>
          + Nuevo mes
        </button>
      )}
    </div>
  )
}
