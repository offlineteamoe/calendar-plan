import { Modal } from './Modal'
import { useI18n } from '../i18n/I18nContext'

interface Props {
  title: string
  /** Qué va a pasar exactamente, dicho sin rodeos. */
  message: string
  /** Texto de lo que se va a borrar, para que se vea antes de confirmar. */
  preview?: string
  confirmLabel: string
  danger?: boolean
  isPending?: boolean
  errorMessage?: string
  onConfirm: () => void
  onClose: () => void
}

/**
 * Confirmación para acciones que no se pueden deshacer desde la propia
 * pantalla. Muestra el contenido afectado: confirmar a ciegas es la forma más
 * rápida de borrar lo que no era.
 */
export function ConfirmModal({
  title,
  message,
  preview,
  confirmLabel,
  danger = true,
  isPending = false,
  errorMessage,
  onConfirm,
  onClose,
}: Props) {
  const { t } = useI18n()

  return (
    <Modal title={title} onClose={onClose} width={420}>
      <p className="confirm-message">{message}</p>
      {preview && <p className="confirm-preview">{preview}</p>}
      {errorMessage && <p className="error-text">{errorMessage}</p>}
      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onClose} disabled={isPending}>
          {t('common.cancel')}
        </button>
        <button className={danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={onConfirm} disabled={isPending}>
          {isPending ? t('common.saving') : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
