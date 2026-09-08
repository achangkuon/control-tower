# Tasks: append the route-correct S101 migration contract

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 90–140 authored lines for the candidate append; 130–190 including apply-progress evidence |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | One bounded candidate append with its contemporaneous apply-progress evidence |
| Delivery strategy | No delivery authorized; apply only |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Scope and apply boundary

Strict TDD is active (`bun test`). The pre-existing focused acceptance proof—not a new test file—is the RED evidence for this structural append:

`bun openspec/changes/migrate-control-tower-plan-zones/migration/proof/verify-activation-partition.mjs`

Before mutation, it is expected to exit nonzero solely because the candidate has 73 full Sessions rather than the required 74: `full-session-order: expected 74 imported-then-horizon IDs, observed 73`; its observed partition must be 73/7/4 (84 records). After the append, rerun that exact command and require `ok: true` with 74/7/4 (85 records). Do not author or edit any proof/test file.

The only allowed write surfaces are:

- `openspec/changes/migrate-control-tower-plan-zones/migration/candidate/plan.yaml`
- `openspec/changes/s101-policy-resolution/apply-progress.md`
- Engram topic `sdd/s101-policy-resolution/apply-progress`

All other paths are read-only discovery or execution targets. Do not edit proposal/spec/design, `migration/lineage.yaml`, proof tooling or tests, parent migration records, Radar, runtime, Tower, Herdr, DB, canonical plans, or delivery state. Apply may execute only the focused RED/GREEN proof above and strict structural checks; it MUST NOT run the full G1 sequence (Radar `check`, `status`, or `zonas`, or either render), a full test suite, build, activation, commit, push, or PR action.

## Module M1 — Strict-TDD bounded candidate append and evidence

- [x] **T1.1 — UNDERSTAND, checkpoint, and pre-existing RED.** Read `openspec/changes/s101-policy-resolution/{proposal.md,specs/policy-resolution/spec.md,design.md,tasks.md}`, the candidate `openspec/changes/migrate-control-tower-plan-zones/migration/candidate/plan.yaml`, `migration/lineage.yaml`, and the existing P1 proof pair `migration/proof/verify-activation-partition.{mjs,test.mjs}`. Retain a byte identity for the candidate and verify the 73/7/4 pre-append checkpoint, ordered 72 imported IDs then `S100`, no full `S101`, `S102` as a future reference depending on `[S101]`, and the approved lineage bindings. Then run the focused proof command exactly once as the pre-existing RED; record its nonzero 73/7/4 result and require its only acceptance failure to be the missing full S101 (`full-session-order ... observed 73`). Stop without mutation for any other proof failure. Safety-net exception: no passing candidate-focused test is authorized before this append; the pre-existing acceptance proof is deliberately RED for the missing contract. Rollback boundary: no candidate mutation has occurred. <!-- sdd-owner: implementation -->
- [x] **T1.2 — GREEN: append the frozen contract once.** Only after T1.1 records the expected RED, append the exact S101 mapping from `openspec/changes/s101-policy-resolution/design.md` to `openspec/changes/migrate-control-tower-plan-zones/migration/candidate/plan.yaml`, immediately after complete `S100` and before top-level `references:`. Preserve every pre-existing byte and order; retain `ruta.propuesta: full-sdd` and literal `modulos: []`; add no candidate Module or Task. Immediately isolate one contiguous S101-only addition against the T1.1 checkpoint. Rollback boundary: remove only that contiguous mapping and restore the exact 73/7/4 candidate bytes if placement, duplication, or content differs. <!-- sdd-owner: implementation -->
- [x] **T1.3 — GREEN proof execution.** Rerun exactly `bun openspec/changes/migrate-control-tower-plan-zones/migration/proof/verify-activation-partition.mjs` after T1.2. Require a zero exit and `ok: true` with 74 full Sessions, seven future-successor references, four satisfied-history references, and 85 activation records. Do not alter the proof or test files to obtain GREEN. Rollback boundary: if the same focused proof does not pass, remove only S101 and restore the T1.1 candidate identity; stop before any G1 command. <!-- sdd-owner: implementation -->
- [x] **T1.4 — TRIANGULATE with strict structural evidence.** Without authoring a second test, strictly reparse the complete candidate as one YAML document and compare S101 at the value level to `migration/lineage.yaml`; inspect `agent-workflows/tools/radar/check.go:514-524` read-only to confirm the `full-sdd` route-depth rule. Record that S101 has the exact identity/result/Zone/dependency/empty Cimientos/empty resource/replacement, complete authority/provenance, five resolved decisions with authority and falsifier, six non-empty binary criteria, the exact `full-sdd` revalidation base and Engram `10536`, and exactly `modulos: []` with no Module or Task child. Also prove the unchanged imported prefix and S100 bytes, S102 remains only the future reference, the 74/7/4 partition, and the candidate is the sole changed existing migration-data path below 400 authored lines. These structural checks are triangulation for one fixed data output, not G1; do not run Radar commands or renders. Rollback boundary: on any mismatch, restore only the T1.1 candidate bytes and stop. <!-- sdd-owner: implementation -->
- [x] **T1.5 — REFACTOR boundary and freeze.** Do not refactor or normalize the exact frozen YAML mapping: it is one fixed structural output and any refactor risks semantic drift. Confirm no source-mutating formatter or generator ran, freeze the post-GREEN candidate identity, contiguous-block identity, changed-path list, and additions/deletions, and rerun no additional tests. Rollback boundary: remove only the S101 mapping to return to the T1.1 checkpoint. <!-- sdd-owner: implementation -->
- [x] **T1.6 — Write merged apply evidence.** Read any existing `openspec/changes/s101-policy-resolution/apply-progress.md` and Engram `sdd/s101-policy-resolution/apply-progress`; merge rather than overwrite them, then write matching records only to these two allowed evidence surfaces. Include the pre/post candidate identities, insertion and rollback boundaries, exact T1.1 RED command/result, exact T1.3 GREEN command/result, T1.4 structural triangulation, changed-path/authored-line proof, and a `### TDD Cycle Evidence` section whose table records Safety Net, RED, GREEN, TRIANGULATE, and REFACTOR for M1. State explicitly that no test/proof file was authored, no full suite/build/G1/Radar command/render/activation/commit/push/PR ran, and G1 remains separate. Read both evidence records back and prove they match. Rollback boundary: restore the prior merged evidence (or remove only newly created evidence) if either evidence write/readback fails; preserve the last verified candidate checkpoint. <!-- sdd-owner: implementation -->

## Parent-owned post-apply handoff

- Start independent `sdd-verify` against the frozen candidate identity and merged apply-progress evidence. It must validate the bounded append without rerunning, bypassing, or calling its work G1; only later may the separate G1 sequence run. Keep C06–C09 and post-activation S101 runtime `full-sdd` decomposition unavailable. <!-- sdd-owner: parent -->

## Delivery boundary

No commit, push, PR, or delivery is authorized by these tasks.
