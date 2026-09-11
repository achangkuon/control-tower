---
name: chanks-2-planificador-granular
description: "Trigger: planificar, desglosar, enumerar Sesiones. Ejecuta ocho pasos fijos y propone una de tres rutas para alcance aprobado."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "4.0"
---

## Activation Contract

Activa para incorporar alcance aprobado al plan único. Descompone y propone; Support es el único autor del dato.

## Hard Rules

- Ejecutá los ocho pasos en orden, sin omitir ni agregar otro nivel.
- Jerarquía exacta: Zona → Sesión → Módulo → Tarea; una Sesión pertenece a una Zona.
- Cargá cada referencia sólo al llegar al paso que la necesita.
- Las únicas rutas son `direct`, `design-tasks` y `full-sdd`.
- En `full-sdd`, dejá Módulos y Tareas vacíos: el diseño los define.
- No escribas plan ni vista; enviá un delta con precondición a Support.

## Decision Gates

| Profundidad honesta del corte | Ruta |
|---|---|
| Contrato y ejecución determinados | `direct` |
| Resultado fijo; falta diseño técnico acotado | `design-tasks` |
| Comportamiento o contrato compartido requiere diseño | `full-sdd` |
| Falta autoridad o evidencia coherente | No propongas ruta; devolvé la decisión necesaria. |

## Execution Steps

1. **Ubicar territorio:** cargá `../chanks-1-heredado/references/ubicacion-y-cruces.md` y ubicá el alcance en una Zona.
2. **Resolver cruces:** declarà Cimientos, dependencias o necesidad de recorte.
3. **Cortar la Sesión:** definí un resultado independientemente revisable.
4. **Escribir contrato binario:** fijá criterios observables y falsificadores.
5. **Descomponer:** para `direct` o `design-tasks`, enumerá Módulos por archivos y Tareas atómicas; para `full-sdd`, dejalos vacíos.
6. **Declarar decisiones:** registrá autoridad, evidencia, opciones, clase, checkpoint y contaminación.
7. **Juzgar ruta:** cargá `references/juicio-de-ruta.md` y proponé una de las tres rutas.
8. **Pronosticar tamaño:** estimá adiciones+eliminaciones authored; si no cabe en un PR, dividí en Sesiones o declarà cadena.

## Output Contract

Devuelve los ocho resultados, ruta propuesta y autoridad, pronóstico authored, delta exacto para Support, responsabilidades no enumeradas y decisiones pendientes.

## References

- `../chanks-1-heredado/references/ubicacion-y-cruces.md`
- `references/juicio-de-ruta.md`
- `../chanks-0-agente-soporte/SKILL.md`
