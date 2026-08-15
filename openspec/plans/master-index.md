# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-15 contra `origin/master@8dab97e601e7c55e1c4324fe47aa0b16a7e8d5d8` y la resolución del maintainer para S4.2.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md).

## 📍 Punto de retoma

Las nueve decisiones `escala` de la cadena de release están resueltas; fuera de ella sobrevive `S9.2` sobre la frontera `bun ci` en raíz Pi fresca, sin contaminar la cadena por su recurso Pi.

`S4.2` queda 🟢 LISTO por readiness técnica: el candidato local `6ff1ca27` pasó focused 123/123 y full 717/717. Esta etiqueta no acredita activación productiva ni `✅ COMPLETO`; Herdr `0.8.0` aún no expone v1, por lo que siguen pendientes su entrega, instalación y la conformance/runtime verification real.

Lo pendiente es `S5.2`, el dueño de la brecha 6, la enumeración de `enroll/**` y la entrega externa de Herdr v1 para activar S4.2.

Próxima capacidad 🟢 LISTO: `S4.2`, `S5.9` y `S10.2`. P4 conserva 25% (1/4 S): no cerró ninguna Sesión adicional.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 2/11 Planes cerrados (18%) · Sesiones cerradas en planes activos: 31/49 (63%). Cálculo auditable: P1 `16/19` + P4 `1/4` + P5 `7/12` + P7 `0/1` + P8 `5/8` + P9 `0/2` + P10 `2/3` = `31/49`; P2 se excluye porque su STATUS declara trabajo pendiente sin Sesiones enumeradas, por lo que no tiene denominador de Plan derivable.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 84% (16/19 S) | — | Main | S1.17, S1.18, S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 25% (1/4 S) | — | Main | S4.2, S4.3, S4.4 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 58% (7/12 S) | — | Main | S5.2, S5.3, S5.5, S5.9, S5.10 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 63% (5/8 S) | — | Maintainer | S8.7, S8.5, S8.6 | [STATUS](plan-8/STATUS.md) |
| P9 | Slots seguros de Jornada y caché externa de Bun | 🟢 LISTO | 0% (0/2 S) | — | Maintainer | S9.1, S9.2 | [STATUS](plan-9/STATUS.md) |
| P10 | Ejecución y supervisión autónoma de Jornada | 🟢 LISTO | 67% (2/3 S) | — | Maintainer | S10.2 (🟢 LISTO desde 2026-08-14) | [STATUS](plan-10/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
