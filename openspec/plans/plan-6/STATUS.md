# Plan 6 — Campañas multiproyecto

**Propósito:** que un cambio que necesita varios repositorios a la vez se pueda coordinar desde una sola Jornada, sin que ningún proyecto pierda su autoridad local.

**Estado:** 🟡 DIFERIDO — condicionado desde el 2026-08-21.
**Avance:** `—` — no hay Sesiones enumeradas y el denominador permanece abierto.

## Verdad ejecutable actual

- P6 no aporta capacidad ni posición a la cola global: no existe una Sesión que se pueda asignar.
- Su estado es 🟡 DIFERIDO, no 🔴 BLOQUEADO: podría planificarse, pero el maintainer decidió esperar evidencia de uso real.
- La reactivación exige una necesidad multiproyecto observada al operar la Torre después de `S7.1`; un diseño hipotético no alcanza.
- Si esa evidencia no aparece, P6 se archiva. Hasta entonces no se inventa un porcentaje, una descomposición ni IDs de Sesión.

## Condición de reactivación

**P6 no se enumera ni se descompone hasta que la Torre funcione y se haya usado de verdad en un proyecto real.** La evidencia que destraba este Plan es de uso, no de diseño: si al operar la Torre aparece un cambio que efectivamente necesita coordinar varios repositorios y hoy no se puede, eso reactiva P6. Si no aparece, P6 se archiva.

**Quién lo evalúa:** el maintainer, después de `S7.1`.

**Por qué diferido y no eliminado.** El PRD ya excluye esta capacidad de la primera versión —es `F8`— y la decisión 33 fijó que un rojo sobre `F8` **no bloquea la release**. Eliminar el Plan borraría la intención antes de obtener la evidencia que permita decidir si es innecesaria.

## Resumen auditable

| Campo | Detalle |
|---|---|
| Dependencias | Change H depende de B, D, F y G. |
| Outputs previstos | Campaign manifest, coordinación del Main líder, autoridad local, PRs ordenados y validación de compensaciones. |
| Roadmap | Congelado hasta que se cumpla la condición de reactivación. |
| Denominador | `—`. P6 nunca tuvo Sesiones enumeradas y no aporta numerador ni denominador bajo la [decisión 57](../decision-register.md). |
| Referencias | [Plan Manifest](../sdd-tower-implementation/manifest.yaml). El proposal `sdd-tower-multi-repo-campaigns` fue eliminado en `613a45d` por ser una cáscara sin avance; su intención vive en este STATUS. |

## Responsabilidades todavía sin ID

No hay Sesiones con límite de un PR demostrado. Las responsabilidades de campañas permanecen sin IDs en el [apéndice de migración](../plan-vocabulary-migration-appendix.md); conservarlas ahí no abre el denominador ni cambia el estado del Plan.
