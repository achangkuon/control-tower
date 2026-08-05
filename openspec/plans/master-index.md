# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-04 contra `origin/master@b6dda84`; cierre verificado de `S3.4`, **Plan 3 cerrado entero**, y `S5.1` 🟢 LISTO con su contrato sellado.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md).

## 🔢 Orden de ejecución

**Leé esta tabla primero.** La columna `#` es **cuándo** se hace; el ID es **cómo se llama**. No coinciden, y no tienen por qué: los IDs son nombres posicionales, como los números de una calle — te dicen dónde queda la casa, no en qué orden visitarlas. `S4.1` va después de `S5.1`, y `M8.8.6` se ejecutó antes que `M8.8.3`. El orden lo dicta el grafo, nunca el número.

| # | Sesión | Plan | Estado | Qué es |
|---|---|---|---|---|
| ▶ | `S5.1` | P5 | 🟢 LISTO | Candidate contracts + authorization store. **Es la próxima**: contrato sellado el 2026-08-04 y `S3.4` ya integrada |
| 2 | `S4.1` | P4 | 📋 PLANIFICADO | Hosts y línea exclusiva — **cierra P4 entero** |
| 3 | `S5.2` | P5 | 📋 PLANIFICADO | Entrega idempotente y reconciliación. **Contrato sellado el 2026-08-04**; espera `S4.1`, no espera decisiones |
| 4 | `S5.4` | P5 | 📋 PLANIFICADO | Ruteo de escalamiento fuera/en casa. **Contrato sellado el 2026-08-04**; espera `S5.1`, no espera decisiones |
| 5 | `S5.5` | P5 | 📋 PLANIFICADO | Decisión estacionada y continuación independiente |
| 6 | `S5.3` | P5 | 📋 PLANIFICADO | Continuación desde base integrada |
| 7 | `S8.7` | P8 | 📋 PLANIFICADO | Puente Hermes/Telegram — **acá entra la autenticación pendiente** |
| 8 | `S7.1` | P7 | 📋 PLANIFICADO | Conformidad de release — **última de toda la cadena** |

`S0.3`, `S3.1`, `S3.2`, `S3.3`, `S3.4` y `S8.8` ✅ COMPLETO ya salieron de la fila. **P3 cerró entero.** `S8.5` y `S8.6` están 🟡 DIFERIDO y fuera de este camino. El grafo completo, con sus aristas y la capacidad derivada, vive en [release-chain](release-chain.md).

## 📍 Punto de retoma

**`S5.1` sigue 🟢 LISTO y `M5.1.3` quedó re-sellado el 2026-08-05, con 27 criterios binarios y cero decisiones `escala` abiertas.** El contrato suma exactamente `package.json`, `bun.lock` y `.opencode/plugins/tower-spike.js` al `Área`; `core.mjs` y `test/recovery.test.mjs` siguen explícitamente en el `Prohibido`. Esto es sello de planificación, no verificación de implementación.

**El candidato `s5-1@dee52e3` es inválido y no está integrado.** Mezcla compatibilidad schema-v6 —que `S5.1` no posee— en `core.mjs` y `test/recovery.test.mjs`, y su composition root obtiene el binding mediante un reader de `core.mjs`. El test mockea ese reader, por lo que puede quedar verde sin probar el contrato de inyección.

**El bloqueo dejó de ser una decisión del maintainer y pasó a ser una corrección de código.** El límite ya está decidido: `TowerSpikePlugin` recibe `trustedBindingProvider` al inicializarse, no lo fabrica ni retiene un reader nuevo en `core.mjs`, y falla cerrado antes de spawn o persistencia ante provider o binding ausente, inválido o de otra sesión. Recién el candidato corregido puede verificar los 27 criterios de `S5.1`.

**Cola inmediata:** corregir `s5-1`, verificarlo contra el contrato re-sellado e integrarlo; después ejecutar `S4.1`, que sigue 📋 PLANIFICADO y depende de `S5.1`. `S5.2` espera `S4.1`; `S5.4` y `S8.7` siguen esperando la integración de `S5.1`; el resto del orden permanece sin cambios.

**La compatibilidad schema-v6 todavía no tiene Sesión enumerada.** Agente Soporte debe cerrar el mapa acotado de consumidores y dependencias y entregarlo a `planificador-granular`; este punto de retoma no inventa ID, estado ni arista antes de esa evidencia.

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

**Siguen ABIERTAS — ocho.** La enumeración cierra contra las 22 decisiones `escala` y las 14 resueltas:

1. **`S8.7` — autenticación del puente.** Un chat de Telegram es un canal, no una identidad, y el puente transporta autorizaciones que deciden merges.
2. **`S8.7` — exposición de estado por un canal externo.** Falta decidir qué información puede salir de la máquina sin violar el contrato de privacidad.
3. **`S8.7` — callback de aprobación expirado.** Falta decidir si se rechaza y repite el pedido o si se acepta pese a la expiración.
4. **Sin Sesión asignada — contenido de dry-run que salió de `S5.1`.** `NO_SCOPE`, denegación, drift de horizonte y `reconcile→Support→Policy` quedaron huérfanos al resolver `M5.1.1` a favor de `Candidate`. **Clase:** expansión de alcance. **Contamina:** `S5.3`, su destino natural. No contamina `S5.1` ni `S3.4`.
5. **`S5.3` — base integrada divergente.** Falta decidir qué hacer cuando rebasar cambia trabajo ya planificado y descartarlo tira trabajo hecho.
6. **`S5.5` — respuesta contraria a trabajo ya hecho.** Falta decidir qué ocurre con el trabajo construido correctamente contra el scope congelado cuando la respuesta estacionada lo invalida.
7. **`S7.1` — gate sin piloto.** Falta decidir entre declarar conformidad sin evidencia o expandir alcance con el piloto ausente.
8. **`S7.1` — piloto rojo.** Falta decidir si un piloto rojo bloquea la declaración de release.

Las tres de `S8.7` no bloquean nada hasta esa Sesión; la decisión sin Sesión y las de `S5.3`/`S5.5` contaminan donde se indica en sus planes; las dos de `S7.1` contaminan la declaración terminal de release.

**Las catorce Sesiones de la cadena tienen `Decisiones` declaradas** bajo la §11 del [estándar de planes](/home/emili/.claude/skills/_shared/plan-naming-convention.md): **64 en total**, 42 `derivable` con criterio falsificable y autoridad nombrada, 22 `escala` con su clase y su `Contamina:`. De esas 22, **14 ya están resueltas** por el maintainer — 2 el 2026-08-03 (`S5.1`) y 12 el 2026-08-04 (`S3.2`, `S3.3`, la de revocación activa, la del conmutador de ruteo de `S5.4`, **tres** de `S5.2` —reintentos, entrega parcial irreconciliable y dónde vive su ledger—, la del composition root de `S5.1` y **dos** de `S4.1` —toma forzada sólo humana y registrada, y trabajo en vuelo congelado—). Dos de esas doce se descubrieron **sellando o ejecutando**, no planificando: el estado terminal de `S5.2` no cabía en el `CHECK` de `ct_delivery`, y `M5.1.3` no declaraba quién probaba la autoridad de Main. La de revocación activa queda **registrada en `S3.4` y en `S5.1`** porque gobierna a las dos, pero es **una sola decisión** y se cuenta una vez. `S3.2`, `S3.3`, `S3.4`, `S4.1`, `S5.1`, `S5.2` y `S5.4` no tienen decisiones `escala` abiertas.

**No se puede sellar implementación desatendida de la propia Torre.** El sello exige supervisión viva de la Torre —única ruta, Torre inactiva ⇒ `BLOCKED`— y los dos tests P0 de `test/migration.test.mjs` abortan si existe `.git/control-tower/ACTIVE`, marcador que `restore-fixture.mjs:93-101` resuelve por `--git-common-dir` y que comparten los seis worktrees. Torre armada ⇒ la verificación final falla, y ese gate es terminal sin reintento. Torre apagada ⇒ el sello no arranca. **Es específico de este repositorio**: para cualquier otro proyecto, sellar con la Torre armada funciona. Acá la ruta es escritor único con la Torre desarmada, sellando el **alcance** — criterios binarios y cero decisiones abiertas.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.config/opencode/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 2/9 Planes cerrados (22%) · Sesiones cerradas en planes activos: 27/46 (59%)

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔴 BLOQUEADO | 53% (10/19 S) | — | Main | S1.11–S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 📋 PLANIFICADO | 0% (0/1 S) | — | Main | S4.1 | [STATUS · S4.1 sellada](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 📋 PLANIFICADO | 0% (0/5 S) | — | Main | S5.1, S5.2, S5.3, S5.4, S5.5 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 63% (5/8 S) | — | Maintainer | S8.7, S8.5, S8.6 | [STATUS](plan-8/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
