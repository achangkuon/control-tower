# Audit B — OpenCode coupling depth and migration cost

> **Scope.** Read-only measurement of what a host switch (OpenCode → Pi) would cost.
> This audit does **not** evaluate Pi and does **not** recommend a runtime. Capability is Audit A's question.
> **Base:** `master@1c48342`, working tree clean except `openspec/plans/plan-5/STATUS.md`.
> **Method:** static read of every file that names OpenCode plus every file that consumes an OpenCode-shaped
> contract. No test suite was run. Every structural claim carries `file:line`. Inferences are labelled.

---

## Headline

The coupling is **deep in the wrong place and shallow in the right one**. A real host seam exists — but only
for the *continuation loop* (`host/loop.mjs:29`, a pure-port polling controller with zero OpenCode references,
plus a host-parametrized conformance harness at `test/helpers/host-adapter-conformance.mjs:3` that a second
host joins with one call). That is exactly the layer Pi was already planned for (`S1.17`–`S1.19`). It is not
where the cost is. The cost is in the **launch / backend / root-identity / durable-binding** layer, where
OpenCode's model is not behind an interface at all: it is baked into the *record that gets written to disk*.
Three OpenCode facts — the session-id grammar `/^ses_[A-Za-z0-9]{26}$/`, the agent name
`gentle-orchestrator`, and "a host is an HTTP server on a loopback port with a shared secret" — are
duplicated across four, seven, and six sites respectively, and they appear in `hosts/root-binding.mjs:28-29`,
which is the schema of the persisted binding. Changing them is a persisted-contract change, not a config
change. Counterweight, and it is a large one: the two biggest files in `hosts/` are **not** the problem.
`hosts/candidate-fence.mjs` (394 lines) contains **zero** OpenCode references and is host-agnostic by
construction — `assertDifferentHost` (`hosts/candidate-fence.mjs:83-85`) already *requires* a successor to
carry a different `host_id`. `hosts/production-provider.mjs` (268 lines) is roughly **38% OpenCode-specific**;
the other ~62% is fd-pinned executable custody and a duplicate-key JSON parser that survive any host. Net:
about **762 production lines** would be deleted or rewritten, about **446 more** need surgery, and — the
number that actually decides this — **five recorded decisions are invalidated outright and eight more need
re-scoping**, because the maintainer already wrote down, twice, that *"la Torre opera con un provider a la
vez y OpenCode va primero"* (`openspec/plans/decision-register.md:213`, `:289`).

---

## Coupling map

Tier definitions as briefed. Line counts are whole-file unless a fraction is stated; fractions were derived
by reading and attributing each line range, and the ranges are cited.

### Tier 1 — OpenCode-specific (deleted or fully rewritten)

| File | Lines | Why Tier 1 |
|---|---:|---|
| `plugin/tower-spike.js` | 253 | Imports `@opencode-ai/plugin` (`:4`); consumes `client.session.create/prompt/promptAsync`; classifies `session.created/idle/deleted` events. |
| `hosts/opencode-server.mjs` | 79 | Backend lifecycle keyed on loopback URL + secret + `ses_` root (`:17`, `:26-27`). |
| `hosts/opencode-credential-channel.mjs` | 79 | Per-backend ephemeral secret file; validates `backend_url` loopback and `ses_` id (`:9-10`). |
| `hosts/opencode-attach-helper.mjs` | 36 | Spawns `opencode attach <url> --session <id>` with `OPENCODE_SERVER_PASSWORD` (`:30-31`). |
| `hosts/root-identity.mjs` | 35 | `ROOT_AGENT = "gentle-orchestrator"` (`:7`); "Canonical OpenCode session grammar" (`:9-11`). |
| `hosts/opencode-view.mjs` | 34 | Target shape is `{backend_url, credential_ref, root_session_id, worktree}` (`:1-13`). |
| `hosts/launcher.mjs` | 29 | Composes `herdr.createPane` + `opencode.startRoot` (`:8-9`). **Dead** — no production importer. |
| `hosts/opencode-launcher.mjs` | 17 | `start({agent:"gentle-orchestrator", ...})` (`:11`). **Dead** — no production importer. |
| `.opencode/agent/support-agent.md` | 25 | OpenCode agent definition consumed by `plugin/tower-spike.js:219`. |
| `.opencode/plugins/tower-spike.js` | 1 | Install shim into OpenCode's plugin directory. |
| `hosts/production-provider.mjs` **(fraction)** | ~102 / 268 | See breakdown below. |
| `install/lifecycle.mjs` **(fraction)** | ~35 / 361 | `["opencode", …herdr]` runtime record (`:39`, `:44`, `:77-78`, `:82-84`); `--opencode-bin` CLI (`:346-348`); `legacy-opencode.json` + `opencode/opencode.json` legacy path (`:166`, `:179`, `:355`). |
| `install.sh` **(fraction)** | ~35 / 135 | `$HOME/.config/opencode` discovery (`:22-23`, `:56-57`), `jq` write of `.mcp["control-tower"]` into `opencode.json` (`:104-120`), operator instructions (`:126`). |
| `package.json` **(fraction)** | 2 / 11 | `@opencode-ai/plugin` and `@opencode-ai/sdk`, both pinned `1.18.13` (`:6-7`). |
| **Tier 1 production subtotal** | **~762** | |

Tier 1 tests (delete or rewrite wholesale):

| File | Lines |
|---|---:|
| `test/host-adapters.test.mjs` | 340 |
| `test/hosts/opencode-server.test.mjs` | 244 |
| `test/plugin/tower-spike.test.mjs` | 230 |
| `test/hosts/production-provider.test.mjs` | 176 |
| `test/hosts/opencode-view.test.mjs` | 103 |
| `test/hosts/opencode-credential-channel.test.mjs` | 66 |
| `test/hosts/root-identity.test.mjs` | 64 |
| `test/hosts/launcher.test.mjs` | 51 |
| `test/hosts/production-runtime.test.mjs` | 48 |
| `test/hosts/opencode-launcher.test.mjs` | 27 |
| `test/hosts/opencode-attach-helper.test.mjs` | 21 |
| **Tier 1 test subtotal** | **1,370** |

**Tier 1 total: ~2,132 lines.**

#### `hosts/production-provider.mjs` — line-attributed breakdown

268 lines. **~102 lines (≈38%) are OpenCode-specific.** Why, by range:

| Range | Lines | Verdict |
|---|---:|---|
| `:13-16` — imports of the four `opencode-*` modules | 4 | **OpenCode** |
| `:64` — `sessionIdentifier` = `/^ses_[A-Za-z0-9]{26}$/` | 1 | **OpenCode** |
| `:74-79` — `parseServerAnnouncement`, regex `^opencode server listening on (\S+)$` | 6 | **OpenCode** |
| `:81-89` — `assertParentlessSessionCreation`, reads OpenCode's `/doc` OpenAPI schema for `/api/session` | 9 | **OpenCode** |
| `:91-103` — `parseCreatedRoot`, OpenCode `data.id` / `parentID` envelope + `gentle-orchestrator` | 13 | **OpenCode** |
| `:120` — pins an executable literally named `opencode` | 1 | **OpenCode** |
| `:154-164` — `serve`: `["serve","--port","0","--hostname","127.0.0.1"]` + `OPENCODE_SERVER_PASSWORD` | 11 | **OpenCode** |
| `:174-186` — `admitOpenCodeBrief`: `POST /session/{id}/prompt_async`, Basic `opencode:secret`, 204-or-fail | 13 | **OpenCode** |
| `:207-217` — `call`: Basic `opencode:secret` transport | 11 | **OpenCode** |
| `:231-250` — composition of credential channel + `createOpenCodeBackendHost` + `createRoot`/`admitBrief` | 20 | **OpenCode** |
| `:251-263` — Herdr `pane split`/`pane run`/`pane close` driving the `opencode attach` helper | 13 | **OpenCode** |
| `:63`, `:70-71`, `:218-230` — pane grammar, `loopbackOrigin`, stdout announcement wait | 16 | Host-shaped |
| `:1-12`, `:18-62`, `:105-119`, `:121-153`, `:165-172`, `:188-206`, `:264-267` | ~150 | **Host-neutral** — `/proc/self/fd` executable pinning, dev/ino/sha256 re-verification, the hand-written duplicate-key JSON parser, fence/epoch/binding-consumer wiring |

The reusable ~150 lines are the expensive, security-critical part (fd-pinned exec custody, tamper re-check on
every call). A host swap keeps that and changes the binary name, the argv, and the wire protocol.

#### `hosts/candidate-fence.mjs` — **0% OpenCode-specific**

394 lines, **zero** occurrences of "opencode" (verified by `rg -i`). Its entire vocabulary is abstract:
`host_id`, `host_epoch`, `runtime_binding_ref`, `role_binding_ref`, `assignment_ref`, `base_sha`
(`hosts/candidate-fence.mjs:12-15`). The only host-aware rule in the file is
`assertDifferentHost` (`:83-85`) — *"New activation must use a different host"* — which is a rule the fence
enforces on **data**, not on OpenCode. Everything else is journal integrity: canonical bytes, sha256
filename digests, epoch gap/duplicate detection, `O_EXCL` locking, `fsync`, symlink refusal.
**A host switch changes nothing in this file.** It is the single largest artifact in `hosts/` and it is free.

Same verdict, smaller: `hosts/epoch-enforcement.mjs` (36 lines, 0 hits) and `host/loop.mjs` (275 lines,
0 hits) are fully host-neutral. That is **705 lines of `hosts/`+`host/` that survive untouched.**

### Tier 2 — Host-shaped (surgery, not deletion)

These files never say "opencode". They encode OpenCode's *model*: a session discovered by a `ses_`-grammar
id, running an agent named `gentle-orchestrator`, reachable at an `http://127.0.0.1:<port>` URL held open by
a `backend_pid`.

| File | Lines | The leak |
|---|---:|---|
| `hosts/root-binding.mjs` | 94 | The **persisted** record: `BINDING_KEYS` includes `backend_pid`, `backend_url` (`:7`); `loopback()` (`:20`); `validRecord` demands `agent === ROOT_AGENT` and `canonicalRootSessionId` (`:28-29`). This is a disk schema, so changing it is a migration. |
| `hosts/inspect.mjs` | 67 | Observation must be byte-identical to the binding on `backend_pid`/`backend_url`/`root_session_id` (`:7`, `:60`). |
| `hosts/health.mjs` | 64 | `validBinding` repeats the same shape (`:25-29`); the liveness probe's only handle is `backend_url` (`:54`). |
| `hosts/stop-proof.mjs` | 51 | Copies `backend_pid`/`backend_url`/`root_session_id` into the proof binding (`:4`, `:47`), explicitly noting they are *not* proven (`:17-19`). |
| `hosts/launch-worker.mjs` | 37 | Port set `{preflight, consumeBinding, assertCurrentHost, backend, rootBinding, view}` (`:6-9`) — provider-shaped, but `backend.start` is required to return a loopback URL and a proven root. |
| `hosts/rehydration.mjs` | 36 | Durable projection carries `backend_pid`/`backend_url`/`agent` (`:2`). |
| `hosts/launch-worker-cli.mjs` | 21 | `createLaunchWorkerRuntime(createProductionProvider())` (`:11`) — **the one hardcoded composition point in production.** |
| `install/lifecycle.mjs` (rest) | ~60 / 361 | `secureExecutable`/`validateActiveHostRuntime` are generic, but the record schema `control-tower.host-runtime/v1` has a literal `opencode` key (`:39`, `:44`, `:82-84`). |
| `hosts/production-provider.mjs` (fraction) | ~16 / 268 | `:63`, `:70-71`, `:218-230`. |
| **Tier 2 production subtotal** | **~446** | |

Tier 2 tests: `test/hosts/root-binding.test.mjs` 164, `health.test.mjs` 162, `inspect.test.mjs` 157,
`stop-proof.test.mjs` 128, `launch-worker.test.mjs` 113, `rehydration.test.mjs` 92,
`test/helpers/host-adapter-conformance.mjs` 35 (survives — it is host-parametrized),
`test/install/launch-worker-cli.test.mjs` 72, plus ~150 of `test/install/lifecycle.test.mjs`'s 510.
**≈ 1,073 test lines.**

**Duplication that multiplies the surgery** (the maintainer already hit this class of error once — decision
46/T2 found five copies of a defective loopback predicate, not four):

- `/^ses_[A-Za-z0-9]{26}$/` — **4 production sites**: `hosts/root-identity.mjs:11`, `hosts/opencode-view.mjs:7`,
  `hosts/opencode-credential-channel.mjs:10`, `hosts/production-provider.mjs:64`.
- `"gentle-orchestrator"` — **7 production sites**: `hosts/root-identity.mjs:7`,
  `hosts/production-provider.mjs:99,102,243`, `hosts/opencode-launcher.mjs:8,11`, plus `ROADMAP.md:203`.
- `http://127.0.0.1:<port>` loopback predicate — **6 production sites**: `hosts/root-binding.mjs:20`,
  `hosts/health.mjs:22`, `hosts/opencode-server.mjs:17`, `hosts/opencode-view.mjs:6`,
  `hosts/production-provider.mjs:71`, `hosts/opencode-credential-channel.mjs:9`.

### Tier 3 — Incidental (cheap)

~35 lines across ~20 files. Notably, the contract layer is **already multi-host**:

| File | What |
|---|---|
| `schemas/assignment-v1.schema.json:4` | `"host": {"enum": ["pi","opencode","claude"]}` |
| `schemas/assignment-v2.schema.json:4` | same enum |
| `schemas/jornada-v1.schema.json:4` | `execution_host` **and** `fallback_host`, same enum |
| `schemas/project-registry-v1.schema.json:5` | `allowed_hosts`, same enum |
| `policy/jornada.mjs:6` | `const executionHosts = new Set(["pi","opencode","claude"])` |
| `core.mjs:8` | one comment |
| `bin/torre:46` | default core path under `~/.config/opencode/control-tower/` |
| `.githooks/pre-push:4` | comment, explicitly agent-agnostic |
| `install/runtime-payload.mjs:51-54` | four `hosts/opencode-*` filenames in a **generated** closure list |
| Docs | `AGENTS.md` (4), `docs/architecture/sdd-tower-implementation.md` (5), `ROADMAP.md` (3), `README.md` (2), `CLAUDE.md` (1) |
| Test fixtures | `test/fixtures/contracts/schema-cases-v1.json` (3) + ~9 single-hit test files |

`install/runtime-payload.mjs` is generated by `scripts/payload-closure.mjs` from six roots
(`scripts/payload-closure.mjs:8-15`); the OpenCode entries regenerate automatically. Mechanical, not work.

### Totals

| Tier | Production lines | Test lines | Total |
|---|---:|---:|---:|
| Tier 1 — OpenCode-specific | ~762 | ~1,370 | ~2,132 |
| Tier 2 — Host-shaped | ~446 | ~1,073 | ~1,519 |
| Tier 3 — Incidental | ~35 | ~15 | ~50 |
| **Touched by a switch** | **~1,243** | **~2,458** | **~3,701** |
| Tier 0 — host-neutral, in `hosts/`+`host/`, untouched | 705 | 946 | 1,651 |

**One material discount.** Six of the Tier 1/Tier 2 modules — `hosts/launcher.mjs`,
`hosts/opencode-launcher.mjs`, `hosts/health.mjs`, `hosts/inspect.mjs`, `hosts/rehydration.mjs`,
`hosts/stop-proof.mjs` (247 production lines, ~594 test lines) — have **no production importer** and are
**absent from `RUNTIME_PAYLOAD_FILES`** (verified: zero matches in `install/runtime-payload.mjs`). They are
built, tested and unshipped — part of the "34 módulos sin llamador" the maintainer already measured
(decision 58). Rewriting them costs test-suite churn, not product regression.

---

## The abstraction question

**Answer: a seam exists, but it is one layer below where the switch actually bites.**

### The seam that does exist — and it is real

1. **`host/loop.mjs:29`** — `createPollingLoop({ cancel, now, peek, policy, schedule, trace, wake })`.
   Every collaborator is a required function port (`host/loop.mjs:5-8, 31-34`). The file contains **zero**
   OpenCode references, no HTTP, no session grammar. Its states (`UNBOUND`/`POLLING`/`WAKING`/…) are generic.
   A second host implements six functions.
2. **`test/helpers/host-adapter-conformance.mjs:3`** — `defineHostAdapterConformance({ host, createFixture })`.
   Five scenarios `CT-R5-S1`..`CT-R5-S5` parametrized by host name. `test/host-adapters.test.mjs:101` calls it
   with `host: "OpenCode"`. **A second host is one additional call site.** This is the only explicitly
   multi-host construct in the repository, and `S1.15`'s acceptance criteria required it not leak OpenCode
   field names (`openspec/plans/plan-1/STATUS.md:169`).
3. **`hosts/launch-worker.mjs:6-9`** — a provider-shaped port set. `hosts/launch-worker-cli.mjs:11` is the
   **single** production line that binds it to OpenCode:
   `createLaunchWorkerRuntime(createProductionProvider()).launchWorker(...)`.
4. **The data model is already multi-host.** `policy/jornada.mjs:6` and four schemas enumerate
   `["pi","opencode","claude"]`; `project-registry-v1` has `allowed_hosts`; `jornada-v1` has both
   `execution_host` and `fallback_host`. Nothing in the contract layer says OpenCode is the only host.
5. **`hosts/candidate-fence.mjs:83-85`** — the exclusivity fence *requires* a host change to carry a
   different `host_id`. The mechanism that would arbitrate a switch already exists and is host-blind.

### Why that is not enough

`createLaunchWorkerRuntime` looks like an interface but its **contract** is OpenCode's:

- `backend.start(...)` must return something whose `backend_url` satisfies
  `loopback()` and whose `root_identity` is a branded `ProvenRootIdentity` with a `ses_`-grammar id
  (`hosts/opencode-server.mjs:43,49`; `hosts/root-identity.mjs:11,21-25`).
- `rootBinding.bind(...)` **persists** that shape to disk (`hosts/root-binding.mjs:7,28-29,76-77`) with
  `O_EXCL`, one binding per assignment.
- Root-ness is proven by a property of OpenCode's HTTP API specifically: `parseCreatedRoot`
  (`hosts/production-provider.mjs:94-103`) leans on "a root omits `parentID` in this API version", and
  `assertParentlessSessionCreation` (`:83-89`) re-reads OpenCode's own `/doc` OpenAPI on every launch to
  verify that assumption still holds. The comment at `:65-69` says so explicitly:
  *"rootness is proven BY CONSTRUCTION … `POST /api/session` structurally cannot be asked for a parent."*

So a second host cannot be dropped behind the existing interface. It would have to either (a) produce a
loopback HTTP endpoint, a `ses_`-shaped id, and a `gentle-orchestrator` agent — i.e. impersonate OpenCode —
or (b) force a change to `hosts/root-identity.mjs`, `hosts/root-binding.mjs` and the four consumers of that
record shape. Option (b) is a **persisted-schema change**, which under the project's own rules is a
maintainer escalation (contrato visible del producto; API pública).

**What would have to be built:** a host-identity abstraction that (i) makes the session-id grammar and root
agent a per-host property rather than a module constant, (ii) makes the reachability handle opaque instead of
a loopback URL + pid, and (iii) makes "prove this root has no parent" a per-host strategy instead of a fixed
OpenCode `/doc` assertion. That is the 446-line Tier-2 surgery plus a migration of any live
`root-bindings/*.json`.

### Pi scaffolding in the tree today: **none**

Verified:

- `adapters/` — **does not exist** (`eza -la adapters` → "No such file or directory").
- `hosts/pi-launcher.mjs` — **does not exist**. `fd`/`rg` find it only in plan prose:
  `openspec/plans/plan-9/STATUS.md:138`, `openspec/plans/decision-register.md:289`,
  `openspec/plans/inventario-de-producto.md:203`.
- `adapters/pi/**` appears only in `decision-register.md:213`, `plan-1/STATUS.md:228`, and archived SDD
  artifacts (`openspec/changes/p8-slice-planning/{tasks,design,proposal}.md`).
- The archived exploration states it plainly: *"no `adapters/pi/`"*
  (`openspec/changes/p8-slice-planning/exploration.md:7`).

All Pi scaffolding is **purely planned**. Zero lines exist.

---

## Decisions that reopen

Each reopened decision is a maintainer escalation under the closed set of eight always-escalate classes, not
developer work. Verdicts: **(a)** intact · **(b)** needs re-scoping · **(c)** invalidated outright.

| # | Core claim (one line) | Verdict | Why |
|---|---|---|---|
| **Ordering rule** (`decision-register.md:213`, `:289`; restated `plan-9/STATUS.md:138`, `plan-1/STATUS.md:228`) | *"la Torre opera con un provider a la vez y OpenCode va primero"* | **(c)** | A switch-now is the literal negation. Not a side effect — this is the decision being overturned, and everything else follows from it. |
| **38** | *"Main lanza y posee un backend OpenCode aislado por cada worktree… proceso, puerto loopback, secreto de autenticación, binding de raíz primaria"* | **(c)** | Its falsifier is stated in OpenCode terms ("dos worktrees comparten proceso, puerto, secreto"). If the new host is not a loopback HTTP server, the decision has no referent. It is also the decision that put `loopback()` into six files and into the persisted binding. |
| **39** | *"Herdr queda temporalmente sólo como launcher reemplazable de una vista `opencode attach` no crítica… `opencode attach` manual es fallback obligatorio"* | **(c)** | The **mandatory** fallback is an OpenCode CLI command. Deleting OpenCode deletes the required fallback. |
| **68** | *"Conservar OpenCode CLI `1.18.23` y plugin/SDK `1.18.13` hasta la matriz real de `S4.8`; alinear ambos paquetes juntos… sólo si toda la matriz pasa"* | **(c)** | The whole subject disappears. `S4.8` exists only to execute this decision. |
| **76** | *"La vista OpenCode/Herdr actual siempre informa `DEGRADED`; `ATTACHED` queda reservado… Sólo `S4.8`/`S4.9` pueden descubrir una prueba falsificable"* | **(c)** | The reservation is conditioned on two OpenCode/Herdr probe Sesiones. Remove them and `ATTACHED` has no path to ever exist. |
| **37** | *"Main posee el backend y una raíz primaria durable `gentle-orchestrator` por worktree; la TUI adjunta es automática, reemplazable y no autoritativa"* | **(b)** | The architectural property (Main owns the root; the view is non-authoritative) is host-independent and worth keeping. The named agent profile is not. Re-scope: replace `gentle-orchestrator` with a per-host root agent. |
| **40** | *"Tras muerte probada… `host_epoch` incrementado y lineage explícito… la pérdida de vista sólo re-ejecuta `opencode attach` sobre el mismo `root_session_id`"* | **(b)** | Epoch/lineage/no-resurrection logic is host-agnostic and survives. The reattach *mechanism* and the `ses_` id do not. Directly gates `S4.4`, which is in progress. |
| **66** | *"La vista OpenCode automática usa un canal local efímero owner-only y `ATTACHED` requiere prueba autenticada positiva"* | **(b)** | The security property (secret never in argv/logs, opaque ref to a private helper) generalizes cleanly. "OpenCode view", "per-backend namespace" and the loopback binding do not. |
| **65** | *"El éxito de launch exige que la raíz Main-owned exacta acepte el brief aprobado exacto; no espera output del modelo"* | **(b)** | The semantic (admission ≠ execution) survives. Its falsifier is written as HTTP status codes — `admitOpenCodeBrief` demands exactly `204` and empty body (`hosts/production-provider.mjs:184`) — so the evidence clause needs restating. |
| **59** | *"La Torre no reimplementa lo que el stack ya provee… ni lo que Herdr y OpenCode ya hacen con las sesiones"* | **(b)** | Rule survives; its worked example is OpenCode. **Live consequence:** the same decision archived `capabilities/registry.mjs` on the ground that *"todos los agentes… son hoy el mismo perfil"* and says it *"vuelve de su rama si algún día conviven agentes con capacidades distintas, como el host Pi de `S1.18`"*. A second/replacement host is exactly that trigger — un-archiving it requires surgery in `test/plugin/tower-spike.test.mjs` and `test/jornada/lifecycle.test.mjs`, per the decision's own "costo registrado". |
| **46 / T2** | *"rango de puerto loopback… eran cinco copias y no cuatro"* | **(b)** | The predicate it hardened is exactly what a switch removes or replaces. Its derived rule ("confirmar por forma, no por nombre del símbolo") is what forced me to count six sites here, not five. |
| **13** | *"Lanzamiento visible de raíz OpenCode… inicia una sesión OpenCode raíz con `gentle-orchestrator`"* | **(b)** — historical | Already marked *"SUPERSEDIDA para trabajo futuro por la decisión 37"*. It records `S4.2`'s delivered bytes. A switch does not reopen the decision; it makes the work it names dead. |
| **36** | *"`S4.2` posee sólo el lanzamiento y la custodia inicial Main → Herdr 0.8.0 → raíz OpenCode"* | **(b)** — historical | Same: superseded by 37, preserved as history. |
| **43** | *"`recovery-proof-v1` gana un `host_epoch` requerido"* | **(a)** | `host_epoch` is host-agnostic. Consumers (`hosts/candidate-fence.mjs:279-291`, `hosts/stop-proof.mjs:46`) never name a host. |
| **77** | *"La envolvente pública degradada es mínima, declarativa y no ejecutable"* | **(a)** | `{status:"DEGRADED", code:"CT_VIEW_UNVERIFIED", retryable:true}` — no host in it (`hosts/launch-worker.mjs:2`). |
| **78** | *"La cerca no lee… Support define el brief; la Torre verifica lo recibido"* | **(a)** | Host-agnostic. **Caveat:** its supporting evidence cites `plugin/tower-spike.js:219` as the already-wired path that invokes the `support-agent` subagent. That wiring is the OpenCode plugin, so the decision stands but its evidence must be re-cited against the new host. |
| **72 / 79** | Process receipt loaded-not-required; execution-contract versioning | **(a)** | No host reference. |
| **58 / 61** | `console/vocabulary.mjs` is scope authority; Main commands by directive, not by writing | **(a)** | Host-agnostic. Decision 61's *evidence* cites `hosts/opencode-view.mjs` degradation, which would be re-cited. |

**Tally: 5 invalidated outright, 8 needing re-scope, the remainder intact.**

---

## Sesiones affected

### Completed ✅ whose delivered work goes dead or needs rework

| ID | Plan | What it delivered | Fate under a switch |
|---|---|---|---|
| **S4.2** | P4 | Main → Herdr 0.8 → OpenCode root launch: `hosts/launcher.mjs`, `hosts/opencode-launcher.mjs`, `hosts/herdr.mjs`, the `production-provider` wiring (`plan-4/STATUS.md:166-229`) | **Dead.** Already half-retired by `S4.6`; the two surviving files have no production importer. |
| **S4.5** | P4 | `M4.5.1` durable root binding, `M4.5.2` Main-owned OpenCode backend per worktree, `M4.5.3` Herdr view (`plan-4/STATUS.md:230-349`) | **Rework.** This is where the persisted binding schema and the loopback/`ses_` model were created. The largest single rework item. |
| **S4.3** | P4 | `hosts/inspect.mjs`, `hosts/health.mjs`, `hosts/stop-proof.mjs`, `hosts/rehydration.mjs` (`plan-4/STATUS.md:364-398`) | **Rework** — all four key on `S4.5`'s record shape. Discount: none is wired to production or shipped in the payload. |
| **S4.7** | P4 | `M4.7.1` brief admission (`13e3ec7`), `M4.7.2` owner-only credential channel + attach helper (`429f2ea`), `M4.7.3` truthful `DEGRADED` (`3b981ef`) | **M4.7.1 + M4.7.2 dead** (`prompt_async`, `opencode attach`). `M4.7.3`'s envelope survives (decision 77). |
| **S1.15** | P1 | OpenCode lifecycle adapter + the reusable CT-R5 conformance harness; 399 authored lines (`plan-1/STATUS.md:140-182`) | **Partial.** The harness (`test/helpers/host-adapter-conformance.mjs`, 35 lines) survives by design. The OpenCode fixture (340 lines) goes. |
| **S1.16** | P1 | Reconciled transport + wake composition mapped to `client.session.promptAsync`; 298 authored lines (`plan-1/STATUS.md:183-224`) | **Partial.** `host/loop.mjs` intact; the OpenCode transport half is rewritten. |
| S1.13, S1.14 | P1 | `host/loop.mjs` controller and polling safety | **Intact.** Zero OpenCode references. |
| S4.1 | P4 | `hosts/candidate-fence.mjs` | **Intact.** Zero OpenCode references. |
| S8.10 / S11.1 | P8 / P11 | Payload closure + executor | **Mechanical.** `install/runtime-payload.mjs` regenerates from `scripts/payload-closure.mjs`. |

**Six completed Sesiones invalidated or reworked.**

### Pending Sesiones whose scope changes or disappears

| ID | State | Today's scope | Under a switch |
|---|---|---|---|
| **S4.4** | 🔵 EN CURSO, **candidate parked** at `feat/plan-4/s4-4-same-host-recovery@75c378d` (2 commits, `a00193c`+`75c378d`) | Same-host recovery: live root ⇒ reattach the view; proven death ⇒ successor root. Consumes `S4.5`'s `backend.start`/`rootBinding.bind`/`view.attach` (`plan-4/STATUS.md:399-453`) | **Scope changes.** Epoch/lineage criteria survive; the reattach mechanism is `opencode attach`. The parked candidate rebases onto a contract that moved. Currently queue `#1`. |
| **S4.8** | 🟢 LISTO, **WIP parked** at `feat/plan-4/s4-8-opencode-runtime-matrix@40060b7` | *"Matriz real OpenCode 1.18.23 y alineación condicional"* — prove the real CLI against backend/root/brief/view, then align plugin+SDK (`plan-4/STATUS.md:664-695`) | **Disappears entirely.** Its whole subject is the OpenCode CLI. Parked WIP is stranded. Queue `#4`. |
| **S4.9** | 🟢 LISTO, unassigned | *"Probe y adopción guardada de Herdr 0.8.2"* — Herdr as view launcher for `opencode attach` (`plan-4/STATUS.md:696-725`) | **Disappears or is fully re-scoped.** Herdr exists here only to host an `opencode attach` pane (decision 39). Queue `#5`. |
| **S7.1** | 📋 PLANIFICADO | Release conformance pilot. Outputs: *"Conformidad Main → backend/raíz primaria OpenCode con TUI no autoritativa"* (`plan-7/STATUS.md:11`); explicit criterion *"sólo Main/OpenCode same-host WSL… Pi/Intercom no es condición"* (`plan-7/STATUS.md:32`) | **Re-scoped.** This is the **terminal release declaration** — the single Sesión of P7. It also depends on `S4.4`. Queue `#10`. |
| **S8.12** | 📋 PLANIFICADO | Single distribution channel. Its measured problem is `install.sh` writing `.mcp["control-tower"]` into `opencode.json` and copying the plugin to `~/.config/opencode/plugins/` (`plan-8/STATUS.md:892,898-902`) | **Scope changes substantially.** "Install into the host's own config file" only has meaning if the new host has an MCP/plugin config. Queue `#6`. |
| **S1.17–S1.19** | 🟡 DIFERIDO ×3 | Gate/RED, adapter, regression for Pi/Intercom. `Área: adapters/pi/**`, `test/host-adapters.test.mjs`; explicit common criterion *"ningún cambio de estas Sesiones bloquea, relocaliza o modifica la ruta OpenCode"* (`plan-1/STATUS.md:226-234`) | **Promoted to critical path AND their scope grows.** They were scoped as *continuation-loop* adapters behind `host/loop.mjs`. They contain no launch, no backend, no root-identity, no durable binding. Their "does not touch the OpenCode route" criterion becomes unsatisfiable. |
| **S9.4** | 🟡 DIFERIDO | *"Binding del launcher Pi y failure fence."* `Área: hosts/pi-launcher.mjs`; `Recurso`: a Pi process/root namespace (`plan-9/STATUS.md:135-150`) | **Promoted.** The **only** enumerated Sesión covering a second host's *launch* side. Depends on `S9.3` **and** on "la ruta OpenCode esté cerrada". |
| S5.5, S5.14, S5.15, S2.8, S9.1–S9.3, S8.11, S8.5/S8.6 | various | Delivery, continuation, seats, install cost | **Unaffected.** No host reference in their `Área`. |

### What the stated ordering currently gates

The rule — *"la Torre opera con un provider a la vez, y OpenCode va primero. Se reactiva cuando la ruta
OpenCode esté cerrada"* (`plan-9/STATUS.md:138`; register `:213`, `:289`) — gates:

- **4 deferred Sesiones**: `S1.17`, `S1.18`, `S1.19` (P1) and `S9.4` (P9), all 🟡 DIFERIDO, all retained in
  the denominator by decision 57's rule ("diferido-con-intención se conserva").
- **behind 4 active ones**: `S4.4` (in progress), `S4.8` (WIP parked), `S4.9` (ready), and the release
  declaration `S7.1`.

It also gates the un-archiving of `capabilities/registry.mjs`, which decision 59 explicitly conditions on
*"si algún día conviven agentes con capacidades distintas, como el host Pi de `S1.18`"*.

---

## Cost

Units per the project's own standard: **Sesión = what fits in one PR**, delivery is direct commit + push to
`master` with **≤400 authored lines per commit** (`AGENTS.md` delivery policy, decision-register
"Reconciliación de autoridad 35"). Calibration from delivered work: `S1.15` = 399 authored lines,
`S1.16` = 298; forecasts `S4.8` = 280–460 / 2 commits, `S4.9` = 220–360.

### Path A — finish OpenCode, then add Pi as second host (the existing plan)

| Item | Count |
|---|---:|
| New Sesiones to enumerate | **0** — `S4.4`, `S4.8`, `S4.9` already exist; `S1.17`–`S1.19`, `S9.4` already exist and are already in the denominator |
| Existing Sesiones invalidated | **0** |
| Existing Sesiones reworked | **0** |
| Maintainer escalations (reopened decisions) | **0** — decision 68 executes as written; the ordering rule is *followed* |
| Parked work stranded | **0** — `75c378d` and `40060b7` resume |
| Production lines deleted | **0** |

**Caveat, labelled inference.** Path A is not free of *unenumerated* work. `S9.4` covers
`hosts/pi-launcher.mjs` + a failure fence; `S1.17`–`S1.19` cover the continuation adapter. **Nothing
enumerated covers** a Pi equivalent of `hosts/opencode-server.mjs` (backend lifecycle),
`hosts/opencode-credential-channel.mjs`, `hosts/opencode-view.mjs` + attach helper, or generalizing
`hosts/root-identity.mjs`/`hosts/root-binding.mjs` off the `ses_` grammar and loopback URL. I found no
document measuring that gap. **Inference: ~1–3 additional Sesiones**, and they are needed on *either* path.
Reporting them separately so they do not distort the comparison.

### Path B — switch now (Pi replaces OpenCode as the only host)

New Sesiones required:

| # | Sesión | Why one PR is not enough / is enough |
|---|---|---|
| 1–2 | Generalize the host identity contract: retire `ses_` grammar + `gentle-orchestrator` from `hosts/root-identity.mjs`, `root-binding.mjs`, `health.mjs`, `inspect.mjs`, `rehydration.mjs`, `stop-proof.mjs`; migrate persisted `root-bindings/*.json` | 6 production files (~350 lines) + 5 test files (~700 lines) touching a **persisted schema**. Over the 400-line commit ceiling → **2 Sesiones** |
| 3 | Pi backend/session lifecycle — the `hosts/opencode-server.mjs` equivalent | ~79 prod + ~244 test → 1 |
| 4 | Pi credential channel + view + attach helper — `opencode-credential-channel.mjs` + `opencode-view.mjs` + `opencode-attach-helper.mjs` equivalents | ~149 prod + ~190 test → 1 |
| 5 | Pi production provider + pinned runtime — rewrite the ~102 OpenCode lines of `production-provider.mjs`; change `install/lifecycle.mjs`'s `control-tower.host-runtime/v1` record from a literal `opencode` key | ~137 prod + ~370 test → 1 |
| 6 | Retire the OpenCode path — delete Tier 1, regenerate the payload, strip `@opencode-ai/*` | pure deletion → 1 |
| — | Pi continuation adapter | **existing** `S1.17`–`S1.19` |
| — | Pi launcher binding + failure fence | **existing** `S9.4` |
| — | Installer/distribution re-point | **existing** `S8.12`, re-scoped |
| — | Conformance pilot against the new host | **existing** `S7.1`, re-scoped |

| Item | Count |
|---|---:|
| **New Sesiones** | **6** |
| **Existing completed Sesiones invalidated or reworked** | **6** — `S4.2`, `S4.3`, `S4.5`, `S4.7`, `S1.15`, `S1.16` |
| **Existing pending Sesiones re-scoped or dissolved** | **5** — `S4.4`, `S4.8`, `S4.9`, `S7.1`, `S8.12` |
| **Deferred Sesiones promoted, with grown scope** | **4** — `S1.17`, `S1.18`, `S1.19`, `S9.4` |
| **Maintainer escalations (reopened decisions)** | **13** — 5 invalidated outright + 8 re-scoped |
| **Parked work stranded** | **2 branches** — `75c378d` (`S4.4` candidate, 2 commits), `40060b7` (`S4.8` WIP) |
| **Production lines deleted** | **~762** (Tier 1); **~446** more rewritten (Tier 2) |
| **Test lines deleted or rewritten** | **~2,443** |

### The delta — what is genuinely EXTRA about switching now

| Dimension | Path A | Path B | **Extra** |
|---|---:|---:|---:|
| New Sesiones to enumerate | 0 (+1–3 inferred gap) | 6 (+1–3 inferred gap, same) | **+6** |
| Completed Sesiones invalidated/reworked | 0 | 6 | **+6** |
| Pending Sesiones re-scoped/dissolved | 0 | 5 | **+5** |
| Maintainer escalations | 0 | 13 | **+13** |
| Production lines discarded | 0 | ~762 | **+762** |
| Test lines discarded/rewritten | 0 | ~2,443 | **+2,443** |
| Parked branches stranded | 0 | 2 | **+2** |

**Effect on the reported figure (inference, arithmetic shown).** `master-index.md` reports
41/59 Sesiones closed in active plans (69%), P4 at 6/9 (67%). Under Path B: remove the 6 invalidated
completed Sesiones from the numerator → 35. `S4.8` and `S4.9` leave the denominator under decision 57
("dejó de ser objetivo") → 57; the 6 new Sesiones enter → 63. **35/63 ≈ 56%**, a 13-point drop with zero
product regression. P4 specifically goes from 6/9 to roughly 2/9 closed with 6 new Sesiones added. This is
bookkeeping, not damage — but the maintainer should expect the number to move sharply against him and know
in advance why.

**What the delta does *not* include, and should not be read as free.** Path B keeps every host-neutral asset:
`hosts/candidate-fence.mjs` (394), `host/loop.mjs` (275), `hosts/epoch-enforcement.mjs` (36), the CT-R5
conformance harness (35), all schemas, `policy/jornada.mjs`, the whole delivery/continuation/main-store
stack. **1,651 lines of the hardest, most security-critical code in `hosts/`+`host/` are host-agnostic and
survive either path untouched.** The switch is expensive because of decisions and rework, not because the
architecture is a monolith.

---

## What I could not determine

1. **Anything about Pi's actual capabilities.** By instruction, and I did not look. Whether Pi exposes a
   stable session identifier, a reachability handle, an authenticated local endpoint, or a parentless-root
   proof determines whether the Tier-2 surgery is a rename (~100 lines) or a redesign (~446 lines plus a
   persisted-record migration). **The single largest uncertainty in this estimate.** Audit A owns it.
2. **The forecast for the 6 new Sesiones.** No design exists for any of them. My split into 6 is derived
   from the 400-authored-line commit ceiling applied to measured file sizes; the project's own rule is that
   a forecast is not attributed without a design (`plan-4/STATUS.md:453`: *"No se atribuye un ahorro de
   líneas sin diseño"*). Treat the "6" as a floor, not a measurement.
3. **Whether `S9.4`'s scope was ever measured against the full OpenCode host surface.** `plan-9/STATUS.md:135-150`
   names only `hosts/pi-launcher.mjs` + a failure fence. I found no document comparing that to
   `opencode-server.mjs` + `opencode-credential-channel.mjs` + `opencode-view.mjs` + `opencode-attach-helper.mjs`
   (228 production lines). **Inference: it was not.** If so, Path A also has an unenumerated gap.
4. **The contents of the two parked branches.** `feat/plan-4/s4-4-same-host-recovery@75c378d` and
   `feat/plan-4/s4-8-opencode-runtime-matrix@40060b7` exist locally but I did not check them out or diff
   them (read-only mandate). I cannot say how many of their lines are OpenCode-specific, only that `S4.8`'s
   declared `Área` (`scripts/host-compatibility/opencode.mjs`, `test/compat/opencode-runtime.test.mjs`) is
   entirely OpenCode by name.
5. **Whether any live `root-bindings/*.json` exist on this machine.** `hosts/root-binding.mjs:42` writes under
   `<git_common_dir>/control-tower/main-store/root-bindings/`. I did not inspect runtime state. If bindings
   exist, the Tier-2 schema change needs a migration path; if not, it does not.
6. **Test-suite state.** Not run, by instruction. All line counts are `wc -l`; all "dead code" claims rest on
   import-graph search (`rg`) plus absence from `install/runtime-payload.mjs`, not on execution.
7. **`install/lifecycle.mjs` and `install.sh` fractions.** My ~35/361 and ~35/135 splits are attributions by
   reading, not by a mechanical metric. They could be off by ±10 lines each; the tier totals are not
   sensitive to it.
8. **Whether a switch would require re-running `S7.1`'s pilot from scratch or amending it.** Decision 32 fixed
   the pilot target as `control-tower` itself and decision 33 defines what a red blocks. Neither says what
   happens when the host under test changes identity mid-plan. That is itself an unrecorded decision.
