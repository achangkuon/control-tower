---
name: chanks-1-heredado
description: "Trigger: Chanks etapa 1, particionar un producto heredado, definir Zonas. Divide un producto vivo por superficies reales y cruces verificables."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Activa para particionar un producto existente en Zonas disjuntas y Cimientos compartidos antes de planificar trabajo paralelo.

## Hard Rules

- Cargá `references/ubicacion-y-cruces.md` antes de cortar territorio.
- Una Zona se define por superficies que modifica, no por carpetas, capas o afinidad temática.
- Toda ruta exacta modificada por más de una Zona es Cimiento.
- Probá cobertura y disjunción con `radar check` contra `git ls-files`.
- No escribas el plan: devolvé al responsible parent un delta confirmado con precondición.

## Decision Gates

| Situación | Acción |
|---|---|
| Superficies propias disjuntas | Proponer Zona. |
| Cruce puntual | Extraer ruta exacta como Cimiento. |
| Partir destruye el resultado | Proponer Zona nueva y dependencias. |
| Cruces repetidos | Reabrir el corte; no acumular excepciones. |
| `radar check` falla | No declarar la partición lista. |

## Execution Steps

1. Inventariá archivos reales, autoridad y familias de comportamiento.
2. Aplicá la ubicación y matriz de cruces compartida.
3. Proponé Zonas, Cimientos y dependencias.
4. Construí un delta con ubicación, valor anterior esperado y valor nuevo.
5. Pedí aprobación humana y devolvé el delta al responsible parent para que registre evidencia y ejecute `radar check`/`radar render`.

## Output Contract

Devuelve inventario, matriz superficie→Zonas, Zonas/Cimientos candidatos, cobertura, delta, aprobación, evidencia del checker y riesgos pendientes.

## References

- `references/ubicacion-y-cruces.md`
- `../chanks-0-agente-soporte/SKILL.md`
