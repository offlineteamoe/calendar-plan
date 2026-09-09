import { PasswordConfirmModal } from '../../components/PasswordConfirmModal'
import { useI18n } from '../../i18n/I18nContext'

interface Props {
  monthLabel: string
  onClose: () => void
  onConfirmed: () => void
  isPending: boolean
  errorMessage?: string
}

export function DeleteMonthModal({ monthLabel, onClose, onConfirmed, isPending, errorMessage }: Props) {
  const { t } = useI18n()

  return (
    <PasswordConfirmModal
      title={t('months.deleteTitle', { month: monthLabel })}
      warning={t('months.deleteWarning', { month: monthLabel })}
      confirmLabel={t('common.delete')}
      pendingLabel={t('months.deleting')}
      isPending={isPending}
      errorMessage={errorMessage ? t('months.deleteError', { error: errorMessage }) : undefined}
      onConfirmed={onConfirmed}
      onClose={onClose}
    />
  )
}
