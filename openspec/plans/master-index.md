# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-13 sobre la base `master@53b471cd2e621b844fc043ced844e9c034887952` (`53b471c`). El ref local `origin/master` permanece en `3db3c121`; el candidato PREPARED de `S5.12` está importado en el working tree y no fue commiteado, pusheado ni publicado.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md).

## 📍 Punto de retoma

`S1.15` y `S5.11` están cerradas técnica y localmente. `S1.16` queda 🟢 LISTO. `S5.12` queda 🔵 EN CURSO con un candidato **PREPARED** exacto ya importado en Main: la verificación funcional final está verde y la desviación procedimental está registrada; quedan el commit selectivo y un único push directo ordenado con los documentos de cierre. No aporta crédito.

`S9.1` queda planning-only y en cuarentena antes de tasks/apply. Sus artefactos permanecen intactos; transporte `#1b` y la contradicción del rollback floor siguen sin resolver. `S9.2` continúa 🔴 BLOQUEADO. P9 no reabre P3 ni altera el orden de hosts.

Control Tower es un producto, un roadmap y un release. OpenCode sigue primero (`S1.13`–`S1.15` ✅ COMPLETO; `S1.16` 🟢 LISTO) y Pi sigue siendo el segundo host/fallback obligatorio (`S1.17` 🔴 BLOQUEADO; `S1.18`–`S1.19` sin implementar). P10 entra en la cadena: `S3.4 → S10.1 → S10.2 → S7.1`; `S10.1` queda 🟢 LISTO por `design-tasks`, siempre effect-incapable, y `S10.2` conserva sus dos decisiones abiertas.

Con la Torre apagada, sesiones peer Pi homogéneas pueden coordinarse por Intercom sólo con autorización explícita del maintainer. Es un método interino de desarrollo, no autoridad Tower ni cambio del orden de hosts.

La hermeticidad clean-clone del registry queda como deuda separada y todavía no tiene ID de Sesión; no invalida el cierre post-integración de `S5.11` sobre Main. `S1.17`, `S5.2`/`S5.3`, `S5.9`/`S5.10`/`S5.5`, `S8.7` y `S10.2` conservan sus bloqueos.

No se acredita ninguna Sesión posterior. La capacidad debe reevaluarse por grafo, `Área`, `Recurso` y contaminación antes de ejecutar trabajo en paralelo.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 2/11 Planes cerrados (18%) · Sesiones cerradas en planes activos: 27/48 (56%). Cálculo auditable: P1 `15/19` + P4 `1/4` + P5 `6/12` + P7 `0/1` + P8 `5/8` + P9 `0/2` + P10 `0/2` = `27/48`; P2 se excluye porque su STATUS declara trabajo pendiente sin Sesiones enumeradas, por lo que no tiene denominador de Plan derivable.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 79% (15/19 S) | — | Main | S1.16, S1.17, S1.18, S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 25% (1/4 S) | — | Main | S4.2, S4.3, S4.4 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 50% (6/12 S) | — | Main | S5.2, S5.3, S5.5, S5.9, S5.10, S5.12 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 63% (5/8 S) | — | Maintainer | S8.7, S8.5, S8.6 | [STATUS](plan-8/STATUS.md) |
| P9 | Slots seguros de Jornada y caché externa de Bun | 🟢 LISTO | 0% (0/2 S) | — | Maintainer | S9.1, S9.2 | [STATUS](plan-9/STATUS.md) |
| P10 | Ejecución y supervisión autónoma de Jornada | 🟢 LISTO | 0% (0/2 S) | — | Maintainer | S10.1, S10.2 | [STATUS](plan-10/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
