# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-19 contra `master@555acbe`. La autoridad vigente es Moshi → Main → raíz primaria OpenCode con TUI adjunta no autoritativa; Herdr no pertenece al lifecycle crítico.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md).

## 📍 Punto de retoma

**`S4.3` está ✅ COMPLETO** en `555acbe`: inspección, liveness, stop proof y rehidratación, en cuatro commits directos y bajo TDD estricto. La suite pasó de 776 a **822 pass / 0 fail / 5.043 expectations**. Los cuatro criterios pasan.

Se corrió el **set 4R completo** y cambió el resultado. R2 encontró que el comentario del binder afirmaba probar el backend y la raíz que liga, cuando la prueba canónica no tiene campo de backend ni de sesión. R3 encontró que un host que nunca mandó heartbeat satisfacía por **suposición** el conjunto de sesenta segundos de §14.3 en vez de por medición: ahora el silencio se mide siempre desde un origen de observación, y el caso especial desapareció en vez de parchearse. R4 encontró el bloqueante real —una prueba del predecesor ligaba al host vivo— y lo encontró **después de que R1 devolviera cero hallazgos**. Esa asimetría quedó registrada como nota metodológica de la decisión 43.

La **decisión 43** resolvió el bloqueante extendiendo `recovery-proof-v1` con un `host_epoch` requerido, y amplió el Área de `S4.3` al schema y a las dos fixtures que asertan contra él. Requerirlo fue seguro porque ningún productor emite todavía `recovery-proof`: el contrato se definió antes de su primer emisor.

P4 pasa a 4/5 S (80%). `S4.4` queda 🟢 LISTO —decision-clean y con su dependencia satisfecha— y la próxima Sesión de la cola es `S5.10`. Queda pendiente, sin dueño ni Sesión, la cláusula de §14.3 según la cual los defaults de liveness son versionados y cambiarlos no altera jornadas activas: `hosts/health.mjs` los expone como constantes de módulo y el comentario declara la brecha en vez de esconderla. El warning de preflight release sigue siendo preexistente. `S5.2` conserva su corrección técnica pendiente.

**`S9.1` está 🔵 EN CURSO y BLOQUEADA por una decisión del maintainer.** Su planificación está completa —nueve Módulos, veintisiete Tareas, nueve commits directos secuenciales de ≤400 líneas— pero la ejecución va `1/9 M` y `3/27 T`. `M9.1.1` está congelado y el candidato terminal de `M9.1.2` **no está aceptado, ni es reutilizable, ni entregable**: quedó como evidencia de diagnóstico. La próxima acción exacta es `await-fresh-rewrite-authorization` — el maintainer debe autorizar por separado descartarlo y reescribirlo antes de un RED fresco. `S9.1` no reanuda hasta entonces. `S9.3` está 🔴 BLOQUEADA por autoridad de transporte.

## 🎯 Cola de ejecución

`#1 S5.10` · `#2 S4.4` · `#3 S5.3` · `#4 S5.5` · `#5 S7.1` — recalculada 2026-08-19 tras cerrar `S4.3`. `S5.10` avanza a la cabeza con su dependencia `S5.9` satisfecha; `S4.4` la sigue, ya 🟢 LISTO. Pi/Intercom y S8.7 no integran esta cola.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 3/11 Planes cerrados (27%) · Sesiones cerradas en planes activos: 34/48 (71%). Cálculo auditable: P1 `16/19` + P4 `4/5` + P5 `8/12` + P7 `0/1` + P8 `6/8` + P9 `0/3` = `34/48`; el denominador subió de 47 a 48 porque `S9.3` quedó enumerada en el Plan 9; P10 se excluye porque cerró 3/3 S. P2 no tiene denominador derivable.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 84% (16/19 S) | — | Main | S1.17, S1.18, S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 80% (4/5 S) | — | Main | S4.4 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 67% (8/12 S) | — | Main | S5.2, S5.3, S5.5, S5.10 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 75% (6/8 S) | — | Maintainer | S8.5, S8.6 | [STATUS](plan-8/STATUS.md) |
| P9 | Slots seguros de Jornada y caché externa de Bun | 🔵 EN CURSO | 0% (0/3 S) | — | Maintainer | S9.1 (🔵, esperando autorización), S9.2, S9.3 | [STATUS](plan-9/STATUS.md) |
| P10 | Ejecución y supervisión autónoma de Jornada | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-10/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
