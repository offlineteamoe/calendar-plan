// Deshacer / rehacer (Ctrl+Z / Ctrl+Y) sobre los cambios que YO hice en esta
// pestaña. Se apoya en los ChangeRecord: deshacer aplica `before`, rehacer
// vuelve a aplicar `after`. La pila es por sesión a propósito — deshacer algo
// que hizo otra persona hace tres días sería una sorpresa desagradable; para
// eso está el historial, donde se elige explícitamente el punto.

import { useCallback, useEffect, useRef, useState } from 'react'
import { applyChangeState, type ChangeAuthor } from '../lib/changelog'
import type { ChangeRecord } from '../types'

interface Options {
  myEmail: string
  author: ChangeAuthor
  /** Cambios del mes en tiempo real, más recientes primero. */
  changes: ChangeRecord[]
  onApplied: () => void
}

export function useUndoRedo({ myEmail, author, changes, onApplied }: Options) {
  const [busy, setBusy] = useState(false)
  // Ids ya deshechos por mí en esta sesión, para poder rehacerlos.
  const undoneRef = useRef<ChangeRecord[]>([])
  const [undoneCount, setUndoneCount] = useState(0)

  const myChanges = changes.filter((c) => c.user_email === myEmail && !c.reverted)
  const canUndo = myChanges.length > 0 && !busy
  const canRedo = undoneCount > 0 && !busy

  const undo = useCallback(async () => {
    const target = changes.find((c) => c.user_email === myEmail && !c.reverted)
    if (!target || busy) return
    setBusy(true)
    try {
      await applyChangeState(target, 'undo', author)
      undoneRef.current = [target, ...undoneRef.current]
      setUndoneCount(undoneRef.current.length)
      onApplied()
    } catch (err) {
      console.warn('No se pudo deshacer:', err)
    } finally {
      setBusy(false)
    }
  }, [changes, myEmail, busy, author, onApplied])

  const redo = useCallback(async () => {
    const [target, ...rest] = undoneRef.current
    if (!target || busy) return
    setBusy(true)
    try {
      await applyChangeState(target, 'redo', author)
      undoneRef.current = rest
      setUndoneCount(rest.length)
      onApplied()
    } catch (err) {
      console.warn('No se pudo rehacer:', err)
    } finally {
      setBusy(false)
    }
  }, [busy, author, onApplied])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        void undo()
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault()
        void redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  return { undo, redo, canUndo, canRedo, busy }
}
