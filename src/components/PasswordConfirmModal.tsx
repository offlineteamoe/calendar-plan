import { useState } from 'react'
import { Modal } from './Modal'
import { useI18n } from '../i18n/I18nContext'

// Clave compartida del equipo para borrados que no se pueden deshacer. No es
// una credencial de cuenta ni sustituye a las reglas de Firestore (que ya
// restringen quién puede borrar): es fricción deliberada para que borrar algo
// grande nunca sea un clic accidental.
//
// Vive aquí, en un solo sitio, porque tenerla repetida en cada pantalla de
// borrado es la forma segura de que un día dejen de coincidir.
export const DELETE_PASSWORD = 'open@2027#'

interface Props {
  title: string
  /** Qué se va a perder, dicho sin rodeos. */
  warning: string
  confirmLabel: string
  pendingLabel?: string
  isPending?: boolean
  errorMessage?: string
  onConfirmed: () => void
  onClose: () => void
}

export function PasswordConfirmModal({
  title,
  warning,
  confirmLabel,
  pendingLabel,
  isPending = false,
  errorMessage,
  onConfirmed,
  onClose,
}: Props) {
  const { t } = useI18n()
  const [password, setPassword] = useState('')
  const [wrong, setWrong] = useState(false)

  const submit = () => {
    if (password !== DELETE_PASSWORD) {
      setWrong(true)
      return
    }
    setWrong(false)
    onConfirmed()
  }

  return (
    <Modal title={title} onClose={onClose} width={430}>
      <div className="callout callout-danger">{warning}</div>

      <label className="field">
        <span>{t('months.deletePasswordLabel')}</span>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setWrong(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
        />
      </label>

      {wrong && <p className="error-text">{t('months.deletePasswordWrong')}</p>}
      {errorMessage && <p className="error-text">{errorMessage}</p>}

      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onClose} disabled={isPending}>
          {t('common.cancel')}
        </button>
        <button className="btn btn-danger" disabled={isPending} onClick={submit}>
          {isPending ? (pendingLabel ?? t('common.saving')) : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
