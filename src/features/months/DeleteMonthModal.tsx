import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { useI18n } from '../../i18n/I18nContext'

// Clave compartida del equipo para borrados destructivos. No es una
// credencial de cuenta ni sustituye a las reglas de Firestore (que ya
// restringen todo al dominio): es fricción deliberada para que borrar un mes
// nunca sea un clic accidental.
const DELETE_PASSWORD = 'open@2027#'

interface Props {
  monthLabel: string
  onClose: () => void
  onConfirmed: () => void
  isPending: boolean
  errorMessage?: string
}

export function DeleteMonthModal({ monthLabel, onClose, onConfirmed, isPending, errorMessage }: Props) {
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
    <Modal title={t('months.deleteTitle', { month: monthLabel })} onClose={onClose} width={430}>
      <div className="callout callout-danger">{t('months.deleteWarning', { month: monthLabel })}</div>

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
      {errorMessage && <p className="error-text">{t('months.deleteError', { error: errorMessage })}</p>}

      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button className="btn btn-danger" disabled={isPending} onClick={submit}>
          {isPending ? t('months.deleting') : t('common.delete')}
        </button>
      </div>
    </Modal>
  )
}
