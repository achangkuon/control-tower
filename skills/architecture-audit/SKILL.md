---
name: architecture-audit
description: "Audita arquitectura y realidad funcional, convierte familias de dominio en Zonas candidatas y produce un delta de plan verificable. Trigger: audit this codebase, auditoría arquitectónica, auditar proyecto."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.0"
---

## Activation Contract

Activa para una auditoría arquitectónica completa o acotada. Reporta, no corrige. Si el usuario
pide planificación, lee primero `../_shared/plan-naming-convention.md` y produce candidatos para
el plan único; Support es el único autor del dato.

## Mental Model

- Modelo de dominio ≠ navegación. Las pantallas son lentes sobre entidades, reglas y estados.
- Separá DB (reglas/seguridad), servicios y hooks (adaptación), pantallas (presentación).
- Cálculos de dinero, seguridad o estado real pertenecen al backend; presentación al cliente.
- Una Zona se corta por **quién modifica la superficie**, no por el nombre de la carpeta, una
  capa técnica ni una similitud temática.

## Hard Rules

- Leé cada archivo auditado completo y citá `archivo:línea` para cada hallazgo.
- Clasificá mock vs real, trazá pantalla → hook → servicio → backend y cuantificá los gaps.
- Pausá ante reglas de dominio ambiguas; no inventes decisiones de producto.
- Convertí familias de dominio en **Zonas candidatas**, pero instancialas contra las superficies
  reales que cada familia modifica. Una carpeta no demuestra ownership.
- Construí una matriz `superficie exacta → Zonas que la modifican`. Toda ruta exacta modificada
  por más de una Zona es Cimiento aunque viva físicamente bajo una ruta amplia de otra Zona.
- Exigí `plan check` contra `git ls-files` para probar que la partición es exhaustiva y disjunta.
  Una revisión visual o una clasificación por nombres no sustituye esa prueba.
- Para alcance de implementación producí Sesiones dentro de una sola Zona, con Módulos/Tareas,
  no varios Planes ni archivos manuales `STATUS`/índice/ROADMAP.
- No edites código, `openspec/plan.yaml` ni `openspec/ROADMAP.md`. Entregá a Support un delta
  candidato confirmado. Support aplica el dato y regenera la vista.

## Decision Gates

| Situación | Acción |
|---|---|
| La familia modifica superficies propias disjuntas | Candidata a Zona. |
| Dos familias modifican la misma ruta exacta | Clasificar esa ruta como Cimiento. |
| El cruce puede separarse sin destruir el resultado | Proponer Sesiones distintas por Zona. |
| Separar destruye el resultado | Proponer Zona nueva con dependencias. |
| Los cruces se repiten | Reabrir la partición; no multiplicar excepciones. |
| `plan check` encuentra huérfano o solape | La partición no está lista; no afirmar capacidad segura. |

## Execution Steps

1. Leé reglas del repositorio, autoridad de producto y contexto técnico vigente.
2. Mapeá familias de dominio y, para cada pantalla/flujo, código completo, datos, hooks, servicios
   y backend. Registrá origen real/mock y hallazgos con líneas.
3. Identificá **superficies de modificación reales** por familia. Distinguilas de lecturas de
   verificación, que no transfieren ownership.
4. Proponé Zonas por conjuntos de archivos y la matriz de cruces exactos; extraé Cimientos con el
   umbral de más de una Zona.
5. Materializá el candidato en forma de dato/delta y pedí a Support aplicarlo en un entorno donde
   pueda ejecutar `plan check -f openspec/plan.yaml -C <repo>`.
6. Si el checker pasa, reportá cobertura, Zonas, Cimientos y riesgos de corte. Si falla, conservá
   sus hallazgos exactos y no promociones el candidato.
7. Cuando se pida implementación, pasá el alcance aprobado a `planificador-granular`; no armes una
   jerarquía paralela.

## Output Contract

Devuelve alcance y fuentes; mapa dominio/flujo/capas; matriz real/mock; hallazgos por severidad con
líneas; familias candidatas; matriz de superficies modificadas; Zonas/Cimientos candidatos; delta
exacto para Support; comando `plan check` requerido y su evidencia observada o `pendiente`; riesgos
y decisiones humanas. Termina con `skill_resolution: paths-injected`.

## References

- `../_shared/plan-naming-convention.md`
- `../planificador-granular/SKILL.md`
- `../agente-soporte/SKILL.md`
