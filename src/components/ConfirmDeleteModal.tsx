import { useState } from 'react'
import { Modal } from './Modal'
import { useI18n } from '../i18n/I18nContext'

// Clave compartida del equipo para confirmar borrados destructivos — no es
// una credencial de cuenta ni reemplaza las reglas de Firestore (que ya
// restringen todo a @openenglish.com); es solo una fricción a propósito
// para que borrar un mes no sea un clic accidental de tres puntos.
const DELETE_PASSWORD = 'open@2027#'

interface Props {
  monthLabel: string
  onClose: () => void
  onConfirmed: () => void
  isPending: boolean
}

export function ConfirmDeleteModal({ monthLabel, onClose, onConfirmed, isPending }: Props) {
  const { t } = useI18n()
  const [password, setPassword] = useState('')
  const [wrongPassword, setWrongPassword] = useState(false)

  const submit = () => {
    if (password !== DELETE_PASSWORD) {
      setWrongPassword(true)
      return
    }
    setWrongPassword(false)
    onConfirmed()
  }

  return (
    <Modal title={t('months.menu.delete')} onClose={onClose} width={400}>
      <p>{t('months.confirmDelete', { month: monthLabel })}</p>
      <label className="filter-field">
        <span>{t('months.deletePasswordLabel')}</span>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setWrongPassword(false)
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </label>
      {wrongPassword && <p className="error-text">{t('months.deletePasswordWrong')}</p>}

      <div className="form-actions" style={{ marginTop: 18 }}>
        <button className="btn-secondary" onClick={onClose}>
          {t('months.cancel')}
        </button>
        <button className="btn-primary btn-danger" style={{ width: 'auto' }} disabled={isPending} onClick={submit}>
          {t('months.menu.delete')}
        </button>
      </div>
    </Modal>
  )
}
