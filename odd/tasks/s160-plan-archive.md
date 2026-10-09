# S160 — Archive completed Sessions

## Objective and authority

Implement the approved S160 native Encargo in Radar: move one completed, integrated Session block to `openspec/archive/sesiones/<ID>.md`, leave a compact reference in `openspec/plan.yaml`, preserve completion/readiness/progress, and keep status lightweight by default. This is technical continuity, not product plan authority. Source: fresh `radar sesion S160` at `bac1981503a50305190a8ec76f4f5df50668ffa6`; the human selected S160. The maintainer expressly authorized `odd/tasks/s160-plan-archive.md` and `openspec/plan.yaml` in addition to the 12 exact S160 implementation paths, and accepted a size exception to the 400-line review reference. No initial batch archive of previously closed Sessions belongs to this implementation.

## Scope and constraints

- Only the twelve exact paths named by `radar sesion S160`, this document, and `openspec/plan.yaml` at closure may be edited. Archive files under `openspec/archive/sesiones/` are command output, not an implementation change in this Session. Do not rewrite other Session blocks in the plan.
- Strict TDD: enabled by the S160 Encargo and `openspec/config.yaml` (`strict_tdd: true`). Radar's exact applicable focused runner is `go test ./...` from `agent-workflows/tools/radar/`; record observed RED before implementation, GREEN and subsequent full Radar suite/check. Do not infer a passing result.
- Route: read-only mapping delegated because 4+ files; implementation delegates one bounded multi-file writer because 2+ nontrivial files; verification follows native assessment/review policy. No SDD, PR or mass archive.
- Forecast: 410–670 authored added/deleted lines, with uncertainty; strategy `exception-ok`, explicitly approved for this Session. Rollback boundary: the Radar implementation and skill changes as one coherent behavior, without touching unrelated plan rows.

## Tasks

- [x] T1 — Add archived-reference representation, validation, readiness, and progress preservation. Tests cover valid/invalid references, duplicate IDs, missing/nonintegrated commits and history, archived dependency versus `satisfied_history`. Route: delegated writer (multi-file). Proof: observed RED/GREEN plus `go test ./...`; commit: 5eb62d8.
- [x] T2 — Implement `radar archivar <ID>` with surgical plan replacement and safe archive publication. Tests cover successful extraction and rejection of open, unintegrated, already archived, or conflicting targets; untouched unrelated plan content. Route: same single writer (multi-file). Proof: observed RED/GREEN plus focused Go tests; commit: 5eb62d8.
- [x] T3 — Default status text/JSON to live Sessions, provide explicit all-Sessions option, and update the close skill. Tests cover lightweight/default versus full view and stable total progress. Route: same single writer (multi-file). Proof: observed RED/GREEN, full Radar suite, `radar check` against the current plan; commit: 5eb62d8.

## Delivery (2026-09-25)

- Revalidated: `go test ./... -count=1` passed; source `radar check`: 0 errors/33 warnings; `git diff --check` clean.
- Review: the earlier `schema-incompatible` block came from untracked-file selection. Staging the unit and using `--projection staged` produced a clean START; consent envelope reported risk high (11 files, 987 lines). The maintainer chose "Skip this time" → `declined_this_candidate`, no lineage.
- Delivered as 5eb62d8 on master and pushed; installed Radar reinstalled via `install-radar.sh` before push. Closure recorded in `openspec/plan.yaml` (`entrega.commit`).

## Acceptance and current checkpoint

Implement all Encargo outcomes within exact scope; run source-mutating normalizers before verification, and structural readback of exact bytes; then inspect native review if eligible. Run the full Radar suite and current installed Radar check as separate evidence. Do not write closure into `openspec/plan.yaml` before integrated delivery evidence exists. No commit or push without a separate explicit human request under the current Pi safety contract. Current checkpoint: one delegated writer implemented T1–T3 in the approved paths without committing or touching the real plan; initial strict RED (`go test ./... -run '^TestArchivar' -count=1`, undefined archiveSession) preceded GREEN. Independent verification found archived records skipping applicable Session checks, so one scoped correction added RED regressions for malformed archived fields and same-run changes, then GREEN. `cd agent-workflows/tools/radar && go test ./... -count=1` passed after correction; `git diff --check` passed; installed `radar check` returned 0 errors and 33 notices but predates this source change. Independent verification confirmed the correction with a fresh uncached Go suite; the current source CLI returned `go run . check -C /home/<usuario>/projects/control-tower/Main`: 0 errors/33 warnings, default JSON status: 37 live Sessions, and `--all`: 129 Sessions, both with progress 92/129. A semantically valid historical edit before Load cannot be detected without a content binding, which the exact approved compact reference does not include. Native review inspect requested intended-untracked selection; selection failed with `schema-incompatible` before any lineage or mutation (`lineage_created: false`, `mutation_performed: false`). Do not retry review on this unchanged candidate without provider direction. Task commits and delivery evidence remain pending; do not check off or close a task until its commit and relevant checks are observed. Next: maintainer decision on the blocked review and explicit commit/delivery authorization, then revalidate candidate and close only with actual delivery evidence.

## Follow-up (2026-09-25): real-plan archive batch

- First batch 720447e archived 34 native Sessions and exposed three defects: `-C .` always failed (relative plan path vs canonical root), legacy dotted IDs were rejected, and a Session with `reemplaza` could be archived into an invalid plan.
- Fix 9e2a970 (strict TDD, five RED tests then GREEN; native 4-lens review approved with no findings, lineage review-4b7769a444185462 acknowledged). archivar now accepts `legacySesionID`, canonicalizes the plan path, and refuses any archive that would add a lineage or dependency error.
- Second batch archived the 48 legacy Sessions. S100, S135 and S138 stay live by design (they declare `reemplaza`). Plan: 10,489 → 3,395 lines; progress unchanged at 93/129.
