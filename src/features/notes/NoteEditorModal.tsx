import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { useI18n } from '../../i18n/I18nContext'
import type { NotaKind } from '../../types'

interface Props {
  title: string
  /** Categorías que esta persona puede elegir (depende de su rol). */
  kinds: NotaKind[]
  initialKind: NotaKind
  initialContent: string
  submitLabel: string
  isSaving: boolean
  errorMessage?: string
  onSubmit: (kind: NotaKind, content: string) => void
  onClose: () => void
}

/**
 * Un solo formulario para crear y para editar notas: así el cambio de
 * categoría y el de contenido se hacen en el mismo sitio y con el mismo
 * aspecto, se llegue desde donde se llegue.
 */
export function NoteEditorModal({
  title,
  kinds,
  initialKind,
  initialContent,
  submitLabel,
  isSaving,
  errorMessage,
  onSubmit,
  onClose,
}: Props) {
  const { t } = useI18n()
  const [kind, setKind] = useState<NotaKind>(kinds.includes(initialKind) ? initialKind : kinds[0])
  const [content, setContent] = useState(initialContent)

  const dirty = content.trim() !== initialContent.trim() || kind !== initialKind

  return (
    <Modal title={title} onClose={onClose} width={460}>
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

      <textarea
        rows={5}
        autoFocus
        placeholder={t('notes.placeholder')}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      {errorMessage && <p className="error-text">{errorMessage}</p>}

      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button
          className="btn btn-primary"
          disabled={isSaving || !content.trim() || !dirty}
          onClick={() => onSubmit(kind, content.trim())}
        >
          {isSaving ? t('common.saving') : submitLabel}
        </button>
      </div>
    </Modal>
  )
}
