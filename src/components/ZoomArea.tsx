import type { ReactNode } from 'react'

/**
 * Envuelve el contenido que SÍ se escala con el zoom de la aplicación.
 *
 * El encabezado queda fuera a propósito: es la barra de referencia de la
 * herramienta —quién está conectado, idioma, el propio control de zoom— y
 * cambiarla de tamaño haría que los controles se movieran cada vez que
 * alguien ajusta el contenido.
 */
export function ZoomArea({ children }: { children: ReactNode }) {
  return (
    <div className="zoom-frame">
      <div className="zoom-canvas">{children}</div>
    </div>
  )
}
