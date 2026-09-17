# Documentación — Offline Planning

Herramienta web de planificación de medios offline del equipo de Open English.
Sustituye el Excel mensual (`Plan Sep 2026 - Proyecto Atribución.xlsm`).

- **Publicada en:** https://offlineteamoe.github.io/calendar-plan/
- **Código:** https://github.com/offlineteamoe/calendar-plan
- **Backend:** Firebase — proyecto `offline-planning`

## Por dónde empezar

Depende de a qué vengas:

| Si necesitas… | Lee |
|---|---|
| Entender qué es esto y para quién | [VISION-Y-ALCANCE.md](VISION-Y-ALCANCE.md) |
| Entender cómo está construido | [ARQUITECTURA.md](ARQUITECTURA.md) |
| Saber dónde se guarda cada dato | [DATA-MODEL.md](DATA-MODEL.md) |
| Entender los resultados reales de la pestaña Resultados | [DATOS-DE-RESULTADOS.md](DATOS-DE-RESULTADOS.md) |
| Saber quién puede hacer qué | [SEGURIDAD-Y-ROLES.md](SEGURIDAD-Y-ROLES.md) |
| Entender las pantallas y su comportamiento | [INTERFAZ.md](INTERFAZ.md) |
| Desplegar, configurar cuentas, revisar cuotas | [OPERACION.md](OPERACION.md) |
| Hacer un paso manual en Google o GitHub | [PASOS-MANUALES.md](PASOS-MANUALES.md) |
| Saber **por qué** algo está hecho así | [DECISIONES.md](DECISIONES.md) |
| Saber qué pasó durante la construcción | [BITACORA.md](BITACORA.md) |
| Saber qué falta | [PENDIENTES.md](PENDIENTES.md) |
| Traducir una sigla del negocio | [GLOSARIO.md](GLOSARIO.md) |

Además, en la raíz del repositorio está [`CLAUDE.md`](../CLAUDE.md): el
contexto operativo para trabajar con Claude Code sobre este proyecto. Contiene
las reglas duras que no se pueden romper al programar aquí.

## Cómo se relacionan estos documentos

```
VISION-Y-ALCANCE   qué problema resuelve y para quién
        │
        ├── ARQUITECTURA        cómo está construido
        │        ├── DATA-MODEL        dónde vive cada dato
        │        ├── DATOS-DE-RESULTADOS  de dónde salen las cifras de Spotfire
        │        ├── SEGURIDAD-Y-ROLES quién puede tocarlo
        │        └── INTERFAZ          qué ve y hace cada persona
        │
        ├── OPERACION           cómo se despliega y se mantiene
        │        └── PASOS-MANUALES    lo que solo se hace a mano
        │
        └── DECISIONES          por qué, y qué se descartó
                 └── BITACORA          cuándo y a raíz de qué
```

Los cuatro primeros describen **el estado actual**, sin referencias a errores
ni a conversaciones: son la fuente de verdad para entender la herramienta hoy.
`DECISIONES` y `BITACORA` son memoria histórica, y están separados a propósito
para que la documentación de referencia no se llene de anécdotas.

## Regla de mantenimiento

Si cambias el comportamiento, actualiza el documento correspondiente **en el
mismo commit**. Una documentación desactualizada es peor que ninguna: la
segunda te obliga a leer el código, la primera te hace confiar en algo falso.
Ya pasó una vez en este proyecto — ver el registro del 2026-09-09 en
[BITACORA.md](BITACORA.md).
