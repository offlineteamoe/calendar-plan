# ETL

Scripts que preparan los datos pesados que la web lee desde Google Drive. No
forman parte del sitio: se corren desde este equipo, contra las carpetas
compartidas.

## `build_calendar_results.py`

Convierte los ocho JSON de resultados de Spotfire (~77 MB) en el archivo
compacto que lee la pestaña Resultados (~225 KB).

```bash
python etl/build_calendar_results.py
```

- **Entrada:** la ruta que indique `Reglas y Rutas.xlsx`, fila
  `Data MCP Marketing Spotfire`. No está escrita en el código a propósito: si el
  equipo mueve los archivos, se corrige el Excel.
- **Salida:** `calendar-results.json`, en esa misma carpeta de Drive.
- **Cuándo:** después del refresco diario del pipeline de KPIs.
- **Requisitos:** Python 3 y `openpyxl` (`pip install openpyxl`).

Opciones: `--src DIR` para saltarse el Excel y `--out DIR` para escribir en otro
sitio (útil para probar sin tocar Drive).

Qué hace exactamente, qué significa cada cifra y cómo las usa la web:
[`docs/DATOS-DE-RESULTADOS.md`](../docs/DATOS-DE-RESULTADOS.md).
