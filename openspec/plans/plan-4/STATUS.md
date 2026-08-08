# Plan 4 — Hosts y línea exclusiva

**Estado:** 🟢 LISTO

## Resumen

| Campo | Detalle |
|---|---|
| Dependencias | Las dependencias legacy de Change E se conservan. Para Autonomous V2, `S4.1` depende de `S3.1`, `S3.2` y `S5.1`; su predecesora inmediata es `S5.1`. |
| Outputs | Adapter contract, launcher Pi/OpenCode, health, stop proof, host epoch y fallback exclusivo. |
| Roadmap | `S5.1` está ✅ COMPLETO; `S4.1` es ejecutable. Las responsabilidades legacy que aún no tienen límite de un PR permanecen sin ID. |
| Referencias | [`autonomous-v2-checkpointed-delivery`](../../changes/autonomous-v2-checkpointed-delivery/), [Plan Manifest](../sdd-tower-implementation/manifest.yaml). El proposal `sdd-tower-host-launcher` fue eliminado en `613a45d` por ser cáscara sin avance; su intención vive en este STATUS. |

## Sesión 4.1 — Change E single-host candidate fence

**Estado:** 🟢 LISTO — **contrato ejecutable sellado el 2026-08-04** sobre `origin/master@da68163`. `S5.1` está ✅ COMPLETO y no quedan decisiones `escala` abiertas propias.

**Depende de:** `S3.1` ✅, `S3.2` ✅, `S5.1` ✅; predecesora inmediata `S5.1`.

**Área:** `hosts/candidate-fence.mjs`, `test/hosts/**`

**Prohibido:** `core.mjs`, `mcp.mjs`, `continuation/**`, `main-store/store.mjs`, `plugin/**`, `delivery/**`, `escalation/**`, `capabilities/**`, `policy/**`, `jornada/**`, `registry/**`, `workspace/**`, `contracts/**`, `schemas/**`, `openspec/plans/**`, `openspec/specs/**`

**Recurso:** **línea exclusiva** — es el recurso que esta Sesión existe para proteger. Registro append-only propio en `hosts/**` por CAS de filesystem. **Sin migraciones de SQLite**, siguiendo el precedente que fijó `S5.2` el mismo día.

**Entrega:** commit directo a `master` + push, sin PR ([`AGENTS.md`](../../../AGENTS.md)). Dos commits. Forecast **150–220 líneas** ([`role-routed-continuation`](../../changes/autonomous-v2-role-routed-continuation/tasks.md)), muy por debajo del borde de encadenado de 400.

**Por qué `contracts/**` y `schemas/**` están prohibidos:** `recovery-proof-v1` ya existe —lo entregó `S3.2`— y `S4.1` lo consume sin modificarlo. Esta Sesión no introduce ningún contrato nuevo.

Implementa host epoch, prueba de detención y fencing fail-closed para un único host activo.

**Las dos definiciones de `M4.1.1` son compatibles, no contradictorias.** A diferencia de `M5.1.1` y `M5.2.1`, acá no hubo colisión que resolver: [`checkpointed`](../../changes/autonomous-v2-checkpointed-delivery/tasks.md#s41-change-e--m411-fence) lo llama `Fence` y [`role-routed`](../../changes/autonomous-v2-role-routed-continuation/tasks.md) `Role-bound fence`, con el mismo sujeto, las mismas tres Tareas y la misma forma RED/GREEN/REFACTOR. `role-routed` es posterior y **estrictamente extiende**: agrega drift de rol a los de host, base y runtime. El sello toma la unión.

**Decisiones:**

- `derivable` — hacia dónde falla el fence ante la duda. **Criterio:** cerrado. Si no se puede probar que el host anterior se detuvo, no hay host activo nuevo. El alcance de la Sesión ya dice "fencing fail-closed"; esto lo vuelve la respuesta por defecto de todo caso ambiguo, no sólo de los enumerados. Falsificable: cualquier camino en el que una prueba de detención ausente o ilegible resulte en un host admitido. **Autoridad:** el propio alcance de `S4.1`.
- `derivable` — qué constituye prueba de detención. **Criterio:** evidencia positiva y verificable de que el host anterior terminó; la ausencia de señal **no** es prueba. Un host que dejó de responder puede estar vivo y particionado, y ése es exactamente el caso que el fence existe para cubrir. Falsificable: un test que simule un host silencioso pero vivo y logre que el fence lo dé por detenido. **Autoridad:** el requisito de línea exclusiva de Change E.
- `derivable` — cómo avanza el host epoch. **Criterio:** monótono, nunca reutilizado, y comparable sin consultar reloj de pared. Un epoch que retrocede o se repite deja de distinguir un host viejo de uno nuevo, que es su única función. Falsificable: dos activaciones distintas que compartan epoch. **Autoridad:** `Outputs` de este Plan.
- `escala` — si un operador puede forzar la toma de la línea sin prueba de detención. **Clase:** operaciones irreversibles. **RESUELTA el 2026-08-04 por el maintainer: sí, pero exclusivamente humana y registrada.** Por defecto el fence falla cerrado y **escala**; no existe ningún camino automático —ni timeout ni heurística— que ceda la línea. El maintainer puede forzarla, y cuando lo hace el epoch avanza y la toma queda marcada `TAKEOVER_FORCED` en el registro del fence. **Esa marca es legible desde afuera**, y ahí está la clave: `S5.2` y `S7.1` pueden detectar que el supuesto de escritor único se rompió en ese tramo, en vez de asumirlo intacto. Es el mismo patrón que la autorización de merge — lo irreversible lo firma un humano, no el sistema. Falsificable: cualquier ruta automática que tome la línea sin prueba, o una toma forzada que no quede marcada y legible. **Autoridad:** decisión del maintainer del 2026-08-04. **Contaminaba:** `S5.2` y `S7.1`, ambas destrabadas — su piloto de "cero efectos remotos duplicados" ahora sabe cuándo el supuesto no aplica.
- `escala` — qué pasa con el trabajo en vuelo del host desalojado. **Clase:** migraciones o pérdida de datos. **RESUELTA el 2026-08-04 por el maintainer: se congela y se escala. Ni se descarta ni se adopta.** Descartarlo pierde trabajo real y además no deshace lo que ya haya tocado el remoto; adoptarlo hereda estado que **por definición** no se puede verificar —si se pudiera, el host no habría necesitado ser desalojado por falta de prueba—. Queda en estado terminal congelado, con la decisión estacionada para el maintainer, y la Torre continúa con trabajo independiente. Falsificable: trabajo en vuelo descartado o adoptado automáticamente tras un desalojo. **Autoridad:** decisión del maintainer del 2026-08-04. **Contaminaba:** `S5.3`, destrabada — debe **rechazar** una base que arrastre trabajo congelado sin resolver.
  **Es deliberadamente la misma forma que `S5.2` dio a la entrega parcial irreconciliable**, decidida el mismo día: estado terminal, nada se toca, decisión estacionada, la Torre sigue. Una misma situación —el sistema no puede determinar en qué estado quedó algo— no debe tener dos respuestas distintas según dónde ocurra.

### Módulo M4.1.1 — Fence

- [ ] Tarea T4.1.1.1 — RED: ownership, prueba de detención, host epoch y recuperación incierta, más
  el drift de **host, base, runtime y rol** que agregó `role-routed`. Incluye el caso que define la
  Sesión: un host **silencioso pero vivo** no se da por detenido.
- [ ] Tarea T4.1.1.2 — GREEN: implementar `hosts/candidate-fence.mjs` con el fence de host único,
  el epoch monótono y el registro append-only propio, **más la toma forzada**: sólo humana, con el
  epoch avanzado y la marca `TAKEOVER_FORCED` legible desde fuera de esta Sesión.
- [ ] Tarea T4.1.1.3 — REFACTOR: preservar los errores de evidencia bloqueada sin colapsarlos en uno
  genérico, y dejar el fallback en **cero mutación**. Congelar el trabajo en vuelo del host desalojado
  por el mismo camino que resuelve el desalojo, para que no puedan divergir.
  `bun test test/hosts`.

**Criterios de aceptación de S4.1** — todos deben pasar para cerrar:

- [ ] Un host sin prueba verificable de detención del anterior **no** se admite
- [ ] **La ausencia de señal no es prueba:** un host silencioso pero vivo nunca se da por detenido
- [ ] El host epoch es monótono, nunca se reutiliza, y dos activaciones distintas jamás comparten epoch
- [ ] El epoch es comparable **sin consultar reloj de pared**
- [ ] Drift de host, base, runtime o rol falla cerrado
- [ ] Ownership incierto falla cerrado, y el error nombra la evidencia que faltó
- [ ] **No existe ningún camino automático que tome la línea:** ni timeout, ni heurística, ni reintento
- [ ] **La toma forzada existe, es exclusivamente humana**, avanza el epoch y queda marcada `TAKEOVER_FORCED`
- [ ] **Esa marca es legible desde fuera de `S4.1`**, para que `S5.2` y `S7.1` detecten el tramo donde el supuesto de escritor único no aplica
- [ ] **El trabajo en vuelo del host desalojado se congela:** ninguna ruta lo descarta ni lo adopta automáticamente
- [ ] Una base que arrastra trabajo congelado sin resolver se rechaza
- [ ] El fence no crea, valida ni consume autoridad
- [ ] El registro del fence es append-only y **no requiere migración de SQLite**
- [ ] El fallback ante fallo es cero mutación, verificado por testigos de bytes
- [ ] `bun test test/hosts` pasa completo y `bun test` no introduce fallos nuevos sobre la línea base que deje `S5.1`
- [ ] El diff no toca ninguna ruta del `Prohibido`

Las responsabilidades legacy de Host Launcher que aún no tienen límite de un PR permanecen sin IDs en el [apéndice de migración](../plan-vocabulary-migration-appendix.md).
