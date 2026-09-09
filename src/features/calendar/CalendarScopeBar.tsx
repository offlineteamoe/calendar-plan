import { useEffect, useRef, useState } from 'react'
import { COUNTRY_LABELS, type Brand, type Country, type VersionEntry, type VersionStatus } from '../../types'
import { useI18n } from '../../i18n/I18nContext'
import { useRole } from '../../hooks/useRole'
import { formatDateTime } from '../../lib/dateUtils'

interface Props {
  brand: Brand
  country: Country
  /** Canal abierto: forma parte de qué calendario estás viendo. */
  channel: string
  versions: VersionEntry[]
  version: VersionEntry
  /** Estado de ESTE calendario (versión + marca + región), no de la versión entera. */
  status: VersionStatus
  onSelectVersion: (v: VersionEntry) => void
  onToggleStatus: () => void
  onCreateVersion: () => void
  onEditVersion: (v: VersionEntry) => void
  onDeleteVersion: (v: VersionEntry) => void
  creatingVersion: boolean
  latamView: boolean
  onToggleLatamView: () => void
  latamAvailable: boolean
}

/** Tarjeta que explica una versión al pasar el cursor por encima. */
function VersionCard({ version }: { version: VersionEntry }) {
  const { t, locale } = useI18n()
  return (
    <span className="version-card">
      <span className="version-card-top">
        <span className="version-letter">{version.letter}</span>
        <span className="version-card-name">{version.name?.trim() || t('version.unnamed', { letter: version.letter })}</span>
      </span>
      <span className="version-card-desc">{version.description?.trim() || t('version.noDescription')}</span>
      <span className="version-card-foot">
        {version.created_by ? version.created_by.split('@')[0] : '—'}
        {version.created_at && ` · ${formatDateTime(version.created_at, locale)}`}
        {version.copied_from && ` · ${t('version.copiedFrom', { from: version.copied_from })}`}
      </span>
    </span>
  )
}

/**
 * Barra superior del calendario: deja claro QUÉ calendario se está viendo
 * (versión, marca, región, canal), su estado, y permite cambiar de versión,
 * crear una nueva, renombrarla o eliminarla.
 */
export function CalendarScopeBar({
  brand,
  country,
  channel,
  versions,
  version,
  status,
  onSelectVersion,
  onToggleStatus,
  onCreateVersion,
  onEditVersion,
  onDeleteVersion,
  creatingVersion,
  latamView,
  onToggleLatamView,
  latamAvailable,
}: Props) {
  const { t } = useI18n()
  const { canEdit } = useRole()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const nameOf = (v: VersionEntry) => v.name?.trim() || t('version.unnamed', { letter: v.letter })

  return (
    <div className="scope-bar aligned-head">
      <div className="scope-bar-left">
        <div className="menu-anchor version-anchor" ref={ref}>
          <button className="version-chip" onClick={() => setOpen((v) => !v)} title={t('version.switch')}>
            <span className="version-letter">{version.letter}</span>
            <span className="version-chip-name">{nameOf(version)}</span>
            <span className="version-caret">▾</span>
          </button>
          {!open && <VersionCard version={version} />}

          {open && (
            <div className="menu-panel version-menu">
              <div className="menu-head">
                <h3>{t('version.switch')}</h3>
              </div>
              {versions.map((v) => (
                <div className={`version-row ${v.version_id === version.version_id ? 'is-active' : ''}`} key={v.version_id}>
                  <button
                    className="version-row-main"
                    onClick={() => {
                      onSelectVersion(v)
                      setOpen(false)
                    }}
                  >
                    <span className="version-letter">{v.letter}</span>
                    <span className="version-row-text">
                      <span className="version-row-name">{nameOf(v)}</span>
                      {v.description?.trim() && <span className="version-row-desc">{v.description.trim()}</span>}
                    </span>
                  </button>
                  {canEdit && (
                    <span className="version-row-actions">
                      <button
                        className="mini-btn"
                        title={t('version.editTitle', { letter: v.letter })}
                        aria-label={t('version.editTitle', { letter: v.letter })}
                        onClick={() => {
                          setOpen(false)
                          onEditVersion(v)
                        }}
                      >
                        ✎
                      </button>
                      <button
                        className="mini-btn mini-btn-danger"
                        disabled={versions.length <= 1}
                        title={
                          versions.length <= 1
                            ? t('version.deleteLast')
                            : t('version.deleteTitle', { letter: v.letter })
                        }
                        aria-label={t('version.deleteTitle', { letter: v.letter })}
                        onClick={() => {
                          setOpen(false)
                          onDeleteVersion(v)
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  )}
                </div>
              ))}
              {canEdit && (
                <button
                  className="menu-item"
                  disabled={creatingVersion}
                  onClick={() => {
                    setOpen(false)
                    onCreateVersion()
                  }}
                >
                  {creatingVersion ? t('common.saving') : `+ ${t('version.createFrom', { letter: version.letter })}`}
                </button>
              )}
            </div>
          )}
        </div>

        <button
          className={`pill status-toggle ${status === 'approved' ? 'pill-ok' : 'pill-warn'}`}
          onClick={onToggleStatus}
          disabled={!canEdit}
          title={canEdit ? t('version.toggleStatus') : t('role.readOnly')}
        >
          {t(`version.status.${status}`)}
        </button>

        <span className="scope-bar-where">
          <strong>{brand}</strong>
          <span className="scope-sep">·</span>
          {latamView ? t('latam.viewing') : COUNTRY_LABELS[country]}
          <span className="scope-sep">·</span>
          <span className="scope-channel">{channel}</span>
        </span>
      </div>

      <div className="scope-bar-right">
        {latamAvailable && (
          <button
            className={`btn btn-ghost latam-toggle ${latamView ? 'is-on' : ''}`}
            onClick={onToggleLatamView}
            title={t('latam.hint')}
          >
            {latamView ? t('latam.back') : t('latam.see')}
          </button>
        )}
      </div>
    </div>
  )
}
