import { useEffect, useRef, useState } from 'react'
import { COUNTRY_LABELS, type Brand, type Country, type VersionEntry, type VersionStatus } from '../../types'
import { useI18n } from '../../i18n/I18nContext'
import { useRole } from '../../hooks/useRole'

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
  creatingVersion: boolean
  latamView: boolean
  onToggleLatamView: () => void
  latamAvailable: boolean
}

/**
 * Barra superior del calendario: deja claro QUÉ calendario se está viendo
 * (versión, marca, región), su estado (maybe/aprobado), permite cambiar de
 * versión, crear una nueva y encender la vista agregada de LATAM.
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

  return (
    <div className="scope-bar aligned-head">
      <div className="scope-bar-left">
        <div className="menu-anchor" ref={ref}>
          <button className="version-chip" onClick={() => setOpen((v) => !v)} title={t('version.switch')}>
            <span className="version-letter">{version.letter}</span>
            {t('version.label')}
            <span className="version-caret">▾</span>
          </button>
          {open && (
            <div className="menu-panel" style={{ left: 0, right: 'auto', minWidth: 230 }}>
              <div className="menu-head">
                <h3>{t('version.switch')}</h3>
              </div>
              {versions.map((v) => (
                <button
                  key={v.version_id}
                  className={`menu-item ${v.version_id === version.version_id ? 'menu-item-active' : ''}`}
                  onClick={() => {
                    onSelectVersion(v)
                    setOpen(false)
                  }}
                >
                  <span className="version-letter">{v.letter}</span>
                  <span className="menu-item-label">{t('version.label')} {v.letter}</span>
                </button>
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
