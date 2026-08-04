# Plan 4 — Hosts y línea exclusiva

**Estado:** 📋 PLANIFICADO

## Resumen

| Campo | Detalle |
|---|---|
| Dependencias | Las dependencias legacy de Change E se conservan. Para Autonomous V2, `S4.1` depende de `S3.1`, `S3.2` y `S5.1`; su predecesora inmediata es `S5.1`. |
| Outputs | Adapter contract, launcher Pi/OpenCode, health, stop proof, host epoch y fallback exclusivo. |
| Roadmap | Ejecutar `S4.1` después de integrar `S5.1`; el PR se dirige a `main`. Las responsabilidades legacy que aún no tienen límite de un PR permanecen sin ID. |
| Referencias | [`autonomous-v2-checkpointed-delivery`](../../changes/autonomous-v2-checkpointed-delivery/), [Plan Manifest](../sdd-tower-implementation/manifest.yaml). El proposal `sdd-tower-host-launcher` fue eliminado en `613a45d` por ser cáscara sin avance; su intención vive en este STATUS. |

## Sesión 4.1 — Change E single-host candidate fence

**Estado:** 📋 PLANIFICADO

**Dependencias:** `S3.1`, `S3.2` y `S5.1` integradas; predecesora inmediata `S5.1`.

Implementa host epoch, prueba de detención y fencing fail-closed para un único host activo. La definición de `M4.1.1` y `T4.1.1.1`–`T4.1.1.3` vive en [`tasks.md`](../../changes/autonomous-v2-checkpointed-delivery/tasks.md#s41-change-e--m411-fence).

**Decisiones:**

- `derivable` — hacia dónde falla el fence ante la duda. **Criterio:** cerrado. Si no se puede probar que el host anterior se detuvo, no hay host activo nuevo. El alcance de la Sesión ya dice "fencing fail-closed"; esto lo vuelve la respuesta por defecto de todo caso ambiguo, no sólo de los enumerados. Falsificable: cualquier camino en el que una prueba de detención ausente o ilegible resulte en un host admitido. **Autoridad:** el propio alcance de `S4.1`.
- `derivable` — qué constituye prueba de detención. **Criterio:** evidencia positiva y verificable de que el host anterior terminó; la ausencia de señal **no** es prueba. Un host que dejó de responder puede estar vivo y particionado, y ése es exactamente el caso que el fence existe para cubrir. Falsificable: un test que simule un host silencioso pero vivo y logre que el fence lo dé por detenido. **Autoridad:** el requisito de línea exclusiva de Change E.
- `derivable` — cómo avanza el host epoch. **Criterio:** monótono, nunca reutilizado, y comparable sin consultar reloj de pared. Un epoch que retrocede o se repite deja de distinguir un host viejo de uno nuevo, que es su única función. Falsificable: dos activaciones distintas que compartan epoch. **Autoridad:** `Outputs` de este Plan.
- `escala` — si un operador puede forzar la toma de la línea sin prueba de detención. **Clase:** operaciones irreversibles. Es la salida de emergencia cuando un host quedó colgado y el sistema no puede probarlo, y también la forma exacta de terminar con dos hosts escribiendo a la vez. **Contamina:** `S5.2`, cuya idempotencia de entrega asume un solo escritor, y `S7.1`, cuyo piloto de "cero efectos remotos duplicados" es precisamente el que fallaría.
- `escala` — qué pasa con el trabajo en vuelo del host desalojado. **Clase:** migraciones o pérdida de datos. Descartarlo pierde trabajo real; adoptarlo lo hereda sin saber en qué estado quedó. **Contamina:** `S5.3`, cuya continuación asume una respuesta a esto.

Las responsabilidades legacy de Host Launcher que aún no tienen límite de un PR permanecen sin IDs en el [apéndice de migración](../plan-vocabulary-migration-appendix.md).
