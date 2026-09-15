// Zoom propio de la aplicación, con un nivel guardado POR PANTALLA.
//
// Por qué no basta con el zoom del navegador: el del navegador agranda el
// contenido pero NO reduce el área de maquetación, así que en una pantalla
// pensada para caber entera (el calendario) aparece scroll de inmediato. Aquí
// se hace al revés: se maqueta en un lienzo 1/k más pequeño y se escala por k.
// Todo se ve k veces más grande, las proporciones se mantienen exactas, y la
// pantalla sigue cabiendo sin scroll.
//
// Cada pantalla recuerda el suyo porque no piden lo mismo: el calendario se
// mira de lejos y agradece tamaño, la lista de meses se lee de cerca. Se
// agrupa por TIPO de pantalla, no por URL: todos los calendarios comparten
// nivel, porque comparten maquetación.
//
// El tope no es un número fijo: depende del monitor. Tras cada aumento se
// comprueba si algo empezó a recortarse y, si es así, se deshace el paso y se
// marca el máximo de ESA pantalla. Al cambiar el tamaño de la ventana se
// vuelve a permitir subir.
//
// Se guarda en el navegador, no en la cuenta: el zoom que va bien en un
// portátil de 13" no es el que va bien en un monitor de 27", así que abrir la
// herramienta en otro equipo debe empezar de cero.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

const STORAGE_KEY = 'ui-zoom'
const STEP = 0.05
const MIN = 0.7
const MAX = 1.8

type Levels = Record<string, number>

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

function clamp(value: number): number {
  return Math.min(MAX, Math.max(MIN, round(value)))
}

/** Tipo de pantalla, no URL: todos los calendarios comparten nivel. */
function pageKeyOf(pathname: string, signedIn: boolean): string {
  if (!signedIn) return 'login'
  if (pathname.startsWith('/calendar')) return 'calendar'
  if (pathname.startsWith('/logs')) return 'logs'
  return 'months'
}

function readStored(): Levels {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    // Versión anterior: un único número para toda la aplicación. Se respeta
    // como punto de partida de todas las pantallas.
    const asNumber = Number(raw)
    if (!Number.isNaN(asNumber) && asNumber > 0) {
      const value = clamp(asNumber)
      return { login: value, months: value, calendar: value, logs: value }
    }
    const parsed = JSON.parse(raw) as Levels
    const out: Levels = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'number' && !Number.isNaN(value)) out[key] = clamp(value)
    }
    return out
  } catch {
    // Modo incógnito, almacenamiento bloqueado o dato corrupto: se arranca
    // al 100 % en todas las pantallas.
    return {}
  }
}

function apply(zoom: number) {
  document.documentElement.style.setProperty('--app-zoom', String(zoom))
}

/**
 * Cuánto contenido está quedando fuera de la vista. No importa el número
 * absoluto —hay recortes intencionados, como el texto de una nota limitado a
 * dos líneas— sino si AUMENTA al subir el zoom: eso significa que algo que
 * antes se veía entero ha dejado de verse.
 *
 * Se mide en dos sitios porque son dos fallos distintos:
 *  · elementos que recortan su propio contenido, y
 *  · el lienzo entero desbordando su hueco, que se nota como contenido
 *    saliéndose por un lado. Ese hay que medirlo aparte: `transform` no
 *    interviene en las métricas de scroll, así que el marco que lo contiene
 *    no lo delata.
 */
function overflowScore(): number {
  let score = countClippedElements()
  const canvas = document.querySelector<HTMLElement>('.zoom-canvas')
  if (canvas) {
    if (canvas.scrollWidth - canvas.clientWidth > 2) score += 1
    if (canvas.scrollHeight - canvas.clientHeight > 2) score += 1
  }
  return score
}

function countClippedElements(): number {
  const root = document.getElementById('root')
  if (!root) return 0
  let clipped = 0
  for (const el of root.querySelectorAll<HTMLElement>('*')) {
    const overflowsY = el.scrollHeight - el.clientHeight > 2
    const overflowsX = el.scrollWidth - el.clientWidth > 2
    if (!overflowsY && !overflowsX) continue
    const { overflowY, overflowX } = getComputedStyle(el)
    // Las zonas con scroll propio (lista de meses, registro, panel de
    // actividad) están diseñadas para desbordarse: no cuentan.
    const clipsY = overflowY === 'hidden' || overflowY === 'clip'
    const clipsX = overflowX === 'hidden' || overflowX === 'clip'
    if ((overflowsY && clipsY) || (overflowsX && clipsX)) clipped += 1
  }
  return clipped
}

export function ZoomProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { status } = useAuth()
  const pageKey = pageKeyOf(pathname, status === 'signed-in')

  const [levels, setLevels] = useState<Levels>(readStored)
  const [atScreenLimit, setAtScreenLimit] = useState(false)

  const zoom = levels[pageKey] ?? 1

  // El nivel vigente, legible de forma síncrona. Sin esto, dos clics seguidos
  // antes de que React redibuje leen el mismo valor y el segundo no avanza.
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom

  useEffect(() => {
    apply(zoom)
  }, [zoom])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(levels))
    } catch {
      // Si no se puede guardar, el zoom sigue funcionando en esta sesión.
    }
  }, [levels])

  // Cambiar de pantalla o de tamaño de ventana da otro margen: se vuelve a
  // permitir subir.
  useEffect(() => setAtScreenLimit(false), [pageKey])
  useEffect(() => {
    const onResize = () => setAtScreenLimit(false)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const setFor = useCallback(
    (key: string, value: number) => setLevels((prev) => ({ ...prev, [key]: value })),
    [],
  )

  const zoomIn = useCallback(() => {
    const current = zoomRef.current
    const next = clamp(current + STEP)
    if (next === current) return

    const before = overflowScore()
    apply(next)
    zoomRef.current = next
    setFor(pageKey, next)
    // Se mide en el siguiente fotograma, ya con la nueva maquetación.
    requestAnimationFrame(() => {
      if (overflowScore() > before) {
        apply(current)
        zoomRef.current = current
        setFor(pageKey, current)
        setAtScreenLimit(true)
      }
    })
  }, [pageKey, setFor])

  const zoomOut = useCallback(() => {
    setAtScreenLimit(false)
    const next = clamp(zoomRef.current - STEP)
    zoomRef.current = next
    setFor(pageKey, next)
  }, [pageKey, setFor])

  const reset = useCallback(() => {
    setAtScreenLimit(false)
    zoomRef.current = 1
    setFor(pageKey, 1)
  }, [pageKey, setFor])

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
