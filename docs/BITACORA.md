# Bitácora

Memoria histórica de la construcción: qué se hizo, qué falló y cómo se
resolvió. **No es documentación de referencia** — para saber cómo funciona la
herramienta hoy, ver [ARQUITECTURA.md](ARQUITECTURA.md) y sus hermanos.

Existe para que quien retome el proyecto no repita caminos ya recorridos ni
errores ya pagados.

---

## Fase 0 — Análisis (septiembre 2026)

Se analizaron tres fuentes antes de escribir código:

1. **`Plan Sep 2026 - Proyecto Atribución.xlsm`** — el Excel a reemplazar. De
   ahí salió el modelo real: marcas, regiones, canales, semanas, escenarios, y
   el bucket `LT_EXCL_MX_AR` como bloque de compra.
2. **`C:\BrandformanceOS`** — proyecto anterior del equipo. Buena interfaz
   (grilla + panel lateral con pestañas), arquitectura inviable: exigía un
   servidor Node en el portátil de una persona conectado por VPN.
3. **`PPT HTML`** — dashboard del equipo ya en producción: sitio estático en
   GitHub Pages con acceso por cuenta de Google. El patrón a copiar.

**Decisión de partida:** GitHub Pages + datos en la nube, sin servidor propio.

---

## Cambio de rumbo — de Google Sheets a Firestore

El plan original guardaba todo en una hoja maestra por mes, clonada de la
anterior. Se descartó **antes de terminarlo**:

- Configurarlo exigía crear y compartir hojas a mano, mes a mes.
- El "tiempo real" era en realidad *avisar que algo cambió para volver a leer*.
- El acceso necesitaba dos pasos: token de Drive/Sheets **y** sesión de
  Firebase.

Firestore resolvió los tres: tiempo real de verdad, acceso en un clic y reglas
de seguridad por documento.

**Lo que se perdió:** ya no existe una hoja de cálculo cruda que alguien pueda
abrir por fuera para mirar o corregir filas a mano.

---

## Incidentes y cómo se resolvieron

### `npm install` fallaba en la unidad de Google Drive

`EBADF`, `TAR_ENTRY_ERROR`. Drive bloquea archivos durante la sincronización.
**Solución:** el proyecto vive en `C:\Users\william.fonseca\Projects\`.

### "Eliminar un mes no hace nada"

Se depuró el código durante toda una sesión. No era el código: las reglas
**publicadas** todavía tenían `allow delete: if false`. El archivo del
repositorio estaba bien; nadie lo había publicado.

**Solución:** se corrigieron las reglas y, sobre todo, **todo error de
escritura pasó a mostrarse en pantalla**. Un fallo silencioso cuesta horas; un
error feo, segundos.

### El menú de tres puntos de un mes no mostraba nada

`.month-card { overflow: hidden }` recortaba el desplegable.

### El botón de plegar filtros era invisible

`.icon-btn` heredaba un color pensado para el encabezado oscuro.

### Las reglas se corrompían al escribirlas en la consola

Teclear dentro del editor de la consola de Firebase provoca autocompletado de
llaves y sangría, y termina duplicando bloques enteros.

**Regla desde entonces:** nunca teclear ahí. Se copia el archivo completo y se
pega.

### Traducciones duplicadas entre idiomas

Una inserción automática anclada en una clave que existía igual en dos bloques
metió las cadenas en el idioma equivocado.

**Solución:** las inserciones de traducciones se hacen delimitando primero el
bloque de cada idioma.

### Notas y notas semanales sin alinear con el calendario

**Solución:** no ajustar píxeles. Ambas columnas comparten el mismo ritmo
vertical (`WeekGrid`). Ver [INTERFAZ.md](INTERFAZ.md).

---

## 2026-09-09 — Roles, historial y migración

Sesión larga, con varios hallazgos encadenados.

### Se añadieron roles

Tres administradores; el resto del dominio, solo consulta, con una categoría
de nota propia (*Observaciones a considerar*). La restricción se puso en las
reglas, no solo en la interfaz.

### Una cuenta del equipo no podía ni entrar

`dolores.yanes@business.openenglish.com` está en un **subdominio**, y la
comprobación exigía `@openenglish.com` exacto.

**Solución:** se aceptan el dominio y sus subdominios, exigiendo el punto
separador para que `notopenenglish.com` no cuele.

### El estado *maybe / aprobado* no llegaba a las demás sesiones

Se leía una sola vez y quedaba en caché. Los demás seguían viendo "aprobado"
hasta recargar.

**Solución:** `useVersions` pasó a ser un listener. **Primera aparición de un
patrón que se repetiría dos veces más.**

### El historial de una nota salía vacío

Al editar una nota, su entrada de historial no se guardaba. Causa: el estado
anterior arrastraba campos en `undefined` (por ejemplo `updated_at` en una nota
nunca editada), **Firestore rechaza `undefined`**, y el registro de cambios se
traga sus errores a propósito para no tumbar la operación principal. La edición
se guardaba; el historial, no, y nada lo delataba.

**Solución:** `src/lib/firestoreSafe.ts` (`pruneUndefined`) limpia antes de
escribir.

### Las notificaciones flotantes decían `update · version`

No significaba nada para quien las leía.

**Solución:** cada escritura guarda `summary_key` + `summary_params`, y la
frase se arma en el idioma de quien mira. Los avisos flotantes se sustituyeron
por una campanita con panel desplegable.

### La documentación apuntaba al proyecto de Firebase equivocado

Todo el tutorial de pasos manuales enviaba a `calendar-plan-c36b5`, un proyecto
vacío creado por error al principio. La aplicación corría en otro.

**Lección:** la fuente de verdad es `VITE_FIREBASE_PROJECT_ID`, nunca lo que
diga un documento.

### El proyecto de Firebase estaba compartido con otra herramienta

Al revisar la base de datos apareció una colección `CaseActivity` ajena. Las
reglas aplican a **toda** la base de un proyecto, y las nuestras terminan con
"todo lo demás, denegado".

**Decisión:** migrar a un proyecto propio, `offline-planning`, creado desde la
cuenta del equipo (`am@openenglish.com`). Se hizo en ese momento porque los
datos aún eran de prueba: era el instante más barato para mover.

La configuración de Firebase pasó **al código** como valores por defecto, y se
borraron las variables del repositorio. No es secreta —viaja en el JavaScript
del navegador de todos modos— y así el repositorio es autocontenido.

### El coste oculto de la presencia

Con un latido cada 30 segundos, 10 personas y jornada de 8 horas: ~9.600
escrituras diarias solo para pintar avatares, **la mitad del cupo gratuito**. Y
una pestaña olvidada en segundo plano escribía igual que alguien trabajando.

**Solución:** un minuto entre latidos, y ninguno mientras la pestaña esté
oculta.

### Un parche de prueba llegó a producción

Para revisar el diseño sin sesión de Google se había desactivado el control de
acceso con `if (false && status !== 'signed-in')`. La restauración falló **en
silencio**: `git checkout --` con varias rutas no restaura ninguna si una de
ellas no está en git. El parche se publicó y la aplicación servía la pantalla
principal sin pedir acceso.

Los datos nunca estuvieron expuestos — Firestore rechazó cada lectura, que es
lo que se veía como *"Missing or insufficient permissions"* — pero la
aplicación era inusable y el mensaje no explicaba nada.

**Solución:** `scripts/check-no-debug.mjs` corre antes de cada build y falla si
encuentra un parche así. Un fallo de este tipo no puede depender de que alguien
se acuerde de deshacer algo.

### Los datos del calendario no eran en vivo

Solo la presencia y las versiones eran listeners. El plan, las notas, los
escenarios y las tarjetas semanales se leían una vez y se quedaban en caché; lo
que las refrescaba era una señal indirecta desde el historial de cambios.

Ese intermediario falló de forma invisible: al restringir el historial para que
nadie lea el rastro ajeno, **las cuentas de consulta dejaron de recibir la
señal** y su pantalla quedaba congelada. Una nota borrada por otra persona
seguía en pantalla hasta hacer clic en algo.

**Solución:** `useLiveDocs` (`onSnapshot`) para todos los datos del calendario.
Tercera y última aparición del mismo patrón — de ahí la regla dura en
`CLAUDE.md`: *los datos del calendario no se leen con consultas en caché*.

---

## 2026-09-14 — Interfaz y modelo de versiones

### Las notas semanales se escribían en un modal centrado

Una nota de la semana se redacta mirando esa semana del calendario, y el modal
tapaba justo eso.

**Solución:** editor en línea dentro de la propia fila de la semana. Las
categorías pasan a puntos de color con el nombre de la elegida al lado, porque
cuatro etiquetas no caben en esa altura.

### Los nombres de los días aparecían amontonados a la izquierda

La fila de días es una grilla de ocho columnas, pero una regla CSS posterior le
aplicaba `display: flex` y la aplastaba.

**Solución:** los nombres ocupan la banda del subencabezado con las mismas
columnas que las celdas. De paso se quitaron del calendario el total del mes
(ya estaba en *Resumen*) y la etiqueta suelta del canal (subió al título, junto
a marca y región).

### Las versiones colgaban del mes, no del calendario

Cambiar de marca o de región seguía mostrando las mismas versiones A/B/C,
aunque el contenido de abajo no tuviera nada que ver.

Era **la única excepción del modelo**: el plan, las notas, los escenarios, los
resultados y los creativos siempre estuvieron aislados por marca y región.

**Solución:** el documento de la versión lleva `brand` y `country`, su id pasa
a `{brand}_{country}_{letra}`, crear un mes siembra una versión A por
calendario, y crear una versión copia solo el contenido del suyo. Como cada
documento es ya de un solo calendario, el estado de aprobación volvió a ser un
campo normal — el mapa `scope_status` existía solo porque una versión abarcaba
ocho calendarios a la vez.

### Las versiones no se podían identificar ni borrar

**Solución:** nombre y descripción opcionales por versión, tarjeta al pasar el
cursor, modal al crear, y botones para renombrar y eliminar. Eliminar pide la
misma contraseña que eliminar un mes, y la última versión de un calendario no
se puede borrar.

Se añadió renombrar sin que se pidiera: sin eso, un nombre mal escrito sería
permanente y la única salida sería borrar la versión entera.

---

## Patrones que se repitieron

Tres lecciones que costaron más de una vez:

1. **Lo que otra persona puede cambiar tiene que ser un listener.** Falló tres
   veces: el estado de aprobación, los datos del calendario y, entre medias, la
   señal indirecta que intentaba suplirlos.
2. **Un fallo silencioso cuesta horas; un error visible, segundos.** El borrado
   que no borraba, el historial vacío y el registro de cambios que se tragaba
   sus errores fueron todos lo mismo.
3. **Lo que no verifica una máquina, se olvida.** El parche de acceso llegó a
   producción porque la restauración dependía de que alguien se acordara. Ahora
   lo comprueba el build.

### Al crear la versión B desaparecía la A

Un calendario sin versiones guardadas muestra una **A sintética**, que solo
existe en pantalla. Al crear la B —la primera versión real— la lista pasaba a
tener contenido y la sintética dejaba de añadirse: la A desaparecía del menú y,
con ella, el acceso a todo lo que ya se hubiera escrito debajo. El contenido
seguía en la base, simplemente sin ninguna versión desde la que llegar a él.

**Solución:** crear una versión guarda primero la de origen si aún no existe.

Al revisarlo apareció un segundo riesgo, todavía no disparado: la letra nueva
se elegía tomando **el primer hueco libre**, así que en un calendario que
hubiera quedado solo con B, la siguiente versión se habría llamado A y habría
sobrescrito el contenido huérfano. Ahora las letras avanzan siempre hacia
adelante.

---

## Pestaña Resultados con datos reales (17 sep 2026)

Petición: la pestaña Resultados deja de ser un cuadro de texto y muestra las
cifras de Spotfire por semana, según la marca y la región abiertas, con
subpestañas WOW, YOY, 2025 WOW y Margen, y con la posibilidad de mirar solo
ciertos días de la semana.

**Las rutas no se escribieron en el código.** El equipo mantiene
`Reglas y Rutas.xlsx` justamente porque las carpetas cambian de sitio; el ETL
lee la ruta de ahí.

### Lo que se descartó

- **Leer los decks directamente desde el navegador.** `OE-LATAM.json` pesa
  30 MB y los ocho suman 77 MB. Cambiar de marca habría costado otra descarga
  igual.
- **Guardar los resultados en Firestore.** Decisión ya tomada antes por el
  cupo, y aquí se confirma: son datos de solo lectura que se regeneran a
  diario.

### Errores encontrados al construirlo

- **La rejilla de métricas rompía la alineación con el calendario.** Las
  subpestañas y el filtro de días se habían puesto como dos bandas nuevas
  encima de las semanas, lo que empujaba hacia abajo todo el panel derecho:
  las semanas dejaban de coincidir con las del calendario de la izquierda, que
  es justo lo que `WeekGrid` existe para garantizar. Se metieron dentro de las
  dos bandas que ya existían (subencabezado y encabezado de semanas).
- **La etiqueta de cada métrica se recortaba.** La celda tenía tres líneas
  (etiqueta, valor, variación) y en una ventana baja `overflow:hidden` se comía
  la primera — la única que dice qué se está mirando. Ahora son dos: etiqueta
  arriba, valor y variación en la misma línea.
- **La comparación de la semana en curso era tramposa.** Tres días cerrados
  contra siete hacía que todo apareciera desplomándose. Ahora las dos ventanas
  se recortan igual y la semana avisa de que es parcial.

### Comprobación

La lógica que va a la web (`src/lib/results.ts`) se corrió en Node contra el
archivo real y se comparó, cifra por cifra, con un recálculo independiente
hecho en Python directamente sobre los decks crudos: coinciden en los siete
calendarios probados. Las tres ventanas de comparación caen siempre en lunes.

### Limitación del origen, no del cálculo

A 17-sep-2026 el gasto de medios de LatAm y México venía en cero desde el día
14 aunque sí hubiera leads, mientras que Brasil sí lo traía hasta el 16. En los
días más recientes de esos mercados el CPL sale artificialmente bajo y el %MNCC
artificialmente alto. Es lo que entrega la fuente.
