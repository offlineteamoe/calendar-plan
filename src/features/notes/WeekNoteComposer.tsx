import { useState } from 'react'
import { useI18n } from '../../i18n/I18nContext'
import type { NotaKind } from '../../types'

interface Props {
  kinds: NotaKind[]
  initialKind: NotaKind
  initialContent: string
  isSaving: boolean
  onSubmit: (kind: NotaKind, content: string) => void
  onCancel: () => void
}

/**
 * Escribir una nota semanal **dentro de su propia fila**, no en un modal.
 *
 * Una nota de la semana se escribe mirando esa semana del calendario: un
 * modal centrado tapa exactamente lo que la persona necesita ver para
 * redactarla. El espacio es poco, así que las categorías se eligen con puntos
 * de color y el nombre de la elegida se muestra al lado.
 */
export function WeekNoteComposer({ kinds, initialKind, initialContent, isSaving, onSubmit, onCancel }: Props) {
  const { t } = useI18n()
  const [kind, setKind] = useState<NotaKind>(kinds.includes(initialKind) ? initialKind : kinds[0])
  const [content, setContent] = useState(initialContent)

  const submit = () => {
    if (content.trim()) onSubmit(kind, content.trim())
  }

  return (
    <div className={`week-composer nc-${kind}`}>
      <div className="week-composer-top">
        {kinds.length > 1 && (
          <span className="week-composer-kinds">
            {kinds.map((k) => (
              <button
                key={k}
                type="button"
                className={`week-kind-dot nc-${k} ${k === kind ? 'is-active' : ''}`}
                onClick={() => setKind(k)}
                title={t(`notes.kind.${k}`)}
                aria-label={t(`notes.kind.${k}`)}
              />
            ))}
          </span>
        )}
        <span className="week-composer-kind-name">{t(`notes.kind.${kind}`)}</span>
      </div>

      <textarea
        className="week-composer-input"
        autoFocus
        placeholder={t('notes.placeholder')}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          // Enter guarda; Mayús+Enter hace un salto de línea. Escape cancela.
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
          if (e.key === 'Escape') onCancel()
        }}
      />

      <div className="week-composer-actions">
        <button className="note-act" onClick={onCancel} disabled={isSaving}>
          {t('common.cancel')}
        </button>
        <button className="note-act note-act-add" onClick={submit} disabled={isSaving || !content.trim()}>
          {isSaving ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </div>
  )
}
