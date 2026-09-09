import { useState } from 'react'
import { WeekGrid } from '../calendar/WeekGrid'
import { NoteEditorModal } from './NoteEditorModal'
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
  onAdd: (weekStart: string, kind: NotaKind, content: string) => void
  onEdit: (note: NotaRow) => void
  onHistory: (note: NotaRow) => void
  /** Pide confirmación antes de borrar: lo resuelve el panel de notas. */
  onDelete: (note: NotaRow) => void
  onDeleteWeek: (weekStart: string, notes: NotaRow[]) => void
  isSaving: boolean
}

/**
 * Notas por semana, alineadas fila a fila con el calendario de la izquierda.
 *
 * Cada semana muestra una nota a la vez, con un paginador que dice en texto
 * en cuál estás ("Nota 2 de 5"), y todas las acciones a la vista con su
 * nombre: esconderlas en un menú de tres puntos obligaba a adivinar que
 * existían.
 */
export function WeeklyNotes({
  weeks,
  notes,
  kinds,
  canEditNote,
  canDelete,
  canSeeHistory,
  onAdd,
  onEdit,
  onHistory,
  onDelete,
  onDeleteWeek,
  isSaving,
}: Props) {
  const { t, locale } = useI18n()
  const [cursor, setCursor] = useState<Record<string, number>>({})
  const [composerWeek, setComposerWeek] = useState<string | null>(null)

  const move = (weekStart: string, delta: number, total: number) => {
    setCursor((prev) => {
      const next = (prev[weekStart] ?? 0) + delta
      return { ...prev, [weekStart]: Math.max(0, Math.min(total - 1, next)) }
    })
  }

  return (
    <>
      <WeekGrid
        weeks={weeks}
        headerLabel={<span className="week-col-title">{t('notes.weekly')}</span>}
        renderWeek={(week: CalendarWeek) => {
          const forWeek = notes.filter((n) => n.week_start === week.weekStart)
          const index = Math.min(cursor[week.weekStart] ?? 0, Math.max(0, forWeek.length - 1))
          const note = forWeek[index]

          if (forWeek.length === 0) {
            return (
              <button className="week-empty" onClick={() => setComposerWeek(week.weekStart)}>
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
                  <button className="note-act" onClick={() => onEdit(note)}>
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
                <button className="note-act note-act-add" onClick={() => setComposerWeek(week.weekStart)}>
                  + {t('notes.addForWeek')}
                </button>
              </div>
            </div>
          )
        }}
      />

      {composerWeek && (
        <NoteEditorModal
          title={t('notes.addForWeekTitle', { week: composerWeek })}
          kinds={kinds}
          initialKind={kinds[0]}
          initialContent=""
          submitLabel={t('notes.add')}
          isSaving={isSaving}
          onSubmit={(kind, content) => {
            onAdd(composerWeek, kind, content)
            setComposerWeek(null)
          }}
          onClose={() => setComposerWeek(null)}
        />
      )}
    </>
  )
}
