import { useEffect, useRef, useState } from 'react'
import type { ChangeRecord } from '../types'
import { useI18n } from '../i18n/I18nContext'

const VISIBLE_MS = 6000
const MAX_STACK = 3

/**
 * Avisos flotantes, no invasivos, cuando OTRA persona guarda un cambio.
 * Dice qué hizo y dónde lo hizo (ej. "maria editó plan en 12 sep · OEA · México · TV").
 */
export function ChangeToasts({ changes, myEmail }: { changes: ChangeRecord[]; myEmail: string }) {
  const { t } = useI18n()
  const [visible, setVisible] = useState<ChangeRecord[]>([])
  const seenRef = useRef<Set<string>>(new Set())
  const primedRef = useRef(false)

  useEffect(() => {
    // La primera carga trae historial viejo: se marca como visto sin avisar,
    // para no lanzar 20 toasts al abrir el mes.
    if (!primedRef.current) {
      changes.forEach((c) => seenRef.current.add(c.change_id))
      primedRef.current = true
      return
    }
    const fresh = changes.filter((c) => !seenRef.current.has(c.change_id) && c.user_email !== myEmail)
    if (fresh.length === 0) return
    fresh.forEach((c) => seenRef.current.add(c.change_id))
    setVisible((prev) => [...prev, ...fresh].slice(-MAX_STACK))
  }, [changes, myEmail])

  useEffect(() => {
    if (visible.length === 0) return
    const timer = setTimeout(() => setVisible((prev) => prev.slice(1)), VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [visible])

  if (visible.length === 0) return null

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {visible.map((c) => (
        <div className="toast" key={c.change_id}>
          <span className="avatar">{c.user_initials || c.user_email.slice(0, 2).toUpperCase()}</span>
          <span className="toast-text">
            <strong>
              {t('toast.change', {
                who: c.user_email.split('@')[0],
                action: t(`history.action.${c.action}`).toLowerCase(),
                entity: t(`history.entity.${c.entity}`),
              })}
            </strong>{' '}
            {t('toast.where', { where: c.where_label })}
          </span>
        </div>
      ))}
    </div>
  )
}
