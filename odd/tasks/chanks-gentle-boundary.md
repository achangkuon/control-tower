# Chanks / Gentle AI boundary

> Subordinate ODD execution record. `openspec/plan.yaml` remains the sole product-plan authority. This work closes no enumerated Session: the maintainer authorized it directly in conversation on 2026-10-01, outside any plan Session.

## Objective

Make the maintainer's personal configuration (Chanks instruction blocks and skills) stop colliding with Gentle AI, so his flow stays usable as a parallel-work layer on top of Gentle AI.

## Problem

Three audits (2026-09-09, 2026-09-25, 2026-09-29) found the same collisions and none was applied to the personal files. Chanks text prescribes how to implement, review, verify, delegate and commit, and five blocks claim precedence over Gentle AI managed content. V2 machinery (Herdr dispatch, Pi Intercom, sealed unattended execution) is loaded in every conversation. No skill teaches V1 parallel implementation.

## Approved rule

Chanks decides what is worked on and what runs in parallel. Gentle AI decides how it is implemented, reviewed and delivered. If they collide, Gentle wins.

Stage ownership: 1 Definir, 2 Preparar, 3 Paralelo and 5 Cerrar belong to Chanks. Stage 4 Implementar y revisar belongs to Gentle AI; Chanks only hands over the Session and receives the commit.

## Accepted consequences

- "Review before committing", the `--base-ref` ban and "ask before exceeding 400 lines" are removed: they are about the how.
- Herdr dispatch, Intercom and sealed unattended execution are V2. `chanks-3-despacho-herdr` is kept and modified to be V2-only.
- Gentle AI managed content is never edited.
- Hermes is handled last, once the result is defined for the other agents.

## Constraints

- Edit the repo sources that generate the installed files, never only the installed copies.
- One unit at a time, each with its own check and its own work-unit commit.
- No reinstall or skill sync without asking first: it crashes open Pi sessions.
- No push, merge to `master` or installation without explicit maintainer authorization.
- Isolated worktree `Worktrees/chanks-frontera`, branch `feat/chanks-gentle-boundary`; another conversation is working in `Main`.
- TDD: strict, from `openspec/config.yaml` (`strict_tdd: true`, `rules.apply.tdd: true`). Primary runner: `bun test`; companion Python runner: `python3 -m unittest discover -s agent-workflows/tests -p 'test_*.py'`; Radar runner: `go test ./...` in its tool directory.

## Tasks

- [x] T0 — Map block and skill provenance, binding tests, Radar `EN CURSO` mechanics and repo rules (delegated, read-only). Done: see "Mapping findings".
- [x] T1a — Remove precedence claims and "how" rules from the hand-maintained global blocks in Claude Code, OpenCode and Pi (delegated writer; outside the repo, no commit). Backup: `~/.claude/.skill-backups/boundary-2026-10-01/`. Done: Claude 97774 → 87592 B, OpenCode 47691 → 35420 B, Pi 26613 → 17703 B. Parent spot check: no precedence or "how" phrase left in the three files, the six Gentle AI managed blocks in Claude byte-identical to the backup, `manual-blocks.py save` then `check` OK for claude, opencode, pi and hermes (codex has nothing stored). Review lifecycle block reduced to sync-protection guidance; SDD gatekeeper, sealed consent, native checking, Pi Intercom and Pi ODD-compat blocks removed.
- [x] T1b — Remove the same from the repo sources: SDD gatekeeper template and its `MANUAL_BLOCKS` entry, the 400-line ask in the canon, planner, delivery-policy skill, adoption reference and `AGENTS.md`, with their tests (delegated writer, strict TDD). Done: 10 files, +73/−141. Observed RED: six `test_builder_flow` failures and the new `test_install` gatekeeper test before the source edits. GREEN: Python suite 290 tests with the same 76 environmental failures as the baseline and no new ones; `bun test ./agent-workflows` 356 pass; whole `bun test` 1660 pass / 0 fail across 113 files; `git diff --check` clean. Parent spot check: `builder-instructions.test.mjs` 2 pass, `test_builder_flow.py` 22 OK. Known leftover for T4: the canon still says "review-size forecast" (§15) and `chanks-4-puente` still pins "per work-unit commit".
- [x] T2 — Add the short boundary block that replaces the heavy routing blocks. Done (delegated writer, strict TDD): `templates/session-routing.md` is now 1279 B (was about 7.9 KB), marker name unchanged, installer untouched. The Session admission contract moved to `skills/chanks-3-session-kickoff/references/admission-contract.md`, JSON intact; no production code read it from the block. Nested owned-block rejection test restored. Observed RED in a mode-fixed copy: 16 failures and 3 errors; GREEN: only the pre-existing `test_fresh_normal_startup_and_policy`. Worktree Python suite 297 tests, 75 failing, all inside the environmental baseline; `bun test ./agent-workflows` 356 pass; whole `bun test` 1660 pass / 0 fail. Parent spot check: template 1279 B, one V2 line, 356 pass, three re-targeted Python files 64 OK. Gap for T5: about 25 dispatch-protocol assertions left `test_despacho_herdr.py`; T5 must confirm the V2 skills carry and pin those rules in their own text.
- [x] T3a/T3b status: both done. T3a commit `f8d700f` (delegated writer, strict TDD in Go): `radar marcar <ID> --worktree`, `radar marcar <ID> --listo` (local witness), `radar desmarcar <ID>`; all code in existing `etapa.go`/`main.go`, 14 refusal cases with filesystem snapshots, Herdr markers still valid; `go test -count=1 ./...` ok, `gofmt` clean, whole `bun test` 1660 pass, end-to-end smoke in a throwaway repo showed stage 3 → 4 → 5 → 3. Native assessment medium (`slice_budget_reached`), consent `declined` by the maintainer. T3b (delegated writer, strict TDD): `skills/chanks-3-paralelo/SKILL.md` 63 lines / 3453 B, registered in `CHANKS_SKILLS` and README, boundary block points to it (1305 B); observed RED 10 errors, GREEN 10 OK; mode-fixed Python suite 307 tests with only the pre-existing failure; `bun test` 1660 pass. Not exercised yet against a live Radar. Original task lines follow.
- [x] T3a — Radar commands to mark and unmark a Session in progress without Herdr (`radar marcar <ID>`, `radar desmarcar <ID>`), keeping Herdr-written markers valid; resolve the Intercom-only review-ready witness for stage 5. Maintainer chose this over leaving Sessions `LISTO`, because `EN CURSO` is what lets him resume.
- [x] T3b — Write `chanks-3-paralelo` (name approved): V1 dispatch through Gentle AI subagents, one git worktree per Session; Radar compatibility, human-approved lot, `radar marcar`, serial integration, close in `plan.yaml`.
- [ ] T4 — Reopened after failed independent verification; original implementation follows. Slim the stage 1, 2 and 5 skills and the stage-4 handoff, keeping every skill (the maintainer keeps his staged flow). Done (delegated writer, strict TDD): 38 files, +399/−558. `chanks-4-puente` now only hands the Session to Gentle AI and receives the commit; admission stated once in `chanks-3-session-kickoff`, which re-homes the "installed Radar is the only admission binary" rule and uses `radar marcar`; `chanks-5-session-doc` reduced to closing a Session through Radar (9986 → 2606 B), its Notion assets and schema deleted; `chanks-0-agente-soporte` 13104 → 7815 B with three orphans deleted; stage-1 triggers made explicit; stale `chanks-6/7` names and flow-doc claims fixed. Observed RED: 71 assertions across 32 `test_builder_flow` tests plus one each in `test_mensajes_visibles` and `test_issue_patch_flow`; no RED was observed for the re-targeted `test_install` assertions. GREEN: mode-fixed Python suite 316 tests with only the pre-existing failure; `bun test ./agent-workflows` 356 pass; whole `bun test` 1660 pass / 0 fail. Parent spot check: four Python files 59 OK, 356 pass, no live consumer of the deleted files (only the frozen-snapshot SHA table names them). Process note: the writer rewrote test files with small Python scripts instead of Edit/Write. Gaps for T5: issue-patch closure rules left `chanks-5-session-doc` and must still live in the Herdr skill; `radar marcar` on the primary checkout is accepted by the code but untested.
- [x] T3c — Committed as `9c70299`; recorded findings remain pending a separate decision. Radar: `marcar` refuses a Session that collides in files or resources with a Session already `EN CURSO` and refuses a worktree already used by another marker (maintainer decision after the independent verification of T3a); cover the untested branches the verifier listed; `chanks-3-paralelo` asks for the ODD feature document to carry the Session ID in its name so stage 5 is reachable.
- [ ] T5 — Mark the V2 skills (Herdr dispatch, coordinador-manual, unattended, jornada) as V2-only and not model-invoked by default. Candidate functionally verified; local work-unit commit and native assessment pending.
- [ ] T6 — Install and propagate to Claude Code, OpenCode, Pi and Codex, verify per agent; Hermes last.

## Mapping findings

- Only two global blocks are generated by the repo (`agent-workflows/tools/install.py` `MANUAL_BLOCKS`): the session-routing block from `templates/session-routing.md` (required) and the SDD gatekeeper block from `templates/sdd-auto-gatekeeper-policy.md` (optional, appended if absent). Every other manual block exists only in the global files.
- The install renders `{{REPO_ROOT}}` from the checkout it runs in, so the reinstall must run from `Main`, never from this worktree.
- Codex has no manual blocks; by code reading, `install.py` would fail there until the required block is seeded. Not executed.
- The 26 skills and the canon live in `agent-workflows/skills/`; installed copies match the repo. `product/tower/generic/` is a frozen snapshot pinned by SHA-256 and must not be edited.
- Radar marks `EN CURSO` only from a live `radar.despacho/v1` marker under `<git-common-dir>/chanks/despachos/`; Radar never writes it. Without a marker a Session stays `LISTO` and closes through `entrega.commit`. Open decision for T3.
- TDD: strict, runner `bun test` (`openspec/config.yaml`). Python suite: `python3 -m unittest discover -s agent-workflows/tests -p 'test_*.py'`; Radar: `go test ./...` in `agent-workflows/tools/radar`.
- Baselines in this worktree before any edit: Python 291 tests, 76 failing or erroring, all in `test_install.py` (75) plus one in `test_despacho_herdr`, reported as file-mode environment failures; `bun test ./agent-workflows` 356 pass; whole `bun test` not clean because `node_modules` is absent.
- Route: T1a, T1b, T2, T3, T4, T5 delegated to one bounded writer each (2+ non-trivial files); T6 parent with human confirmation.

## Evidence

- T1b work-unit commit `2c825b3`. Native assessment: high risk (`process_boundary` in `test_install.py`), review due. Consent envelope relayed; maintainer answered `declined` for that candidate. Off-path independent verifier: pass with minor findings, no regressions; `test_install.py` 98 OK in a mode-fixed copy.

- Baseline: branch created from `origin/master` at `33e14ce4ae131943728f9132f55a251f30f3d6bd`.
- Engram mirror `odd/chanks-gentle-boundary/tasks`: restored and read back on 2026-10-01 (observation #12383). Earlier Claude saves failed with "multiple active runtime sessions match the current project"; no runtime session identity was invented to recover it.

## Resume state (2026-10-01, conversation stopped at a usage limit)

- Commits on `feat/chanks-gentle-boundary`: `2c825b3` (T1b), `8615fe5` (T2), `f8d700f` (T3a), `8fa49e0` (T3b), `ab959f5` (T4), `9c70299` (T3c). Nothing pushed, merged or installed. The maintainer declined native review for each of the six commits; a single review of the whole branch before integration was offered and not yet answered.
- T3c `9c70299`: commit done, independent verification pass with findings. Open gaps, none fixed: check-then-write race between two concurrent `radar marcar` calls for colliding Sessions (19 of 20 trials left both markers); an orphan marker revived by recreating its worktree bypasses the collision guard; markers for IDs not in the plan are ignored by the worktree/branch check; a live Session with no declared `archivos` blocks every other Session (intended, undocumented); the skill's `odd/tasks/<id>*.md` wording is looser than `tareasCerradas`.
- T4 `ab959f5`: independent verification FAILED. Not yet fixed: (1) V2 worker handoff and (2) issue-patch closure rules lost — both sent to the T5 writer to restore inside the Herdr skills; (3) the single-Session path never runs `radar marcar <ID> --listo`, so stage 5 is unreachable there; (4) the Notion project map and `.session-doc.json` schema used by the maintainer's other repositories were deleted and must be restored as an on-demand reference; (5) how-rules remain in `chanks-2-planificador-granular/references/juicio-de-ruta.md`; (6) `StageSkillBoundaryTests` does not scan `chanks-3-paralelo` or `.py` files and the trigger test is too loose; (7) `install.py` never prunes files removed from a skill, so a reinstall leaves stale files.
- T5: a delegated writer was still running when the conversation stopped. It leaves changes unstaged in this worktree. On resume, read `git status`, verify its work against the T5 scope and the two restored items, then commit or discard.
- T6 and Hermes not started. Both installs (skills and Radar) need the maintainer's confirmation; open Pi sessions crash on reinstall, and the install must run from `Main`.
- Global files already changed outside the repo (T1a): backups in `~/.claude/.skill-backups/boundary-2026-10-01/`.

## Authorized continuation (2026-10-01, Codex)

The maintainer authorized continuing local changes after context recovery. Preserve inherited changes and finish one coherent work unit at a time. No installation, skill propagation, merge, push, remote operations, or global instruction edits are authorized by this continuation. Preserve the existing Spanish-facing artifact language where extending it; use English for this execution record.

Four pending units: T5, T4a, T4b and T6. T4 is an umbrella reopened because its implementation failed independent verification, not a new product plan. Radar race/orphan findings stay deferred; this continuation begins with skills recovery rather than silently expanding Radar behavior.

- [ ] T4a — Restore single-Session readiness (`radar marcar <ID> --listo`), generic on-demand Notion map/schema with Control Tower's local prohibition intact, and planning-reference boundary rules. Strengthen stage activation and file-surface tests, including parallel skill and `.py` references. Route: delegated writer (multiple non-trivial files; preparation mapping delegated). Acceptance: no lost generic capability, no Chanks-owned implementation/review policy, reachable stage 5. Checks: relevant Python tests, full Python suite with baseline comparison, `bun test`, whitespace and local-reference checks. Forecast: about 350–650 authored lines including restored assets.
- [ ] T4b — Prune removed installed skill files using proven ownership, without deleting unrelated files or weakening symlink/path protections. Route: delegated mapping and writer (installer plus tests). Acceptance: stale owned files are removed, unmanaged files are preserved, isolated install fixtures only. Checks: observed RED/GREEN installer regressions, full Python suite with environmental baseline, `bun test`, whitespace. Forecast: about 150–300 authored lines. Resolve any real ownership ambiguity before deletion semantics change.

T5 route: delegated writer; 4+ file preparation/mapping and 2+ non-trivial writer triggers. Inherited candidate: 597 authored changed lines including task-record changes, before small corrections. Finish V2-only/default non-invocation, restored worker/issue handoffs and relocated pool consumers; keep schema compatibility and consent explicit. Strengthen the per-skill pointer regression and description/structure checks before corrections. Historical T5 RED was not observed by this runtime and will not be claimed; new corrections require observed RED/GREEN.

Verification environment: source tool modes are 775 although installer expects 755; do not silently chmod live sources to obtain GREEN. Compare baseline/candidate in isolated mode-normalized fixtures and disclose live-check failures. Primary strict-TDD source and runners are listed above.

Delivery: existing approved boundary removes Chanks-owned size prompts; repository `AGENTS.md` forbids PRs/chained PRs. Retain coherent local work-unit commits (`exception-ok` for this inherited feature under that policy), never code-golf or artificially split to satisfy 400 lines. No remote delivery is authorized. Running authored counts and exact commits will be recorded per unit. RDD is on, deciding source global; old declines cover only the six historical candidates. Assess each new committed work unit against `9c70299` initially and follow native returned transitions; new candidate consent is not inferred from historical decisions.

## T5 verification (2026-10-01, Codex)

Delegated writer preserved the inherited worker seal/handoff, issue-patch closure and pool declaration, then fixed three oversized descriptions, four misplaced V2 headings, the unattended handoff pointer, a broken night-mode relative link, and retirement's old pool locator. Four V2 skills retain explicit human activation and `disable-model-invocation: true`. Execution-contract schema unchanged; historical review-policy constants are inert, never automatic consent. The local native consent envelope remains human-owned.

Observed new RED before corrections: `test_despacho_herdr.py`, 74 tests, 13 contract failures plus one existing installer-mode error. Separate resolved night-mode-link regression: one failure, then one pass. No historical inherited T5 RED claimed.

Final checks:
- Five focused files in isolated normalized fixture: `PYTHONPATH=agent-workflows/tests python3 -m unittest test_builder_flow test_chanks_jornada test_coordinador_manual test_despacho_herdr test_issue_patch_flow`: 171 tests OK.
- Full Python command `python3 -m unittest discover -s agent-workflows/tests -p 'test_*.py'`: raw HEAD baseline 318 tests / 3 failures / 73 errors / 1 skip; raw candidate 339 tests / 2 failures / 73 errors / 1 skip. No new failure/error names. Four live source tools remain mode 775; no live chmod.
- Isolated normalized full Python: baseline 318 tests / 1 failure / 1 skip; candidate 339 tests / same failure and skip. Remaining failure: `GenuineCompositionTests.test_fresh_normal_startup_and_policy`; skip: native SDD binary unavailable. Normalization only in disposable copies; no global install. The raw startup-policy difference is environmental and not advertised as fixed.
- `bun test ./agent-workflows`: 356 pass, 0 fail (5.40 s). `bun test`: 1660 pass, 0 fail (189.04 s). `git diff --check`: clean.
- Candidate behavior/instruction paths: 18, +529/-91 = 620 authored lines, excluding this execution record. Keep coherent unit under existing no-PR policy.
- Runtime harness: N/A, instruction/reference unit; no authorized Herdr dispatch or installation. Actual runtime activation/agent parity deferred to T6.
- Rollback: restore 14 tracked T5 behavior/test paths to `9c70299` and remove the four new Herdr handoff/reference files; preserve prior six commits and this execution record.
- Broader pre-existing skill-body/section style debt and registry refresh are not claimed completed; no global registry refresh, install, sync, merge or push performed.
- Temporary evidence: `/tmp/chanks-t5-fixtures-hsnyek8h`, `/tmp/chanks-t5-*-final.log`, `/tmp/chanks-t5-baseline-{raw,normalized}.log`. Durable essential results are recorded above; Engram bugfix observations #12385/#12386 and completion #12387.

## Next step

Create the verified T5 local work-unit commit and consume the native assessment/consent transition. Continue T4a/T4b only after that applicable gate. T6 remains human-confirmation gated.
