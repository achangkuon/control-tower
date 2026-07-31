# Índice Maestro — SDD Tower Implementation V1

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-07-31 contra `origin/master` en `2cc7c80281ce266efa5eac073a63e5e91c0af466`.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md).

## 📍 Punto de retoma

Los PRs #100, #102 y #104 están integrados: `master` en `112446d` lleva la taxonomía de lanes, el renombre de P7, [implementation-state](implementation-state.md) y la enumeración `S8.3`–`S8.7`. El PR #106 queda abierto con los contratos de ejecución de `S8.3` y `S2.5`. Ninguna Sesión cerró en esta entrega.

**La próxima acción es la primera sesión de Torre con dos agentes en paralelo**: `S8.3` en el lane `installable-v1` y `S2.5` en `autonomous-v2`. Paralelismo verificado en los tres predicados — sin dependencia mutua, `Área` disjunta (`enroll/**` contra `openspec/changes/sdd-tower-legacy-import-preflight/**`) y sin `Recurso` compartido. `S2.5` no toca código, así que el par no puede colisionar en fuente.

Se eligió `S2.5` sobre `S3.1` deliberadamente: `S3.1` está 🟢 LISTO y el grafo la habilita, pero `S2.5` sigue 🔵 EN CURSO con evidencia sin entregar. Se cierra lo abierto antes de abrir lo nuevo.

Antes de arrancar hay dos condiciones operativas: el MCP `control-tower` está configurado en Claude pero no se carga en una sesión ya iniciada — requiere reiniciar —, y el board conserva registros stale de sesiones anteriores que conviene limpiar. La Torre está ARMADA con `locks: ninguno`; el probe correcto es `bin/torre status`, no `.git/control-tower/ACTIVE`.

`S8.3` **no admite ventana nocturna** hasta cerrar el `MAY` de aceptación de layouts existentes: el pre-flight rechaza toda Sesión donde una decisión de producto *pueda aparecer*. Atendida sí. `S2.5` pasa el gate limpio.

`S2.5` queda 🔵 EN CURSO: PR #94 integró la planificación en `8bcf090ef5a7a9b9c292bad51481a77a7d605b63` y PR #96 integró implementación + tests en `691aac05a3a3f155c7cc25dd08c03225763e829f`.
La verificación técnica final está PASS con 0 CRITICAL, 5/5 requisitos, 9/9 escenarios, 12/12 tareas, focused 13/13 y combined 70/70; PR3 apply evidence y PR4 verify evidence permanecen locales y pendientes.
La próxima acción de `autonomous-v2` es entregar PR3 con la evidencia apply de `S2.5`; P2 queda 🔵 EN CURSO y Change B conserva responsabilidades posteriores sin Sesiones enumeradas.
La cadena restante es `S3.2` → `S5.1` → `S4.1` → `S5.2` → `S5.3` → `S7.1`; ninguna Tarea de implementación está completa.
P8 debe definir el primer límite restante de un PR desde las dependencias de enrollment, resolución de proyecto/Main y Support read-only; `S8.1` y `S8.2` están ✅ COMPLETO.
P1 permanece bloqueado en `S1.11` y `S1.12`; las responsabilidades sin límite de PR demostrable permanecen sin ID en el [apéndice de migración](plan-vocabulary-migration-appendix.md).

Los dos lanes pueden avanzar en paralelo con tres restricciones verificadas: los cinco archivos de planificación reclamados en [`product-version-map.yaml`](product-version-map.yaml) pertenecen a `installable-v1-provenance` y `autonomous-v2` declara `paths: []`; el enrollment de V1 se apoya sobre `registry/`, ya integrado desde el lane V2; y `autonomous-v2` no puede cerrar sin la capacidad `enrollment` de V1.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.config/opencode/skills/_shared/plan-naming-convention.md`.

`Lane` es una etiqueta sobre el Plan, no un nivel de planificación. Los niveles siguen siendo exactamente cuatro.

## 🚦 Lanes de release

Definidos en [`product-version-map.yaml`](product-version-map.yaml). Un Plan pertenece a un lane; un lane nunca contiene IDs propios.

| Lane | Producto | Status | Planes | Avance |
|------|----------|--------|--------|--------|
| `installable-v1` | Installable Control Tower V1 | `active` | P8 | 29% (2/7 S) |
| `autonomous-v2` | Autonomous Control Tower V2 | `dependency-blocked` | P1–P7 | 45% (14/31 S enumeradas) |
| — | Base transversal | — | P0 | 100% (2/2 S) |

`autonomous-v2` declara `required_release_refs: installable-control-tower-v1-r1` y las capacidades `install`, `enrollment` y `workspace`: V2 no puede cerrar antes que V1.

El denominador de `autonomous-v2` es provisional: el Change B de P2 y la totalidad de P6 no tienen Sesiones enumeradas, así que el total de Sesiones va a subir.
`installable-v1` sí tiene denominador cerrado: sus siete Sesiones cubren los cinco requisitos de la spec y no queda responsabilidad sin ID. `S8.3` y `S8.5` están 🟢 LISTO en paralelo.

El "V1" que aparece en REQUIREMENTS, en los pilotos de conformidad y en los nombres `sdd-tower-*-v1-*` es la etiqueta amplia anterior al split de productos, registrada como `migrates: broad-v1-label-to-autonomous-v2`. No es el lane `installable-v1`.

## 📊 Estado de un vistazo

**Avance global**: 1/9 Planes cerrados (11%) · Sesiones cerradas en planes activos: 16/38 (42%)

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
| P8 | Installable V1 release | `installable-v1` | 🔵 EN CURSO | 29% (2/7 S) | — | Maintainer | S8.3–S8.7 | [STATUS](plan-8/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
