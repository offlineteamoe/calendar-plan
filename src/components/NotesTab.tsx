import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addNota, getNotas } from '../lib/store'
import { logActivity } from '../hooks/useActivityFeed'
import type { NotaCategory, NotaRow } from '../types'
import { useAuth } from '../context/AuthContext'

const CATEGORY_LABELS: Record<NotaCategory, string> = {
  promo: 'Promoción',
  channel_toggle: 'Canal on/off',
  rationale: 'Razón / contexto',
  general: 'General',
}

interface Props {
  monthKey: string
}

export function NotesTab({ monthKey }: Props) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [weekStart, setWeekStart] = useState('')
  const [category, setCategory] = useState<NotaCategory>('general')
  const [content, setContent] = useState('')

  const notasQuery = useQuery({ queryKey: ['notas', monthKey], queryFn: () => getNotas(monthKey) })

  const addMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString()
      const row: NotaRow = {
        note_id: crypto.randomUUID(),
        scope: 'week',
        week_start: weekStart,
        day: '',
        brand: '',
        country: '',
        category,
        content,
        created_by: user?.email ?? '',
        created_at: now,
        updated_at: now,
      }
      await addNota(monthKey, row)
      await logActivity(monthKey, { type: 'note', sheetTab: 'Nota', range: row.week_start, userEmail: user?.email ?? '', userInitials: user?.initials ?? '' })
    },
    onSuccess: () => {
      setContent('')
      void queryClient.invalidateQueries({ queryKey: ['notas', monthKey] })
    },
  })

  const notas = [...(notasQuery.data ?? [])].sort((a, b) => (a.week_start < b.week_start ? 1 : -1))

  return (
    <div className="tab-content">
      <h3>Notas</h3>
      {notasQuery.isLoading && <p className="muted">Cargando…</p>}
      <ul className="notes-list">
        {notas.map((n) => (
          <li key={n.note_id} className="note-card">
            <div className="note-meta">
              <span className={`category-pill category-${n.category}`}>{CATEGORY_LABELS[n.category] ?? n.category}</span>
              <span className="muted">semana {n.week_start}</span>
            </div>
            <p>{n.content}</p>
            <span className="muted small">{n.created_by}</span>
          </li>
        ))}
        {notas.length === 0 && !notasQuery.isLoading && <p className="muted">Todavía no hay notas este mes.</p>}
      </ul>

      <form
        className="stacked-form"
        onSubmit={(e) => {
          e.preventDefault()
          addMutation.mutate()
        }}
      >
        <div className="form-row">
          <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} required title="Semana" />
          <select value={category} onChange={(e) => setCategory(e.target.value as NotaCategory)}>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <textarea
          placeholder="Ej. 70% Off Sep 21-25 (TV+DG)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={2}
        />
        <button className="btn-secondary" type="submit" disabled={addMutation.isPending}>
          {addMutation.isPending ? 'Guardando…' : 'Agregar nota'}
        </button>
      </form>
    </div>
  )
}
