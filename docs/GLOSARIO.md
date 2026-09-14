# Glosario

Términos del negocio y del código, para que una sigla no obligue a preguntar.

## Negocio

| Término | Significado |
|---|---|
| **Pauta** | Inversión publicitaria planificada. "Plan de pauta" = plan de medios |
| **Offline** | Medios no digitales: TV, radio, vía pública. El equipo que usa esta herramienta |
| **OEA** | Open English Adultos. Una de las dos marcas |
| **OEJR** | Open English Junior. La otra marca |
| **LT_EXCL_MX_AR** | LatAm excluyendo México y Argentina. Se compra como un solo bloque, igual que en el Excel original |
| **MX / AR / BR** | México, Argentina, Brasil. Se compran por separado |
| **LATAM (vista agregada)** | Suma de LT_EXCL_MX_AR + México + Argentina. Solo visualización, nunca un objetivo de planificación |
| **Canal** | TV, Digital, Radio, Otro |
| **Escenario** | Propuesta de inversión para una semana. Varios por semana; uno marcado como activo |
| **Maybe / Aprobado** | Estado de un calendario. *Maybe* = propuesta en discusión; *aprobado* = decisión cerrada |
| **Versión** | Alternativa completa de planificación para un calendario: A, B, C… Se crea copiando otra |

## Conceptos de la herramienta

| Término | Significado |
|---|---|
| **Calendario** | La unidad de planificación: mes + versión + marca + región. Cada uno es independiente |
| **Alcance** *(scope)* | Esas tres dimensiones juntas. Prefija el id de todo documento editable |
| **Mes en curso / Planeación futura / Mes cerrado** | Fase del mes, deducida de la fecha, no guardada |
| **Nota general** | Nota del mes completo |
| **Nota semanal** | Nota de una semana concreta, alineada con la fila del calendario |
| **Observaciones a considerar** | Categoría de nota exclusiva de las cuentas de consulta |
| **Administrador** | Cuenta que puede editar la planificación |
| **Consulta** *(viewer)* | Cuenta que solo puede ver y dejar observaciones |
| **Registro de cambios** | Colección `changes`: quién, cuándo, qué había antes y qué hay ahora |
| **Presencia** | Quién tiene el mes abierto ahora mismo |

## Código

| Término | Significado |
|---|---|
| `month_key` | Identificador del mes: `YYYY-MM` (`2026-09`). Es el id del documento |
| `week_start` | Lunes de la semana, en `YYYY-MM-DD` |
| `version_id` / `letter` | Letra de la versión dentro de su calendario |
| `scope_label` | Texto legible del alcance: `A · OEA · México` |
| `summary_key` / `summary_params` | Clave de idioma y valores de la frase que describe un cambio |
| `place_key` | Zona de la aplicación donde ocurrió un cambio: calendario, notas, resultados… |
| **Sello legible** *(stamp)* | Campos `month_key`, `version_letter`, `country_label` que se añaden a cada documento para que se explique solo |
| `_global` | Clave del mes técnico donde se registran los eventos que no pertenecen a ningún mes vivo (crear o eliminar un mes) |
| `BOOTSTRAP_ADMINS` | Lista de administradores escrita en el código y en las reglas, como respaldo |
| **Listener** | Suscripción en vivo a Firestore (`onSnapshot`), frente a una lectura puntual |

## Servicios

| Término | Significado |
|---|---|
| **Firebase** | Plataforma de Google que da el acceso y la base de datos |
| **Firestore** | La base de datos de documentos. Única fuente de datos de la aplicación |
| **Reglas de seguridad** | `firestore.rules`. Quién puede leer y escribir qué. Se evalúan en el servidor |
| **Plan Spark** | Nivel gratuito de Firebase. Sin tarjeta asociada |
| **GitHub Pages** | Alojamiento de sitios estáticos donde vive la aplicación |
| **GitHub Actions** | Automatización que compila y publica en cada `push` a `main` |
| **MCP** | *Model Context Protocol*. El conector previsto para consultar la base en lenguaje natural |
