import { useState } from 'react'
import type { ChangeRecord } from '../types'
import { useI18n } from '../i18n/I18nContext'
import { formatDateTime } from '../lib/dateUtils'

interface Props {
  /** Solo mis cambios, más recientes primero. */
  changes: ChangeRecord[]
  onRevert: (change: ChangeRecord) => Promise<void>
  onClose: () => void
}

/** Panel del historial: mis cambios con fecha/hora y opción de volver a ese punto. */
export function HistoryMenu({ changes, onRevert, onClose }: Props) {
  const { t, locale } = useI18n()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async (change: ChangeRecord) => {
    if (change.reverted || pendingId) return
    setPendingId(change.change_id)
    setError(null)
    try {
      await onRevert(change)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="menu-panel menu-panel-wide">
      <div className="menu-head">
        <h3>{t('history.title')}</h3>
        <span className="small faint">{t('history.mineOnly')}</span>
      </div>

      {changes.length === 0 && <p className="menu-empty">{t('history.empty')}</p>}
      {error && <p className="error-text">{error}</p>}

      {changes.map((c) => (
        <button
          key={c.change_id}
          className={`change-row ${c.reverted ? 'change-reverted' : ''}`}
          onClick={() => void handleClick(c)}
          title={c.reverted ? t('history.alreadyReverted') : t('history.revertHint')}
        >
          <span className="change-dot" style={{ background: c.reverted ? 'var(--ink-faint)' : undefined }} />
          <span className="change-body">
            <span className="change-label">
              {t(`history.action.${c.action}`)} · {t(`history.entity.${c.entity}`)}
            </span>
            <span className="change-meta">{c.where_label}</span>
            <span className="change-meta">{formatDateTime(c.at, locale)}</span>
          </span>
          <span className="change-action">
            {pendingId === c.change_id ? '…' : c.reverted ? t('history.reverted') : t('history.revert')}
          </span>
        </button>
      ))}
    </div>
  )
}
