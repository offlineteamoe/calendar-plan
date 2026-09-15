import { useZoom } from '../context/ZoomContext'
import { useI18n } from '../i18n/I18nContext'

/**
 * Control de tamaño de la interfaz: − 110 % +.
 *
 * El porcentaje es un botón: devuelve al 100 %. Cuando no se puede subir más
 * sin que algo se recorte, el "+" queda deshabilitado y explica por qué, en
 * lugar de dejar de responder sin motivo aparente.
 */
export function ZoomControl() {
  const { zoom, zoomIn, zoomOut, reset, canZoomIn, canZoomOut, atScreenLimit } = useZoom()
  const { t } = useI18n()

  return (
    <div className="zoom-control" role="group" aria-label={t('zoom.label')}>
      <button
        className="zoom-btn"
        onClick={zoomOut}
        disabled={!canZoomOut}
        title={t('zoom.out')}
        aria-label={t('zoom.out')}
      >
        −
      </button>
      <button
        className="zoom-value"
        onClick={reset}
        disabled={zoom === 1}
        title={zoom === 1 ? t('zoom.label') : t('zoom.reset')}
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        className="zoom-btn"
        onClick={zoomIn}
        disabled={!canZoomIn}
        title={atScreenLimit ? t('zoom.limit') : t('zoom.in')}
        aria-label={t('zoom.in')}
      >
        +
      </button>
    </div>
  )
}
