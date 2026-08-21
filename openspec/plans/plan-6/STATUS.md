# Plan 6 — Campañas multiproyecto

**Propósito:** que un cambio que necesita varios repositorios a la vez se pueda coordinar desde una sola Jornada, sin que ningún proyecto pierda su autoridad local.

**Estado:** 🟡 DIFERIDO — condicionado, desde el 2026-08-21.

## Condición de reactivación

**P6 no se enumera ni se descompone hasta que la Torre funcione y se haya usado de verdad en un proyecto real.** La evidencia que destraba este Plan es de uso, no de diseño: si al operar la Torre aparece un cambio que efectivamente necesita coordinar varios repositorios y hoy no se puede, eso reactiva P6. Si no aparece, P6 se archiva.

**Quién lo evalúa:** el maintainer, después de `S7.1`.

**Por qué diferido y no eliminado.** El PRD ya excluye esta capacidad de la primera versión —es `F8`— y la decisión 33 fijó que un rojo sobre `F8` **no bloquea la release**. Pero eliminar el Plan borraría la intención, y todavía no existe la evidencia que diría si es innecesaria. Diferir con condición explícita conserva la intención sin inflar el mapa ni las cadenas de dependencia.

**Efecto sobre el avance:** ninguno. P6 nunca tuvo Sesiones enumeradas, así que no aporta numerador ni denominador. Bajo la regla de denominador de la [decisión 57](../decision-register.md), un diferido-con-intención se conserva; P6 califica.

## Resumen

| Campo | Detalle |
|---|---|
| Dependencias | Change H depende de B, D, F y G. |
| Outputs | Campaign manifest, coordinación del Main líder, autoridad local, PRs ordenados y validación de compensaciones. |
| Roadmap | Congelado hasta que se cumpla la condición de reactivación de arriba. |
| Referencias | [Plan Manifest](../sdd-tower-implementation/manifest.yaml). El proposal `sdd-tower-multi-repo-campaigns` fue eliminado en `613a45d` por ser cáscara sin avance; su intención vive en este STATUS. |

No hay Sesiones con límite de un PR demostrado. Las responsabilidades de campañas permanecen sin IDs en el [apéndice de migración](../plan-vocabulary-migration-appendix.md).
