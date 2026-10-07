# S231 — RDD consent probe as a hard lock; Radar exposes the pilot switch

Subordinate execution continuity only, not a product plan.
Product Session: S231 (Torre V2 › v2-piloto). Authority: smoke V2 findings #1
and #7 (Engram 13286); maintainer decisions (Engram 13290, 13292).

## Objective

1. `piloto sonda --confirmar` records that the human answered the corrida's RDD
   consent question (schema `radar.piloto.sonda/v1`, common Git dir; no new
   field in interruptor.json; never a lineage or review identity).
2. `piloto despegar` refuses before creating branches/copies without the sonda,
   naming the question and the command; `marcar --en-curso` refuses too.
3. `radar status --json` exposes `piloto: {prendido, rondas, tope}`.
4. chanks-4-puente reads the switch before handing to Gentle AI and, when on,
   asks the blocking question «¿con piloto automático o en esta conversación?».

## Authorized files

`piloto/main.go`, `piloto/marca.go`, `piloto/vuelo.go`, `piloto/main_test.go`,
`piloto/marca_test.go`, `piloto/vuelo_test.go`, `radar/snapshot.go`,
`radar/snapshot_test.go`, `skills/chanks-4-puente/SKILL.md`.

## Constraints

- The probe records only that the human answered; no RDD lineage or review
  identity ever lands in piloto state.
- Hard lock from day one. TDD with RED observed. Native ODD.

## Tasks

- [x] RED+GREEN: Sonda record (`radar.piloto.sonda/v1`) written/read in the
      common dir; `piloto sonda --confirmar` CLI (refuses without the flag).
- [x] RED+GREEN: `cmdDespegar` refuses without the sonda, naming the question
      and the command, before any branch/copy creation.
- [x] RED+GREEN: `marcarEnCurso` refuses without the sonda.
- [x] RED+GREEN: `radar.snapshot/v1` gains `piloto: {prendido, rondas, tope}`
      populated from the observed switch; absent when no switch exists.
- [x] chanks-4-puente: switch read + blocking pilot question + sonda step
      (worded without the review-framework terms the bridge must not prescribe;
      test_builder_flow enforces that boundary).
- [x] Checks: piloto `go test ./...`, radar `go test ./...` green.

## Evidence

- Work-unit commit on branch s231/sonda-rdd (recorded below).
