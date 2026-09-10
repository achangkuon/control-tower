---
name: chanks-6-politica-de-entrega
description: "Trigger: política de entrega, delivery policy, onboarding de repo. Detecta evidencia en repos existentes o declara PR para proyectos nuevos."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.0"
---

## Activation Contract

Activa para declarar o reparar el único bloque machine-readable de política de entrega de un repositorio.

## Hard Rules

- Distinguí proyecto nuevo de repositorio existente antes de inferir la forma de entrega.
- En repos existentes, detectá evidencia y nunca supongas pull request.
- En proyectos nuevos, usá `pull-request` como default; `direct-push` exige elección humana y justificación explícita.
- Mostrá evidencia y obtené confirmación antes de escribir.
- No alteres pisos de seguridad ni agregues campos fuera del esquema.
- Repará el bloque existente; no agregues un segundo.

## Decision Gates

| Contexto | Acción |
|---|---|
| Repositorio existente con evidencia coherente | Proponer la forma observada. |
| Repositorio existente sin evidencia suficiente | Dejar sin declarar y preguntar; no inferir PR. |
| Señales contradictorias | Mostrar ambas y pedir decisión. |
| Proyecto nuevo | Proponer `pull-request`. |
| Proyecto nuevo elige push directo | Exigir justificación registrada. |

## Execution Steps

1. Determiná si existe historia operativa previa.
2. Para un repo existente, inspeccioná en orden: protección/rulesets, workflows, política escrita, historial de merges/PRs y rama default.
3. Para un proyecto nuevo, prepará el default `pull-request` sin fabricar evidencia histórica.
4. Mostrá campo, valor propuesto, evidencia y confianza; preguntá sólo por conflictos o huecos.
5. Con confirmación, escribí un único bloque `delivery-policy` en el archivo canónico y releelo.

## Output Contract

Devuelve tipo de repo, evidencia por señal, propuesta confirmada, bloque/ruta escritos, justificación de cualquier desviación y campos sin declarar.

## References

- `../chanks-1-terreno/SKILL.md`
