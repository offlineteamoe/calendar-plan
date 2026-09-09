import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { useI18n } from '../../i18n/I18nContext'

interface Props {
  existingKeys: string[]
  onClose: () => void
  onConfirm: (monthKey: string) => void
  isPending: boolean
  errorMessage?: string
}

/** Selector propio de año (flechas) + grilla de 12 meses. */
export function NewMonthModal({ existingKeys, onClose, onConfirm, isPending, errorMessage }: Props) {
  const { t, locale } = useI18n()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const monthNames = Array.from({ length: 12 }, (_, m) => {
    const label = new Date(2000, m, 1).toLocaleDateString(locale, { month: 'long' })
    return label.charAt(0).toUpperCase() + label.slice(1)
  })
  const keyFor = (m: number) => `${year}-${String(m + 1).padStart(2, '0')}`
  const taken = (m: number) => existingKeys.includes(keyFor(m))

  return (
    <Modal title={t('months.newModalTitle')} onClose={onClose} width={440}>
      <div className="year-stepper">
        <button className="icon-btn" onClick={() => setYear((y) => y - 1)} aria-label="-1">
          ‹
        </button>
        <span className="year-stepper-value">{year}</span>
        <button className="icon-btn" onClick={() => setYear((y) => y + 1)} aria-label="+1">
          ›
        </button>
      </div>

      <div className="month-picker">
        {monthNames.map((name, i) => (
          <button
            key={name}
            className={i === month ? 'is-active' : ''}
            disabled={taken(i)}
            title={taken(i) ? t('months.exists') : undefined}
            onClick={() => setMonth(i)}
          >
            {name}
          </button>
        ))}
      </div>

      {errorMessage && <p className="error-text">{errorMessage}</p>}

      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button className="btn btn-primary" disabled={isPending || taken(month)} onClick={() => onConfirm(keyFor(month))}>
          {isPending ? t('months.creating') : t('months.create')}
        </button>
      </div>
    </Modal>
  )
}
