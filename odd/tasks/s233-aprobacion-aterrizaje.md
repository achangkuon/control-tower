# S233 — `piloto aterrizar` requires the recorded human approval of each exact commit

Subordinate execution continuity only, not a product plan.
Product Session: S233 (Torre V2 › v2-piloto). Authority: smoke V2 finding #2
(Engram 13286); S217 rule (Engram 13259); maintainer decision (Engram 13292).

## Objective

1. `piloto aprobar <Sesión> --decision <texto>` requires the Sesión's cierre
   mark and records an approval tied to the exact commit SHA of that mark
   (schema `radar.piloto.aprobacion/v1`, same registro pattern as NOVEDAD
   resolution).
2. `aterrizar` fails closed when any Sesión in the approved portion lacks an
   approval or its approved SHA no longer matches the cierre mark, with a
   message asking to review commit by commit.

## Authorized files

`agent-workflows/tools/piloto/aterrizaje.go`, `aterrizaje_test.go`,
`main.go`, `main_test.go`.

## Constraints

- The review is human; piloto determinizes the record, not the judgment.
- TDD with RED observed: today aterrizar passes with marks and no approval.

## Tasks

- [x] RED+GREEN: `aprobarSesion` records `radar.piloto.aprobacion/v1` bound to
      the cierre mark's commit; refuses without a cierre mark or with empty decision.
- [x] RED+GREEN: `aterrizarVuelo` refuses without a registered approval per
      Sesión in the portion, and on SHA mismatch with the cierre mark.
- [x] CLI: `piloto aprobar <sesión> --decision <texto>` wired like resolver.
- [x] Checks: `go build`, `go vet`, `go test ./...` green.

## Evidence

- RED observed: `TestAterrizajeExigeAprobacion/se_niega_sin_la_aprobación_humana_registrada`
  failed against the old behavior (aterrizar passed with marks and no approval).
- GREEN: `Aprobacion` (radar.piloto.aprobacion/v1) written to the `aprobaciones`
  registro; the aterrizar loop verifies one approval per Sesión in the portion
  and an exact SHA match with the cierre mark, refusing with "revisá commit por
  commit" otherwise.
- Existing full-flow aterrizaje tests now register approvals (aprobarCierres).
- CLI wired: `piloto aprobar <sesión> --decision <texto>` (TestAprobarCLI).
- Work-unit commit on branch s233/aprobacion-aterrizaje (recorded below).
