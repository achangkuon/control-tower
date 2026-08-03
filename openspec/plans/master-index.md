# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-03 contra `d232fdf` (delta de política/seguridad V2) + implementación `3d2ef57`.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md).

## 📍 Punto de retoma

**Producto único desde el 2026-08-01.** Las etiquetas `installable-v1` y `autonomous-v2` dejan de ser identidades de producto: hay un solo roadmap y una sola primera versión. La decisión, su alcance y el grafo completo viven en [release-chain](release-chain.md). Los lanes sobreviven como afinidad de trabajo, y `CT_V2_ONLY` en `bin/torre:28` pasa a ser un flag de capacidad opt-in apagado por defecto — no se borra.

**La primera versión no se declara hasta que el maintainer pueda aprobar desde Telegram** las decisiones que requieren su autoridad, sobre un objetivo exacto y con sobre de un solo uso. Eso incorpora `sdd-tower-implementation-v1-requirements.md` §16–§17 al alcance que sale. Son **once Sesiones** en una cadena casi lineal.

**`S8.8` sigue 🔵 EN CURSO, y su estado real es más avanzado de lo que estos documentos decían.** `M8.8.1` ✅ COMPLETO vía PR #132. **`M8.8.2` ya se ejecutó**: el data-root XDG existe en `~/.local/share/control-tower/` con `active.json` y dos versiones instaladas, y `torre diagnose` devuelve `healthy:true` sobre `b72e450`. **`M8.8.3` está 🔴 BLOQUEADO**: el corte no se hizo porque el payload instalado omite `core.mjs`. **`M8.8.4` ✅ COMPLETO** en `3d2ef57`: payload 5/0, instalación 27/0 y suite aislada completa 442/0; no hubo efectos sobre runtime/DB reales y el fixture descartable fue destruido.

**Próximo trabajo de la cadena:** levantar el freno de ejecución y continuar, de forma atendida, la secuencia de prerrequisito/adopción real de `M8.8.2`; `M8.8.3` sigue 🔴 BLOQUEADO y no se adelanta. Hasta que eso ocurra no se inician ni asignan `M8.8.2`, `M8.8.3` ni ninguna Sesión de la cadena. Listas para arrancar el día que se levante: `S3.1` y la continuación de `S8.8`; `S0.3` ya está ✅ COMPLETO.

**Bloqueo técnico previo a construir autorización:** `schemas/authorization-v1.schema.json` y `main-store/store.mjs:118` no coinciden. Esto es de `S5.1`; la enmienda de `S0.3` ya está ✅ COMPLETA y la spec canónica permite que el puente transporte el callback acotado sin otorgarle autoridad.

**Los gates de V2 se partieron en seguridad y política el 2026-08-03 (`d232fdf`).** Es delta de especificación: **ninguna Sesión cambió de estado y los porcentajes de abajo no se mueven**. Lo que cambió es el contrato que `S3.2`, `S5.1`, `S5.2` y `S7.1` van a implementar. Los pisos de seguridad —sin mutación temprana, inmutabilidad del candidato congelado, ledger append-only, autoridad única de Main, sin autoasignación del worker— quedan fuera del alcance de cualquier configuración. Pasan a ser política declarada por proyecto: autorización de merge, forma de entrega, techo de planificación y profundidad del cierre documental, en el bloque `delivery-policy` de [`AGENTS.md`](../../AGENTS.md), con default fail-closed al valor más restrictivo. Un repo sin ese bloque se comporta igual que antes de que existiera.

Del mismo delta salen tres decisiones del loop: Support corre como **subagente nativo que Main lanza**, sin registro en la Torre ni elegibilidad de lock —lo que vuelve estructural la prohibición Support→Worker en vez de vigilada—; la delegación a subagentes con contexto aislado pasa a ser **capacidad de host requerida**, sin camino inline alternativo; y la derivación del siguiente Módulo lee la enumeración del plan por digest más el ledger inmutable `ct_delivery`/`ct_claim`, **nunca engram**, que hace upsert por `topic_key` y no está atado al contenido del repo. Eso mantiene la derivación correcta cuando el cierre de Módulo no toca documentación. Detalle en [`autonomous-v2-role-routed-continuation`](../changes/autonomous-v2-role-routed-continuation/).

`S5.1` quedó con forecast 380–500 líneas, en el borde de encadenado de 400: se decide en apply, no ahora.

## Granularidad

Plan → Sesión (1 unidad entregable) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.config/opencode/skills/_shared/plan-naming-convention.md`.

**La Sesión se sigue definiendo por ALCANCE — el que entraría en un PR.** Lo que cambió el 2026-08-01 es el *mecanismo* de entrega, no el nivel: en este repo la unidad entregable es un **commit directo a `master` + push**, no un PR. Ver [Política de entrega](../../CLAUDE.md). La regla de overflow no se mueve: si una Sesión no entra en una unidad entregable, se parte en dos Sesiones o se encadenan sus Módulos — nunca se crea un nivel nuevo.

**La [regla de ejecución](v1-execution-rule.md) rige para las Sesiones de la cadena de release:** van de `tasks.md` directo a implementación, sin `exploration`/`proposal`/`design`, y el `STATUS` se actualiza en el mismo commit que el código. El ciclo SDD completo se reserva para cambios grandes o con incertidumbre arquitectónica real.

## 📊 Estado de un vistazo

**Avance global**: 1/9 Planes cerrados (11%) · Sesiones cerradas en planes activos: 22/43 (51%)

> El denominador pasó de 39 a 43: se sumaron las 2 Sesiones ya cerradas de P0 —que volvió a contar como Plan activo— más `S0.3` y `S5.4`, enumeradas el 2026-08-01.
> P0 volvió a cerrar el 2026-08-01 con `S0.3` (`9595b92`), así que los Planes cerrados vuelven a 1. Reabrir y cerrar un Plan es normal cuando cambia la decisión de producto que ese Plan documenta.
> **Ninguno de estos porcentajes mide qué falta para salir.** Para eso está [release-chain](release-chain.md): **11 Sesiones**, de las cuales 1 cerrada.
>
> **La tabla de abajo está ordenada por ID, y el ID no es un orden de ejecución.** Es un nombre posicional: `P8` no va después de `P7`, y `P0` no es el primer paso. El orden lo dicta el grafo, no el número — ver [release-chain](release-chain.md).
>
> **En la cadena de release:** P0 ✅, P3, P4, P5, P7, P8 (`S8.7`, `S8.8`).
> **Fuera de la cadena** — no bloquean la primera versión: P1 (ningún Plan de la cadena lo declara dependencia), el resto sin enumerar de P2, y P6.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔴 BLOQUEADO | 53% (10/19 S) | — | Main | S1.11–S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | 🟢 LISTO | 0% (0/2 S) | — | Main | S3.1, S3.2 | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 📋 PLANIFICADO | 0% (0/1 S) | — | Main | S4.1 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 📋 PLANIFICADO | 0% (0/4 S) | — | Main | S5.1, S5.2, S5.3, S5.4 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 50% (4/8 S) | — | Maintainer | S8.8, S8.7, S8.5, S8.6 | [STATUS](plan-8/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
