# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-04 contra `master@d8924a6`; cierre verificado de `S3.1`.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md).

## 🔢 Orden de ejecución

**Leé esta tabla primero.** La columna `#` es **cuándo** se hace; el ID es **cómo se llama**. No coinciden, y no tienen por qué: los IDs son nombres posicionales, como los números de una calle — te dicen dónde queda la casa, no en qué orden visitarlas. `S4.1` va después de `S5.1`, y `M8.8.6` se ejecutó antes que `M8.8.3`. El orden lo dicta el grafo, nunca el número.

| # | Sesión | Plan | Estado | Qué es |
|---|---|---|---|---|
| ▶ | `S3.2` | P3 | 🟢 LISTO | Policy/Jornada y resolución de la política de entrega. **Es la próxima**, y la única entrada disponible del grafo |
| 2 | `S3.3` | P3 | 📋 PLANIFICADO | Agent Capability Registry |
| 3 | `S5.1` | P5 | 📋 PLANIFICADO | Candidate contracts + authorization store |
| 4 | `S4.1` | P4 | 📋 PLANIFICADO | Hosts y línea exclusiva — **cierra P4 entero** |
| 5 | `S5.2` | P5 | 📋 PLANIFICADO | Entrega idempotente y reconciliación |
| 6 | `S5.4` | P5 | 📋 PLANIFICADO | Ruteo de escalamiento fuera/en casa |
| 7 | `S5.5` | P5 | 📋 PLANIFICADO | Decisión estacionada y continuación independiente |
| 8 | `S5.3` | P5 | 📋 PLANIFICADO | Continuación desde base integrada |
| 9 | `S8.7` | P8 | 📋 PLANIFICADO | Puente Hermes/Telegram — **acá entra la autenticación pendiente** |
| 10 | `S7.1` | P7 | 📋 PLANIFICADO | Conformidad de release — **última de toda la cadena** |

`S0.3`, `S3.1` y `S8.8` ✅ COMPLETO ya salieron de la fila. `S8.5` y `S8.6` están 🟡 DIFERIDO y fuera de este camino. El grafo completo, con sus aristas y la capacidad derivada, vive en [release-chain](release-chain.md).

## 📍 Punto de retoma

**`S3.1` ✅ COMPLETO en `d8924a6`.** `M3.1.1` captura checkpoints canónicos con raíz absoluta, OIDs completos y evidencia ligada, sin red ni efectos remotos. Verificación: `bun test test/workspace/checkpoint.test.mjs` 11/0/23, `bun test` 476/0/2779 y corrección de binding `CORROBORATED_FIXED`; la Torre siguió OFF.

**Siguiente punto elegible: `S3.2` 🟢 LISTO.** Su única dependencia, `S3.1`, está completa. `S3.3` sigue 📋 PLANIFICADO hasta que cierre `S3.2`; `S8.7` sigue 📋 PLANIFICADO y espera `S5.1`. No hay decisión ni bloqueo nuevo.

**Producto único.** `installable-v1` y `autonomous-v2` son afinidades de trabajo, no identidades de producto; la cadena y sus dependencias viven en [release-chain](release-chain.md).

## ⚖️ Decisiones vigentes

> **Esta sección NO es el punto de retoma y no se reescribe al cerrar una Sesión.** El `📍 Punto de retoma` es un estado y se reescribe entero cada vez; esto es **política**, y sobrevive. La distinción se aprendió por las malas el 2026-08-03: estas decisiones vivían adentro del punto de retoma y el cierre de `S8.8` se las llevó puestas, correctamente según el estándar. El error era la ubicación.

**Resueltas por el maintainer el 2026-08-03.** Gobiernan `S5.1` en adelante; ninguna se resuelve escribiendo código.

1. **Expiración de una autorización: una hora.** Cubre aprobar desde el celular y que el agente ejecute en minutos, sin dejar una aprobación armada toda la noche. Es la **segunda** capa de invalidación; la primera es por contenido, que el candidato congelado ya provee. Destraba `S5.2` y `S5.5`.
2. **Herencia entre sucesores: hasta el horizonte declarado, condicionada al sello.** Un sucesor hereda si y sólo si, al momento de la aprobación, **todas** las Sesiones dentro de `planning.horizon_ceiling` están selladas — cero decisiones `escala` abiertas. Si alguna tiene una abierta, el horizonte **colapsa** ahí. Horizonte y sello son garantías distintas: el horizonte acota **hasta dónde** llega la aprobación, el sello garantiza que **lo que alcanza ya está determinado**. Sin la segunda, heredar es autorizar contenido que se define después de aprobado. Destraba `S5.3` y `S8.7`.
3. **Árbitro documental: gana el `STATUS.md` del plan.** Los `tasks.md` externos son anteriores a que SDD se aplicara a todo el trabajo; varios viven en `changes/archive/`, o sea documentos archivados gobernando trabajo activo. Pasan a ser referencia histórica, no contrato. Aplica a `S3.1`, `S3.2`, `S4.1`, `S5.1`, `S5.2`, `S5.3` y `S7.1` — es una regla del repositorio, no de una Sesión.
4. **Entrega de Módulos sellados: push directo, sin espera atendida.** Es la política ya declarada en `delivery-policy` de [`AGENTS.md`](../../AGENTS.md) (`shape: direct-push`); lo que se resolvió es que `merge.authorizing_party: human` **no** obliga a una pausa por Módulo cuando el Módulo está sellado con cero decisiones abiertas. La revisión humana es del resultado, no del paso previo.

**Resueltas por el maintainer el 2026-08-04.** Sellan `S3.2` entero — cero decisiones `escala` abiertas. Detalle en [`plan-3/STATUS.md`](plan-3/STATUS.md).

5. **Ninguna excepción acotada relaja un floor de seguridad.** Los cinco —sin mutación remota temprana, inmutabilidad del candidato congelado, ledger append-only, autoridad única de Main, sin autoasignación del worker— quedan fuera del alcance de la configuración **y** de toda excepción. Dos ni siquiera admiten relajación *acotada*: el ledger vive en triggers DDL y una migración no vence; una excepción sobre la autoridad de Main tendría que otorgarla Main. La excepción conserva alcance real sobre la superficie configurable. Destraba `S3.2`, y deja intactas `S5.1`, `S5.2` y `S7.1`.
6. **El set de floors es de cinco.** El spec vigente nombraba tres y el proposal seis; ambos corregidos. `fail-closed validation of every binding` es propiedad del sistema, no un sexto floor.
7. **La excepción la otorga sólo un humano y vence con la Jornada.** Deliberadamente distinto de la expiración de una autorización de merge (una hora, punto 1). Son dos reglas de expiración distintas a propósito — no unificarlas.
8. **La auditoría de una excepción es un evento §15.3**, con cadena de hash **por entrega** (no por proyecto, para no serializar la punta contra CAS) y justificación persistida **sólo como digest más puntero externo**. Eso resuelve de una la fuga de secretos por texto libre y el choque entre el borrado de §22 y el append-only.

9. **`plan-manifest-v1.delivery_policy` se renombró a `delivery_automation`.** Colisionaba con el bloque `delivery-policy` de [`AGENTS.md`](../../AGENTS.md) y son controles distintos: el del manifest declara **qué pasos de entrega están automatizados**; el de `AGENTS.md` declara **quién autoriza el merge**. El renombre alcanza el schema, el manifest vivo y el fixture/test, pero **no** el bloque de ejemplo de REQUIREMENTS: ese archivo está byte-pinned como input histórico por la revisión congelada 1 (`autonomous-v2/revisions/1/manifest.yaml:39-43`) y `provenance.test.mjs` falla cerrado ante cualquier drift. Corregir el ejemplo exige publicar una revisión nueva, no editar los bytes fijados — el mecanismo funcionando como fue diseñado. Enmienda puntual a la decisión "preserve accepted bytes" de [`design.md`](../changes/autonomous-v2-checkpointed-delivery/design.md), anotada ahí como excepción única.

**Sigue ABIERTA — una sola: la autenticación del puente.** Un chat de Telegram es un canal, no una identidad, y `S8.7` transporta autorizaciones que deciden merges. No bloquea nada hasta `S8.7`, décima en el orden de ejecución.

**Las trece Sesiones de la cadena tienen `Decisiones` declaradas** bajo la §11 del [estándar de planes](/home/emili/.claude/skills/_shared/plan-naming-convention.md): **57 en total**, 37 `derivable` con criterio falsificable y autoridad nombrada, 20 `escala` con su clase y su `Contamina:`. De esas 20, **4 ya están resueltas** por el maintainer — 2 el 2026-08-03 (`S5.1`) y 2 el 2026-08-04 (`S3.2`). `S3.2` es la primera Sesión de la cadena que queda con cero `escala` abiertas.

**No se puede sellar implementación desatendida de la propia Torre.** El sello exige supervisión viva de la Torre —única ruta, Torre inactiva ⇒ `BLOCKED`— y los dos tests P0 de `test/migration.test.mjs` abortan si existe `.git/control-tower/ACTIVE`, marcador que `restore-fixture.mjs:93-101` resuelve por `--git-common-dir` y que comparten los seis worktrees. Torre armada ⇒ la verificación final falla, y ese gate es terminal sin reintento. Torre apagada ⇒ el sello no arranca. **Es específico de este repositorio**: para cualquier otro proyecto, sellar con la Torre armada funciona. Acá la ruta es escritor único con la Torre desarmada, sellando el **alcance** — criterios binarios y cero decisiones abiertas.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.config/opencode/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 1/9 Planes cerrados (11%) · Sesiones cerradas en planes activos: 24/45 (53%)

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔴 BLOQUEADO | 53% (10/19 S) | — | Main | S1.11–S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | 🟢 LISTO | 33% (1/3 S) | — | Main | S3.2, S3.3 | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 📋 PLANIFICADO | 0% (0/1 S) | — | Main | S4.1 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 📋 PLANIFICADO | 0% (0/5 S) | — | Main | S5.1, S5.2, S5.3, S5.4, S5.5 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 63% (5/8 S) | — | Maintainer | S8.7, S8.5, S8.6 | [STATUS](plan-8/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
