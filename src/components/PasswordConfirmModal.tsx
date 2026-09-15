import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from './Modal'
import { useI18n } from '../i18n/I18nContext'
import { getDeletePassword, setDeletePassword } from '../lib/appSecrets'

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

/**
 * Confirmación con contraseña para lo que no se puede deshacer.
 *
 * La contraseña no está en el código: se lee de `config/secrets`, que solo
 * pueden leer los administradores. Si aún no hay ninguna configurada, este
 * mismo modal deja definirla — así no hace falta ir a la consola de Firebase a
 * crear un documento a mano.
 */
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
  const queryClient = useQueryClient()
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [wrong, setWrong] = useState(false)

  const stored = useQuery({
    queryKey: ['delete-password'],
    queryFn: getDeletePassword,
    staleTime: 5 * 60 * 1000,
  })

  const defineMutation = useMutation({
    mutationFn: (value: string) => setDeletePassword(value),
    onSuccess: () => {
      setPassword('')
      setRepeat('')
      void queryClient.invalidateQueries({ queryKey: ['delete-password'] })
    },
  })

  const needsSetup = stored.isSuccess && stored.data === null

  const submit = () => {
    if (password !== stored.data) {
      setWrong(true)
      return
    }
    setWrong(false)
    onConfirmed()
  }

  if (stored.isLoading) {
    return (
      <Modal title={title} onClose={onClose} width={430}>
        <p className="muted small">{t('common.loading')}</p>
      </Modal>
    )
  }

  // Primera vez: no hay contraseña configurada todavía.
  if (needsSetup) {
    const valid = password.length >= 6 && password === repeat
    return (
      <Modal title={t('password.setupTitle')} onClose={onClose} width={430}>
        <p className="confirm-message">{t('password.setupBody')}</p>

        <label className="field">
          <span>{t('password.newLabel')}</span>
          <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="field">
          <span>{t('password.repeatLabel')}</span>
          <input type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
        </label>

        {password.length > 0 && password.length < 6 && <p className="error-text">{t('password.tooShort')}</p>}
        {repeat.length > 0 && password !== repeat && <p className="error-text">{t('password.mismatch')}</p>}
        {defineMutation.isError && <p className="error-text">{(defineMutation.error as Error).message}</p>}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            className="btn btn-primary"
            disabled={!valid || defineMutation.isPending}
            onClick={() => defineMutation.mutate(password)}
          >
            {defineMutation.isPending ? t('common.saving') : t('password.setupBtn')}
          </button>
        </div>
      </Modal>
    )
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
