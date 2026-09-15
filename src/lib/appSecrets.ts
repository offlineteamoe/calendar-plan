// La contraseña de borrado, fuera del código.
//
// Antes vivía como una constante en un componente, lo que significaba que
// viajaba dentro del JavaScript que sirve GitHub Pages: cualquiera en internet
// podía leerla. Ahora vive en `config/secrets`, un documento que las reglas
// solo dejan leer a los administradores. Quien no tenga una sesión de una
// cuenta administradora no puede obtenerla de ninguna forma.
//
// Sigue sin ser una credencial de seguridad: lo que impide borrar es el rol,
// impuesto por las reglas en el servidor. Esto es fricción deliberada para que
// borrar algo grande no sea nunca un clic accidental. Pero ahora la fricción
// es real para todo el mundo, no solo para quien no sepa abrir el código.

import { doc, getDoc, setDoc } from 'firebase/firestore'
import { getDb } from './firebaseClient'

const DOC_PATH = ['config', 'secrets'] as const

/**
 * La contraseña configurada, o `null` si todavía no hay ninguna (o si quien
 * pregunta no tiene permiso para leerla).
 */
export async function getDeletePassword(): Promise<string | null> {
  try {
    const snap = await getDoc(doc(getDb(), ...DOC_PATH))
    const value = snap.data()?.deletePassword
    return typeof value === 'string' && value.length > 0 ? value : null
  } catch {
    // Sin permiso: quien pregunta no administra. Se comporta igual que si no
    // estuviera configurada, y el borrado queda bloqueado.
    return null
  }
}

/** Define o cambia la contraseña. Las reglas solo lo permiten a las cuentas de arranque. */
export async function setDeletePassword(password: string): Promise<void> {
  await setDoc(doc(getDb(), ...DOC_PATH), { deletePassword: password }, { merge: true })
}
