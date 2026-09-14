# Pendientes

Lo que falta, ordenado por lo que más duele si no se hace.

## 1. Copias de seguridad

**Riesgo abierto.** El plan gratuito de Firebase no incluye copias automáticas
ni recuperación a un punto en el tiempo. Si un administrador elimina un mes,
Google no puede devolverlo.

Hoy lo contienen tres cosas —solo administradores pueden borrar, hay
confirmación con contraseña, y el borrado queda registrado— pero **ninguna es
un respaldo**.

Opciones, de menos a más esfuerzo:

- Una exportación manual periódica de las colecciones a JSON, guardada en la
  unidad compartida.
- Una pantalla de administrador que descargue el mes completo en JSON antes de
  borrarlo.
- Pasar a plan de pago (Blaze) y activar las copias de Firestore. Para este
  volumen el coste sería de céntimos, pero exige tarjeta asociada.

## 2. Traducción automática de notas

Implementada y **sin activar**: falta crear la llave de Cloud Translation en
Google Cloud y añadirla como variable del repositorio. Ver
[PASOS-MANUALES.md](PASOS-MANUALES.md), paso 3.

Sin esa llave la aplicación funciona con normalidad; las notas simplemente se
muestran en el idioma en que se escribieron.

## 3. Documento `config/roles`

Los tres administradores están escritos en el código y en las reglas, así que
la herramienta funciona. Crear `config/roles` en Firestore permite **añadir o
quitar administradores sin volver a desplegar**. Paso 2 de los pasos manuales.

## 4. Gasto real ejecutado — fase 2

La colección `real` existe en el esquema y está vacía a propósito. Falta
poblarla desde `BDD PAUTA & SPOTFIRE`, usando `source_ref` como punto de
enganche.

Cuando llegue, habrá que decidir si el bucket `LT_EXCL_MX_AR` necesita
desagregarse con porcentajes de atribución reales.

## 5. Consulta por lenguaje natural (MCP)

Objetivo declarado: poder preguntar *"¿cómo fue la estrategia semanal de
septiembre 2026 para OEA México? ¿Qué creativos rotamos?"*.

El modelo de datos ya está preparado: cada documento lleva dentro el mes, la
letra de versión y el nombre de la región aunque la aplicación no los necesite,
y la colección `changes` guarda el *por qué* además del estado final. Ver el
final de [DATA-MODEL.md](DATA-MODEL.md).

Falta el conector en sí.

## 6. Limpieza menor

- **Meses creados antes del 2026-09-14** tienen una versión `A` sin `brand` ni
  `country`, anterior al alcance por calendario. La aplicación las ignora y
  cada calendario arranca con su propia A. No molestan; si se quiere empezar
  limpio, basta con borrar esos meses de prueba y crearlos de nuevo.
- **`setMonthStatus`** sigue en `src/lib/store.ts` pero ya nada lo usa: la fase
  del mes se deduce de la fecha. Se puede quitar.
- **El tamaño del bundle** supera los 500 kB (unos 265 kB comprimidos). Para
  diez personas con buena conexión no es un problema real; si alguna vez lo
  fuera, el candidato obvio es cargar el SDK de Firestore de forma diferida.

## 7. Verificado a medias

Estas partes están implementadas y compiladas, pero **no se han probado con dos
personas reales a la vez**:

- Deshacer / rehacer (`Ctrl+Z`, `Ctrl+Y`) y volver a un punto del historial.
- Vista agregada de LATAM con datos en las tres regiones.
- Escenarios semanales y su marca de "activo".

Merecen una pasada antes de dar la herramienta por cerrada.
