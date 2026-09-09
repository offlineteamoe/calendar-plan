import { useEffect, useRef, useState } from 'react'
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
  onAdd: (weekStart: string, kind: NotaKind, content: string) => void
  onEdit: (note: NotaRow) => void
  onHistory: (note: NotaRow) => void
  /** Pide confirmación antes de borrar: lo resuelve el panel de notas. */
  onDelete: (note: NotaRow) => void
  onDeleteWeek: (weekStart: string, notes: NotaRow[]) => void
  isSaving: boolean
}

/** Menú de la nota: acciones con nombre, no iconos que haya que adivinar. */
function WeekNoteMenu({
  note,
  total,
  canEditNote,
  canDelete,
  onEdit,
  onHistory,
  onDelete,
  onDeleteWeek,
}: {
  note: NotaRow
  total: number
  canEditNote: boolean
  canDelete: boolean
  onEdit: () => void
  onHistory: () => void
  onDelete: () => void
  onDeleteWeek: () => void
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const run = (fn: () => void) => () => {
    setOpen(false)
    fn()
  }

  return (
    <div className="menu-anchor week-note-menu" ref={ref}>
      <button className="mini-btn" onClick={() => setOpen((v) => !v)} title={t('notes.actions')} aria-label={t('notes.actions')}>
        ⋯
      </button>
      {open && (
        <div className="menu-panel menu-panel-right week-note-menu-panel">
          <button className="menu-item" onClick={run(onHistory)}>
            {t('noteHistory.open')}
          </button>
          {canEditNote && (
            <button className="menu-item" onClick={run(onEdit)}>
              {t('notes.editTitle')}
            </button>
          )}
          {canDelete && (
            <button className="menu-item menu-item-danger" onClick={run(onDelete)}>
              {t('notes.deleteThis')}
            </button>
          )}
          {total > 1 && (
            <button className="menu-item menu-item-danger" onClick={run(onDeleteWeek)}>
              {t('notes.deleteWeekAll', { count: total })}
            </button>
          )}
        </div>
      )}
      <span className="sr-only">{note.note_id}</span>
    </div>
  )
}

/**
 * Notas por semana, alineadas fila a fila con el calendario de la izquierda.
 * Cada semana muestra una nota a la vez, con un paginador que dice en texto
 * en cuál estás ("Nota 2 de 5") y un botón de agregar con etiqueta: en un
 * espacio tan pequeño, un icono suelto no se percibe como acción.
 */
export function WeeklyNotes({
  weeks,
  notes,
  kinds,
  canEditNote,
  canDelete,
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

                <span className="week-note-nav">
                  {forWeek.length > 1 && (
                    <>
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
                    </>
                  )}
                  <WeekNoteMenu
                    note={note}
                    total={forWeek.length}
                    canEditNote={canEditNote(note)}
                    canDelete={canDelete(note)}
                    onEdit={() => onEdit(note)}
                    onHistory={() => onHistory(note)}
                    onDelete={() => onDelete(note)}
                    onDeleteWeek={() => onDeleteWeek(week.weekStart, forWeek)}
                  />
                </span>
              </div>

              <p className="week-note-text">{pickNoteText(note.text, note.content, locale)}</p>

              <div className="week-note-foot">
                <span className="week-note-by">
                  {note.created_by.split('@')[0]} · {formatDateTime(note.created_at, locale)}
                  {note.updated_at && ` · ${t('notes.edited')}`}
                </span>
                <button className="week-add-btn" onClick={() => setComposerWeek(week.weekStart)}>
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
