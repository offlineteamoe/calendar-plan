# Modelo de datos

Todo vive en **Cloud Firestore**, en el proyecto de Firebase de la app. No hay
Google Sheets, ni servidor propio, ni base de datos intermedia: lo que se ve en
pantalla es literalmente lo que hay en estas colecciones.

Este documento existe por dos razones. La primera es operativa: entender dónde
está cada cosa cuando algo falle. La segunda es de diseño a futuro — la
intención declarada es poder conectar más adelante un MCP que responda
preguntas como *"háblame del plan de septiembre 2026 para OEA México: ¿cuál fue
la estrategia semanal, qué creativos rotamos?"*. Por eso cada documento se
escribe de forma **auto-explicativa**: lleva estampado el mes, la letra de
versión y el nombre legible de la región, aunque la app no los necesite (ya
conoce el contexto). Una fila suelta se entiende sin cruzar colecciones.

## Las tres dimensiones que alcanzan todo

Cualquier dato de planificación pertenece a exactamente un **calendario**, y un
calendario son tres cosas juntas:

| Dimensión | Valores | Dónde vive |
|---|---|---|
| **Versión** | `A`, `B`, `C`… | `months/{mes}/versions/{brand}_{country}_{letra}` |
| **Marca** | `OEA`, `OEJR` | campo `brand` |
| **Región** | `LT_EXCL_MX_AR`, `MX`, `AR`, `BR` | campo `country` |

`LT_EXCL_MX_AR` es el bloque de LatAm que se compra junto, igual que en el
Excel original. México, Argentina y Brasil se compran por separado.

El **id de cada documento editable empieza por ese alcance**:
`{version}_{brand}_{country}_…`. Es lo que garantiza que una nota de OEA/México
versión A no aparezca nunca en OEJR/Argentina ni en la versión B — no depende de
que la interfaz filtre bien, depende de que sean documentos distintos.

Crear una versión nueva (B a partir de A) **copia todo** el contenido de A
—plan, notas, escenarios, resultados y creativos— **de ese calendario y solo
de ese**. A partir de ahí las dos evolucionan por separado. La versión nueva
arranca siempre en `maybe`.

## Colecciones

### `months/{month_key}`

`month_key` tiene formato `YYYY-MM` (`2026-09`). Un documento por mes.

| Campo | Tipo | Notas |
|---|---|---|
| `month_key` | string | `2026-09` |
| `status` | string | heredado; la interfaz ya no lo usa |
| `created_by` | string | email |
| `created_at` | string | ISO 8601 |

La **fase** del mes (mes en curso / planeación futura / mes cerrado) **no se
guarda**: se deduce comparando `month_key` con la fecha de hoy (`monthPhase()`
en `src/types.ts`). Un estado que nadie tiene que mantener a mano es un estado
que nunca queda desactualizado.

### `months/{month_key}/versions/{brand}_{country}_{letra}`

**Las versiones pertenecen a un calendario, no al mes.** OEA/México tiene sus
versiones y OEJR/Argentina las suyas: la B de una no existe en la otra. Al
crear un mes se siembra una versión A por cada combinación de marca y región.

| Campo | Tipo | Notas |
|---|---|---|
| `version_id`, `letter` | string | `A`, `B`, … |
| `name` | string | nombre corto del equipo ("Plan agresivo TV"); opcional |
| `description` | string | para qué es y en qué se diferencia; opcional |
| `brand`, `country` | string | a qué calendario pertenece |
| `status` | `maybe` \| `approved` | aprobación de ESTE calendario |
| `copied_from` | string \| null | letra de origen |
| `created_by`, `created_at` | string | |

Eliminar una versión borra también todo su contenido (plan, notas, escenarios,
resultados y creativos de todas las marcas y regiones) y exige la contraseña
compartida del equipo. La última versión de un mes no se puede eliminar.

Como el documento ya es de un solo calendario, `status` es directamente su
aprobación: aprobar OEA/México no toca OEJR/Argentina.

### `months/{month_key}/plan/{version}_{brand}_{country}_{fecha}_{canal}`

La inversión planificada, **un documento por día y canal**.

| Campo | Tipo |
|---|---|
| `date` | `YYYY-MM-DD` |
| `brand`, `country`, `channel` | string |
| `planned_spend` | número |
| `scenario_id` | string (vacío si se escribió a mano) |
| `last_edited_by`, `last_edited_at` | string |
| `month_key`, `version_letter`, `country_label` | *sello legible* |

### `months/{month_key}/nota/{version}_{brand}_{country}_{uuid}`

| Campo | Tipo | Notas |
|---|---|---|
| `kind` | `pendiente` \| `cambio` \| `info` \| `otro` \| `observacion` | rojo / amarillo / azul / morado / fucsia |
| `scope` | `general` \| `week` | general del mes, o de una semana |
| `week_start` | `YYYY-MM-DD` | lunes, solo si `scope = week` |
| `content` | string | texto original tal como se escribió |
| `source_lang` | `es` \| `en` \| `pt` | detectado al guardar |
| `text` | mapa | el mismo texto por idioma, traducido en segundo plano |
| `created_at` | string | automático; nadie elige la fecha |
| `created_by` | string | email |
| `created_by_role` | `admin` \| `viewer` | rol en el momento de escribirla |
| `updated_at`, `updated_by` | string | última edición; el detalle está en `changes` |
| `scope_label` | string | `A · OEA · México` |

`observacion` es la categoría exclusiva de los usuarios de consulta: es la
única que pueden crear, y la ven ellos y los administradores.

**Editar una nota nunca crea una nota nueva.** Se conserva el mismo
`note_id`, el mismo documento, el mismo `created_by` y el mismo `created_at`
—las reglas de seguridad lo exigen— y solo cambian el contenido, la categoría
y `updated_at`/`updated_by`. Cada edición deja una entrada en `changes` con el
estado completo anterior, que es exactamente lo que muestra el botón de
historial de cada nota: quién, cuándo, qué decía antes y qué dice ahora.

Quién puede editar qué:

| Nota escrita por | La puede editar |
|---|---|
| Un administrador | Cualquier administrador |
| Un usuario de consulta (`observacion`) | Solo quien la escribió |

Borrar es distinto de editar: un administrador puede borrar cualquier nota,
pero no puede reescribir en silencio lo que dijo otra persona.

### `months/{month_key}/escenario/{version}_{brand}_{country}_{scenario_id}`

Escenarios semanales: descripción, `weekly_spend` e `is_active`. Solo uno queda
activo por semana × marca × región.

### `months/{month_key}/results/…` y `creative/…`

Una tarjeta de texto libre **por semana**, con id
`{version}_{brand}_{country}_{lunes}`. Guardar vacío borra el documento, para
que no queden filas fantasma. Campos: `week_start`, `content`, `updated_by`,
`updated_at` más el sello legible.

### `months/{month_key}/changes/{change_id}`

El historial. Una entrada por escritura, con el estado completo **antes** y
**después**.

| Campo | Tipo | Notas |
|---|---|---|
| `entity` | `plan` \| `nota` \| `escenario` \| `version` \| `results` \| `creative` \| `bloqueo` | |
| `action` | `create` \| `update` \| `delete` | |
| `doc_id` | string | el documento afectado |
| `where_label` | string | legible: `A · OEA · México · 12 sep · TV` |
| `before`, `after` | objeto \| null | estado completo |
| `user_email`, `user_initials`, `at` | | |

Quién puede leerlo: un administrador ve el historial de todo el equipo; el
resto del dominio, solo las entradas que llevan su propio correo. Está en las
reglas, no solo en la interfaz. Consecuencia práctica al programar: Firestore
**rechaza** una consulta que pudiera devolver documentos que no puedes leer, no
la filtra — así que toda consulta al historial hecha por alguien que no
administra tiene que incluir `where('user_email', '==', <su correo>)`.

Guardar `before` y `after` completos es lo que permite, con el mismo dato:
el historial personal, deshacer/rehacer, volver a un punto anterior, y el
registro de actividad de todo el equipo. Esta colección **nunca se edita ni se
borra** (las reglas lo prohíben): es la memoria de por qué el plan quedó como
quedó, y es probablemente lo más valioso para una consulta futura.

### `presence/{month_key}/users/{uid}`

Efímero: quién está viendo el mes ahora mismo, con `name`, `email`,
`initials`, `currentView` y `lastSeen`. Cada quien solo puede escribir su
propio documento.

### `config/roles`

```json
{ "admins": ["alguien@openenglish.com"] }
```

Un solo documento con la lista de administradores. La leen la app y las reglas
de seguridad, así que **cambiarla no requiere volver a desplegar**. Las tres
cuentas de arranque están además escritas en las reglas y en
`src/lib/roles.ts`, para que borrar este documento por error no deje a la
herramienta sin ningún administrador.

## Permisos, en una frase

Cualquier cuenta del dominio (incluidos subdominios como
`@business.openenglish.com`) **lee todo**. Solo los administradores **escriben**
planificación. Los demás solo pueden crear notas con `kind = "observacion"`
firmadas con su propio email, y borrar las suyas. Esto está en
`firestore.rules`, no en la interfaz: los botones deshabilitados son cortesía,
la regla es la restricción.

## Para el MCP futuro

Lo que hace esta base consultable sin trabajo extra:

- **Ids predecibles.** Sabiendo mes, versión, marca y región se arma el id
  exacto de cualquier documento sin buscar.
- **Sello legible en cada fila.** `month_key`, `version_letter` y
  `country_label` viajan dentro del documento, así que un resultado de búsqueda
  se explica solo.
- **`changes` como narrativa.** Responde el *por qué* y el *cuándo*, no solo el
  estado final.
- **Notas multiidioma.** `text.es` / `text.en` / `text.pt` permiten responder en
  el idioma en que se pregunte, sin traducir en el momento.
- **Consultas de grupo de colección** ya habilitadas para `changes` y
  `versions`: se puede barrer todos los meses de una sola vez.

Lo que haría falta agregar cuando llegue ese proyecto: poblar `real` con el
gasto ejecutado (`BDD PAUTA & SPOTFIRE`), que ya tiene su lugar reservado y el
campo `source_ref` como punto de enganche.
