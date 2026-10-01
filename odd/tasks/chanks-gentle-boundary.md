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
- [x] T5 — Mark the V2 skills (Herdr dispatch, coordinador-manual, unattended, jornada) as V2-only and not model-invoked by default. Functionally verified and committed locally as `bec4ec17b6b2f88691a9afe8e8315810b7cbb165`; native medium review granted, approved without findings, and acknowledged; exact commit remains local only.
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

- [x] T4a — Functionally verified and committed locally as `55fae88c93a336117f157fffd2585fcb52ff4846`; native high-risk review explicitly declined for this candidate; ordinary functional evidence retained, no review approval claimed. Restore single-Session readiness (`radar marcar <ID> --listo`), generic on-demand Notion map/schema with Control Tower's local prohibition intact, and planning-reference boundary rules. Strengthen stage activation and file-surface tests, including parallel skill and `.py` references. Route: delegated writer (multiple non-trivial files; preparation mapping delegated). Acceptance: no lost generic capability, no Chanks-owned implementation/review policy, reachable stage 5. Checks: relevant Python tests, full Python suite with baseline comparison, `bun test`, whitespace and local-reference checks. Forecast: about 350–650 authored lines including restored assets.
- [ ] T4b — Candidate functionally verified; local commit/native assessment pending. Prune removed installed skill files using proven ownership, without deleting unrelated files or weakening symlink/path protections. Route: delegated mapping and writer (installer plus tests). Acceptance: stale owned files are removed, unmanaged files are preserved, isolated install fixtures only. Checks: observed RED/GREEN installer regressions, full Python suite with environmental baseline, `bun test`, whitespace. Forecast: about 150–300 authored lines. Resolve any real ownership ambiguity before deletion semantics change.

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

T4a candidate review was explicitly declined and the exact native skip completed. T4b is now functionally verified; create its local work-unit commit and consume native assessment/consent transitions for the new pending range. Source edits are finished for the known skills scope after that commit; live activation still requires authorization. T6 remains human-confirmation gated; integration/remote delivery remain separately unauthorized. Last genuinely reviewed boundary remains `bec4ec1`; never fabricate approval for `55fae88` or re-prompt this exact declined candidate.

## T5 commit and native checkpoint

- Local work-unit commit: `bec4ec17b6b2f88691a9afe8e8315810b7cbb165`, `fix(skills): isolate V2 flows and restore worker handoffs`. Nineteen paths, +576/-97 = 673 authored lines including the execution record; 620 behavior/test lines. No install, sync, remote operation, merge or push.
- Running committed work-unit churn from branch point `33e14ce4ae131943728f9132f55a251f30f3d6bd`: +2623/-1065 = 3688. Accumulated base-to-HEAD diff: +2584/-1026 = 3610. No PR slices in this no-PR repository.
- Native postcommit assessment: medium, `executable_change` in `AGENTS.md`; review due `slice_budget_reached`. Exact returned preflight STATUS executed, then exact `review.start --consent=relay` executed to obtain the human envelope. No reviewer launched and no consent answered.
- Review candidate: only `9c70299..bec4ec1`, not the accumulated feature branch. Base tree `710e8d1025dc88a8445b2641d98bbcbfa8667a80`, candidate tree `220f50b4a7390dc1cbfcce35fdf0b7cc44df1ce0`, target `sha256:90349e7ce88da673ba1c2a423cfeb24cbefd228a6e19ce4c581eaf0153b3e837`, lineage `review-ee5f719b2f10238d`.
- Consent checkpoint is pending, not approved/declined. This postcommit evidence update is the only dirty file; it is excluded from the explicitly committed-only candidate.
- Consent is a candidate-review decision: granted reviews only this commit, adds time and helps find regressions; declined skips only this candidate under ordinary policy and does not disable future reviews. Contaminates only native review of T5; does not authorize installation or delivery.

### Native consent envelope (exact, for recovery)

```json
{
  "schema": "gentle-ai.review-integration.consent/v3",
  "contract": "gentle-ai.review-integration/v2",
  "operation": "review.start",
  "action": "consent_required",
  "agent": "codex",
  "blocking": true,
  "target_identity": "sha256:90349e7ce88da673ba1c2a423cfeb24cbefd228a6e19ce4c581eaf0153b3e837",
  "projection": "workspace",
  "risk_level": "medium",
  "changed_files": 19,
  "changed_lines": 673,
  "headline": "Gentle AI can review this change before you call it done.",
  "reason": "Review can help detect regressions in these changes.",
  "value": "Reviewing takes a little longer and makes the result safer.",
  "risk_evidence": [
    "this change is not purely passive documentation, so it gets one consolidated review.",
    "an executable change in AGENTS.md"
  ],
  "choices": [
    {
      "answer": "granted",
      "label": "Review this change",
      "effect": "Reviews only this change; later medium- or high-risk changes ask again, and delivery needs separate approval.",
      "invocation": "gentle-ai review start --contract gentle-ai.review-integration/v2 --cwd /home/emili/projects/control-tower/Worktrees/chanks-frontera --target sha256:90349e7ce88da673ba1c2a423cfeb24cbefd228a6e19ce4c581eaf0153b3e837 --target-evidence v1:base-diff:workspace:710e8d1025dc88a8445b2641d98bbcbfa8667a80:220f50b4a7390dc1cbfcce35fdf0b7cc44df1ce0:sha256:391b845cbd5c2624848d34b515f0a1643dc7996bc278080fd5d8e3e84bec779d --projection workspace --agent codex --lineage review-ee5f719b2f10238d --base-ref 710e8d1025dc88a8445b2641d98bbcbfa8667a80 --committed-only --consent granted"
    },
    {
      "answer": "declined",
      "label": "Skip this time",
      "effect": "Skips only this change; no review record is created, and future reviews stay enabled.",
      "invocation": "gentle-ai review start --contract gentle-ai.review-integration/v2 --cwd /home/emili/projects/control-tower/Worktrees/chanks-frontera --target sha256:90349e7ce88da673ba1c2a423cfeb24cbefd228a6e19ce4c581eaf0153b3e837 --target-evidence v1:base-diff:workspace:710e8d1025dc88a8445b2641d98bbcbfa8667a80:220f50b4a7390dc1cbfcce35fdf0b7cc44df1ce0:sha256:391b845cbd5c2624848d34b515f0a1643dc7996bc278080fd5d8e3e84bec779d --projection workspace --agent codex --lineage review-ee5f719b2f10238d --base-ref 710e8d1025dc88a8445b2641d98bbcbfa8667a80 --committed-only --consent declined"
    }
  ],
  "off_path": {
    "note": "To turn reviews off for good, run 'gentle-ai review mode disable'.",
    "command": "gentle-ai review mode disable"
  }
}
```

## T5 native review started (2026-10-01)

The maintainer answered `si` to reviewing only `bec4ec1`; granted consent was recorded in Engram #12389. Fresh STATUS matched the saved target/lineage and committed-only trees. The exact saved granted invocation created native medium review `review-ee5f719b2f10238d`, selected lens `review-reliability`, correction budget 200. This is not approval and grants no installation or delivery.

Provider repository context: `rctx2_b76f7822b05adc834780bf66c43b236b3f6e785f9d03b6e81a5ba0a7b4a235c0`. Reviewing capture subject: `sha256:223a6b95386b8044c9d0a4a76ceca6cde86be1a1dab718027b1b5674f9516ffb`, expected revision `sha256:2dc1b689b11878d9f7a9b137e361bfee91f697dd0458870edc624ff6810af278`.

Installed compiled Codex runtime rejects `capture-result --materialize` with `mutation_outcome: not_started`, `retry_safe: true`; it materializes its own reviewer internally. Executed the provider-carried `capture-result` arguments without that unsupported flag, preserving every binding and `--agent=codex`. Native reviewer capture is running; follow fresh native STATUS on completion. Never replace it with a parent-authored reviewer result. The task record remains the sole dirty file, excluded from this committed-only review.

## T5 native review completed (2026-10-01)

Native compiled Codex `review-reliability` inspected all nineteen immutable patches and returned no findings. It ran no commands or external-file reads; this review does not independently establish runtime activation/dispatch. Existing functional checks and the explicit T6 deferral remain unchanged. Native final event returned `state: approved`; executed its exact acknowledgement command successfully, `action: acknowledged`, `authority: burned`.

Result hash: `sha256:1967dc39ed7dd1fee95f0d4d53ca8f0191f903c7a8fe4ce4c82000130eb93104`. Consumed revision: `sha256:abe42ce09855c05831d368c712a7d9d46fe1c6107b79f0fb152b71b1bf91c7ea`. Lineage and target unchanged. Reviewed boundary advances from `9c70299` to `bec4ec17b6b2f88691a9afe8e8315810b7cbb165`; future review consent is separate. No installation, merge, propagation or push. Native reviewer approval applies only to T5, not T4 or the accumulated branch.

## T4a verification (2026-10-01)

Delegated combined preparation/writer restored single-Session stage-5 coordination through a shared readiness reference. It passes the exact lowercase `odd/tasks/<id>.md` or `odd/tasks/<id>-<feature>.md` locator, checks immutable same-branch commit, real checked task evidence (at least one checked task/no unchecked task), observed outcome/check evidence and Session/checkout identity before the installed `radar marcar <ID> --listo -C <repo>`. It confirms `radar etapa` offers stage 5 and leaves refusals pending. `--listo` itself does not prove tasks complete; no new authority or technical review is claimed. CLI/source compatibility verified through CodeGraph; no installed runtime command was executed.

Generic Notion map/schema restored from `ab959f5^`, preserving payload apart from `chanks-7` to `chanks-5` metadata. The compact optional reference prioritizes local prohibitions, valid project configuration, explicit documentary authorization and readback. Control Tower's local prohibition and intentionally absent `.session-doc.json` remain untouched. No Notion call or global configuration write. Removed technical HOW prescriptions from planning judgment. Strengthened actual activation/parallel/`.py` boundary tests, narrowed digest exception to the canonical admission reference, retained the legacy SDD helper unchanged.

Test surface includes one exact `StageFiveSkillInventoryTests` expectation in `test_install.py`, necessary to retain the restored three support files; installer source/pruning untouched. Twelve behavior/test paths: +292/-28 = 320 authored lines, excluding this record.

Observed RED before source corrections: 50 tests, four contract failures and one missing-asset error. Additional observed RED: inventory expected only `SKILL.md` despite restored generic support; changed only that exact expected set. Final focused builder/parallel/legacy-bridge Python checks: 61 tests OK, one existing native-SDD-binary skip.

Final full Python command `python3 -m unittest discover -s agent-workflows/tests -p 'test_*.py'`: raw baseline 339 tests / 3 failures / 73 errors / 1 skip; candidate 344 / 2 failures / 73 errors / 1 skip, no new failure/error names. Disposable normalized baseline 339 and candidate 344 both have one `GenuineCompositionTests.test_fresh_normal_startup_and_policy` failure and one unavailable-native-SDD-binary skip. Four live tool modes remain 775; normalization only in disposable fixture copies. Baseline/candidate raw count differences in startup behavior are environmental, not claimed fixed.

`bun test ./agent-workflows`: 356 pass. `bun test`: 1660 pass, zero fail. `git diff --check`, local references, JSON syntax and historical payload comparison: clean. External Draft7 schema validator unavailable (`jsonschema` absent); no dependency installed. Runtime harness: N/A for this instruction/reference unit; live agent/Notion activation deferred to authorized T6, never inferred from text tests. Temporary evidence `/tmp/chanks-t4a-*`, fixture `/tmp/chanks-t4a-fixtures-w9f61eb0`; durable results recorded here and Engram #12390–#12392.

Rollback: restore eight tracked behavior/test paths to `bec4ec1`, remove four new/restored readiness/Notion files, preserve this execution record and the seven previous commits. No install, sync, merge, push or review started for T4a by the writer.

## T4a commit and pending native consent

Local work-unit `55fae88c93a336117f157fffd2585fcb52ff4846`, `fix(chanks): restore session readiness and optional closure support`: thirteen paths, +377/-31 = 408 authored lines including this execution record; 320 behavior/test lines. Running work-unit churn from the branch point is 4096 authored additions+deletions (previous3688 plus408), with no generated files. No PR slices, install, sync, merge, push or remote operation.

Native assessment of ONLY `bec4ec1..55fae88`: high, `process_boundary` signal `shell_process` in `agent-workflows/tests/test_install.py`; review due `high_risk`. The actual test change only updates the exact expected restored asset inventory; no installer/process-launch source was modified. Native risk selection is retained, never lowered by model interpretation. Exact returned preflight STATUS and consent relay command were executed; no reviewer launched and no consent answer inferred.

Target `sha256:00b4a8986d014e420f65fe3defd427813850d9d24f0eecd0bddb1171d9bae884`, lineage `review-b750dd44d1c01659`, base tree `220f50b4a7390dc1cbfcce35fdf0b7cc44df1ce0`, candidate tree `22d9349fd0baa6de6b8e4ed69db916ee3fef7f0e`. Last reviewed boundary remains `bec4ec1`; T4b and T6 are still pending. This postcommit task-evidence update is the only dirty file and is excluded by committed-only selectors.

Decision class: native candidate-review consent. Contaminates only review of T4a; neither answer authorizes installation/delivery or changes the global RDD mode. Granted adds review time to help detect execution problems; declined skips only this candidate under ordinary policy. Exact recovery choices follow.

### T4a native consent envelope (exact)

```json
{
  "schema": "gentle-ai.review-integration.consent/v3",
  "contract": "gentle-ai.review-integration/v2",
  "operation": "review.start",
  "action": "consent_required",
  "agent": "codex",
  "blocking": true,
  "target_identity": "sha256:00b4a8986d014e420f65fe3defd427813850d9d24f0eecd0bddb1171d9bae884",
  "projection": "workspace",
  "risk_level": "high",
  "changed_files": 13,
  "changed_lines": 408,
  "headline": "Gentle AI can review this change before you call it done.",
  "reason": "Review can help detect execution issues in these changes.",
  "value": "Reviewing takes a little longer and makes the result safer.",
  "risk_evidence": [
    "code that starts other processes in agent-workflows/tests/test_install.py"
  ],
  "choices": [
    {
      "answer": "granted",
      "label": "Review this change",
      "effect": "Reviews only this change; later medium- or high-risk changes ask again, and delivery needs separate approval.",
      "invocation": "gentle-ai review start --contract gentle-ai.review-integration/v2 --cwd /home/emili/projects/control-tower/Worktrees/chanks-frontera --target sha256:00b4a8986d014e420f65fe3defd427813850d9d24f0eecd0bddb1171d9bae884 --target-evidence v1:base-diff:workspace:220f50b4a7390dc1cbfcce35fdf0b7cc44df1ce0:22d9349fd0baa6de6b8e4ed69db916ee3fef7f0e:sha256:571c67e671ebcb2e0ab3cf36da1d80c99747c7ed6c1dcef421bd87cc3733a843 --projection workspace --agent codex --lineage review-b750dd44d1c01659 --base-ref 220f50b4a7390dc1cbfcce35fdf0b7cc44df1ce0 --committed-only --consent granted"
    },
    {
      "answer": "declined",
      "label": "Skip this time",
      "effect": "Skips only this change; no review record is created, and future reviews stay enabled.",
      "invocation": "gentle-ai review start --contract gentle-ai.review-integration/v2 --cwd /home/emili/projects/control-tower/Worktrees/chanks-frontera --target sha256:00b4a8986d014e420f65fe3defd427813850d9d24f0eecd0bddb1171d9bae884 --target-evidence v1:base-diff:workspace:220f50b4a7390dc1cbfcce35fdf0b7cc44df1ce0:22d9349fd0baa6de6b8e4ed69db916ee3fef7f0e:sha256:571c67e671ebcb2e0ab3cf36da1d80c99747c7ed6c1dcef421bd87cc3733a843 --projection workspace --agent codex --lineage review-b750dd44d1c01659 --base-ref 220f50b4a7390dc1cbfcce35fdf0b7cc44df1ce0 --committed-only --consent declined"
    }
  ],
  "off_path": {
    "note": "To turn reviews off for good, run 'gentle-ai review mode disable'.",
    "command": "gentle-ai review mode disable"
  }
}
```

## T4a review declined and remaining scope (2026-10-01)

Maintainer answered `omitimos` for ONLY T4a `55fae88`, then asked how much work remains. Fresh native STATUS matched the exact target; executed the saved `--consent declined` invocation. Provider returned `action: declined`, `consent: declined_this_candidate`, `lenses_required: false`; no native review record or approval created. Global RDD remains on and future distinct candidate consent stays separate. Decision saved in Engram #12394. No code tests or implementation rerun in this status-only turn.

Remaining known skills scope: one correction unit T4b (safe ownership-based stale-file pruning, installer regressions and functional checks), followed by T6 installation/propagation and verification in Claude Code, OpenCode, Pi and Codex, with Hermes last. Installation still needs explicit approval because it disrupts open Pi sessions and must run from Main, not this worktree. Bringing the feature into Main/master and any push also need separate authorization. No reliable minute estimate is claimed before ownership mapping and activation conditions are established.

Radar concurrent-mark/orphan/other findings remain separately deferred and are not silently included in this skills completion estimate. Existing Python environment failures/skip and unavailable external schema validator stay documented, not advertised as fixed. No install, propagation, merge, push or remote operation performed. The task record remains the sole dirty file after the verified source commits.

## T4b authorized design and checks (2026-10-01)

The maintainer explicitly resumed local implementation with `Dale, continuamos`. Narrow read-only mapping (delegated, mandatory preparation/4+ file context trigger) established that `install.py` has no per-file ownership manifest, but it already archives retired whole skills through `os.replace` under `<runtime-root>/.retired-skills/`. Use explicit immutable historical path/SHA256 tombstones for the four net removed owned files plus a separate guarded reversible file-retirement helper. This solves existing installations without inventing a mutable runtime ownership database or recursively deleting user content. Tradeoff: future known removals must maintain the tombstone registry; unknown or modified files deliberately survive.

Source edit surface for T4b: `agent-workflows/tools/install.py`, `agent-workflows/tests/test_install.py`, `agent-workflows/README.md`. Route: delegated bounded writer (installer, tests and docs are multiple non-trivial files), preparation mapping delegated first. Forecast: about 200–350 authored lines; heuristic only, no artificial splitting or code golf. Parent owns this record and native review. Strict TDD remains from `openspec/config.yaml`; primary `bun test`, focused `PYTHONPATH=agent-workflows/tests python3 -m unittest test_install`, full Python discovery as above.

Owned tombstones, relative to each runtime skill root:
- `chanks-0-agente-soporte/assets/assignment-readonly.md`: `1066822ccc072dc21cd5dd67965cbbcf0a03b186d276a70b593d26e4e0c8d72f` (`1b3a53b`) or `9b35256b723d835665783739526a12497bf037c822521c498850a3bf253bc622` (`f7612de`).
- `chanks-0-agente-soporte/references/contrato-no-interferencia.md`: `c9f5b2db842d9b4751ab2a86a94cd7c30d7d538f433f4165674a5db88d6edf61` (`1b3a53b`) or `b2c15bc842cc310b06489f3160d4e75a9ca111cf59bab525d1024000de7e981e` (`f7612de`).
- `chanks-0-agente-soporte/references/unidad-ejecutable.md`: `2d78b7322467476ce1e8c127f5ce746c62e9adb392d4ec8c8d4bac2cd8baf322` (`1b3a53b`) or `a5362b5289abf87269ffbf879ab55976205cf0485cfa2c4e4132b20e5626a612` (`f7612de`).
- `chanks-5-session-doc/references/links.md`: `6d75a865769a7561193f06bb5f2f86f39d65b1911e6337a0a11077c863b6885b` (`929ac91`).

Digests recovered directly from immutable Git blobs; `ab959f5` removed these files. Restored Notion assets are current source, never retirement candidates. Current source inventory excludes a tombstone even if that path returns later.

Preflight validates every known destination and archive ancestor before any source/manual write: reject symlink components, wrong types and path escapes. Plan `retired-skill-file` only for a regular file whose content matches a known historical digest. Missing, modified and unlisted files remain untouched. At the end of successful apply, revalidate path and digest and move exact historical copies into collision-safe `.retired-skills/files/` backups preserving relative identity. Reuse the archive surface, not the whole-directory helper; do not inherit its unguarded archive-parent behavior or expand into unrelated whole-skill refactoring. Do not delete empty directories.

Observed RED before source fixes must cover: all four paths/known variants across four runtime roots; modified and unlisted files preserved; current-source overlap and restored Notion protected; symlink file/parent/archive parent and wrong types rejected before writes with external sentinels intact; digest changes after planning preserved; earlier apply failure leaves obsolete copies active; archive collision preserves both copies and subsequent runs are idempotent. CLI proof in copied-source/temporary-home fixtures: `--dry-run` and `--check` detect known obsolete copies without mutation, isolated apply archives them and a subsequent check succeeds. No real HOME install or runtime activation.

Functional closure: focused regressions, full raw/normalized Python baseline comparison, `bun test ./agent-workflows`, `bun test`, whitespace and exact black-box fixture evidence. No live chmod: the four tool modes remain 775; expected 755 only in disposable copies. Existing startup-policy failure and native-SDD-binary skip remain disclosed. Mapping discovery #12397 and summary #12398. T6 integration/installation/propagation and any push remain separately human-gated.

## T4b functional verification (2026-10-01)

Implemented exactly three behavior/test/doc paths: `agent-workflows/tools/install.py` +76, `agent-workflows/tests/test_install.py` +249, `agent-workflows/README.md` +24 = 349 authored additions. Immutable historical path+digest tombstones gate retirement; current-source overlap excludes reintroduced/restored files. Modified, unlisted and missing copies survive. Known file/archive destinations are guarded in preflight; after ordinary apply succeeds the helper revalidates path/digest and archives matched bytes in private collision-safe timestamp directories. Concurrent-writer protection is explicitly not guaranteed: install without other processes editing the same skill paths. No recursive cleanup or mutable ownership manifest.

Strict-TDD evidence: `PYTHONPATH=agent-workflows/tests python3 -m unittest test_install.RetiredSkillFileTests` observed RED before production edits (10 tests, nine failures/two errors through subcases). Final regression class 11 OK. Disposable mode-normalized full installer suite 115 OK. Full discovery raw baseline344/candidate355 both three failures/73 errors/one skip; normalized baseline344/candidate355 both one existing `GenuineCompositionTests.test_fresh_normal_startup_and_policy` failure and one unavailable-native-SDD-binary skip. Exact failure/error names unchanged. Four live source modes remain 775; no live chmod.

`bun test ./agent-workflows`: 356 pass/zero fail. Initial clean-HOME full Bun failed 1654 pass/six failures/one error because its harness lacked the default core facade and Go cache. Its Go build inadvertently downloaded public yaml.v3 into the disposable cache; this violated the worker's no-network scope and was disclosed, not hidden. No credentials/real HOME/cache used. Corrected real copied-source facade, disposable dependency cache, `GOPROXY=off`, `GOTOOLCHAIN=local` gave fail-closed eight pass and pre-push twelve pass. Worker full Bun reported1660/0 but a zsh logging tail failed (`status` is read-only); inner exit was not claimed. Parent reran the unchanged candidate directly without that wrapper: `env HOME=/tmp/t4b-proof-73txulhi/bun-home GOMODCACHE=/tmp/t4b-proof-73txulhi/home/go/pkg/mod GOCACHE=/tmp/t4b-proof-73txulhi/bun-home/.cache/go-build GOPROXY=off GOTOOLCHAIN=local bun test`, actual exit0, 1660 pass/zero fail/9700 expectations/113 files (113.62s). Whitespace clean. Final verification offline; no claim of zero network activity across the earlier failed attempt.

Real black-box CLI proof uses only a copied installer and temporary `--home`. Two rounds seed all seven immutable Git-blob versions across four runtime roots: each dry-run exits0/check exits1 and detects sixteen historical copies without mutation; each isolated apply exits0 and produces sixteen byte-identical archives; subsequent check exits0. Parent independently read the artifact and hashed all32 backups: exactly the seven expected historical digests, no unknown content. Evidence: `/tmp/t4b-proof-73txulhi/historical-cli-evidence.json`, `bun-all-parent-direct.log` and raw/normalized fixture logs. This proves installer behavior in isolated homes, not live agent activation.

Rollback: remove only these three T4b source diffs; runtime rollback inspects a private backup and restores its original relative path without overwriting newer user content. Parent task record excluded from source rollback. Engram bugfix #12401, environment discoveries #12407/#12408, completion #12409. No real installation, propagation, merge or push.
