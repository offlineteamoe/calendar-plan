// Impide que un parche de prueba llegue a producción.
//
// Existe por un incidente real: para revisar el diseño sin sesión de Google se
// desactivó el control de acceso con `if (false && status !== 'signed-in')`.
// La restauración posterior falló en silencio (un `git checkout --` con varias
// rutas no restaura NINGUNA si una de ellas no está en git), el parche se
// publicó, y la aplicación quedó sirviendo la pantalla principal sin pedir
// login. Firestore la rechazaba —las reglas hicieron su trabajo— pero el
// usuario solo veía "Missing or insufficient permissions" sin entender nada.
//
// Un fallo así no puede depender de que alguien se acuerde de deshacer algo.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const FORBIDDEN = [
  { pattern: /\bif\s*\(\s*false\s*&&/, why: 'condición desactivada con `false &&`' },
  { pattern: /\bif\s*\(\s*true\s*\)\s*return/, why: 'retorno forzado con `if (true) return`' },
]

const problems = []

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      walk(full)
      continue
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue
    const lines = readFileSync(full, 'utf8').split('\n')
    lines.forEach((line, i) => {
      for (const { pattern, why } of FORBIDDEN) {
        if (pattern.test(line)) problems.push(`${full}:${i + 1}  ${why}\n    ${line.trim()}`)
      }
    })
  }
}

walk('src')

if (problems.length > 0) {
  console.error('\nParches de prueba sin revertir:\n')
  console.error(problems.join('\n\n'))
  console.error('\nQuítalos antes de compilar.\n')
  process.exit(1)
}
