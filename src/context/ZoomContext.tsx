// Zoom propio de la aplicación.
//
// Por qué no basta con el zoom del navegador: el del navegador agranda el
// contenido pero NO reduce el área de maquetación, así que en una pantalla
// pensada para caber entera (el calendario) aparece scroll de inmediato. Aquí
// se hace al revés: se maqueta en un lienzo 1/k más pequeño y se escala por k.
// Todo se ve k veces más grande, las proporciones se mantienen exactas, y la
// pantalla sigue cabiendo sin scroll.
//
// El tope no es un número fijo: depende del monitor. Tras cada aumento se
// comprueba si algo empezó a recortarse y, si es así, se deshace el paso y se
// marca el máximo de ESA pantalla. Al cambiar el tamaño de la ventana se
// vuelve a permitir subir.
//
// Se guarda en el navegador, no en la cuenta: el zoom que va bien en un
// portátil de 13" no es el que va bien en un monitor de 27", así que abrir la
// herramienta en otro equipo debe empezar de cero.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'ui-zoom'
const STEP = 0.05
const MIN = 0.7
const MAX = 1.8

interface ZoomContextValue {
  zoom: number
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
  canZoomIn: boolean
  canZoomOut: boolean
  /** true cuando subir más empezaría a recortar contenido en esta pantalla. */
  atScreenLimit: boolean
}

const ZoomContext = createContext<ZoomContextValue | null>(null)

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function readStored(): number {
  try {
    const raw = Number(localStorage.getItem(STORAGE_KEY))
    if (!raw || Number.isNaN(raw)) return 1
    return Math.min(MAX, Math.max(MIN, round(raw)))
  } catch {
    // Modo incógnito o almacenamiento bloqueado: se arranca al 100 %.
    return 1
  }
}

function apply(zoom: number) {
  document.documentElement.style.setProperty('--app-zoom', String(zoom))
}

/**
 * Cuenta los elementos cuyo contenido está siendo recortado. No importa el
 * número absoluto —hay recortes intencionados, como el texto de una nota
 * limitado a dos líneas— sino si AUMENTA al subir el zoom: eso significa que
 * algo que antes se veía entero ha dejado de verse.
 */
function countClipped(): number {
  const root = document.getElementById('root')
  if (!root) return 0
  let clipped = 0
  for (const el of root.querySelectorAll<HTMLElement>('*')) {
    const overflowsY = el.scrollHeight - el.clientHeight > 2
    const overflowsX = el.scrollWidth - el.clientWidth > 2
    if (!overflowsY && !overflowsX) continue
    const { overflowY, overflowX } = getComputedStyle(el)
    // Las zonas con scroll propio (listas de meses, registro, panel de
    // actividad) están diseñadas para desbordarse: no cuentan.
    const clipsY = overflowY === 'hidden' || overflowY === 'clip'
    const clipsX = overflowX === 'hidden' || overflowX === 'clip'
    if ((overflowsY && clipsY) || (overflowsX && clipsX)) clipped += 1
  }
  return clipped
}

export function ZoomProvider({ children }: { children: ReactNode }) {
  const [zoom, setZoom] = useState<number>(readStored)
  const [atScreenLimit, setAtScreenLimit] = useState(false)

  useEffect(() => {
    apply(zoom)
    try {
      localStorage.setItem(STORAGE_KEY, String(zoom))
    } catch {
      // Si no se puede guardar, el zoom sigue funcionando en esta sesión.
    }
  }, [zoom])

  // Otra ventana puede dar más sitio: se vuelve a permitir subir.
  useEffect(() => {
    const onResize = () => setAtScreenLimit(false)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const zoomIn = useCallback(() => {
    setZoom((current) => {
      const next = round(Math.min(MAX, current + STEP))
      if (next === current) return current

      const before = countClipped()
      apply(next)
      // Se mide en el siguiente fotograma, ya con la nueva maquetación.
      requestAnimationFrame(() => {
        if (countClipped() > before) {
          apply(current)
          setZoom(current)
          setAtScreenLimit(true)
        }
      })
      return next
    })
  }, [])

  const zoomOut = useCallback(() => {
    setAtScreenLimit(false)
    setZoom((current) => round(Math.max(MIN, current - STEP)))
  }, [])

  const reset = useCallback(() => {
    setAtScreenLimit(false)
    setZoom(1)
  }, [])

  const value = useMemo<ZoomContextValue>(
    () => ({
      zoom,
      zoomIn,
      zoomOut,
      reset,
      canZoomIn: zoom < MAX && !atScreenLimit,
      canZoomOut: zoom > MIN,
      atScreenLimit,
    }),
    [zoom, zoomIn, zoomOut, reset, atScreenLimit],
  )

  return <ZoomContext.Provider value={value}>{children}</ZoomContext.Provider>
}

export function useZoom(): ZoomContextValue {
  const ctx = useContext(ZoomContext)
  if (!ctx) throw new Error('useZoom debe usarse dentro de <ZoomProvider>')
  return ctx
}
