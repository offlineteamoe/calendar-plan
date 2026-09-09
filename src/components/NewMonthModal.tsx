import { useState } from 'react'
import { Modal } from './Modal'
import { useI18n } from '../i18n/I18nContext'

interface Props {
  onClose: () => void
  onConfirm: (monthKey: string) => void
  isPending: boolean
  errorMessage?: string
}

const MONTH_INDEXES = Array.from({ length: 12 }, (_, i) => i)

/** Modal con selector de año (flechas) + grilla de 12 meses, en vez del <input type="month"> nativo. */
export function NewMonthModal({ onClose, onConfirm, isPending, errorMessage }: Props) {
  const { t, locale } = useI18n()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const monthNames = MONTH_INDEXES.map((m) => {
    const label = new Date(2000, m, 1).toLocaleDateString(locale, { month: 'long' })
    return label.charAt(0).toUpperCase() + label.slice(1)
  })

  return (
    <Modal title={t('months.newModalTitle')} onClose={onClose} width={420}>
      <div className="year-stepper">
        <button className="icon-btn" onClick={() => setYear((y) => y - 1)} aria-label="prev-year">
          ‹
        </button>
        <span className="year-stepper-value">{year}</span>
        <button className="icon-btn" onClick={() => setYear((y) => y + 1)} aria-label="next-year">
          ›
        </button>
      </div>

      <div className="month-grid-picker">
        {monthNames.map((name, i) => (
          <button key={name} className={`month-pick-cell ${i === month ? 'month-pick-active' : ''}`} onClick={() => setMonth(i)}>
            {name}
          </button>
        ))}
      </div>

      {errorMessage && <p className="error-text">{errorMessage}</p>}

      <div className="form-actions" style={{ marginTop: 18 }}>
        <button className="btn-secondary" onClick={onClose}>
          {t('months.cancel')}
        </button>
        <button
          className="btn-primary"
          style={{ width: 'auto' }}
          disabled={isPending}
          onClick={() => onConfirm(`${year}-${String(month + 1).padStart(2, '0')}`)}
        >
          {isPending ? t('months.creating') : t('months.create')}
        </button>
      </div>
    </Modal>
  )
}
