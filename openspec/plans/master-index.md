# Índice Maestro — SDD Tower Implementation V1

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-07-31 contra `origin/master` en `9d0842172728780ba089c168c110e2de8538228b`.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md).

## 📍 Punto de retoma

`S8.3` cerró mediante PR #110, mergeada en `master@9d0842172728780ba089c168c110e2de8538228b`, con enrollment 10/10, registry 27/27 y diff-check PASS. P8 queda en `43% (3/7 S)`.

Las próximas Sesiones ejecutables de Installable V1 son `S8.4` y `S8.5`, ambas 🟢 LISTO: `S8.4` quedó habilitada por el cierre de `S8.3` y `S8.5` no tiene dependencias. Pueden avanzar en paralelo si sus áreas y recursos se mantienen disjuntos; las actualizaciones de planificación se serializan.

`S2.5` continúa 🔵 EN CURSO en Autonomous V2: la siguiente entrega es PR3 con la evidencia apply y después PR4 con la evidencia verify. `S3.1` permanece 🟢 LISTO, pero la decisión vigente es cerrar primero `S2.5`.

P1 permanece 🔴 BLOQUEADO en `S1.11` y `S1.12`. Las responsabilidades sin límite de un PR demostrable permanecen sin ID en el [apéndice de migración](plan-vocabulary-migration-appendix.md).

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.config/opencode/skills/_shared/plan-naming-convention.md`.

`Lane` es una etiqueta sobre el Plan, no un nivel de planificación. Los niveles siguen siendo exactamente cuatro.

## 🚦 Lanes de release

Definidos en [`product-version-map.yaml`](product-version-map.yaml). Un Plan pertenece a un lane; un lane nunca contiene IDs propios.

| Lane | Producto | Status | Planes | Avance |
|------|----------|--------|--------|--------|
| `installable-v1` | Installable Control Tower V1 | `active` | P8 | 43% (3/7 S) |
| `autonomous-v2` | Autonomous Control Tower V2 | `dependency-blocked` | P1–P7 | 45% (14/31 S enumeradas) |
| — | Base transversal | — | P0 | 100% (2/2 S) |

`autonomous-v2` declara `required_release_refs: installable-control-tower-v1-r1` y las capacidades `install`, `enrollment` y `workspace`: V2 no puede cerrar antes que V1.

El denominador de `autonomous-v2` es provisional: el Change B de P2 y la totalidad de P6 no tienen Sesiones enumeradas, así que el total de Sesiones va a subir.
`installable-v1` sí tiene denominador cerrado: sus siete Sesiones cubren los cinco requisitos de la spec y no queda responsabilidad sin ID. `S8.4` y `S8.5` están 🟢 LISTO en paralelo.

El "V1" que aparece en REQUIREMENTS, en los pilotos de conformidad y en los nombres `sdd-tower-*-v1-*` es la etiqueta amplia anterior al split de productos, registrada como `migrates: broad-v1-label-to-autonomous-v2`. No es el lane `installable-v1`.

## 📊 Estado de un vistazo

**Avance global**: 1/9 Planes cerrados (11%) · Sesiones cerradas en planes activos: 17/38 (45%)

| ID | Plan | Lane | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | — | ✅ COMPLETO | 100% (2/2 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | `autonomous-v2` | 🔴 BLOQUEADO | 53% (10/19 S) | — | Main | S1.11–S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | `autonomous-v2` | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | S2.5 | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | `autonomous-v2` | 🟢 LISTO | 0% (0/2 S) | — | Main | S3.1, S3.2 | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | `autonomous-v2` | 📋 PLANIFICADO | 0% (0/1 S) | — | Main | S4.1 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | `autonomous-v2` | 📋 PLANIFICADO | 0% (0/3 S) | — | Main | S5.1, S5.2, S5.3 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | `autonomous-v2` | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | `autonomous-v2` | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Installable V1 release | `installable-v1` | 🔵 EN CURSO | 43% (3/7 S) | — | Maintainer | S8.4, S8.5, S8.6, S8.7 | [STATUS](plan-8/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
