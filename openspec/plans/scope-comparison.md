# Comparación de alcance — Control Tower V1 frente a las skills en producción

> **Estado:** BORRADOR PARA DECISIÓN DEL MAINTAINER. No modifica PRD, RFC, REQUIREMENTS,
> roadmap ni estado de Sesiones.
> **Medición base:** `origin/master@b360c8a`, 2026-08-10. Ver [implementation-state](implementation-state.md) re-medido.
> **Eje de la comparación:** para cada capacidad prometida, ¿es **sustrato** (necesita código
> porque debe sobrevivir a la muerte del proceso, imponer exclusión o custodiar autoridad) o
> es **prompt** (ya resuelto por una skill que corre hoy)?

## Resumen ejecutivo

La hipótesis inicial —que el alcance de V1 es sobre-ingeniería y debe recortarse— **no se
sostiene sobre la cadena de release**. Seis de las siete Sesiones que faltan para el punto de
release son sustrato irreducible: ninguna skill puede proveerlas, porque todas exigen
persistencia entre procesos, compare-and-set o custodia de autoridad.

Lo que sí aparece es distinto, y en tres formas:

1. **Una rama entera de 7 Sesiones cuya necesidad está en contradicción documental** dentro de
   `release-chain.md`. Es la mitad del trabajo restante.
2. **Una duplicación real y única** entre la Jornada acotada planificada (F3) y
   `unattended-implementation`, que ya sella contratos de ejecución con schema propio.
3. **Un costo de proceso desproporcionado**, no de alcance: 4,9 : 1 de documentación sobre
   código en la última Sesión cerrada por ruta `full-sdd`.

El producto no se fue de las manos en alcance. Se fue de las manos en **costo de proceso y
exactitud de la contabilidad**.

## El punto de release, según la autoridad vigente

`release-chain.md` lo define sin ambigüedad. La primera versión se declara cuando el
maintainer puede, desde Telegram:

- ver el estado de un proyecto registrado;
- recibir el escalamiento de toda decisión que requiera su autoridad;
- aprobar o rechazar sobre un objetivo exacto, con sobre inmutable, nonce de un solo uso y expiración;
- prender y apagar el ruteo según esté fuera o en casa;

y cuando, con Hermes ausente, la operación local por CLI sigue completa.

**Todo lo que no está en el camino a ese punto no es requisito de release.** Ese es el filtro
que ordena la tabla siguiente.

## 🔴 Hallazgo bloqueante: contradicción interna en `release-chain.md`

El mismo documento declara dos dependencias distintas para `S7.1` (conformidad de release):

| Fuente | Qué dice |
|---|---|
| Grafo Mermaid | `S44 --> S71` — `S7.1` **depende** de `S4.4` (failover) |
| Tabla de la cadena | `S7.1 · Depende de: S5.3, S8.7, S5.5` — `S4.4` **no aparece** |
| Prosa | «`S7.1` pasa a depender de `S5.5` en vez de `S5.4`» — no menciona el retiro de `S4.4` |

Esta contradicción vale exactamente **7 de las 14 Sesiones restantes**:

```
S4.2  raíz visible OpenCode      S1.16  OpenCode wake
S4.3  liveness/rehidratación     S1.17  Pi RED
S4.4  epoch/failover             S1.18  Pi GREEN
                                 S1.19  Pi refactor
```

- **Si vale la tabla:** el failover queda fuera del release. Faltan **7** Sesiones.
- **Si vale el grafo:** el failover es requisito. Faltan **14** Sesiones.

Es la decisión de mayor apalancamiento disponible hoy, y no puede derivarse: las dos lecturas
tienen autoridad idéntica dentro del mismo archivo. **Escala.**

Clase: *evidencia contradictoria*. Contamina: `S7.1`, `S4.2`–`S4.4`, `S1.16`–`S1.19`.

## Comparación capacidad por capacidad

| # | Capacidad (PRD §7) | Construido hoy | Resuelto por skill | Veredicto |
|---|---|---|---|---|
| F1 | Registro y selección de proyectos | `registry/` 337 + `enroll/` 140 — **no desplegado** | No. Las skills leen planes, no registran proyectos. | **Sustrato · ya construido.** Falta empaquetarlo, no escribirlo. |
| F2 | Estado remoto confiable | `mcp.mjs` con 8 herramientas `tower_*` — **desplegado**; `dashboard/` 413 con fuente mock | `torre-control-entregas` consume `tower_status`, `tower_acquire`, `tower_transfer` | **Sustrato · desplegado pero falso.** Ver brecha 5: la Torre reporta 3 agentes inexistentes y ninguno con la rama correcta. |
| F3 | Jornada autónoma acotada | `jornada/` 23 líneas; `policy/jornada.mjs` resolvedor puro y pasivo | **Sí, casi entera.** `unattended-implementation` sella contrato inmutable, digest canónico, repo/worktree/rama/base SHA exactos, presupuesto de 2 correcciones, estados terminales, modo nocturno con 6 gates y wake report. Tiene schema propio. | **Duplicación real y única.** El sellado es prompt y ya funciona. Lo que la skill declara que NO puede hacer es el sustrato faltante: *«nothing of this skill is live overnight»*. |
| F4 | Continuación entre Sesiones | `continuation/` 35 líneas; `S5.3` 🔴 | Parcial: `session-kickoff` continúa desde Engram **cuando un humano reabre la sesión** | **Sustrato · es la pieza que falta.** La continuación sin humano exige un proceso vivo. |
| F5 | Workspaces y sesiones aisladas | `workspace/` 89 + `hosts/` 383 — `S3.1`, `S3.2`, `S4.1` ✅, **no desplegado** | No. Ninguna skill crea worktrees. | **Sustrato · ya construido.** Falta empaquetarlo. |
| F6 | Entrega con merge humano | `main-store/` 331, `escalation/` 243, `policy/delivery-policy.mjs`, authorization store de `S5.1` ✅ | **Sí, la orquestación.** `torre-control-entregas` serializa entrega, custodia el token `git-delivery`, corre la máquina de estados y el semáforo de DB | **Híbrido · ya funciona.** El token es código desplegado; el protocolo es prompt. `S5.2` (idempotencia) sigue siendo sustrato irreducible. |
| F7 | Recuperación y fallback | `S4.2`–`S4.4` 🔴 tras `S1.16`–`S1.19` | No | **Sustrato · diferible.** Recuperación manual desde checkpoint alcanza para V1. Es la rama de 7 Sesiones en disputa. |
| F8 | Campañas multiproyecto | Nada. P6 sin Sesiones enumeradas | No | **Diferir.** `release-chain.md` ya la declara *fuera de la cadena de release*. |

## Las 7 Sesiones del camino al release

| ID | Resultado | ¿Puede una skill darlo? | Por qué |
|---|---|---|---|
| `S5.7` | Contratos de decisión estacionada y respuesta | **No** | Un prompt no impone un nonce de un solo uso entre procesos. |
| `S5.8` | Binding de opción seleccionada en autoridad canónica | **No** | Compare-and-set: una sola respuesta gana y el resto rebota. Requiere store transaccional. |
| `S5.5` | Decisión estacionada y continuación independiente | **No** | Exige registrar la decisión no derivable y seguir con lo no contaminado, sin humano presente. |
| `S5.2` | Entrega idempotente y post-check | **No** | Un reintento no puede duplicar un push. Es la definición de sustrato. |
| `S5.3` | Continuación | **Parcial** | Con humano, `session-kickoff` ya lo hace. Sin humano, no. |
| `S8.7` | Puente Hermes/Telegram | **No, pero se reduce mucho** | Ver abajo. |
| `S7.1` | Conformidad de release | N/A | Es verificación, no construcción. |

**Seis de siete son sustrato irreducible.** En el camino al release no queda sobre-ingeniería
de alcance que recortar.

## Remote Control reduce `S8.7`, no lo elimina

Estado verificado del repositorio vecino (`6e81d3c`, 2026-08-10, 132 commits):

```
src/        2.450 líneas
adapters/   1.526 líneas    ← incluye adapters/telegram/
```

El roundtrip de Telegram está probado y en uso. La decisión aceptada del 2026-08-08
(`openspec/decisions/remote-control-and-control-tower.md`) ya resolvió la relación:

- **Dos switches independientes, no un producto fusionado.** El interlock `tower-guard.js`
  implementa el modelo y no se retira: existe para impedir dos autoridades simultáneas.
- **Remote Control es dueño de la credencial y del camino de salida.** La Torre sólo alcanza
  el bot mientras `/torre remote on` esté activo.
- **La Torre adapta el contrato; no importa el código.** Lo que se transfiere es el bus
  durable de decisiones — identidad de request, `scope_hash`, decisión por CAS, receipts,
  envío idempotente, frontera de privacidad, TTL de ocho horas — *no* la integración de
  Telegram, que es la última milla y la parte fácil.

Trabajo Tower-side que queda: su propio plugin de Hermes para recibir `/torre remote ...`, y
acceso al mismo token para enviar. Eso es `S8.7`, y su bloqueo actual **no es técnico**: es la
decisión de seguridad abierta sobre quién origina `trustedBindingProvider` en producción.

## Dónde está la sobre-ingeniería real

No está en el alcance del camino al release. Está en tres lugares medibles:

| Fuente | Evidencia | Costo |
|---|---|---|
| **Costo de proceso** | `S5.6`, ruta `full-sdd`: 282 líneas de producto, 345 de tests, ~1.395 de `openspec/` | **4,9 : 1** docs:código para una biblioteca pura sin consumidores |
| **Ratio sostenido** | 132 commits `docs` contra 70 de código en todo el historial | **1,9 : 1**, sin mejora tras la corrección declarada el 2026-07-31 |
| **Rama en disputa** | `S4.2`–`S4.4` + `S1.16`–`S1.19` | **7 Sesiones**, la mitad del resto, con necesidad contradicha en su propio documento |

A eso se suma el desperdicio ya identificado y no cuantificable como Sesión: 44% del código de
producto no viaja en el artefacto instalable, y `jornada/` (23 líneas) y `continuation/` (35) —
los módulos que nombran el producto— son los más chicos del repositorio.

## Respuesta a la pregunta del maintainer

> ¿El autonomous loop va a estar implementado? ¿Las skills lo complementan, o la planificación
> es sobre-ingeniería y hay que redefinir el scope?

**Las skills complementan; no duplican, salvo en F3.**

El reparto que la evidencia sostiene:

```
PROMPT  (ya resuelto, no volver a construir)
  decomposición Plan → Sesión → Módulo → Tarea   planificador-granular
  clasificación de ruta direct/design-tasks/
    full-sdd/blocked                             session-kickoff · session-plan
  protocolo de cierre y avance de Sesión         session-kickoff · session-doc
  serialización de entrega y custodia de token   torre-control-entregas
  sellado de contrato de ejecución               unattended-implementation   ← duplica F3

SUSTRATO  (sólo código puede darlo)
  registro persistente de proyectos              F1 · construido, sin desplegar
  estado observable y verdadero                  F2 · desplegado pero falso (brecha 5)
  proceso vivo que ejecuta el contrato sellado   F3 · FALTA — la skill sella, no corre
  transición autónoma entre Sesiones             F4 · FALTA — es el corazón del producto
  aislamiento de workspaces                      F5 · construido, sin desplegar
  idempotencia y autoridad de entrega            F6 · S5.2 falta
  canal remoto con CAS, nonce y TTL              S5.7 · S5.8 · S5.5 · S8.7
```

La frase que decide todo está en la propia skill `unattended-implementation`:

> *«Complement the Tower; never join it. Produce documents and end the turn — **nothing of
> this skill is live overnight**.»*

Las skills sellan, clasifican, deciden ruta y ordenan la entrega. **Ninguna corre mientras
nadie mira.** Eso es exactamente lo que la Torre tiene que ser, y es exactamente lo que todavía
no está construido: `jornada/` 23 líneas, `continuation/` 35.

**El loop va a estar implementado, y el scope del camino al release no es sobre-ingeniería.**
Lo que hay que corregir es el costo de proceso, la contabilidad, y resolver la contradicción de
las 7 Sesiones.

## Decisiones que esta comparación deja abiertas

Ninguna es derivable. Las cuatro escalan.

| # | Decisión | Clase | Contamina |
|---|---|---|---|
| 1 | ¿`S7.1` depende de `S4.4`? Grafo y tabla se contradicen | Evidencia contradictoria | `S7.1`, `S4.2`–`S4.4`, `S1.16`–`S1.19` — 7 Sesiones |
| 2 | ¿F3 se construye, o la Torre sólo ejecuta el contrato que `unattended-implementation` ya sella? | Alcance del producto | `jornada/`, presets, P3 cerrado |
| 3 | ¿Se corrige el registro de la Torre antes de seguir? Hoy reporta capacidad ficticia | Operaciones irreversibles (purga de cola) | F2, brecha 5, 2 mensajes encolados |
| 4 | ¿Se baja el costo de proceso? `full-sdd` cuesta 4,9 : 1 en Sesiones de biblioteca pura | Expansión de alcance (inversa) | Ruta de toda Sesión futura |

## Lo que esta comparación NO hace

No recorta ninguna Sesión, no cambia estados ni dependencias, no toca PRD/RFC/REQUIREMENTS ni
roadmap, y no inicia `S5.7`. Es entrada de decisión.
