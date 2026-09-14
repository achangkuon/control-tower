# Design: Radar Session Priorities

Sesión authority: `openspec/plan.yaml` S127. Inputs: `proposal.md`, `specs/radar-session-priorities/spec.md`.

## Architecture decisions

| # | Decision | Rationale | Rejected |
|---|----------|-----------|----------|
| AD1 | Priority is a **post-pass** over `EstadosAt`: after the dependency pass, compute the active priority, then turn LISTO into DIFERIDO for later priorities. | Every existing pass stays byte-identical. Dependencies only unlock on COMPLETO, so turning LISTO into DIFERIDO cannot change another Sesión's state. `ColaPorZonaAt`, `AsientosAt`, and `trabajoEjecutable` already exclude DIFERIDO, so offering stops everywhere without touching them. | Filtering inside `AsientosAt` (queues and ROADMAP would still offer the work). |
| AD2 | "Open" for the active priority = computed state not COMPLETO/ARCHIVADO (includes manual DIFERIDO and BLOQUEADO). | Decision 7 of S127; uses already-computed truth, not raw fields. | Raw `Entrega == nil` (a non-integrated delivery would close a priority early). |
| AD3 | Check rules use structural openness (`Entrega == nil && !Archivada`), the same test as `checkSesionesAt`. | Check must not depend on Git ancestry to validate shape. | Using computed states in check. |
| AD4 | `prioridad` on a Sesión without a declared list is an error. | Fail closed: a silent ignore would hide a typo in the list key. | Ignoring the field. |
| AD5 | New snapshot fields use `omitempty`: `prioridad_activa`, `prioridades`, and per-Sesión `prioridad`. | C1 byte identity and C8 additive contract; `radiografia/measure.mjs:56` only checks the schema string. | Bumping to `radar.snapshot/v2`. |
| AD6 | Text surfaces add lines **only when the list is declared**. | Keeps `ROADMAP.golden.md` and `radar status` output identical for current plans (C1). | Always printing "Prioridad activa: —". |
| AD7 | Priority index is resolved once through `p.PrioridadPorID()` returning list position. | One lookup shared by state, check, and projection; no duplicated ordering logic. | Re-scanning the list per Sesión. |

## Data shape

```go
type Prioridad struct {
	ID     string `yaml:"id"`
	Nombre string `yaml:"nombre"`
}
// Plan:   Prioridades []Prioridad `yaml:"prioridades"`
// Sesion: Prioridad   string      `yaml:"prioridad"`
```

## State flow

```text
EstadosAt
  1. archived / delivered / manual diferida      (unchanged)
  2. own escalating decisions → BLOQUEADO         (unchanged)
  3. Contamina → BLOQUEADO                        (unchanged)
  4. dependency graph → LISTO | PLANIFICADO       (unchanged)
  5. NEW aplicarPrioridades(estados):
       if the plan declares no list: return            (C1)
       activa = first list entry with a Sesión not COMPLETO/ARCHIVADO
       if no entry has one: return                      (C5, nothing deferred)
       for each Sesión with a known prioridad, index(prioridad) > index(activa), and estado == LISTO:
           estado = DIFERIDO
```

A Sesión without a known `prioridad` is skipped by step 5 and never used to pick `activa`. Check rule 3 already rejects that shape for structurally open Sesiones; the only structurally closed but computed-open case is a non-integrated `entrega`, which `checkSesionesAt` rejects as `entrega integrada` before any state-showing command runs (`main.go:168-179`). The guard keeps `EstadosAt` total without relying on that ordering.

`PrioridadActivaAt(root, head) (Prioridad, bool)` exposes step 5's result for projection.

## Check rules (`checkPrioridades`, called after `checkGrafo`)

1. List: empty `id`, duplicate `id`, empty `nombre` → error `prioridades`.
2. Without list: any Sesión with `prioridad` → error naming it.
3. With list: open Sesión without `prioridad` or with unknown id → error naming it.
4. With list: `depende_de` target whose priority index is greater than the source's → error naming both.

## Projection

| Surface | Change (only when list declared) |
|---------|----------------------------------|
| `snapshot.go` | `Snapshot.PrioridadActiva *PrioridadJSON`, `Snapshot.Prioridades []PrioridadJSON`, `SesionEstado.Prioridad string`, all `omitempty` |
| `main.go` `cmdStatus` | `Prioridad activa: <nombre> (<id>)` under the product line; `prioridad:<id>` suffix per queue line |
| `sesion.go` | `Prioridad: <nombre> (<id>)` after the Zona line |
| `render.go` | `- Prioridad activa: <nombre>.` in "Punto de retoma"; ` · prioridad <nombre>` per queue line |

## Canon

Add a subsection to §9 of `plan-naming-convention.md`: `prioridad` is an optional ordering attribute declared per project, never a level, with no time field; it can only turn a would-be LISTO Sesión into DIFERIDO. §1, §7, and the §9 state table stay unchanged. Document the YAML in `tools/radar/README.md`.

## Módulos (review lots)

| Módulo | Paths | Forecast (authored ±) |
|--------|-------|-----------------------|
| M127.1 Radar declares, validates, and computes priorities | `plan.go`, `state.go`, `check.go`, `state_test.go`, `check_test.go` | ~270 |
| M127.2 Priorities are visible in every Radar surface | `snapshot.go`, `main.go`, `sesion.go`, `render.go`, `snapshot_test.go`, `sesion_test.go`, `render_test.go` | ~170 |
| M127.3 Canon and README document priority | `agent-workflows/skills/_shared/plan-naming-convention.md`, `agent-workflows/tools/radar/README.md`, `agent-workflows/tests/test_builder_flow.py` (canon assertion and its pinned SHA-256 at line 56) | ~60 |

Order is M127.1 → M127.2 → M127.3; each is one revertible commit with trailer `Modulo: <ID>`.

## Testing

Strict TDD per Tarea. Go tests use the existing `repoGit`, `entregada`, and `abierta` helpers (`state_test.go:11-40`). C1 is proven twice: the existing `ROADMAP.golden.md` test stays green unchanged, and verify compares `radar status --json` and `radar render` output of the pre-change binary against the new binary on the live plan.
