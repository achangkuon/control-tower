# Índice Maestro — SDD Tower Implementation V1

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-07-31 contra `origin/master` en `2cc7c80281ce266efa5eac073a63e5e91c0af466`.

## 📍 Punto de retoma

`S2.5` queda 🔵 EN CURSO: PR #94 integró la planificación en `8bcf090ef5a7a9b9c292bad51481a77a7d605b63` y PR #96 integró implementación + tests en `691aac05a3a3f155c7cc25dd08c03225763e829f`.
La verificación técnica final está PASS con 0 CRITICAL, 5/5 requisitos, 9/9 escenarios, 12/12 tareas, focused 13/13 y combined 70/70; PR3 apply evidence y PR4 verify evidence permanecen locales y pendientes.
La próxima acción es entregar PR3 con la evidencia apply de `S2.5`; P2 queda 🔵 EN CURSO y Change B conserva responsabilidades posteriores sin Sesiones enumeradas.
La cadena restante es `S3.2` → `S5.1` → `S4.1` → `S5.2` → `S5.3` → `S7.1`; ninguna Tarea de implementación está completa.
P8 debe definir el primer límite restante de un PR desde las dependencias de enrollment, resolución de proyecto/Main y Support read-only; `S8.1` y `S8.2` están ✅ COMPLETO.
P1 permanece bloqueado en `S1.11` y `S1.12`; las responsabilidades sin límite de PR demostrable permanecen sin ID en el [apéndice de migración](plan-vocabulary-migration-appendix.md).

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.config/opencode/skills/_shared/plan-naming-convention.md`.

`Lane` es una etiqueta sobre el Plan, no un nivel de planificación. Los niveles siguen siendo exactamente cuatro.

## 🚦 Lanes de release

Definidos en [`product-version-map.yaml`](product-version-map.yaml). Un Plan pertenece a un lane; un lane nunca contiene IDs propios.

| Lane | Producto | Status | Planes | Avance |
|------|----------|--------|--------|--------|
| `installable-v1` | Installable Control Tower V1 | `active` | P8 | — (S8.1 y S8.2 cerradas; alcance restante sin Sesiones enumeradas) |
| `autonomous-v2` | Autonomous Control Tower V2 | `dependency-blocked` | P1–P7 | 45% (14/31 S enumeradas) |
| — | Base transversal | — | P0 | 100% (2/2 S) |

`autonomous-v2` declara `required_release_refs: installable-control-tower-v1-r1` y las capacidades `install`, `enrollment` y `workspace`: V2 no puede cerrar antes que V1.

El denominador de `autonomous-v2` es provisional: el Change B de P2 y la totalidad de P6 no tienen Sesiones enumeradas, así que el total de Sesiones va a subir.
`installable-v1` no expone porcentaje porque su alcance restante (enrollment, resolución de proyecto/Main, Support read-only) todavía no demuestra límites de un PR. El alcance está aprobado; la descomposición en Sesiones es lo que falta.

El "V1" que aparece en REQUIREMENTS, en los pilotos de conformidad y en los nombres `sdd-tower-*-v1-*` es la etiqueta amplia anterior al split de productos, registrada como `migrates: broad-v1-label-to-autonomous-v2`. No es el lane `installable-v1`.

## 📊 Estado de un vistazo

**Avance global**: 1/9 Planes cerrados (11%) · Sesiones cerradas en planes activos: 16/33 (48%)

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
| P8 | Installable V1 release | `installable-v1` | 🔵 EN CURSO | — (trabajo restante sin Sesión enumerada) | 320–400 líneas | Maintainer | — | [STATUS](plan-8/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
