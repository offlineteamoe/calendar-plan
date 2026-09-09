import { useState } from 'react'
import { WeekGrid } from '../calendar/WeekGrid'
import { WeekNoteComposer } from './WeekNoteComposer'
import { useI18n } from '../../i18n/I18nContext'
import { formatDateTime, type CalendarWeek } from '../../lib/dateUtils'
import { pickNoteText } from '../../lib/translate'
import type { NotaKind, NotaRow } from '../../types'

interface Props {
  weeks: CalendarWeek[]
  notes: NotaRow[]
  /** Categorías que esta persona puede crear (depende de su rol). */
  kinds: NotaKind[]
  canEditNote: (note: NotaRow) => boolean
  canDelete: (note: NotaRow) => boolean
  canSeeHistory: (note: NotaRow) => boolean
  kindsFor: (note: NotaRow) => NotaKind[]
  onAdd: (weekStart: string, kind: NotaKind, content: string) => void
  onUpdate: (note: NotaRow, kind: NotaKind, content: string) => void
  onHistory: (note: NotaRow) => void
  /** Pide confirmación antes de borrar: lo resuelve el panel de notas. */
  onDelete: (note: NotaRow) => void
  onDeleteWeek: (weekStart: string, notes: NotaRow[]) => void
  isSaving: boolean
}

/** Qué se está escribiendo y en qué semana; `note` presente = se está editando. */
type Composing = { weekStart: string; note: NotaRow | null }

/**
 * Notas por semana, alineadas fila a fila con el calendario de la izquierda.
 *
 * Cada semana muestra una nota a la vez, con un paginador que dice en texto en
 * cuál estás ("Nota 2 de 5"), y todas las acciones a la vista con su nombre.
 * Escribir y editar ocurre **dentro de la fila de esa semana**: son notas sobre
 * lo que está pasando esa semana, y un modal centrado taparía justo el trozo de
 * calendario que hay que mirar para escribirlas.
 */
export function WeeklyNotes({
  weeks,
  notes,
  kinds,
  canEditNote,
  canDelete,
  canSeeHistory,
  kindsFor,
  onAdd,
  onUpdate,
  onHistory,
  onDelete,
  onDeleteWeek,
  isSaving,
}: Props) {
  const { t, locale } = useI18n()
  const [cursor, setCursor] = useState<Record<string, number>>({})
  const [composing, setComposing] = useState<Composing | null>(null)

  const move = (weekStart: string, delta: number, total: number) => {
    setCursor((prev) => {
      const next = (prev[weekStart] ?? 0) + delta
      return { ...prev, [weekStart]: Math.max(0, Math.min(total - 1, next)) }
    })
  }

  return (
    <WeekGrid
      weeks={weeks}
      headerLabel={<span className="week-col-title">{t('notes.weekly')}</span>}
      renderWeek={(week: CalendarWeek) => {
        const forWeek = notes.filter((n) => n.week_start === week.weekStart)
        const index = Math.min(cursor[week.weekStart] ?? 0, Math.max(0, forWeek.length - 1))
        const note = forWeek[index]

        if (composing?.weekStart === week.weekStart) {
          const editing = composing.note
          return (
            <WeekNoteComposer
              kinds={editing ? kindsFor(editing) : kinds}
              initialKind={editing?.kind ?? kinds[0]}
              initialContent={editing?.content ?? ''}
              isSaving={isSaving}
              onCancel={() => setComposing(null)}
              onSubmit={(k, content) => {
                if (editing) onUpdate(editing, k, content)
                else onAdd(week.weekStart, k, content)
                setComposing(null)
              }}
            />
          )
        }

        if (forWeek.length === 0) {
          return (
            <button className="week-empty" onClick={() => setComposing({ weekStart: week.weekStart, note: null })}>
              <span className="week-empty-plus">+</span>
              {t('notes.addForWeek')}
            </button>
          )
        }

        return (
          <div className={`week-note nc-${note.kind}`}>
            <div className="week-note-top">
              <span className="week-note-kind">
                <span className="note-tab-dot" style={{ background: 'var(--nc)' }} />
                {t(`notes.kind.${note.kind}`)}
              </span>

              {forWeek.length > 1 && (
                <span className="week-note-nav">
                  <button
                    className="mini-btn"
                    disabled={index === 0}
                    onClick={() => move(week.weekStart, -1, forWeek.length)}
                    title={t('notes.prev')}
                    aria-label={t('notes.prev')}
                  >
                    ‹
                  </button>
                  <span className="week-note-count">
                    {t('notes.counter', { index: index + 1, total: forWeek.length })}
                  </span>
                  <button
                    className="mini-btn"
                    disabled={index >= forWeek.length - 1}
                    onClick={() => move(week.weekStart, 1, forWeek.length)}
                    title={t('notes.next')}
                    aria-label={t('notes.next')}
                  >
                    ›
                  </button>
                </span>
              )}
            </div>

            <p className="week-note-text">{pickNoteText(note.text, note.content, locale)}</p>

            <div className="week-note-by">
              {note.created_by.split('@')[0]} · {formatDateTime(note.created_at, locale)}
              {note.updated_at && ` · ${t('notes.edited')}`}
            </div>

            <div className="week-note-actions">
              {canSeeHistory(note) && (
                <button className="note-act" onClick={() => onHistory(note)}>
                  {t('noteHistory.open')}
                </button>
              )}
              {canEditNote(note) && (
                <button className="note-act" onClick={() => setComposing({ weekStart: week.weekStart, note })}>
                  {t('notes.edit')}
                </button>
              )}
              {canDelete(note) && (
                <button className="note-act note-act-danger" onClick={() => onDelete(note)}>
                  {t('common.delete')}
                </button>
              )}
              {forWeek.length > 1 && (
                <button
                  className="note-act note-act-danger"
                  onClick={() => onDeleteWeek(week.weekStart, forWeek)}
                  title={t('notes.deleteWeekAll', { count: forWeek.length })}
                >
                  {t('notes.deleteAllShort', { count: forWeek.length })}
                </button>
              )}
              <button
                className="note-act note-act-add"
                onClick={() => setComposing({ weekStart: week.weekStart, note: null })}
              >
                + {t('notes.addForWeek')}
              </button>
            </div>
          </div>
        )
      }}
    />
  )
}
