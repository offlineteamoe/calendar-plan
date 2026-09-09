// Firestore rechaza `undefined` en cualquier punto del documento: la
// escritura entera lanza. Es una fuente de fallos silenciosos difícil de ver,
// porque un objeto leído y vuelto a escribir arrastra campos opcionales sin
// valor sin que nada lo delate hasta que falla en producción.
//
// Ya costó un bug: al editar una nota, su entrada de historial no se
// guardaba porque el estado anterior traía `updated_at: undefined`, y el
// registro de cambios se traga sus errores a propósito para no tumbar la
// operación principal.

/** Copia el valor sin las claves cuyo valor es `undefined`, en profundidad. */
export function pruneUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => pruneUndefined(item)) as unknown as T
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item === undefined) continue
      out[key] = pruneUndefined(item)
    }
    return out as T
  }
  return value
}
