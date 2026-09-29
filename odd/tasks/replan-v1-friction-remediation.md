# Replan V1 friction remediation

> Subordinate ODD execution record. `openspec/plan.yaml` remains the sole product-plan authority; this file records only the technical work needed to make the authorized planning change.

## Goal

Apply the maintainer-approved Control Tower replan: extend Radar schema v3 with non-executable retired-session references, preserve historical identifiers and evidence honestly, and reduce canonical V1 to six sequential units while keeping V2 optional.

## Authority

- The maintainer approved the retired-session contract and canonical V1/V2/V3 disposition in this task.
- `openspec/plan.yaml` remains the sole product-plan authority; this ODD record is subordinate execution evidence only.
- Engram observation `12062` is the cited authority for retired-session dispositions.
- Source and planning writes are authorized only within the declared edit surfaces.
- No commit, push, global tool installation, branch/artifact deletion, external dispatch-marker mutation, or edit to `AGENTS.md`/`CLAUDE.md` is authorized.

## Tasks

- [x] Record the newly approved four-task cut and delivery boundary before source/code writes.
- [x] Add focused strict-TDD coverage, then implement the smallest schema-v3 Radar extension for `references.retired_sessions` without changing existing reference behavior.
- [x] Apply the canonical plan cut and regenerate the generated ROADMAP from the candidate Radar.
- [x] Run focused/package verification and candidate readbacks, prove render idempotence, and record the observed evidence here.
- [x] Apply the independent-verifier correction: explicitly defer S165 and S4.12, regenerate ROADMAP, and re-run candidate Radar readbacks without touching dispatch evidence.

## Work-unit boundary

One uncommitted implementation work unit: Radar support, focused tests, canonical `openspec/plan.yaml`, generated `openspec/ROADMAP.md`, and this subordinate evidence record. Preserve all pre-existing local changes. Do not commit or push.

## Evidence

- RED: `cd agent-workflows/tools/radar && go test . -run 'Test(RetiredSessionReferenceContract|LiveSessionDependingOnRetiredIDIsExplicitError|NonExecutableReferencesListedInRenderAndStatus|ReferencesNeverLeakIntoOperationalProjections|OrdinaryPlanWithoutReferencesUnaffected)$'` failed to compile because `RetiredSession` and `References.RetiredSessions` did not exist.
- GREEN: the same focused command passed after the schema-v3 implementation; `cd agent-workflows/tools/radar && go test ./...` passed.
- Candidate `radar check` from source passed with 0 errors and 63 warnings: 29 expected unverifiable Engram 12062 citations plus 34 existing authority/path warnings.
- Candidate `radar status --json` reports six open Torre V1 units in the approved dependency chain: `S164 → S8.12 → S8.13 → S172 → S173 → S150`; the five V2 survivors are `S165`, `S107`, `S9.8`, `S4.12`, and `S169` under the optional `torre-v2` priority.
- Independent-verifier RED: before the correction, candidate `radar faltan S165` reported `espera turno` and `radar faltan S4.12` reported `BLOQUEADO`, so the two optional survivors were not explicitly deferred.
- Independent-verifier correction: `diferida: true` was added to S165 and S4.12. S4.12's stale `encargo.incompleto: true` marker was removed because candidate Radar rejects the contradictory `incompleto` + `diferida` combination; its ID, result, contract text, decisions, legacy evidence, authorized files, and external dispatch evidence remain unchanged.
- GREEN/readback: candidate `radar check` passed with 0 errors and the same 63 warnings. Candidate `radar status --json` reports `DIFERIDO` for S165, S107, S9.8, S4.12, and S169; candidate `radar faltan` reports five explicitly apartadas Sesiones and no open Torre V2 Sesiones.
- Candidate readbacks show `S164` LISTO with the project-local Pi/Claude Code skill contract, and `radar sesion S170` rejects the absorbed ID as a non-executable retired reference.
- Maintainer-authorized conditional reconciliation: under the canonical shared lock, fresh no-follow/Git/Herdr/candidate-Radar checks found `work/S164@290507b416e6e24ce39c81fd02ca85d79d90a3e6` had zero unique commits, no attached worktree, no S164 candidate, and no live S164 agent. The exact orphan marker and ref were deleted; candidate Radar then confirmed S164 remains LISTO with no orphan or invalid dispatch. The cleanup changed no source or plan bytes.
- Two consecutive candidate renders after the reconciliation produced ROADMAP SHA-256 `bf1a04af791ecb20df19bc9cd9e9a6a4bb488c2d37f0608a463cf55c5332ba93`.
- `git diff --check` passed. Radar code and focused tests total 139 added+deleted lines, below the 400-line reference. Before tracking this subordinate ODD record, the candidate comprised 7 tracked files with 633 insertions and 2887 deletions.
- Work-unit commit: `8e29e2808c1be3f5b80d909fbc98590f51830523` (`feat(radar): add non-executable session retirements`), 8 files with 675 insertions and 2887 deletions.
- Before maintainer-authorized delivery, the planning candidate performed no commit, push, global installation, source or canonical-plan edit, additional ref/marker mutation, or edit to `AGENTS.md`/`CLAUDE.md`; only the parent reconciliation deleted the exact orphan marker and ref under maintainer authorization.
