# Spec: radar-session-priorities

Sesión authority: `openspec/plan.yaml` S127. Every requirement traces to one S127 criterion (C1–C11).

## ADDED Requirements

### Requirement: Plans without priorities keep current behavior (C1)

When a plan declares no `prioridades`, Radar MUST compute states, Zona queues, asientos, `radar.snapshot/v1`, and the generated ROADMAP exactly as before this change.

#### Scenario: current plan output is unchanged
- GIVEN a plan without a `prioridades` key
- WHEN `radar status --json` and `radar render` run
- THEN every state, queue, asiento, snapshot field, and ROADMAP byte equals the pre-change output

### Requirement: Priority list is declared and validated (C2)

A plan MAY declare a top-level ordered list `prioridades` whose entries are `{id, nombre}` chosen by the project. `radar check` MUST fail on an empty `id`, a duplicate `id`, or an empty `nombre`.

#### Scenario: valid list is accepted
- GIVEN `prioridades: [{id: a, nombre: "A"}, {id: b, nombre: "B"}]`
- WHEN `radar check` runs
- THEN no priority error is reported

#### Scenario: duplicate id fails
- GIVEN two entries with `id: a`
- WHEN `radar check` runs
- THEN it reports an error naming `a`

### Requirement: Open Sesiones declare a known priority (C3)

When `prioridades` is declared, every Sesión that is not COMPLETO or ARCHIVADO MUST declare `prioridad` with an `id` from the list; otherwise `radar check` MUST fail naming that Sesión. COMPLETO and ARCHIVADO Sesiones MAY omit it.

#### Scenario: open Sesión without priority fails
- GIVEN a declared list and an open Sesión S2 without `prioridad`
- WHEN `radar check` runs
- THEN it reports an error naming S2

#### Scenario: unknown priority fails
- GIVEN S2 declares `prioridad: z` and `z` is not listed
- WHEN `radar check` runs
- THEN it reports an error naming S2 and `z`

#### Scenario: priority without a declared list fails
- GIVEN a plan without `prioridades` and a Sesión S2 declaring `prioridad: a`
- WHEN `radar check` runs
- THEN it reports an error naming S2

#### Scenario: closed Sesión may omit priority
- GIVEN a COMPLETO Sesión without `prioridad`
- WHEN `radar check` runs
- THEN no priority error is reported for it

### Requirement: Dependencies never point to a later priority (C4)

A Sesión MUST NOT depend on a Sesión whose priority is later in the list; `radar check` MUST fail naming both Sesiones.

#### Scenario: backward dependency fails
- GIVEN S1 in priority `a`, S2 in priority `b`, and S1 `depende_de: [S2]`
- WHEN `radar check` runs
- THEN it reports an error naming S1 and S2

### Requirement: Active priority is computed (C5)

The active priority MUST be the first list entry with at least one open Sesión. A Sesión with `diferida: true` MUST count as open. When no entry has an open Sesión, there MUST be no active priority and no Sesión SHALL be deferred by priority.

#### Scenario: manual deferral keeps a priority open
- GIVEN priority `a` whose only open Sesión has `diferida: true`
- WHEN states are computed
- THEN `a` is the active priority

#### Scenario: everything closed
- GIVEN every Sesión is COMPLETO or ARCHIVADO
- WHEN states are computed
- THEN there is no active priority

### Requirement: Only would-be-LISTO Sesiones are deferred (C6)

A Sesión of a priority after the active one whose computed state would be LISTO MUST become DIFERIDO. PLANIFICADO, BLOQUEADO, COMPLETO, and ARCHIVADO MUST keep their state, and Sesiones of the active priority MUST NOT change.

#### Scenario: later LISTO is deferred
- GIVEN active priority `a` and S3 in `b` with all dependencies COMPLETO
- WHEN states are computed
- THEN S3 is DIFERIDO and leaves its Zona queue

#### Scenario: later BLOQUEADO stays blocked
- GIVEN S4 in `b` with an escalating decision reaching `criterios`
- WHEN states are computed
- THEN S4 is BLOQUEADO

### Requirement: Priority advances without editing the plan (C7)

When the last open Sesión of the active priority becomes COMPLETO, the next priority MUST become active using only Git evidence.

#### Scenario: two successive integrated deliveries
- GIVEN S1 in `a` (LISTO) and S2 in `b` with no dependencies
- WHEN S1's `entrega.commit` becomes an ancestor of HEAD
- THEN `b` is active and S2 is LISTO

### Requirement: Priorities are visible in every Radar surface (C8)

`radar status`, `radar sesion <ID>`, `radar.snapshot/v1`, and the generated ROADMAP MUST show the active priority and each Sesión's priority. The snapshot MUST keep its schema string and every current field; new fields MUST be additive.

#### Scenario: snapshot is additive
- GIVEN a plan with priorities
- WHEN `radar status --json` runs
- THEN `schema` is `radar.snapshot/v1`, existing fields are present, and the active priority and per-Sesión priority are exposed

### Requirement: Canon defines priority as an ordering attribute (C9)

`agent-workflows/skills/_shared/plan-naming-convention.md` MUST document `prioridad` as an optional ordering attribute, not a level, with no time field. The four levels, the seven states, and the banned-noun list MUST remain unchanged.

#### Scenario: canon wording
- GIVEN the amended canon
- WHEN it is read
- THEN it names `prioridad` as optional ordering, not a level, and §1, §7, and §9 lists are unchanged

### Requirement: Radar stays read-only and green (C10, C11)

Radar MUST NOT write `openspec/plan.yaml`. `go test ./...` in `agent-workflows/tools/radar` MUST pass, `radar check` on the current plan MUST add no errors, and the diff MUST touch only `agent-workflows/`.

#### Scenario: delivery checks
- GIVEN the implemented change
- WHEN tests, `radar check`, and `git diff --stat` run
- THEN tests pass, errors do not increase, and every path is under `agent-workflows/`
