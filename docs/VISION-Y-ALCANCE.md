# Visión y alcance

## El problema

La planificación de medios offline de Open English vivía en un Excel mensual:
`Plan Sep 2026 - Proyecto Atribución.xlsm`. Un archivo nuevo cada mes, con
nueve hojas-calendario duplicadas por marca y región, macros de VBA que
compensaban las limitaciones de Excel, y una hoja de gasto real de casi 79.000
filas.

Sus problemas no eran de formato, sino estructurales:

- **Frágil.** Rangos rotos (`#REF!`) por copiar hojas entre archivos.
- **No colaborativo.** Dos personas no pueden editar a la vez; se trabaja por
  turnos y se pisan versiones.
- **Sin memoria.** Nadie sabe quién cambió qué ni por qué. Las decisiones se
  pierden en el chat o en la cabeza de quien las tomó.
- **Difícil de heredar.** Entender el archivo exige que alguien te lo explique.

## Qué es esta herramienta

Un calendario web donde el equipo planifica la inversión de medios offline mes
a mes, en el mismo sitio y al mismo tiempo, con registro de todo lo que se
hace.

Principios que la definen:

1. **Sin servidor propio.** Se publica como sitio estático en GitHub Pages.
   No hay nada que alguien tenga que mantener encendido. El intento anterior
   del equipo (`BrandformanceOS`) fallaba justo ahí: exigía un Node corriendo
   en el portátil de una persona, conectado por VPN.
2. **Gratuito.** Todo cabe en el plan sin coste de Firebase. No hay tarjeta
   asociada, así que no existe la posibilidad de una factura inesperada.
3. **Confidencial.** Solo cuentas de `openenglish.com` y sus subdominios. El
   control es del servidor, no de la interfaz.
4. **En tiempo real.** Lo que una persona escribe aparece en la pantalla de
   las demás sin recargar.
5. **Con trazabilidad.** Cada escritura guarda quién, cuándo, qué había antes
   y qué hay ahora.

## Quién la usa

| Rol | Quiénes | Qué puede hacer |
|---|---|---|
| **Administrador** | William Fonseca, Cesar Hernandez, Dolores Yanes | Todo: crear meses y versiones, editar el plan, aprobar calendarios, escribir cualquier nota, ver el registro completo |
| **Consulta** | Cualquier otra cuenta del dominio | Ver todo el plan. Escribir únicamente notas de categoría *Observaciones a considerar*, y editar o borrar solo las suyas |

Dimensionada para **~10 personas simultáneas**, que es el tamaño real del
equipo ampliado.

## Qué cubre hoy

- Calendario mensual de inversión planificada, por día y canal.
- Cuatro regiones × dos marcas × N versiones, cada combinación independiente.
- Versiones de calendario con nombre y descripción, y estado *maybe* /
  *aprobado* por calendario.
- Notas generales del mes y notas por semana, en cuatro categorías (más una
  exclusiva de las cuentas de consulta), con edición e historial por nota.
- Escenarios semanales de inversión.
- Resultados y creativos por semana.
- Vista agregada de LATAM (suma de LatAm excl. MX/AR + México + Argentina).
- Presencia en vivo, campanita de actividad y registro completo para
  administradores.
- Interfaz en español, inglés y portugués; modo claro y oscuro.

## Qué no cubre (todavía)

- **Gasto real ejecutado.** La colección `real` existe en el esquema pero está
  vacía a propósito. Se poblará desde `BDD PAUTA & SPOTFIRE` usando el campo
  `source_ref` como punto de enganche.
- **Copias de seguridad.** El plan gratuito de Firebase no las incluye. Ver
  [PENDIENTES.md](PENDIENTES.md).
- **Consulta por lenguaje natural.** El objetivo declarado es conectar más
  adelante un MCP que responda preguntas sobre un mes concreto ("¿cómo fue la
  estrategia semanal de septiembre para OEA México?"). El modelo de datos ya
  está preparado para eso — ver [DATA-MODEL.md](DATA-MODEL.md), sección final.

## Referencias de origen

| Fuente | Qué aportó |
|---|---|
| `Plan Sep 2026 - Proyecto Atribución.xlsm` | El modelo de datos real: marcas, regiones, canales, semanas, escenarios |
| `C:\BrandformanceOS` | La estructura de interfaz (grilla de calendario + panel lateral con pestañas). Se descartó su arquitectura por depender de un servidor |
| `G:\...\Offline Marketing\...\PPT HTML` | El patrón de publicación estática en GitHub Pages con acceso por cuenta de Google, ya probado en producción |
