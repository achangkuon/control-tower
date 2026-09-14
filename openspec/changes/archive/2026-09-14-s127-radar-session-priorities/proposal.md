# Proposal: Radar Session Priorities

Sesión authority: `openspec/plan.yaml` S127 (Zona `metodo`, route `full-sdd`, entry gate `proposal`).
Base: `master@cf3e813`. Contract: `radar sesion S127` (11 criteria, 9 resolved decisions).

## Intent

Radar has no priority across Zonas: `AsientosAt` offers the first LISTO Sesión of every Zona, sorted alphabetically (`agent-workflows/tools/radar/state.go:256-296`). A project cannot say "finish this group of work before starting that one", so agents mix unrelated stages in one batch. Radar needs a generic, project-defined ordering.

## Scope

### In Scope
- Optional top-level plan list `prioridades: [{id, nombre}]`; per-Sesión `prioridad: <id>`.
- Computed active prioridad and computed DIFERIDO for later-prioridad Sesiones that would be LISTO.
- Fail-closed `radar check` rules for the list, membership, and backward dependencies.
- Projection in `radar status`, `radar sesion`, `radar.snapshot/v1` (additive), and the generated ROADMAP.
- Canon amendment: `prioridad` is an ordering attribute, not a level.

### Out of Scope
- Tagging `openspec/plan.yaml` with Control Tower priorities (parent planning edit after delivery).
- S122 `motivo` classification and horizon deficit.
- New states, time fields, or manual priority overrides.

## Capabilities

### New Capabilities
- `radar-session-priorities`: declaring, validating, computing, and projecting ordered Sesión priorities.

### Modified Capabilities
- None

## Approach

Parse the list and field in `plan.go` (strict decoding stays on). Derive the active prioridad from computed states after `EstadosAt`'s existing passes, then turn would-be-LISTO Sesiones of later priorities into DIFERIDO without altering any other state. Add check rules beside `checkGrafo`. Expose `prioridad_activa` and per-Sesión `prioridad` as additive fields. Plans without the list skip every new branch.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `agent-workflows/tools/radar/plan.go` | Modified | List and field types |
| `agent-workflows/tools/radar/state.go` | Modified | Active prioridad, DIFERIDO derivation |
| `agent-workflows/tools/radar/check.go` | Modified | Fail-closed rules |
| `agent-workflows/tools/radar/{snapshot,sesion,main,render}.go` | Modified | Projection |
| `agent-workflows/tools/radar/*_test.go`, `testdata/` | Modified | Coverage and goldens |
| `agent-workflows/skills/_shared/plan-naming-convention.md` | Modified | Canon section |
| `agent-workflows/tools/radar/README.md` | Modified | Field documentation |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Regression in plans without priorities | Med | Byte-identity test over current plan, snapshot, and ROADMAP |
| State precedence bug hides a blocker | Med | Only LISTO may become DIFERIDO; table tests per state |
| Collision with S122 on shared files | Low | S122 depends on S127; no `motivo` reuse |
| Review lot over 400 lines | Med | Design cuts Módulos under 400 each |

## Rollback Plan

Each Módulo is one revertible commit. Reverting the Radar commits restores current behavior; plans cannot contain `prioridades` before delivery, so no plan data needs migration. Revert the canon commit independently if wording must change.

## Dependencies

- None. S122 waits on this change.

## Success Criteria

- [ ] All 11 S127 criteria pass, including byte-identical output for plans without `prioridades`.
- [ ] `go test ./...` in `agent-workflows/tools/radar` passes and `radar check` adds no errors.
