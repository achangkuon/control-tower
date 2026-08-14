# Plan 10 — Ejecución y supervisión autónoma de Jornada

**Estado:** 🟢 LISTO
**Avance:** 67% (2/3 S)

> El maintainer resolvió la ubicación provisional del 2026-08-11: las responsabilidades antes
> enumeradas como `S3.5`/`S3.6` forman un Plan nuevo y pasan a ser `S10.1`/`S10.2`. P3 permanece
> ✅ COMPLETO con `4/4 S`. P9 conserva su alcance separado de slots físicos de Jornada y caché
> externa de Bun; no se integra ni se modifica mediante esta decisión.

`S10.3` incorpora primero el contrato versionado como artefacto pasivo. Después, `S10.1`
valida, prepara y persiste bajo ownership exclusivo de Jornada, siempre sin efectos; `S10.2`
conserva la arquitectura productora de supervisión y sus decisiones abiertas.

## Resumen auditable

| Campo | Contrato |
|---|---|
| Autoridad | Decisión explícita del maintainer: Plan nuevo P10 para las responsabilidades provisionales `S3.5`/`S3.6`, renumeradas `S10.1`/`S10.2`. |
| Estado | 🟢 LISTO: `S10.3` y `S10.1` están ✅ COMPLETO; `S10.2` sigue 🔴 BLOQUEADO. |
| Orden | `S3.4 → S10.3 → S10.1 → S10.2 → S7.1`. |
| Capacidad derivada | P10 no aporta capacidad mientras `S10.2` siga sin `Área`; la capacidad siguiente permanece en `S4.2` y `S5.9`. |
| Avance | 67% (2/3 S): `S10.3` y `S10.1` están ✅ COMPLETO. |
| Release | P10 forma parte del producto, roadmap y release únicos; aporta 1/3 al denominador. |

La jerarquía canónica es `Plan → Sesión → Módulo → Tarea`; `S10.3` y `S10.1` quedan enumeradas
abajo. `S10.2` se detiene en Sesión mientras sus decisiones impiden fijar archivos.

## Sesiones

| ID | Resultado | Estado | Ruta | Motivo | Autoridad | Depende de | Área | Recurso |
|---|---|---|---|---|---|---|---|---|
| `S10.3` | Contrato de ejecución versionado | ✅ COMPLETO | `direct` | Copia pasiva, exacta e indivisible con verificación estructural. | Decisión explícita del maintainer. | `S3.4` ✅ | `schemas/execution-contract-v1.schema.json` | — |
| `S10.1` | Preparación persistida de Jornada | ✅ COMPLETO | `design-tasks` | Owner pasivo y gate consumidor verificados, sin arquitectura productora ni efectos. | Decisión explícita del maintainer. | `S10.3` ✅ | `jornada/**`, `test/jornada/**` | —; sin token de entrega ni SQLite de la Torre. |
| `S10.2` | Supervisión sin armado local | 🔴 BLOQUEADO | `blocked` | Arquitectura visible/de seguridad e interlock abiertos; `Área` sin definir. | Brecha 7 de [implementation-state](../implementation-state.md). | `S10.1` | **Sin definir** | Centinela `ACTIVE` del repositorio supervisado. |

## Sesión 10.3 — Contrato de ejecución versionado

**Estado:** ✅ COMPLETO

**Depende de:** `S3.4` ✅

**Área:** `schemas/execution-contract-v1.schema.json`

**Recurso:** —

**Ruta:** `direct` — artefacto pasivo, sin runtime ni tests; sólo copia y readback estructural.

**Decisiones:**
- `escala` — **RESUELTA por el maintainer:** copia byte a byte desde `/home/emili/.agents/skills/unattended-implementation/assets/execution-contract.schema.json`; destino exacto de 17.297 bytes, 407 líneas y SHA-256 `2f4838aa244b30e280c5c558286b0e4d9fbb503a0ef1808ffc27501c1540fddc`. La excepción autoriza sólo este contrato activo indivisible, no otras líneas ni overflow de `S10.1`. **Clase:** expansión de alcance; contrato visible del producto. **Contaminaba:** `S10.3`, `S10.1`, `S10.2`, `S7.1`.

**Criterios de aceptación** — todos deben pasar para cerrar:
- [x] El destino es byte-idéntico al origen y coincide en bytes, líneas y SHA-256
- [x] No se normaliza, genera ni modifica ningún otro archivo de runtime, schema o test
- [x] Ningún runtime lee `~/.claude/`; la fuente se consulta sólo durante la copia estructural
- [x] La excepción de tamaño se atribuye exclusivamente a este artefacto indivisible

### Módulo 10.3.1 — Copia estructural del contrato
- [x] `T10.3.1.1` **RED:** origen confirmado en 17.297 bytes, 407 líneas y SHA-256 `2f4838aa244b30e280c5c558286b0e4d9fbb503a0ef1808ffc27501c1540fddc`; destino ausente y worktree limpio en `cdd0d09bcdd4d2104e54a7265d1dc3742ceea2e7`.
- [x] `T10.3.1.2` **GREEN:** copia byte-idéntica creada únicamente en `schemas/execution-contract-v1.schema.json`, sin transformación.
- [x] `T10.3.1.3` **REFACTOR:** `cmp` confirmó identidad; readback confirmó 17.297 bytes, 407 líneas, SHA-256 esperado y modo Git `100644`. JSON parseó y conservó Draft 2020-12, `$id`, `type: object`, `additionalProperties: false`, 17 propiedades requeridas y `$defs` estructuralmente presentes. Runtime harness: N/A, artefacto pasivo sin frontera ejecutable.

## Sesión 10.1 — Preparación persistida de Jornada

**Estado:** ✅ COMPLETO

**Depende de:** `S10.3` ✅

**Área:** `jornada/**`, `test/jornada/**`

**Prohibido:** `core.mjs`, `mcp.mjs`, `main-store/store.mjs`, `escalation/**`, `delivery/**`, `contracts/**`, todo `schemas/**`; Main store y SQLite.

**Recurso:** —.

**Ruta:** `design-tasks` — elaboración compacta del owner pasivo y gate consumidor; sin proposal/spec ni diseño productor de `S10.2`.

**Decisiones:**
- `derivable` — contrato vencido falla cerrado por `expires_at` y nunca se renueva solo. **Autoridad:** schema versionado. **Falsificador:** aceptar una preparación posterior al vencimiento.
- `escala` — **RESUELTA por el maintainer:** una única capability/root inyectada, pasiva y owner-only bajo `jornada/**` persiste antes de declarar `prepared`; no Main store, SQLite ni writer alternativo. **Clase:** seguridad y permisos; API pública. **Contaminaba:** `S10.1`, `S10.2`, `S7.1`.
- `escala` — **RESUELTA por el maintainer:** `S10.1` consume evidencia opaca de supervisión sólo como gate y permanece incapaz de efectos; `S10.2` conserva arquitectura y producción de evidencia. **Clase:** operaciones irreversibles. **Contaminaba:** `S10.1`, `S10.2`, `S7.1`.

**Criterios de aceptación** — todos deben pasar para cerrar:
- [x] JSON canónico, digest, `expires_at`, repositorio, worktree, rama, `base_sha` y `sesion_id` exactos se validan antes de persistir o declarar `prepared`
- [x] Contrato inválido, divergente o vencido falla cerrado, con cero llamadas de persistencia y sin estado `prepared`
- [x] Evidencia opaca de supervisión válida, vigente y coincidente se verifica después del contrato/contexto y antes de persistir; si está ausente, inválida, divergente o vencida hay cero llamadas de persistencia y no existe estado `prepared`
- [x] Sólo después de validar contrato, contexto y supervisión, una única llamada a la capability/root owner-only persiste pasivamente bajo `jornada/**`; únicamente su éxito permite devolver `prepared`
- [x] `S10.1` no diseña ni produce evidencia de supervisión
- [x] No existe executor ni acceso a subprocess, Git, remoto, Main store o SQLite; ningún camino produce efectos
- [x] El diff no toca ninguna ruta fuera de `Área` ni ninguna ruta del `Prohibido`

### Módulo 10.1.1 — Validación canónica de contrato y contexto
- [x] `T10.1.1.1` **RED:** rechazo de JSON/digest/expiry e identidad exacta divergentes con cero persistencia y sin `prepared`.
- [x] `T10.1.1.2` **GREEN:** contrato y contexto validados en una representación prevalidada, sin persistir ni declarar `prepared`.
- [x] `T10.1.1.3` **REFACTOR:** invariantes centralizadas; cero acceso a executor, subprocess, Git o remoto.

### Módulo 10.1.2 — Gate consumidor de supervisión
- [x] `T10.1.2.1` **RED:** evidencia opaca ausente, inválida, divergente o vencida deja cero persistencia y ningún `prepared`.
- [x] `T10.1.2.2` **GREEN:** evidencia válida, vigente y coincidente se verifica sólo después del contrato/contexto.
- [x] `T10.1.2.3` **REFACTOR:** frontera effect-incapable y ausencia de diseño productor de `S10.2` verificadas.

### Módulo 10.1.3 — Persistencia pasiva owner-only
- [x] `T10.1.3.1` **RED:** root/capability ausente, ajena o fallida prohíbe `prepared` prematuro.
- [x] `T10.1.3.2` **GREEN:** tras validar contrato, contexto y supervisión, una sola persistencia owner-only permite devolver `prepared`.
- [x] `T10.1.3.3` **REFACTOR:** readback/errores aislados sin Main store, SQLite ni writer alternativo.

**Evidencia de cierre:** implementación `6b9bd64adc4456dccdd2fe758d24ed23fb2cc3de13e3b267877ec34ec90e3390`, tests `961e7ccd1b8e4a26a4bc80e144722389c4fb0a9405080c25cd9260e7e70211e1`, patch `d6d8871213c5fca46f81652016eac9868f3366f37aeabbf632be917c26d6c0b0`; 306 líneas ejecutables authored. Focused Bun: 8/0, 144 assertions; full: 679/0, 4164 assertions, 44 archivos. Todos los criterios y las 9 Tareas pasan; la frontera sólo valida, consume evidencia opaca y persiste una vez por capability Jornada inyectada, sin subprocess, Git, remoto, Main store, SQLite ni productor de supervisión. Verificación estructural/integral: PASS; lens consultivo no disponible por exigir lineage mientras RDD/4R está suspendido, sin implicar fallo ni aprobación del candidato.

## Sesión 10.2 — Supervisión sin armado local

**Estado:** 🔴 BLOQUEADO

**Depende de:** `S10.1`. La dependencia conserva el orden aprobado; `S10.1` puede construirse
effect-incapable, pero ningún efecto se habilita antes de que esta Sesión entregue supervisión
válida y vigente.

**Área:** **sin definir**. La resolución de arquitectura debe fijarla explícitamente antes de
elaborar o ejecutar la Sesión. No se adivina y, mientras falte, `S10.2` queda excluida de capacidad.

**Recurso:** centinela `ACTIVE` del repositorio supervisado.

**Ruta:** `blocked` — cambia la semántica visible de supervisión y la frontera de autoridad de la
Torre, toca seguridad y permisos, y parte de evidencia contradictoria. Sólo después de resolver
las decisiones puede clasificarse la elaboración posterior. **Autoridad:** brecha 7 de
[implementation-state](../implementation-state.md).

Resuelve la brecha 7: el sellado desatendido exige la Torre armada, y los dos repositorios en uso
tienen una razón de diseño para exigirla apagada. `control-tower` aborta sus dos tests P0 con
`ACTIVE` presente (`test/helpers/restore-fixture.mjs:90`) y `remote-control` congela su relay
(`src/tower-guard.js:226`, `allowed = remote && off`). Hoy no existe estado que satisfaga ambos.

**Decisiones:**

- `escala` — **Pregunta exacta:** ¿la supervisión sin armar el repositorio supervisado se expresa
  como un modo nuevo del centinela, un centinela separado o supervisión externa al repositorio?
  **Clase:** contrato visible del producto; seguridad y permisos. **Evidencia:** los dos tests P0
  de `control-tower` abortan con `ACTIVE`, mientras el sellado exige supervisión viva.
  **Opciones y consecuencias:** (1) modo nuevo de `ACTIVE`, que cambia su contrato visible y sus
  consumidores; (2) centinela separado, que agrega una segunda señal y exige definir autoridad y
  precedencia; (3) supervisión externa, que evita armar el repositorio pero exige fijar identidad,
  vigencia y prueba de liveness fuera de él. **Origen:** `S10.2`.
  **Checkpoint:** antes de proposal, spec, design, definición de `Área` o implementación.
  **Contamina:** toda `S10.2`, `S10.1`, `remote-control` y los dos tests P0 de
  `test/migration.test.mjs`.
- `escala` — **Pregunta exacta:** ¿`remote-control` conserva intacto su interlock o se autoriza un
  cambio explícito para reconocer la nueva supervisión? **Clase:** dependencias o evidencia
  contradictorias; contrato visible del producto; seguridad y permisos. **Evidencia:**
  `src/tower-guard.js:226` define `allowed = remote && off`, y la decisión aceptada del 2026-08-08
  dice que el interlock no se retira; atravesarlo contradice esa autoridad.
  **Opciones y consecuencias:** (1) conservarlo intacto, lo que obliga a que la supervisión sea
  externa o invisible para ese interlock; (2) autorizar un cambio acotado de contrato, que exige
  nueva autoridad de producto y seguridad antes de tocar `remote-control`. **Origen:** `S10.2`.
  **Checkpoint:** antes de proposal, spec, design, definición de `Área` o implementación.
  **Contamina:** toda `S10.2` y la decisión de complementariedad aceptada.

**Criterios de aceptación** — todos deben pasar para cerrar:

- [ ] La Torre supervisa una ejecución sellada en un repositorio sin que ese repositorio quede armado
- [ ] `bun test` pasa completo durante una supervisión activa sobre este mismo repositorio
- [ ] `relayEligibility` de `remote-control` sigue devolviendo `frozen` cuando la Torre está armada en su repositorio
- [ ] Una supervisión ausente o vencida falla cerrado; no se degrada a ejecución sin supervisar
- [ ] El diff no toca ninguna ruta fuera del `Área` que fije la elaboración técnica

## Grafo del Plan 10

```mermaid
graph LR
  S34["S3.4 ciclo de vida Jornada · ✅"] --> S103["S10.3 contrato versionado · ✅"]
  S103 --> S101["S10.1 preparación persistida · ✅"]
  S101 --> S102["S10.2 supervisión sin armado · 🔴"]
  S102 --> S71["S7.1 conformidad de release · 📋"]
```

**Avance derivado:** 67% (2/3 S). **Capacidad derivada:** `S10.2` permanece 🔴 BLOQUEADO sin `Área`; P10 no aporta capacidad elegible.
