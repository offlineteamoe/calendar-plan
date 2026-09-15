# Interfaz

Describe qué ve y qué puede hacer una persona en cada pantalla, y las
convenciones visuales que las mantienen coherentes.

## Convenciones que aplican a todo

- **Se usa toda la pantalla.** Nada de contenido centrado en una isla estrecha
  con márgenes vacíos a los lados.
- **Toda acción es visible y tiene nombre.** Nada de iconos sueltos que haya
  que deducir. Si no cabe el nombre, va un icono con `title` y el nombre de lo
  seleccionado al lado.
- **Nada destructivo sin confirmación**, y la confirmación muestra el
  contenido que se va a perder.
- **Los errores se ven en pantalla.** Un fallo silencioso es peor que un error
  feo.
- **Los estados dicen algo del negocio**, no del sistema: *mes en curso*, no
  *activo*.

## Tamaño de la interfaz (zoom)

En el encabezado, un control `− 100% +` agranda o reduce **toda** la
aplicación. El porcentaje es un botón: devuelve al 100 %.

**El encabezado nunca cambia de tamaño**: se escala solo lo que hay debajo. Es
la barra de referencia de la herramienta —quién está conectado, idioma, el
propio control— y moverla cada vez que alguien ajusta el contenido sería
desconcertante.

No es el zoom del navegador. El del navegador agranda el contenido pero no
reduce el área de maquetación, así que en una pantalla pensada para caber
entera aparece scroll de inmediato. Aquí el contenido se maqueta en un lienzo
`1/k` más pequeño que el hueco bajo el encabezado y se escala por `k`: se ve
`k` veces más grande, las proporciones se conservan exactas y sigue cabiendo
en ese hueco.

**El máximo lo decide la pantalla, no un número fijo.** Tras cada aumento se
comprueba si algo empezó a recortarse; si es así, se deshace ese paso y el `+`
queda deshabilitado explicando por qué. Al cambiar el tamaño de la ventana se
vuelve a permitir subir.

**Cada pantalla recuerda el suyo.** El calendario se mira de lejos y agradece
tamaño; la lista de meses se lee de cerca. Se agrupa por tipo de pantalla
—acceso, meses, calendario, registro— no por URL: todos los calendarios
comparten nivel porque comparten maquetación.

El control está en **todas** las pantallas, incluida la de acceso.

Se guarda **en el navegador**, no en la cuenta: el tamaño que va bien en un
portátil de 13" no es el que va bien en un monitor de 27", así que abrir la
herramienta en otro equipo empieza al 100 %.

## Idiomas y tema

Tres idiomas — **español, inglés y portugués** — conmutables desde el
encabezado. **La aplicación arranca siempre en inglés**; si alguien elige otro,
se recuerda su elección en ese navegador.

Todo texto visible pasa por `t()` en `src/i18n/translations.ts`. No hay cadenas
sueltas en los componentes.

Tema claro, oscuro o según el sistema, también desde el encabezado.

## Pantalla de acceso — `#/login`

Fondo animado (red de partículas dibujada en canvas más auroras difuminadas,
sin librerías externas) y una tarjeta central con el acceso por Google.

Detalle que importa: al pulsar *Continuar con Google*, **la tarjeta se
mantiene** con un spinner mientras se abre la ventana de Google. Solo el
arranque de la aplicación (recuperar una sesión previa) muestra una pantalla
vacía.

Selector de idioma y de tema disponibles antes de entrar.

## Lista de meses — `#/`

Un saludo con el nombre de pila y una explicación corta de para qué sirve la
pantalla.

**Los meses son filas a lo ancho**, una debajo de otra. Cada fila muestra:

```
Septiembre          MES EN CURSO    ● Todos los calendarios aprobados      →  ⋯
2026-09
```

- **Fase del mes**, deducida de la fecha, no guardada: *mes en curso*,
  *planeación futura* o *mes cerrado*. Se puede filtrar por ella.
- **Resumen de aprobación**: *"Todos los calendarios aprobados"*, o *"8
  pendientes de aprobación · A · OEA · México"* — dice de un vistazo dónde
  falta algo sin entrar.
- **Menú ⋯** con *Eliminar mes*, solo para administradores.

Pestañas de año arriba (el año en curso y cualquier otro con meses). Un único
botón de *Nuevo mes*, solo para administradores — y **solo uno**: cuando la
lista está vacía desaparece de la barra, porque el estado vacío ya ofrece el
suyo.

**Cuando no hay meses** no queda un texto suelto en medio de un folio en
blanco: una tarjeta con icono, título, una línea de ayuda y la llamada a la
acción. El icono lleva un anillo que late despacio — señal de que la
herramienta está viva y no rota.

Crear un mes abre un modal propio (selector de año y mes, no el calendario
nativo del navegador) y siembra una versión A por cada calendario.

## Calendario — `#/calendar/2026-09`

Tres columnas que ocupan el alto completo de la pantalla, sin scroll vertical.

```
┌─ filtros ─┬──────── calendario ─────────┬──── panel lateral ────┐
│ 0–15%     │ 15–70%                      │ 70–100%               │
│ colapsable│                             │                       │
└───────────┴─────────────────────────────┴───────────────────────┘
```

### Columna de filtros

Marca, región y canal. Se puede plegar para dar aire al calendario.

Orden de las regiones, fijado por el equipo: **LatAm (excl. MX, AR) → México →
Argentina → Brasil**.

### Columna del calendario

**Barra superior — qué calendario estás viendo:**

```
 B  Agresivo TV ▾    MAYBE    OEA · México · TV          [Ver LATAM]
```

- **Chip de versión** con la letra y el nombre. Al pasar el cursor aparece una
  tarjeta con la descripción, quién la creó, cuándo y de cuál se copió. Al
  pulsarlo se abre el menú de versiones.
- **Estado del calendario**: *maybe* (ámbar) o *aprobado* (verde). Se cambia
  pulsándolo. Es por calendario: aprobar OEA/México no toca Argentina.
- **Identificación**: marca · región · canal.
- **Ver LATAM**: vista agregada de solo lectura que suma LatAm (excl. MX/AR) +
  México + Argentina. Disponible solo en esas tres regiones.

**Menú de versiones:**

Lista las versiones **de ese calendario** con nombre y descripción. Cada una
con botones pequeños para renombrar y eliminar (administradores). Al final,
*+ Nueva versión a partir de …*, que abre un modal pidiendo nombre y
descripción antes de copiar.

Eliminar una versión pide la contraseña de borrado. La última versión de un
calendario no se puede eliminar.

**La grilla:**

Cabecera con los nombres de los días alineados sobre sus columnas, número de
semana a la izquierda, y una celda por día con la inversión planificada del
canal abierto. Los días de fuera del mes se atenúan. Se escribe directamente en
la celda; se guarda al salir del campo. En vista LATAM las celdas son de solo
lectura.

El total del mes **no** está aquí: vive en la pestaña *Resumen*, donde suma
todos los canales.

### Panel lateral

Cinco pestañas: **Resumen · Spend · Notas · Resultados · Creativos**.

- **Resumen** — total planificado y escenarios semanales (descripción,
  inversión, cuál está activo).
- **Spend** — reparto por canal en barras.
- **Notas** — ver abajo.
- **Resultados** y **Creativos** — un cuadro de texto libre por semana,
  alineado con el calendario. Guardar vacío borra el cuadro.

## Notas

Dos vistas, conmutables: **Generales** (del mes) y **Por semana**.

### Categorías

| Categoría | Color | Quién la crea |
|---|---|---|
| Pendientes | Rojo | Administradores |
| Cambios | Amarillo | Administradores |
| Información general | Azul | Administradores |
| Otros | Morado | Administradores |
| Observaciones a considerar | Fucsia | Solo cuentas de consulta |

Filtros por categoría con contador. El color va en el borde izquierdo.

### Comportamiento

- **La fecha es automática.** Nadie elige cuándo se escribió una nota.
- **Traducción automática** (si la llave de Cloud Translation está
  configurada): se detecta el idioma en que se escribió y se guarda traducida a
  los otros dos, de modo que cada quien la lee en el suyo. Sin esa llave, la
  nota se muestra tal como se escribió.
- **Toda nota se puede editar** (contenido y categoría), conservando su
  identidad. Cada edición deja rastro.
- **Botón de historial por nota** → modal con la línea de tiempo: creada,
  editada o eliminada, con fecha, autor, y el texto anterior tachado junto al
  actual.

### Notas por semana

Alineadas fila a fila con las semanas del calendario. Cada semana muestra una
nota a la vez:

```
● Pendientes                        ‹ Nota 2 de 5 ›
Confirmar el corte de TV con la agencia…
william · 5 sep, 09:30 · editada
[Ver historial] [Editar] [Eliminar] [Borrar las 5]  [+ Agregar nota]
```

**Se escriben dentro de su propia fila**, nunca en un modal centrado: una nota
de la semana se redacta mirando esa semana del calendario, y un modal taparía
justo lo que hay que ver. En el editor en línea las categorías son puntos de
color con el nombre de la elegida al lado (cuatro etiquetas no caben en esa
altura). `Enter` guarda, `Mayús+Enter` salta de línea, `Escape` cancela.

*Eliminar* borra **esa** nota. *Borrar las N* borra todas las de esa semana, y
ambas piden confirmación mostrando lo afectado.

## Alineación semanal

El calendario y las columnas de la derecha comparten el **mismo ritmo
vertical**, y por eso las semanas quedan a la misma altura:

```
encabezado (--h-head) + subencabezado (--h-sub) + banda (--h-weekhead)
          + N filas de semana con flex:1 y el mismo --week-gap
```

Ambas columnas renderizan exactamente esos bloques. Si algo se desalinea, es
que un panel se saltó uno — **no se compensa con píxeles a ojo**, porque eso se
rompe con otro tamaño de pantalla o con un mes de seis semanas.

La primitiva compartida es `src/features/calendar/WeekGrid.tsx`.

## Colaboración visible

- **Presencia** — avatares en el encabezado de quién tiene el mes abierto. Al
  pasar el cursor, una tarjeta con el nombre completo, el correo en pequeño y
  en qué parte de la aplicación está.
- **Campanita** (administradores) — contador de novedades no leídas; al
  pulsarla se despliega un panel con scroll:

  ```
  CH  cesar.hernandez                     hace 2 minutos
      Devolvió el calendario a maybe (versión A)
      Calendario · Septiembre 2026 · A · OEA · México
  ```

  Lo no leído se mide contra la última vez que se abrió el panel, guardada en
  el navegador. Lo propio nunca cuenta como novedad.
- **Historial personal** — botón propio en el encabezado (no escondido en el
  menú de perfil), con los cambios de uno mismo. Pulsar una entrada revierte a
  ese punto. `Ctrl+Z` y `Ctrl+Y` funcionan.
- **Registro de actividad** (`#/logs`, administradores) — tabla completa de
  todo lo que ha hecho el equipo en todos los meses, filtrable por persona,
  descrito en lenguaje natural.

## Móvil

Por debajo de cierto ancho, el calendario y el panel lateral se convierten en
dos pestañas conmutables; los filtros se pliegan. Las filas de meses pasan a
una columna.
