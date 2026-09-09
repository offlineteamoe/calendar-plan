import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { useI18n } from '../../i18n/I18nContext'

interface Props {
  /** Letra de la versión que se está creando o editando. */
  letter: string
  /** Letra de la versión de origen, solo al crear. */
  copiedFrom?: string
  initialName?: string
  initialDescription?: string
  isPending: boolean
  errorMessage?: string
  onSubmit: (meta: { name: string; description: string }) => void
  onClose: () => void
}

/**
 * Nombre y descripción de una versión.
 *
 * "Versión B" no dice nada dentro de tres semanas. Un nombre corto y una
 * descripción de para qué es hacen que elegir entre versiones sea una decisión
 * y no una adivinanza. Los dos son opcionales: si alguien tiene prisa, guarda
 * y sigue.
 */
export function VersionMetaModal({
  letter,
  copiedFrom,
  initialName = '',
  initialDescription = '',
  isPending,
  errorMessage,
  onSubmit,
  onClose,
}: Props) {
  const { t } = useI18n()
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const creating = copiedFrom !== undefined

  return (
    <Modal
      title={creating ? t('version.newTitle', { letter }) : t('version.editTitle', { letter })}
      onClose={onClose}
      width={440}
    >
      {creating && <p className="confirm-message">{t('version.newHint', { from: copiedFrom, letter })}</p>}

      <label className="field">
        <span>{t('version.nameLabel')}</span>
        <input
          type="text"
          autoFocus
          maxLength={40}
          placeholder={t('version.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <label className="field">
        <span>{t('version.descriptionLabel')}</span>
        <textarea
          rows={3}
          maxLength={280}
          placeholder={t('version.descriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      {errorMessage && <p className="error-text">{errorMessage}</p>}

      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onClose} disabled={isPending}>
          {t('common.cancel')}
        </button>
        <button className="btn btn-primary" disabled={isPending} onClick={() => onSubmit({ name, description })}>
          {isPending ? t('common.saving') : creating ? t('version.createBtn') : t('common.save')}
        </button>
      </div>
    </Modal>
  )
}
