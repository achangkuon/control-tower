---
name: planificador-granular
description: "Trigger: planificar, desglosar, enumerar Sesiones. Corta alcance aprobado dentro de Zonas validadas y propone la ruta de cada Sesión."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "3.0"
---

## Activation Contract

Activa cuando alcance aprobado debe incorporarse al plan único del producto. Lee primero
`../_shared/plan-naming-convention.md` y el `openspec/plan.yaml` vigente. Esta skill descompone;
Support es el único autor del dato.

## Hard Rules

- Existe un solo plan por producto. Cortá alcance dentro de una Zona ya validada; si la
  partición debe cambiar, producí primero esa propuesta y exigí `plan check` contra archivos reales.
- Jerarquía exacta: Zona → Sesión → Módulo → Tarea. El producto es marco, no quinto nivel.
- Cada Sesión pertenece a una sola Zona. Puede reservar Cimientos por rutas de archivo exactas.
  Nunca escribas `Área`, estado, porcentaje ni posición: son derivados.
- Cada Sesión abierta incluye dependencias, Cimientos, recursos, decisiones, linaje, criterios
  binarios, uno o más Módulos y una o más Tareas por Módulo. Los IDs siguen
  `S23 → M23.1 → T23.1.1`, son únicos, planos y permanentes.
- Cada Módulo declara archivos concretos. Cada Tarea declara una acción atómica y criterios
  binarios observables. Para implementación directa preferí RED → GREEN → REFACTOR y mantené
  pruebas/documentación con el comportamiento.
- **Proponé** la ruta en `ruta.propuesta` con autoridad exacta. No escribas una revalidación ni
  presentes la propuesta como decisión final de implementación.
- Las rutas válidas siguen siendo `direct`, `design-tasks`, `full-sdd`, `blocked`. Elegí la más
  liviana que sea honesta; tamaño, riesgo o cantidad de archivos no eligen SDD por sí solos.
- No edites `openspec/plan.yaml` ni `openspec/ROADMAP.md`. Enviá un delta exacto y acotado a
  `agente-soporte`, único autor del dato. ROADMAP siempre se regenera con la herramienta.
- Nunca crees SDD por Módulo. `full-sdd` corre una vez para la Sesión completa.

## Decision Gates

| Condición | Resultado |
|---|---|
| Alcance aprobado cabe como resultado independiente dentro de una Zona | Enumerar Sesión, Módulos y Tareas. |
| El resultado cruza Zonas | Cimientos → partir por Zona → Zona nueva sólo si partir destruye el resultado → revisar corte si se repite. |
| Contrato binario y decisiones derivables | Proponer `direct`. |
| Resultado fijo con descubrimiento técnico acotado | Proponer `design-tasks`. |
| Comportamiento/lifecycle/contrato compartido aún requiere diseño dentro de autoridad | Proponer `full-sdd`. |
| Falta autoridad, hay evidencia contradictoria o una decisión alcanza criterios/primer Módulo | Proponer `blocked` y pedir una decisión. |

## Execution Steps

1. Confirmá autoridad aprobada, `openspec/plan.yaml` vigente y Zona validada.
2. Cortá una Sesión por resultado independientemente revisable dentro de esa Zona; el tamaño de
   PR es regla de desborde, no criterio territorial.
3. Asigná IDs nuevos sin renumerar historia; declarà dependencias, reemplazos, Cimientos y recursos.
4. Escribí criterios binarios y decisiones con autoridad, contaminación y alcance.
5. Enumerá Módulos por archivos concretos y Tareas atómicas con sus criterios.
6. Proponé ruta y autoridad; no la revalides.
7. Entregá a Support un delta YAML exacto: ubicación, operación, valor esperado anterior y valor
   nuevo. Support aplica, ejecuta `plan check` y `plan render`.
8. Reportá cualquier error del checker sin editar la vista generada ni inventar un estado.

## Output Contract

Devuelve autoridad, Zona, Sesión y jerarquía completa propuesta; dependencias, Cimientos,
recursos, decisiones, criterios; `ruta.propuesta` con razón/autoridad; delta exacto para Support;
responsabilidades no enumeradas y bloqueos. Termina con `skill_resolution: paths-injected`.

## References

- `../_shared/plan-naming-convention.md`
- `../session-kickoff/SKILL.md`
- `../agente-soporte/SKILL.md`
