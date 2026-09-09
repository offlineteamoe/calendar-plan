import { useQuery } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { listChangesForDoc } from '../../lib/changelog'
import { formatDateTime } from '../../lib/dateUtils'
import { useI18n } from '../../i18n/I18nContext'
import { useRole } from '../../hooks/useRole'
import { useAuth } from '../../context/AuthContext'
import type { ChangeRecord, NotaKind, NotaRow } from '../../types'

interface Props {
  monthKey: string
  docId: string
  onClose: () => void
}

type Snapshot = Partial<NotaRow> | null

function asNote(value: Record<string, unknown> | null): Snapshot {
  return (value as Partial<NotaRow> | null) ?? null
}

/**
 * Historial de una nota: quién la creó, quién la ha editado, cuándo, y qué
 * decía antes de cada edición. Se lee de la colección `changes`, que guarda
 * el estado completo anterior y posterior de cada escritura.
 */
export function NoteHistoryModal({ monthKey, docId, onClose }: Props) {
  const { t, locale } = useI18n()
  const { canEdit } = useRole()
  const { user } = useAuth()
  // Un usuario de consulta solo ve su propio rastro, nunca el de otra persona.
  const onlyEmail = canEdit ? undefined : (user?.email ?? '')
  const historyQuery = useQuery({
    queryKey: ['note-history', monthKey, docId, onlyEmail ?? 'all'],
    queryFn: () => listChangesForDoc(monthKey, docId, onlyEmail),
  })

  const entries = historyQuery.data ?? []

  const kindLabel = (kind?: NotaKind) => (kind ? t(`notes.kind.${kind}`) : '—')

  const actionLabel = (change: ChangeRecord) => {
    if (change.action === 'create') return t('noteHistory.created')
    if (change.action === 'delete') return t('noteHistory.deleted')
    return t('noteHistory.edited')
  }

  return (
    <Modal title={t('noteHistory.title')} onClose={onClose} width={540}>
      {historyQuery.isLoading && <p className="muted small">{t('common.loading')}</p>}
      {historyQuery.isError && <p className="error-text">{(historyQuery.error as Error).message}</p>}
      {!historyQuery.isLoading && entries.length === 0 && <p className="menu-empty">{t('noteHistory.empty')}</p>}

      <ol className="note-history">
        {entries.map((change) => {
          const before = asNote(change.before)
          const after = asNote(change.after)
          const contentChanged = before && after && before.content !== after.content
          const kindChanged = before && after && before.kind !== after.kind

          return (
            <li className={`note-history-item nhi-${change.action}`} key={change.change_id}>
              <span className="note-history-dot" />
              <div className="note-history-body">
                <div className="note-history-top">
                  <span className="note-history-action">{actionLabel(change)}</span>
                  <span className="note-history-time">{formatDateTime(change.at, locale)}</span>
                </div>
                <div className="note-history-who">{change.user_email}</div>

                {change.action === 'create' && after && <p className="note-history-text">{after.content}</p>}

                {change.action === 'delete' && before && (
                  <p className="note-history-text note-history-gone">{before.content}</p>
                )}

                {change.action === 'update' && (
                  <>
                    {kindChanged && (
                      <div className="note-history-field">
                        <span className="note-history-label">{t('noteHistory.category')}</span>
                        <span className="note-history-was">{kindLabel(before?.kind)}</span>
                        <span className="note-history-arrow">→</span>
                        <span className="note-history-now">{kindLabel(after?.kind)}</span>
                      </div>
                    )}
                    {contentChanged && (
                      <div className="note-history-diff">
                        <div className="note-history-side">
                          <span className="note-history-label">{t('noteHistory.before')}</span>
                          <p className="note-history-text note-history-gone">{before?.content}</p>
                        </div>
                        <div className="note-history-side">
                          <span className="note-history-label">{t('noteHistory.after')}</span>
                          <p className="note-history-text">{after?.content}</p>
                        </div>
                      </div>
                    )}
                    {!kindChanged && !contentChanged && (
                      <p className="note-history-text muted">{t('noteHistory.noVisibleChange')}</p>
                    )}
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </Modal>
  )
}
