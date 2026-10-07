# S235 — V2 flies exactly one flight per corrida

Subordinate execution continuity only, not a product plan.
Product Session: S235 (Torre V2 › v2-piloto). Authority: smoke V2 finding #5
(Engram 13286), maintainer decisions (Engram 13292).

## Objective

`piloto despegar` accepts exactly one approved flight. Approving more than one,
or having a corrida that still holds flights, is refused before any branch or
copy is created, with a message saying V2 flies one flight per corrida and real
parallelism (Pista) arrives in V3.

## Authorized files

`agent-workflows/tools/piloto/main.go`, `main_test.go`, `vuelo.go`,
`vuelo_test.go`.

## Constraints

- Do not build Pista or elevate.
- TDD with RED observed.

## Tasks

- [x] RED+GREEN: `cmdDespegar` with two approved flights refuses before creating
      branches/copies/corrida/interruptor, naming V2 one-flight and V3 parallelism.
- [x] RED+GREEN: existing multi-flight despegue tests updated to the one-flight
      contract (stdin approval of a subset, failure-cleanup test reworked to one flight).
- [x] Usage text reflects the one-flight contract.
- [x] Checks: `go build`, `go vet`, `go test ./...` green.

## Evidence

- RED observed: `TestDespegar/despega_un_solo_vuelo_por_corrida_en_V2` failed
  against the two-flight behavior; GREEN with the one-flight guard in
  `cmdDespegar` (refusal before any branch/copy/corrida/interruptor creation).
- Existing multi-flight despegue tests reworked to the one-flight contract.
- Usage text: `--aprobar <id>` and the one-flight contract named.
- Work-unit commit on branch s235/un-solo-vuelo (recorded below).
