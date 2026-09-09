import { useState } from 'react'
import { WeekGrid } from '../calendar/WeekGrid'
import { Modal } from '../../components/Modal'
import { useI18n } from '../../i18n/I18nContext'
import { formatDateTime, type CalendarWeek } from '../../lib/dateUtils'
import { pickNoteText } from '../../lib/translate'
import type { NotaKind, NotaRow } from '../../types'

interface Props {
  weeks: CalendarWeek[]
  notes: NotaRow[]
  /** Categorías que esta persona puede crear (depende de su rol). */
  kinds: NotaKind[]
  canDelete: (note: NotaRow) => boolean
  onAdd: (weekStart: string, kind: NotaKind, content: string) => void
  onDelete: (note: NotaRow) => void
  isSaving: boolean
}

/**
 * Notas por semana, alineadas fila a fila con el calendario de la izquierda.
 * Cada semana muestra una nota a la vez (la más reciente primero) con flechas
 * para recorrerlas y el contador "2 / 5".
 */
export function WeeklyNotes({ weeks, notes, kinds, canDelete, onAdd, onDelete, isSaving }: Props) {
  const { t, locale } = useI18n()
  const [cursor, setCursor] = useState<Record<string, number>>({})
  const [composerWeek, setComposerWeek] = useState<string | null>(null)
  const [kind, setKind] = useState<NotaKind>(kinds[0])
  const [content, setContent] = useState('')

  const move = (weekStart: string, delta: number, total: number) => {
    setCursor((prev) => {
      const next = (prev[weekStart] ?? 0) + delta
      return { ...prev, [weekStart]: Math.max(0, Math.min(total - 1, next)) }
    })
  }

  const submit = () => {
    if (!composerWeek || !content.trim()) return
    onAdd(composerWeek, kind, content.trim())
    setContent('')
    setComposerWeek(null)
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
                + {t('notes.addForWeek')}
              </button>
            )
          }

          return (
            <div className={`week-note nc-${note.kind}`}>
              <div className="week-note-top">
                <span className="week-note-kind">{t(`notes.kind.${note.kind}`)}</span>
                <span className="week-note-nav">
                  <button
                    className="mini-btn"
                    disabled={index === 0}
                    onClick={() => move(week.weekStart, -1, forWeek.length)}
                    aria-label="prev"
                  >
                    ‹
                  </button>
                  <span className="week-note-count">
                    {index + 1}/{forWeek.length}
                  </span>
                  <button
                    className="mini-btn"
                    disabled={index >= forWeek.length - 1}
                    onClick={() => move(week.weekStart, 1, forWeek.length)}
                    aria-label="next"
                  >
                    ›
                  </button>
                  <button className="mini-btn" onClick={() => setComposerWeek(week.weekStart)} aria-label="add">
                    +
                  </button>
                </span>
              </div>
              <p className="week-note-text">{pickNoteText(note.text, note.content, locale)}</p>
              <div className="week-note-foot">
                <span>
                  {note.created_by.split('@')[0]} · {formatDateTime(note.created_at, locale)}
                </span>
                {canDelete(note) && (
                  <button className="mini-btn" onClick={() => onDelete(note)} aria-label="delete">
                    ✕
                  </button>
                )}
              </div>
            </div>
          )
        }}
      />

      {composerWeek && (
        <Modal title={t('notes.addForWeekTitle', { week: composerWeek })} onClose={() => setComposerWeek(null)} width={420}>
          <div className="note-kind-picker">
            {kinds.map((k) => (
              <button
                type="button"
                key={k}
                className={`note-kind-choice nc-${k} ${kind === k ? 'is-active' : ''}`}
                onClick={() => setKind(k)}
              >
                <span className="note-tab-dot" style={{ background: 'var(--nc)' }} />
                {t(`notes.kind.${k}`)}
              </button>
            ))}
          </div>
          <textarea rows={4} autoFocus placeholder={t('notes.placeholder')} value={content} onChange={(e) => setContent(e.target.value)} />
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setComposerWeek(null)}>
              {t('common.cancel')}
            </button>
            <button className="btn btn-primary" disabled={isSaving || !content.trim()} onClick={submit}>
              {isSaving ? t('common.saving') : t('notes.add')}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
