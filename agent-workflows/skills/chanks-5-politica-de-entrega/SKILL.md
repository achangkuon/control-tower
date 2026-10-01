---
name: chanks-5-politica-de-entrega
description: "Trigger: política de entrega, delivery policy, onboarding de repo, stage 5. Detecta, declara o lee la política de entrega del repositorio y enruta su ejecución."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.0"
---

## Activation Contract

En etapas 1–2, activa para declarar o reparar el único bloque machine-readable de política de entrega de un repositorio. En stage 5, lee la política vigente para enrutar la entrega sin modificarla.

## Hard Rules

- Distinguí proyecto nuevo de repositorio existente antes de inferir la forma de entrega.
- En repos existentes, detectá evidencia y nunca supongas pull request.
- En proyectos nuevos, usá `pull-request` como default; `direct-push` exige elección humana y justificación explícita.
- Mostrá evidencia y obtené confirmación antes de escribir.
- No alteres pisos de seguridad ni agregues campos fuera del esquema.
- Repará el bloque existente; no agregues un segundo.
- En stage 5, sólo leé: ni una declaración ausente ni evidencia contradictoria autoriza escribir o inventar un default.
- El tamaño y la división del cambio siguen la guía nativa de Gentle AI; Chanks no agrega regla de tamaño. El requisito issue-first de una skill enrutada se aplica sólo si la política de este repositorio lo declara; no es un bloqueo universal.

## Decision Gates

| Contexto | Acción |
|---|---|
| Repositorio existente con evidencia coherente | Proponer la forma observada. |
| Repositorio existente sin evidencia suficiente | Dejar sin declarar y preguntar; no inferir PR. |
| Señales contradictorias | Mostrar ambas y pedir decisión. |
| Proyecto nuevo | Proponer `pull-request`. |
| Proyecto nuevo elige push directo | Exigir justificación registrada. |
| Stage 5, bloque `delivery-policy` válido | Seguir la forma de entrega declarada por el repositorio. |
| Stage 5, bloque ausente o no interpretable | Detectar evidencia con el mismo orden de etapas 1–2; declarar que falta, mostrar conflictos y pedir decisión al responsable antes de enrutar. |

## Execution Steps

1. Determiná si existe historia operativa previa.
2. Para un repo existente, inspeccioná en orden: protección/rulesets, workflows, política escrita, historial de merges/PRs y rama default.
3. Para un proyecto nuevo, prepará el default `pull-request` sin fabricar evidencia histórica.
4. Mostrá campo, valor propuesto, evidencia y confianza; preguntá sólo por conflictos o huecos.
5. Con confirmación, escribí un único bloque `delivery-policy` en el archivo canónico y releelo (sólo etapas 1–2).

### Lectura y enrutamiento de stage 5

1. Leé el bloque machine-readable `delivery-policy` del archivo de política del repositorio (por ejemplo, `AGENTS.md`); registrá ruta, campos y valores. No infieras desde el nombre de la rama ni desde una skill genérica si hay un bloque válido.
2. Si falta el bloque, aplicá la detección de repos existentes en el orden del paso 2; declaralo **missing** y no supongas PR. Si no hay evidencia suficiente o hay señales contradictorias, mostrálas y pedí decisión; un bloque malformado, incompleto o con valores desconocidos no otorga permiso de entrega por omisión. Respetá cualquier fallback restrictivo que declare el repositorio; no lo reinterpretes como una aprobación humana.
3. Para `direct-push`, enrutá a `work-unit-commits` y a los gates locales de commit/push, sin cargar `branch-pr` ni `chained-pr`. Para `pull-request`, enrutá a `work-unit-commits` y `branch-pr`; usá `chained-pr` sólo cuando la política local o una decisión humana pida dividir cambios grandes en PRs encadenados. No sustituye el gate humano ni los pisos de seguridad.
4. Tomá el tamaño del cambio de la guía nativa de Gentle AI (Chanks no agrega regla de tamaño) y issue-first como requisito sólo donde el repositorio lo adopte; ante divergencias entre skills enrutadas y política local, prevalece la política local y se explicita el conflicto, no se inventa un blocker global.

## Output Contract

Para etapas 1–2, devuelve tipo de repo, evidencia por señal, propuesta confirmada, bloque/ruta escritos, justificación de cualquier desviación y campos sin declarar. Para stage 5, devuelve ruta y valores leídos (o bloque missing/inválido), evidencia de detección, conflictos, forma de entrega y skills enrutadas; nunca afirma que leyó un bloque ausente.

## References

- `../chanks-1-terreno/SKILL.md`
