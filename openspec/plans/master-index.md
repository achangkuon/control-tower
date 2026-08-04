# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-04 contra `origin/master@4621d3f`; cierre verificado de `S3.3` y `S3.4` habilitada tras revalidarse contra el SHA integrado.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md).

## 🔢 Orden de ejecución

**Leé esta tabla primero.** La columna `#` es **cuándo** se hace; el ID es **cómo se llama**. No coinciden, y no tienen por qué: los IDs son nombres posicionales, como los números de una calle — te dicen dónde queda la casa, no en qué orden visitarlas. `S4.1` va después de `S5.1`, y `M8.8.6` se ejecutó antes que `M8.8.3`. El orden lo dicta el grafo, nunca el número.

| # | Sesión | Plan | Estado | Qué es |
|---|---|---|---|---|
| ▶ | `S3.4` | P3 | 🟢 LISTO | Persistencia y ciclo de vida de Jornada. **Es la próxima** — cierra el hueco que aceptó `S3.3` y **cierra P3 entero** |
| 2 | `S5.1` | P5 | 📋 PLANIFICADO | Candidate contracts + authorization store |
| 3 | `S4.1` | P4 | 📋 PLANIFICADO | Hosts y línea exclusiva — **cierra P4 entero** |
| 4 | `S5.2` | P5 | 📋 PLANIFICADO | Entrega idempotente y reconciliación |
| 5 | `S5.4` | P5 | 📋 PLANIFICADO | Ruteo de escalamiento fuera/en casa |
| 6 | `S5.5` | P5 | 📋 PLANIFICADO | Decisión estacionada y continuación independiente |
| 7 | `S5.3` | P5 | 📋 PLANIFICADO | Continuación desde base integrada |
| 8 | `S8.7` | P8 | 📋 PLANIFICADO | Puente Hermes/Telegram — **acá entra la autenticación pendiente** |
| 9 | `S7.1` | P7 | 📋 PLANIFICADO | Conformidad de release — **última de toda la cadena** |

`S0.3`, `S3.1`, `S3.2`, `S3.3` y `S8.8` ✅ COMPLETO ya salieron de la fila. `S8.5` y `S8.6` están 🟡 DIFERIDO y fuera de este camino. El grafo completo, con sus aristas y la capacidad derivada, vive en [release-chain](release-chain.md).

## 📍 Punto de retoma

**`S3.3` ✅ COMPLETO en `4621d3f`, sobre `origin/master@7c1c323`.** Su Módulo y sus tres Tareas quedaron cerrados; los **14** criterios pasaron con verificación fresca del planner contra el SHA integrado, no contra el reporte del implementador. El diff fue de 7 archivos, los 7 dentro del `Área`, 374 adiciones y 0 eliminaciones, sin tocar una sola ruta del `Prohibido`. La prueba enfocada dio 86/0/367 y la completa 503/0/2880, ambas con la Torre OFF; el SHA-256 byte-pinned de REQUIREMENTS permaneció `277129f30b47c1b6fda0a6c81f6d8943d737a7b5ff5750455e2b41dce6e1e5a0`.

**Lo que deja `S3.3`:** resolución de capability por rol y por proyecto, expiración de doble capa —revisión CAS del registro más binding de Jornada—, y **paridad de escritura atómica verificada por test** contra `registry/store.mjs` en los cinco casos (symlink, modos, dueño ajeno, lock ocupado, revisión desactualizada). El límite duro se sostiene por contrato y no por convención: el enum de `agent_role` es exactamente `["SUPPORT", "POLICY"]`, así que **no existe forma de expresar una ruta Support → Worker** en el documento.

**El hueco que `S3.3` aceptó sigue abierto, a propósito.** Una Jornada revocada antes de su `expires_at` deja su entrada resolviendo hasta que el reloj la alcance. Es visibilidad, nunca autoridad. **Lo cierra `S3.4`**, y ese cierre ya está verificado como alcanzable: `resolve` recibe la Jornada **como argumento** (`capabilities/registry.mjs:143`), así que el test de `S3.4` importa el registry y le pasa la Jornada terminada sin editar `capabilities/**`.

**`S3.4` 🟢 LISTO — revalidada el 2026-08-04 contra `origin/master@4621d3f`.** Su `Área` no tiene intersección con el diff de `S3.3`, su criterio de cierre es alcanzable sin violar el `Prohibido`, y su línea base quedó materializada en 503/0/2880. Su única decisión `escala` —si terminar una Jornada debe revocar activamente— **no la bloquea**: sus criterios de aceptación no asumen la respuesta.

**Capacidad de ejecución: 1.** Sólo `S3.4` está 🟢 LISTO. P3 es una sola cadena `S3.1 → S3.2 → S3.3 → S3.4`, así que no admite paralelismo interno.

**Pero el horizonte cambió: `S5.1` dejó de estar bloqueada por dependencias.** Depende de `S3.2` ✅ y `S3.3` ✅, y las dos están integradas. Sigue 📋 PLANIFICADO por dos razones distintas, y conviene no confundirlas: (1) su contrato ejecutable **no está sellado** —le falta el paso de `session-plan` que `S3.3` sí recibió—, y (2) la decisión `escala` **abierta** sobre revocación activa al terminar una Jornada **la contamina**, porque su store de autorización tendría que exponer una ruta de revocación en cascada que hoy no está en su alcance. Sellar exige cero decisiones `escala` abiertas, así que **(2) bloquea a (1)**: mientras el maintainer no resuelva esa decisión, `S5.1` no es sellable. Resuelta la decisión, `S5.1` se vuelve un segundo frente de planificación real, en paralelo a la ejecución de `S3.4` — que es la condición que no existía durante `S3.3`.

`installable-v1` y `autonomous-v2` siguen siendo afinidades de trabajo, no identidades de producto.

## ⚖️ Decisiones vigentes

> **Esta sección NO es el punto de retoma y no se reescribe al cerrar una Sesión.** El `📍 Punto de retoma` es un estado y se reescribe entero cada vez; esto es **política**, y sobrevive. La distinción se aprendió por las malas el 2026-08-03: estas decisiones vivían adentro del punto de retoma y el cierre de `S8.8` se las llevó puestas, correctamente según el estándar. El error era la ubicación.

**Resueltas por el maintainer el 2026-08-03.** Gobiernan `S5.1` en adelante; ninguna se resuelve escribiendo código.

1. **Expiración de una autorización: una hora.** Cubre aprobar desde el celular y que el agente ejecute en minutos, sin dejar una aprobación armada toda la noche. Es la **segunda** capa de invalidación; la primera es por contenido, que el candidato congelado ya provee. Destraba `S5.2` y `S5.5`.
2. **Herencia entre sucesores: hasta el horizonte declarado, condicionada al sello.** Un sucesor hereda si y sólo si, al momento de la aprobación, **todas** las Sesiones dentro de `planning.horizon_ceiling` están selladas — cero decisiones `escala` abiertas. Si alguna tiene una abierta, el horizonte **colapsa** ahí. Horizonte y sello son garantías distintas: el horizonte acota **hasta dónde** llega la aprobación, el sello garantiza que **lo que alcanza ya está determinado**. Sin la segunda, heredar es autorizar contenido que se define después de aprobado. Destraba `S5.3` y `S8.7`.
3. **Árbitro documental: gana el `STATUS.md` del plan.** Los `tasks.md` externos son anteriores a que SDD se aplicara a todo el trabajo; varios viven en `changes/archive/`, o sea documentos archivados gobernando trabajo activo. Pasan a ser referencia histórica, no contrato. Aplica a `S3.1`, `S3.2`, `S4.1`, `S5.1`, `S5.2`, `S5.3` y `S7.1` — es una regla del repositorio, no de una Sesión.
4. **Entrega de Módulos sellados: push directo, sin espera atendida.** Es la política ya declarada en `delivery-policy` de [`AGENTS.md`](../../AGENTS.md) (`shape: direct-push`); lo que se resolvió es que `merge.authorizing_party: human` **no** obliga a una pausa por Módulo cuando el Módulo está sellado con cero decisiones abiertas. La revisión humana es del resultado, no del paso previo.

**Resueltas por el maintainer el 2026-08-04.** Sellan `S3.2` entero — cero decisiones `escala` abiertas — y resuelven la única decisión `escala` de `S3.3`. Detalle en [`plan-3/STATUS.md`](plan-3/STATUS.md).

5. **Ninguna excepción acotada relaja un floor de seguridad.** Los cinco —sin mutación remota temprana, inmutabilidad del candidato congelado, ledger append-only, autoridad única de Main, sin autoasignación del worker— quedan fuera del alcance de la configuración **y** de toda excepción. Dos ni siquiera admiten relajación *acotada*: el ledger vive en triggers DDL y una migración no vence; una excepción sobre la autoridad de Main tendría que otorgarla Main. La excepción conserva alcance real sobre la superficie configurable. Destraba `S3.2`, y deja intactas `S5.1`, `S5.2` y `S7.1`.
6. **El set de floors es de cinco.** El spec vigente nombraba tres y el proposal seis; ambos corregidos. `fail-closed validation of every binding` es propiedad del sistema, no un sexto floor.
7. **La excepción la otorga sólo un humano y vence con la Jornada.** Deliberadamente distinto de la expiración de una autorización de merge (una hora, punto 1). Son dos reglas de expiración distintas a propósito — no unificarlas.
8. **La auditoría de una excepción es un evento §15.3**, con cadena de hash **por entrega** (no por proyecto, para no serializar la punta contra CAS) y justificación persistida **sólo como digest más puntero externo**. Eso resuelve de una la fuga de secretos por texto libre y el choque entre el borrado de §22 y el append-only.

9. **`plan-manifest-v1.delivery_policy` se renombró a `delivery_automation`.** Colisionaba con el bloque `delivery-policy` de [`AGENTS.md`](../../AGENTS.md) y son controles distintos: el del manifest declara **qué pasos de entrega están automatizados**; el de `AGENTS.md` declara **quién autoriza el merge**. El renombre alcanza el schema, el manifest vivo y el fixture/test, pero **no** el bloque de ejemplo de REQUIREMENTS: ese archivo está byte-pinned como input histórico por la revisión congelada 1 (`autonomous-v2/revisions/1/manifest.yaml:39-43`) y `provenance.test.mjs` falla cerrado ante cualquier drift. Corregir el ejemplo exige publicar una revisión nueva, no editar los bytes fijados — el mecanismo funcionando como fue diseñado. Enmienda puntual a la decisión "preserve accepted bytes" de [`design.md`](../changes/autonomous-v2-checkpointed-delivery/design.md), anotada ahí como excepción única.

10. **La disponibilidad predeterminada de una capability vence con su Jornada, materializando `expires_at` al emitir la entrada.** La entrada liga `jornada_id`, `jornada_revision` y ese `expires_at`; falla cerrada ante binding ausente, revisión que no coincide o reloj vencido. Es la **segunda** capa de invalidación: el cambio CAS `R1 → R2` sigue invalidando todos los bindings y no queda sustituido. **Hueco aceptado a propósito:** una Jornada revocada antes de su `expires_at` deja la entrada viva hasta que el reloj la alcance, porque no existe persistencia de Jornada a la que preguntarle. Se acepta porque el registry otorga **visibilidad, nunca autoridad** — una entrada zombi deja *ver* una capability que ya no corresponde, pero no habilita ninguna operación sin autorización de Main. **Lo cierra `S3.4`**, cuyo incremento de `jornada_revision` en toda transición hace que una Jornada terminada produzca drift. Decisión del maintainer del 2026-08-04; gobierna `S3.3`, `S3.4`, `S5.1` y `S5.4`.
11. **La escritura atómica del capability registry es propia de `S3.3`, no reusa `registry/store.mjs`.** Se prefirió aislamiento sobre reuso: no tocar un componente en producción con tests propios. `registry/**` entra al `Prohibido` de `S3.3`, que así no puede romper el registro de proyectos. El costo aceptado es una segunda implementación de escritura atómica, mitigada por un **criterio de aceptación de paridad** — symlink, modos distintos de `0700`/`0600`, dueño ajeno, lock ocupado y revisión desactualizada se rechazan idénticamente en ambas, verificado por test.
12. **La persistencia y el ciclo de vida de Jornada se enumeran como `S3.4`, con alcance pasivo.** `jornada-v1` existía como contrato sin implementación. La Sesión persiste, transiciona y lee Jornadas, e incrementa `jornada_revision` en toda transición; **no** dispara revocación activa en cascada sobre capabilities ni autorizaciones vivas. P3 pasa de 3 a 4 Sesiones.

**Siguen ABIERTAS — dos.** (1) **La autenticación del puente**: un chat de Telegram es un canal, no una identidad, y `S8.7` transporta autorizaciones que deciden merges; no bloquea nada hasta `S8.7`. (2) **Si terminar una Jornada debe revocar activamente** las capabilities y autorizaciones vivas, en vez de sólo invalidarlas por drift — clase expansión de alcance más seguridad y permisos. **Contamina `S5.1`**, y **no** contamina `S3.4`, que quedó enumerada como pasiva por decisión del maintainer. **Desde el cierre de `S3.3` esta es la decisión que gobierna el horizonte:** `S5.1` ya tiene sus dependencias satisfechas, así que es lo único que impide sellarla y abrir un segundo frente.

**Las catorce Sesiones de la cadena tienen `Decisiones` declaradas** bajo la §11 del [estándar de planes](/home/emili/.claude/skills/_shared/plan-naming-convention.md): **64 en total**, 42 `derivable` con criterio falsificable y autoridad nombrada, 22 `escala` con su clase y su `Contamina:`. De esas 22, **6 ya están resueltas** por el maintainer — 2 el 2026-08-03 (`S5.1`) y 4 el 2026-08-04 (`S3.2` y `S3.3`). `S3.2` y `S3.3` no tienen decisiones `escala` abiertas; `S3.4` tiene una que no la bloquea.

**No se puede sellar implementación desatendida de la propia Torre.** El sello exige supervisión viva de la Torre —única ruta, Torre inactiva ⇒ `BLOCKED`— y los dos tests P0 de `test/migration.test.mjs` abortan si existe `.git/control-tower/ACTIVE`, marcador que `restore-fixture.mjs:93-101` resuelve por `--git-common-dir` y que comparten los seis worktrees. Torre armada ⇒ la verificación final falla, y ese gate es terminal sin reintento. Torre apagada ⇒ el sello no arranca. **Es específico de este repositorio**: para cualquier otro proyecto, sellar con la Torre armada funciona. Acá la ruta es escritor único con la Torre desarmada, sellando el **alcance** — criterios binarios y cero decisiones abiertas.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.config/opencode/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 1/9 Planes cerrados (11%) · Sesiones cerradas en planes activos: 26/46 (57%)

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔴 BLOQUEADO | 53% (10/19 S) | — | Main | S1.11–S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | 🟢 LISTO | 75% (3/4 S) | — | Main | S3.4 | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 📋 PLANIFICADO | 0% (0/1 S) | — | Main | S4.1 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 📋 PLANIFICADO | 0% (0/5 S) | — | Main | S5.1, S5.2, S5.3, S5.4, S5.5 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 63% (5/8 S) | — | Maintainer | S8.7, S8.5, S8.6 | [STATUS](plan-8/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
