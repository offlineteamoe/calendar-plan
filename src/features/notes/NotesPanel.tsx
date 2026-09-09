import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addNota, deleteNota, getNotas, notaDocId, setNotaTranslations, updateNota, type Scope } from '../../lib/store'
import { buildNoteText, detectLocale, pickNoteText } from '../../lib/translate'
import { WeeklyNotes } from './WeeklyNotes'
import { NoteEditorModal } from './NoteEditorModal'
import { NoteHistoryModal } from './NoteHistoryModal'
import { ConfirmModal } from '../../components/ConfirmModal'
import { useAuth } from '../../context/AuthContext'
import { useRole } from '../../hooks/useRole'
import { useI18n } from '../../i18n/I18nContext'
import { formatDateTime, type CalendarWeek } from '../../lib/dateUtils'
import {
  COUNTRY_LABELS,
  NOTA_KIND_VIEWER,
  NOTA_KINDS,
  NOTA_KINDS_ADMIN,
  type NotaKind,
  type NotaRow,
  type VersionEntry,
} from '../../types'

interface Props {
  monthKey: string
  scope: Scope
  version: VersionEntry
  weeks: CalendarWeek[]
}

type KindFilter = NotaKind | 'all'
type Mode = 'general' | 'weekly'

/** Una nota escrita por alguien de consulta, sea por rol o por categoría. */
function isViewerNote(note: NotaRow): boolean {
  return (note.created_by_role ?? 'admin') === 'viewer' || note.kind === NOTA_KIND_VIEWER
}

/**
 * Notas del calendario abierto (versión + marca + región). Dos vistas:
 * generales del mes y por semana, esta última alineada con el calendario.
 * La fecha se toma sola al guardar y el texto se traduce en segundo plano.
 *
 * Toda nota se puede editar, y cada edición deja rastro: el botón de
 * historial de cada nota abre el detalle de quién la tocó, cuándo y qué decía
 * antes.
 */
export function NotesPanel({ monthKey, scope, version, weeks }: Props) {
  const { user } = useAuth()
  const { canEdit } = useRole()
  const { t, locale } = useI18n()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<Mode>('general')
  const [filter, setFilter] = useState<KindFilter>('all')
  const [kind, setKind] = useState<NotaKind>(canEdit ? 'pendiente' : NOTA_KIND_VIEWER)
  const [content, setContent] = useState('')
  const [editing, setEditing] = useState<NotaRow | null>(null)
  const [historyOf, setHistoryOf] = useState<NotaRow | null>(null)
  // Nada se borra sin confirmar, y la confirmación dice qué se va a borrar.
  const [confirming, setConfirming] = useState<
    { mode: 'one'; note: NotaRow } | { mode: 'week'; weekStart: string; notes: NotaRow[] } | null
  >(null)

  const author = useMemo(
    () => ({ email: user?.email ?? '', initials: user?.initials ?? '' }),
    [user?.email, user?.initials],
  )

  // Un usuario de consulta solo puede dejar "observaciones a considerar";
  // las ve él y las ven los administradores. Las reglas de Firestore imponen
  // lo mismo del lado del servidor.
  const creatableKinds = canEdit ? NOTA_KINDS_ADMIN : [NOTA_KIND_VIEWER]

  // Una nota de un usuario de consulta solo la edita quien la escribió; las de
  // los administradores las edita cualquier administrador.
  const canEditNote = (note: NotaRow) => (isViewerNote(note) ? note.created_by === user?.email : canEdit)
  const canDelete = (note: NotaRow) => canEdit || note.created_by === user?.email
  const kindsFor = (note: NotaRow) => (isViewerNote(note) ? [NOTA_KIND_VIEWER] : NOTA_KINDS_ADMIN)

  const notesQuery = useQuery({
    queryKey: ['notas', monthKey, scope.versionId],
    queryFn: () => getNotas(monthKey, scope.versionId),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['notas', monthKey, scope.versionId] })
    void queryClient.invalidateQueries({ queryKey: ['changes', monthKey] })
  }

  const translateInBackground = async (row: NotaRow) => {
    const { source, text } = await buildNoteText(row.content)
    if (Object.keys(text).length <= 1) return
    try {
      await setNotaTranslations(monthKey, scope, row.note_id, { ...row, source_lang: source, text })
      void queryClient.invalidateQueries({ queryKey: ['notas', monthKey, scope.versionId] })
    } catch (err) {
      console.warn('No se pudieron guardar las traducciones de la nota:', err)
    }
  }

  const addMutation = useMutation({
    mutationFn: async (input: { kind: NotaKind; content: string; weekStart?: string }) => {
      const sourceLang = detectLocale(input.content)
      const noteKind = canEdit ? input.kind : NOTA_KIND_VIEWER
      const row: NotaRow = {
        note_id: crypto.randomUUID(),
        version_id: scope.versionId,
        brand: scope.brand,
        country: scope.country,
        kind: noteKind,
        scope: input.weekStart ? 'week' : 'general',
        week_start: input.weekStart ?? '',
        content: input.content,
        source_lang: sourceLang,
        text: { [sourceLang]: input.content },
        created_at: new Date().toISOString(),
        created_by: author.email,
        created_by_role: canEdit ? 'admin' : 'viewer',
        week_label: input.weekStart ?? '',
        scope_label: `${version.letter} · ${scope.brand} · ${COUNTRY_LABELS[scope.country]}`,
      }
      await addNota(monthKey, scope, version.letter, row, author)
      return row
    },
    onSuccess: (row) => {
      setContent('')
      invalidate()
      void translateInBackground(row)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (input: { note: NotaRow; kind: NotaKind; content: string }) => {
      const changedText = input.content !== input.note.content
      const sourceLang = changedText ? detectLocale(input.content) : input.note.source_lang
      const after: NotaRow = {
        ...input.note,
        kind: input.kind,
        content: input.content,
        source_lang: sourceLang,
        // Si cambió el texto, las traducciones anteriores ya no valen: se
        // dejan solo con el idioma original y se rehacen en segundo plano.
        text: changedText ? { [sourceLang]: input.content } : input.note.text,
      }
      return updateNota(monthKey, scope, version.letter, input.note, after, author)
    },
    onSuccess: (row) => {
      setEditing(null)
      invalidate()
      void translateInBackground(row)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (row: NotaRow) => deleteNota(monthKey, scope, version.letter, row, author),
    onSuccess: () => {
      setConfirming(null)
      invalidate()
    },
  })

  const deleteWeekMutation = useMutation({
    mutationFn: async (rows: NotaRow[]) => {
      // En serie a propósito: cada borrado deja su propia entrada en el
      // historial, y así el registro queda en un orden legible.
      for (const row of rows) {
        if (!canDelete(row)) continue
        await deleteNota(monthKey, scope, version.letter, row, author)
      }
    },
    onSuccess: () => {
      setConfirming(null)
      invalidate()
    },
  })

  const all = useMemo(() => notesQuery.data ?? [], [notesQuery.data])
  const scoped = useMemo(
    () => all.filter((n) => n.brand === scope.brand && n.country === scope.country),
    [all, scope.brand, scope.country],
  )
  const byFilter = useMemo(
    () => (filter === 'all' ? scoped : scoped.filter((n) => n.kind === filter)),
    [scoped, filter],
  )
  const general = byFilter.filter((n) => n.scope === 'general')
  const weekly = byFilter.filter((n) => n.scope === 'week')

  const counts = useMemo(() => {
    const source =
      mode === 'general' ? scoped.filter((n) => n.scope === 'general') : scoped.filter((n) => n.scope === 'week')
    const map = new Map<KindFilter, number>([['all', source.length]])
    for (const k of NOTA_KINDS) map.set(k, source.filter((n) => n.kind === k).length)
    return map
  }, [scoped, mode])

  return (
    <>
      <div className="aligned-subhead note-subhead">
        <div className="seg">
          <button className={mode === 'general' ? 'is-active' : ''} onClick={() => setMode('general')}>
            {t('notes.general')}
          </button>
          <button className={mode === 'weekly' ? 'is-active' : ''} onClick={() => setMode('weekly')}>
            {t('notes.weekly')}
          </button>
        </div>
        <div className="kind-filters">
          <button className={`kind-chip ${filter === 'all' ? 'is-active' : ''}`} onClick={() => setFilter('all')}>
            {t('notes.all')} {counts.get('all') ?? 0}
          </button>
          {NOTA_KINDS.map((k) => (
            <button
              key={k}
              className={`kind-chip nc-${k} ${filter === k ? 'is-active' : ''}`}
              onClick={() => setFilter(k)}
              title={t(`notes.kind.${k}`)}
            >
              <span className="note-tab-dot" style={{ background: 'var(--nc)' }} />
              {counts.get(k) ?? 0}
            </button>
          ))}
        </div>
      </div>

      {notesQuery.isError && (
        <p className="error-text" style={{ padding: '8px 12px' }}>
          {t('notes.loadError')}
        </p>
      )}

      {mode === 'weekly' ? (
        <WeeklyNotes
          weeks={weeks}
          notes={weekly}
          isSaving={addMutation.isPending}
          kinds={creatableKinds}
          canEditNote={canEditNote}
          canDelete={canDelete}
          onAdd={(weekStart, k, text) => addMutation.mutate({ kind: k, content: text, weekStart })}
          onEdit={(note) => setEditing(note)}
          onHistory={(note) => setHistoryOf(note)}
          onDelete={(note) => setConfirming({ mode: 'one', note })}
          onDeleteWeek={(weekStart, weekNotes) => setConfirming({ mode: 'week', weekStart, notes: weekNotes })}
        />
      ) : (
        <>
          <div className="panel-body panel-body-tight">
            {notesQuery.isLoading && <p className="muted small">{t('common.loading')}</p>}
            {general.length === 0 && !notesQuery.isLoading && <p className="menu-empty">{t('notes.empty')}</p>}
            <ul className="note-list">
              {general.map((n) => (
                <li key={n.note_id} className={`note-item nc-${n.kind}`}>
                  <span className="note-actions">
                    <button className="icon-btn" title={t('noteHistory.open')} onClick={() => setHistoryOf(n)}>
                      ⟲
                    </button>
                    {canEditNote(n) && (
                      <button className="icon-btn" title={t('notes.editTitle')} onClick={() => setEditing(n)}>
                        ✎
                      </button>
                    )}
                    {canDelete(n) && (
                      <button
                        className="icon-btn"
                        title={t('notes.deleteThis')}
                        onClick={() => setConfirming({ mode: 'one', note: n })}
                      >
                        ✕
                      </button>
                    )}
                  </span>
                  <div className="note-item-top">
                    <span className="note-kind">
                      <span className="note-tab-dot" style={{ background: 'var(--nc)' }} />
                      {t(`notes.kind.${n.kind}`)}
                    </span>
                    <span className="note-time">{formatDateTime(n.created_at, locale)}</span>
                  </div>
                  <p className="note-text">{pickNoteText(n.text, n.content, locale)}</p>
                  <div className="note-author">
                    {n.created_by.split('@')[0]}
                    {n.updated_at && <span className="note-edited"> · {t('notes.edited')}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <form
            className="note-composer"
            onSubmit={(e) => {
              e.preventDefault()
              if (content.trim()) addMutation.mutate({ kind, content: content.trim() })
            }}
          >
            <div className="note-kind-picker">
              {creatableKinds.map((k) => (
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
            {!canEdit && <p className="role-hint">{t('role.viewerNoteHint')}</p>}
            <textarea
              rows={2}
              placeholder={t('notes.placeholder')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <button className="btn btn-primary btn-block" type="submit" disabled={addMutation.isPending || !content.trim()}>
              {addMutation.isPending ? t('common.saving') : t('notes.add')}
            </button>
            {addMutation.isError && (
              <p className="error-text">{t('notes.saveError', { error: (addMutation.error as Error).message })}</p>
            )}
          </form>
        </>
      )}

      {editing && (
        <NoteEditorModal
          title={t('notes.editTitle')}
          kinds={kindsFor(editing)}
          initialKind={editing.kind}
          initialContent={editing.content}
          submitLabel={t('common.save')}
          isSaving={updateMutation.isPending}
          errorMessage={updateMutation.isError ? (updateMutation.error as Error).message : undefined}
          onSubmit={(k, text) => updateMutation.mutate({ note: editing, kind: k, content: text })}
          onClose={() => setEditing(null)}
        />
      )}

      {confirming?.mode === 'one' && (
        <ConfirmModal
          title={t('notes.deleteThis')}
          message={t('notes.deleteConfirm')}
          preview={confirming.note.content}
          confirmLabel={t('common.delete')}
          isPending={deleteMutation.isPending}
          errorMessage={deleteMutation.isError ? (deleteMutation.error as Error).message : undefined}
          onConfirm={() => deleteMutation.mutate(confirming.note)}
          onClose={() => setConfirming(null)}
        />
      )}

      {confirming?.mode === 'week' && (
        <ConfirmModal
          title={t('notes.deleteWeekAll', { count: confirming.notes.length })}
          message={t('notes.deleteWeekConfirm', { count: confirming.notes.length, week: confirming.weekStart })}
          confirmLabel={t('notes.deleteWeekConfirmBtn', { count: confirming.notes.length })}
          isPending={deleteWeekMutation.isPending}
          errorMessage={deleteWeekMutation.isError ? (deleteWeekMutation.error as Error).message : undefined}
          onConfirm={() => deleteWeekMutation.mutate(confirming.notes)}
          onClose={() => setConfirming(null)}
        />
      )}

      {historyOf && (
        <NoteHistoryModal
          monthKey={monthKey}
          docId={notaDocId(scope, historyOf.note_id)}
          onClose={() => setHistoryOf(null)}
        />
      )}
    </>
  )
}
