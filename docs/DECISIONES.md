# Por qué la herramienta es como es

Registro de las decisiones que costaron discusión o un error, para no volver a
recorrer el mismo camino. Si algo aquí parece raro, lo más probable es que ya
se probó la alternativa obvia.

## Firestore en vez de Google Sheets

El plan original guardaba todo en una hoja maestra por mes, clonada de la
anterior. Se descartó antes de terminarlo:

- Configurarlo pedía crear y compartir hojas a mano, mes a mes.
- El "tiempo real" era en realidad *avisar que algo cambió para volver a leer*.
- El login necesitaba dos pasos (token de Drive/Sheets + sesión de Firebase).

Firestore da tiempo real de verdad (`onSnapshot`), login de un paso y reglas de
seguridad por documento. **Lo que se perdió:** ya no hay una hoja de cálculo
cruda que alguien pueda abrir por fuera para mirar o corregir filas a mano.

## Nada de servidor propio

El proyecto anterior del equipo (`BrandformanceOS`) resolvía bien la interfaz
pero exigía un Node corriendo en el portátil de una persona, conectado por VPN.
Cualquier propuesta que reintroduzca un servicio que alguien tenga que mantener
encendido está descartada por diseño.

## La seguridad vive en las reglas, no en la interfaz

Deshabilitar un botón es cortesía. La restricción real está en
`firestore.rules`, porque cualquiera puede escribir en Firestore desde la
consola del navegador. De ahí dos consecuencias que se repiten:

- Nunca alcanza con `request.auth != null`: cualquier cuenta de Google puede
  autenticarse contra Firebase. El dominio se valida en **cada** regla.
- Editar una nota no puede reescribir `created_by` ni `created_at`. Sin eso, el
  historial por nota sería decorativo.

**Error que costó una sesión entera:** "eliminar no hace nada". No era el
código: eran las reglas publicadas, que todavía tenían `allow delete: if
false`. Desde entonces, todo error de escritura se muestra en pantalla.

## Lista de administradores duplicada a propósito

Las tres cuentas están en `src/lib/roles.ts` **y** en `firestore.rules`,
además del documento `config/roles` que es la lista viva. La duplicación es
deliberada: si alguien borra o vacía ese documento, esas tres cuentas siguen
pudiendo administrar y arreglarlo. Sin ese respaldo, un error de edición deja
la herramienta sin ningún administrador y sin forma de recuperarla desde la
propia app.

## Subdominios en el correo

`dolores.yanes@business.openenglish.com` no habría podido ni entrar con la
comprobación original (`@openenglish.com` exacto). Se acepta el dominio y sus
subdominios, exigiendo el punto separador para que `notopenenglish.com` no
cuele.

## La fase del mes se deduce, no se guarda

"Activo / archivado" no le decía nada a nadie. Ahora es *mes en curso /
planeación futura / mes cerrado*, calculado comparando `month_key` con la fecha
de hoy. Un estado que nadie tiene que mantener a mano es un estado que nunca
queda desactualizado.

## Aprobación por calendario, no por versión

Una versión cubre las dos marcas y las cuatro regiones. Aprobar OEA/México no
significa aprobar OEJR/Argentina, así que el estado vive en un mapa
`scope_status` dentro del documento de la versión, con clave
`{brand}_{country}`. Guardarlo en el mismo documento —en vez de una colección
aparte— permite resumir el estado de aprobación de todos los meses con una
sola consulta.

## Campanita en vez de avisos flotantes

Los toasts obligaban a leer rápido y se perdían si no estabas mirando. La
campanita acumula, muestra un contador de lo no leído (medido contra la última
vez que se abrió el panel, guardada en el navegador) y permite revisar con
calma.

Lo más importante del cambio no fue el formato sino **el texto**: antes decía
`update · version`, que no significa nada para quien lo lee. Ahora cada
escritura guarda `summary_key` + `summary_params` y la frase se arma en el
idioma de quien mira: *"Devolvió el calendario a maybe (versión A) — Calendario
· Septiembre 2026 · A · OEA · México"*.

## Consultas: nada de índices compuestos

`where` + `orderBy` sobre campos distintos obliga a crear un índice a mano en
la consola de Firebase. Si nadie lo crea, la pantalla falla en producción con
un error que el usuario final no puede resolver. Por eso el historial de una
nota se filtra por `doc_id` y se ordena en el cliente, y por eso se eliminó
`listMyChanges` (el historial personal se filtra sobre el feed que ya está en
memoria).

La única excepción es `listAllChanges`, que sí ordena en el servidor, y está
únicamente en la página de administradores.

## Alineación semanal por ritmo compartido

Las semanas del calendario y las tarjetas de la derecha se alinean porque las
dos columnas usan la misma estructura vertical, no porque se hayan ajustado
alturas a ojo. Cualquier arreglo con píxeles sueltos se romperá con otro
tamaño de pantalla o con un mes de seis semanas.

## Base pensada para consultarse después

Cada documento se guarda con el mes, la letra de versión y el nombre de la
región dentro, aunque la app no los necesite. Es redundante a propósito: el
objetivo declarado es conectar más adelante un MCP que responda preguntas sobre
un mes concreto, y una fila que se explica sola no obliga a cruzar colecciones.
La colección `changes` —que nunca se edita ni se borra— es la que guarda el
*por qué*, no solo el estado final.


## El latido de presencia es la escritura cara

Mostrar "quién está conectado" cuesta una escritura por persona y por latido,
y es con diferencia lo que más escribe la aplicación. Con un latido cada 30
segundos, 10 personas y una jornada de 8 horas eran ~9.600 escrituras al día:
la mitad del cupo gratuito diario, gastada en pintar avatares. Y una pestaña
olvidada en segundo plano escribía exactamente igual que alguien trabajando.

Ahora late cada minuto y **solo mientras la pestaña está visible**. El precio
es que alguien puede tardar hasta ~2,5 minutos en desaparecer de la lista, que
para saber quién está trabajando en el mes no importa.

Si alguna vez hay que añadir otra señal periódica, este es el presupuesto
contra el que hay que medirla.

## Lo que el plan gratuito no da: copias de seguridad

El plan Spark no tiene copias automáticas ni recuperación a un punto en el
tiempo. Si se elimina un mes, Google no lo puede devolver. Hoy lo contienen
tres cosas: solo los administradores pueden borrar, hay confirmación explícita,
y el borrado queda registrado en `months/_global/changes`. Nada de eso es un
respaldo. Pendiente: una exportación periódica de las colecciones.
