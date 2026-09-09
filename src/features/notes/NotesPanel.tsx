import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addNota, deleteNota, getNotas, setNotaTranslations } from '../../lib/store'
import { buildNoteText, detectLocale, pickNoteText } from '../../lib/translate'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../i18n/I18nContext'
import { formatDateTime } from '../../lib/dateUtils'
import { COUNTRY_LABELS, NOTA_KINDS, type Brand, type Country, type NotaKind, type NotaRow } from '../../types'

interface Props {
  monthKey: string
  brand: Brand
  country: Country
  channel: string
}

type Filter = NotaKind | 'all'

/**
 * Notas del mes. La fecha se toma automáticamente al guardar (no se elige),
 * cada tipo tiene su color y se refleja en el borde izquierdo de la nota, y
 * las sub-pestañas filtran por tipo. Orden: más reciente primero.
 */
export function NotesPanel({ monthKey, brand, country, channel }: Props) {
  const { user } = useAuth()
  const { t, locale } = useI18n()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('all')
  const [kind, setKind] = useState<NotaKind>('pendiente')
  const [content, setContent] = useState('')

  const notesQuery = useQuery({ queryKey: ['notas', monthKey], queryFn: () => getNotas(monthKey) })
  const author = { email: user?.email ?? '', initials: user?.initials ?? '' }

  const addMutation = useMutation({
    mutationFn: async () => {
      const text = content.trim()
      const sourceLang = detectLocale(text)
      const row: NotaRow = {
        note_id: crypto.randomUUID(),
        kind,
        content: text,
        source_lang: sourceLang,
        text: { [sourceLang]: text },
        created_at: new Date().toISOString(),
        created_by: author.email,
        scope_label: `${brand} · ${COUNTRY_LABELS[country]} · ${channel}`,
        brand,
        country,
      }
      // La nota se guarda de inmediato con su texto original; la traducción a
      // los otros idiomas ocurre después, sin hacer esperar a quien escribe.
      await addNota(monthKey, row, author)
      return row
    },
    onSuccess: (row) => {
      setContent('')
      void queryClient.invalidateQueries({ queryKey: ['notas', monthKey] })
      void queryClient.invalidateQueries({ queryKey: ['changes', monthKey] })
      void translateInBackground(row)
    },
  })

  const translateInBackground = async (row: NotaRow) => {
    const { source, text } = await buildNoteText(row.content)
    const gotNew = Object.keys(text).length > 1
    if (!gotNew) return
    try {
      await setNotaTranslations(monthKey, row.note_id, { ...row, source_lang: source, text })
      void queryClient.invalidateQueries({ queryKey: ['notas', monthKey] })
    } catch (err) {
      console.warn('No se pudieron guardar las traducciones de la nota:', err)
    }
  }

  const deleteMutation = useMutation({
    mutationFn: (row: NotaRow) => deleteNota(monthKey, row, author),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notas', monthKey] }),
  })

  const notes = useMemo(() => notesQuery.data ?? [], [notesQuery.data])
  const counts = useMemo(() => {
    const map = new Map<Filter, number>([['all', notes.length]])
    for (const k of NOTA_KINDS) map.set(k, notes.filter((n) => n.kind === k).length)
    return map
  }, [notes])

  const shown = filter === 'all' ? notes : notes.filter((n) => n.kind === filter)

  return (
    <>
      <div className="note-tabs">
        <button className={`note-tab ${filter === 'all' ? 'is-active' : ''}`} onClick={() => setFilter('all')}>
          {t('notes.all')} <span className="note-tab-count">{counts.get('all') ?? 0}</span>
        </button>
        {NOTA_KINDS.map((k) => (
          <button
            key={k}
            className={`note-tab nc-${k} ${filter === k ? 'is-active' : ''}`}
            onClick={() => setFilter(k)}
          >
            <span className="note-tab-dot" style={{ background: 'var(--nc)' }} />
            {t(`notes.kind.${k}`)} <span className="note-tab-count">{counts.get(k) ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="panel-body panel-body-tight">
        {notesQuery.isLoading && <p className="muted small">{t('common.loading')}</p>}
        {notesQuery.isError && <p className="error-text">{t('notes.loadError')}</p>}

        {shown.length === 0 && !notesQuery.isLoading && !notesQuery.isError && (
          <p className="menu-empty">{filter === 'all' ? t('notes.empty') : t('notes.emptyKind')}</p>
        )}

        <ul className="note-list">
          {shown.map((n) => (
            <li key={n.note_id} className={`note-item nc-${n.kind}`}>
              <button
                className="icon-btn note-delete"
                title={t('notes.deleteTitle')}
                onClick={() => deleteMutation.mutate(n)}
              >
                ✕
              </button>
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
                {n.scope_label ? ` · ${n.scope_label}` : ''}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <form
        className="note-composer"
        onSubmit={(e) => {
          e.preventDefault()
          if (content.trim()) addMutation.mutate()
        }}
      >
        <div className="note-kind-picker">
          {NOTA_KINDS.map((k) => (
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
        {deleteMutation.isError && (
          <p className="error-text">{t('notes.saveError', { error: (deleteMutation.error as Error).message })}</p>
        )}
      </form>
    </>
  )
}
