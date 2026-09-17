# Datos de resultados (pestaña Resultados)

Cómo llegan a la web las cifras reales de Spotfire, qué significa cada métrica y
con qué se compara cada semana.

---

## De dónde salen

El origen es el export diario del pipeline de KPIs (el mismo que alimenta el
deck de Branded KPIs). Son ocho archivos JSON, uno por marca y región, con corte
al día anterior:

```
G:\Unidades compartidas\Marketing Team\Offline Marketing\02. Reports and results\01. KPIS\PPT HTML\etl\export\
    OE-LATAM.json   OE-BR.json   OE-USPR.json   OE-VE.json
    JR-LATAM.json   JR-BR.json   JR-USPR.json   JR-VE.json
```

**Esa ruta no está escrita en el código.** Se lee de `Reglas y Rutas.xlsx`, fila
`Data MCP Marketing Spotfire`:

```
G:\Unidades compartidas\Proyectos Automatización Branformance\30-Calendario Planeación\Raw Data\Reglas y Rutas.xlsx
```

Si mañana el equipo mueve los archivos, se corrige el Excel y el ETL sigue
funcionando sin tocar el repositorio.

---

## Por qué hay un paso intermedio

Los ocho archivos suman ~77 MB; `OE-LATAM.json` solo pesa 30 MB. Leerlos desde
el navegador significaría varios segundos por archivo en cada carga, y cambiar
de marca obligaría a bajar otro tanto.

`etl/build_calendar_results.py` los reduce a **un archivo de ~225 KB**:

- solo el channel grouping **Brand TV Channels**;
- solo las ocho cifras que las métricas necesitan;
- ya agrupado por los cuatro territorios del calendario;
- en columnas paralelas a un índice de fechas, en vez de un objeto por fila.

Son 340 veces menos. Se publica como `calendar-results.json` en la misma
carpeta de Drive que sus fuentes, que ya está compartida al dominio.

### Correrlo

```bash
python etl/build_calendar_results.py
```

Conviene correrlo después del refresco diario del pipeline de KPIs. Tarda unos
segundos y solo escribe ese archivo.

---

## Cómo lo lee la web

Con la sesión de Google de quien entra, mediante Google Identity Services y la
API de Drive (`drive.readonly`). No hay credenciales en el código: lo único que
decide quién puede leer es **el permiso de la carpeta en Drive**. Quien no la
tenga compartida recibe un 403 del propio Drive.

### Cuándo se actualiza

Al abrir un calendario se le pregunta a Drive **una sola cosa**: cuándo cambió
el archivo. Es una respuesta de unos cientos de bytes.

- Si coincide con la copia guardada en el navegador → se usa esa, no se descarga
  nada.
- Si no coincide (el ETL corrió esta madrugada) → se baja la versión nueva.

Así el dato siempre es el último publicado, se abra el calendario una vez al día
o veinte. El botón **Actualizar** de la pestaña fuerza la comprobación cuando el
ETL corre con la página ya abierta.

### El día en curso no se mira

El tope de lectura es **el menor entre el último día que traen los datos y
ayer**. El día en curso va a medias y sus cifras todavía no son reales.

---

## El archivo

```jsonc
{
  "schema": 1,
  "generatedAt": "2026-09-17T16:09:00",
  "channelGrouping": "Brand TV Channels",
  "mediaSpendTypes": ["BrandLift Media", "..."],
  "dates": ["2025-01-01", "2025-01-02", "…"],   // índice denso, sin huecos
  "scopes": {
    "OEA|LT_EXCL_MX_AR": {
      "leads": [...], "spend": [...], "media": [...], "sales": [...],
      "cash":  [...], "cm":    [...], "rev":   [...], "enr":   [...]
    },
    "OEA|MX": { ... }, "OEA|AR": { ... }, "OEA|BR": { ... },
    "OEJR|LT_EXCL_MX_AR": { ... }, "OEJR|MX": { ... }, "OEJR|AR": { ... }, "OEJR|BR": { ... }
  }
}
```

Las ocho cifras, todas **sumables**:

| Campo   | Qué es                          | De dónde sale                              |
| ------- | ------------------------------- | ------------------------------------------ |
| `leads` | Branded Leads Elegibles         | `dailyRows.leadsEligible`                  |
| `spend` | Spend del channel grouping      | `dailyRows.spend`                          |
| `media` | Inversión de medios (ver abajo) | `brandedTypeRows.spend`, tipos filtrados   |
| `sales` | Ventas / core enrollments       | `dailyRows.coreEnrollmentsTotal`           |
| `cash`  | New Cash Core                   | `dailyRows.newCashCore`                    |
| `cm`    | Full CM Short (USD)             | `channelKpiRows.fullCmShortUsd`            |
| `rev`   | Proj. Revenue Short             | `channelKpiRows.projRevShortTotal`         |
| `enr`   | Total enrollments               | `channelKpiRows.totalEnrollments`          |

### Regla de oro: primero se suma, después se divide

Ninguna razón se guarda calculada. CPL, conversión, %MNCC y Full CM % Short se
calculan en la web sobre el total del rango filtrado. Guardarlas por día y
promediarlas daría otro número —y equivocado—: el promedio de unas razones no es
la razón del total.

---

## Territorios

| Calendario           | Deck             | Países del origen                                                                                                                                              |
| -------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MX`                 | `OE/JR-LATAM`    | Mexico                                                                                                                                                         |
| `AR`                 | `OE/JR-LATAM`    | Argentina                                                                                                                                                      |
| `LT_EXCL_MX_AR`      | `OE/JR-LATAM`    | Colombia, Chile, Ecuador, Perú, Costa Rica, Bolivia, Rep. Dominicana, El Salvador, Guatemala, Honduras, Nicaragua, Panamá, Paraguay, Uruguay, `TV LATAM Excl Arg Mex` |
| `BR`                 | `OE/JR-BR`       | Brazil                                                                                                                                                         |

`OEA` son los decks `OE-*` (Open English adulto) y `OEJR` los `JR-*`.

**La lista de "resto de LatAm" es cerrada a propósito**, no un "todo lo que no
sea MX ni AR". El origen también trae un código de agregación `LATAM` que no es
un país real y que inflaría el bloque con decenas de miles de dólares. Se
descarta, igual que hace el pipeline de los decks.

Los decks `USPR` y `VE` existen en el origen pero el calendario no tiene esos
territorios: hoy no se leen.

---

## Métricas

Todas son de **Brand TV Channels**.

| Métrica             | Fórmula                              | Se lee                          |
| ------------------- | ------------------------------------ | ------------------------------- |
| Leads elegibles     | `leads`                              | variación %                     |
| Media Spend         | `media`                              | variación %, sin color          |
| CPL                 | `spend / leads`                      | variación %, verde si baja      |
| Conversión          | `sales / leads`                      | diferencia en pp, 1 decimal     |
| % MNCC              | `(cash − spend) / cash`              | diferencia en pp                |
| Full CM % Short     | `cm / rev`                           | diferencia en pp                |

**Media Spend** no es todo el gasto del channel grouping: son solo los tipos que
el equipo cuenta como inversión de medios.

```
BrandLift Media · BrandLift Production · CTV · CTV-DV360 · Out of Home
Radio · TV Cable · TV Open Air · Web QR Code · WhatsApp Web
```

Queda fuera lo que no es compra de medios (SEM-Brand, SEO, Direct, Mobile App,
Agent Created, Desktop LP Login, WhatsApp QR Code, los asistentes de IA…).
`Radio` y `CTV-DV360` no aparecen todavía en los datos: están previstos.

**El CPL usa `spend`, no `media`** — el gasto completo del channel grouping,
igual que en el deck de KPIs.

**Por qué las razones se leen en puntos y no en porcentaje.** Un %MNCC que pasa
de 38 % a 40 % subió 2 puntos. Decir "+5,3 %" sería un porcentaje de un
porcentaje: una cifra que no significa nada.

---

## Las cuatro pestañas

Tres son la misma tabla con otra comparación. Solo cambian dos
desplazamientos:

| Pestaña      | Periodo que se muestra | Contra qué se compara |
| ------------ | ---------------------- | --------------------- |
| **WOW**      | la semana              | la semana anterior    |
| **YOY**      | la semana              | la misma semana de hace un año |
| **2025 WOW** | esa semana de hace un año | la semana anterior a esa |
| **Margen**   | la semana              | la semana anterior    |

**Margen** muestra el nivel, no solo la variación: %MNCC y Full CM % Short junto
al dinero que hay detrás (New Cash Core, Spend Brand TV, Full CM Short).

**Comentario** es el cuadro de texto libre por semana que ya existía en esta
pestaña. Sigue ahí y conserva lo escrito.

### 364 días, no 365

El año anterior se calcula restando **364 días (52 semanas exactas)**. Un año
natural correría los días de la semana y compararía un lunes con un domingo,
que es justo lo que el filtro por día existe para evitar.

---

## Filtro por día de la semana

Los siete botones del encabezado (`L M M J V S D`) se apagan y encienden. El
filtro se aplica **a los dos periodos a la vez**, que es lo que hace comparable
"solo lunes" contra "solo lunes".

No se pueden apagar los siete: el último encendido se queda.

---

## Semanas parciales

La semana en curso tiene días sin cerrar. Si hoy es jueves, solo hay tres días
leíbles — y compararlos contra una semana entera haría que todo pareciera
desplomarse cada lunes.

**Las dos ventanas se recortan igual.** Si la semana actual se queda en lunes,
martes y miércoles, la de referencia también. La pestaña avisa: *"Semana
parcial: 3 de 7 días cerrados (en ambos periodos)"*.

Una semana entera fuera de los datos (una semana futura del mes que se está
planeando) muestra **Sin datos**, no ceros.

---

## Vista LATAM

Con la vista agregada activada, las métricas suman los tres territorios que
componen LATAM (`LT_EXCL_MX_AR` + `MX` + `AR`) **antes** de dividir. Brasil se
compra aparte y no entra.

---

## Limitación conocida: el gasto puede llegar con retraso

El origen no carga el gasto de todos los mercados a la misma velocidad. A
17-sep-2026, Brasil traía inversión de medios hasta el día 16, mientras que
LatAm y México la traían en cero desde el día 14 aunque sí tuvieran leads.

Mientras eso pase, en los días más recientes de esos mercados el **CPL sale
artificialmente bajo y el %MNCC artificialmente alto**. No es un fallo del
cálculo: es lo que trae la fuente. El aviso de semana parcial ayuda a no leer
esos días como si estuvieran cerrados, pero conviene tenerlo presente.
