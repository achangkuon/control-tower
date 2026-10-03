---
name: chanks-1-descubrimiento
description: "Trigger: Chanks etapa 1, descubrimiento de un producto vivo, auditar su comportamiento real. Traza comportamiento real y fallas con evidencia archivo:línea sin corregir."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Activa para entender qué existe, qué es real o simulado y dónde falla un producto vivo. Reporta; no implementa.

## Hard Rules

- Leé completos los archivos de código auditados y citá `archivo:línea` para cada afirmación material.
  Nunca leas `openspec/plan.yaml` entero: consultá `radar status --json`, `radar zonas` y
  `radar sesion <ID>` para las Sesiones elegidas.
- Trazá interfaz → adaptación → servicio → backend y distinguí lectura de superficie modificada.
- No inventes reglas de dominio ni conviertas carpetas en ownership.
- No escribas código, documentos de producto ni dato de planificación.
- Cargá la técnica territorial compartida sólo cuando el diagnóstico requiera Zonas o Cimientos.

## Decision Gates

| Hallazgo | Acción |
|---|---|
| Comportamiento y autoridad coinciden | Registrar evidencia, sin cambio propuesto. |
| Mock presentado como real | Marcar gap funcional y superficie responsable. |
| Regla ambigua | Escalar; no inferir producto desde código accidental. |
| Se pide partición completa | Derivar a `chanks-1-heredado`. |

## Execution Steps

1. Leé autoridad, reglas del repo y alcance del diagnóstico.
2. Trazá flujos, datos y capas con citas exactas.
3. Clasificá real/mock, reglas, fallas y superficies modificadas.
4. Si aplica, cargá `../chanks-1-heredado/references/ubicacion-y-cruces.md`.
5. Entregá hallazgos y el delta candidato al responsible parent cuando corresponda.

## Output Contract

Devuelve alcance, fuentes, trazas, matriz real/mock, hallazgos por severidad, superficies afectadas, decisiones humanas y delta candidato sin aplicar.

## References

- `../chanks-1-heredado/references/ubicacion-y-cruces.md`
- `../_shared/plan-naming-convention.md`
