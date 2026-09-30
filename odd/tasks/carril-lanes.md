# Carril: isolated Pi lanes (limpio / candidato / estable)

Subordinate execution continuity only, not a product plan or a new planned Session.
Product planning authority remains `openspec/plan.yaml`.

## Objective

Let the maintainer open Pi in an explicit lane per terminal, always know which lane a terminal is
in, and never touch the stable setup while testing. Step 1 of 3 (see "Later steps").

## Problem and why

Every change to skills, binaries and Pi config lands directly on the setup used daily, so there is
no way to measure whether personal configuration causes friction versus Gentle AI alone, and no
safe place to try a candidate version.

## Scope (authorized 2026-09-28: "Arma carril")

- `carril` launcher command: `carril limpio|estable` opens Pi with the lane's config dir;
  `carril` with no argument reports the current terminal's lane. `candidato` is reserved and
  refused until step 3.
- `limpio` lane: a Pi config dir holding only Gentle AI's shipped pieces, sharing credentials
  safely with the stable dir.
- Visible lane label (terminal title + banner) without adding personal extensions to `limpio`.

## Constraints

- `~/.pi/agent` (estable) is never modified by the launcher or lane setup.
- Plain `pi` keeps behaving exactly as today.
- Lane state is per terminal (environment), never global.
- No personal skills, extensions, packages or APPEND_SYSTEM manual blocks in `limpio`.
- Installing the launcher into `~/.local/bin` is a separate, human-confirmed step.

## Acceptance criteria

- `carril` with no lane in env prints `estable (sin carril)`; inside a lane prints that lane.
- `carril limpio` execs `pi` with `PI_CODING_AGENT_DIR` = the limpio dir and `CARRIL=limpio`.
- Unknown lane → non-zero exit with usage; `candidato` → non-zero exit, "not built yet".
- Lane setup refuses to write inside `~/.pi/agent`.

## Checks

- Strict TDD: on (source `openspec/config.yaml` `strict_tdd: true`).
- Runner for this tool: `python3 -m unittest agent-workflows.tests.test_carril` equivalent,
  run as `python3 -m unittest discover -s agent-workflows/tests -p 'test_carril.py' -v`.

## Tasks

Additional maintenance authorized 2026-09-29: make carril model selection explicit from the normal
stable Pi configuration to control cost, and remove the host-peer dependency warnings shown by the
Gentle packages in isolated lanes. This extends the carril continuity work; it does not change product
planning authority.

- [x] C1 — Isolation facts: credentials, skill discovery, packages, Gentle AI content, labels
  (route: delegated exploration — mapping trigger, 4+ files outside repo). Findings that shaped
  the design:
  - `auth.json` is written in place under a lock; OpenAI Codex rotates refresh tokens, so the lane
    symlinks the stable file instead of copying it.
  - `~/.agents/skills` is discovered whatever `PI_CODING_AGENT_DIR` says, so limpio runs
    `--no-skills --skill <gentle-pi>/skills`.
  - gentle-pi injects its orchestrator prompt itself; the stable `APPEND_SYSTEM.md` has no managed
    blocks, so limpio carries none of it. gentle-pi config lives in `GENTLE_PI_CONFIG_HOME`,
    isolated per lane.
  - Pi owns the terminal title but includes the session name, so the lane label is `--name`.
  - Packages install under `<agent dir>/npm`, fully isolated.
- [x] C2 — `carril` launcher with tests (RED → GREEN → REFACTOR) (route: inline, one new file + test).
  RED observed: 8/9 failed (script missing; the no-write test passed vacuously). GREEN: 9/9 OK.
  Files: `agent-workflows/tools/carril`, `agent-workflows/tests/test_carril.py`.
- [x] C3 — Limpio lane setup + first launch smoke check (route: inline, human-confirmed install).
  Extended tests RED 5/14 → GREEN 14/14 (commit `9f6da94`; C2 was `d44314f`). Installed a copy at
  `~/.local/bin/carril`; `carril preparar limpio` built `~/.pi/agent-limpio` with gentle-pi@3.7.0
  and gentle-engram@0.1.12.

- [x] C4 — `carril candidato <worktree>`: the stable setup, with every repo-owned piece (skills,
  instructions, extensions) read from the chosen worktree; never writes installed runtime dirs.
  Authorized 2026-09-28 ("Si, así me gustaría mucho"), chosen over a fixed candidate dir so two
  candidates can run side by side. Route: delegated mapping of install sources and Pi precedence
  (4+ files), then inline script + tests.
  - Lane dir `~/.pi/agent-candidato/<worktree name>`, rebuilt on every launch; sessions kept.
    Linked: auth.json, mcp-oauth, npm, bin, skills, mcp-adapter.json. Copied: settings, models,
    trust, subagents, agents, chains, MCP caches. Rendered with the worktree's own `install.py`:
    APPEND_SYSTEM.md (hand-written blocks kept, repo blocks swapped) and chanks-controls.ts.
    Other personal extensions are linked.
  - Two defects found by real runs, not by the stub tests, each reproduced in a test first:
    (1) the real installer's string-annotated dataclasses need `sys.modules` registration;
    (2) `--skill` paths load after `~/.agents/skills` and lose name collisions (explorer claim
    was wrong: `resource-loader.js` appends them as `additionalSkillPaths`). The worktree skills
    now ride as `settings.json` entries, rank 2 in `package-manager.js:resourcePrecedenceRank`,
    above user auto-discovery (rank 3).
  - Missing MCP caches made every server connect eagerly (Notion OAuth error absent in stable);
    copying the caches restored parity.
  - Tests 21/21. Real checks: `carril candidato <Main>` renders APPEND_SYSTEM.md and
    chanks-controls.ts byte-identical to the installed ones (control), stable dir hashes unchanged;
    `carril candidato implementer-1` loads all 28 repo skills from the worktree.
  - Native review: staged projection (no `--base-ref`), risk `high`, consent envelope relayed; the
    maintainer answered "Saltear esta vez" and the exact decline invocation returned
    `declined_this_candidate` for `sha256:83b76a5b…2914`. Unreviewed by choice; RDD stays on.
  - Known limits: the chanks extension's skill badge only recognises `~/.agents/skills` paths
    (cosmetic); `_shared` resolves relative to each loaded skill, so worktree skills read the
    worktree `_shared`.
- [x] C5 — Copy the stable explicit generic/SDD/review model mappings into `limpio` after Gentle
  package installation, preserving lane isolation and the distinct Pi (`effort`) and Gentle
  (`thinking`) schemas. Added regression coverage for postinstall clobber and candidato's existing
  `subagents.json` parity. RED: the lane lacked its local npm/model setup; GREEN: focused suite
  24/24.
- [x] C6 — Give `limpio` a lane-local copy of the stable `pi-npm-host-peers` wrapper and configure
  package installation through it so `typebox` and `@earendil-works/pi-tui` are repaired as host
  peers without modifying the stable setup. Added fail-closed and exact warning-regression coverage;
  focused suite 24/24.

### Step 2 — A/B friction test (authorized 2026-09-28: "Si esas están bien")

Tasks approved by the maintainer, each run once per lane (limpio, estable) in throwaway worktrees
from the same commit, non-interactive (`-p`), sessions stored outside the daily history:
1. #146 Radar non-ASCII paths (Go bug). 2. Fold `carril` into `install.py` (Python feature).
3. #147 intermittent timeout, diagnosis only. 4. "Which Sessions can I start today?" (Chanks use).
Excluded: #150 (in progress elsewhere), #144/#145 (Gentle AI internals), #138 (tracker).
Forecast cost disclosed: about $5–20 for the automatic runs.

- [x] A1 — `carril-medir`: sums a run's main session plus its subagent sessions (matched by the
  session header `cwd`), then prints the comparison table (route: inline, one tool + test).
  RED 3/3 → GREEN 3/3; on the real smoke session it reproduces 14 771 tokens / $0.059. Not yet
  committed.
- [x] A2 — Throwaway worktrees `Worktrees/ab-<task>-<lane>` at the same commit; the persistent pool
  is never used (route: inline). Eight detached worktrees at `97ac50c`; `bun install
  --frozen-lockfile` in both t3 worktrees. Stable snapshot: 67 hashed files. Prompts and runner are
  in the session scratchpad; each task pairs both lanes in parallel, 40-minute timeout per run.
- [x] A3 — Eight automatic runs, stable dir hash checked before and after (route: inline, background).
  All 8 exited 0 (23:28–23:46). Only `models-store.json` changed in the stable dir, the model
  catalog cache the estable runs themselves refresh. No subagent sessions were attributed to any
  run. Raw metrics (limpio vs estable): t1 $0.572/152 s/28 tools vs $1.524/331 s/57;
  t2 $1.120/279 s/35 vs $0.851/245 s/26; t3 $0.866/290 s/37 vs $1.049/332 s/47;
  t4 $0.167/28 s/4 vs $0.363/80 s/6. Startup tokens were about 19.6k vs 33.6k in every run.
  Quality grading is blind: bundles are relabelled A/B with a mixed key, and the t1/t2 patches are
  applied on neutral `Worktrees/blind-*` checkouts.
- [x] A4 — Comparison table (route: inline). Maintainer's interactive notes are still pending.
  Blind grades by an independent verifier; the key was revealed only after grading:
  - t1 #146: a tie on quality; both fixes are correct and both tests really reproduce the bug.
    limpio's fix was cleaner (it reuses the `gitCommand` seam). estable's process was stronger
    (it reported RED/GREEN, forced `core.quotepath=true` in the test, and wrote an ODD record) but
    cost 2.7×.
  - t2 installer: a tie on quality, with estable slightly ahead on tests. The two implementations
    are near-identical. estable was also cheaper. Both runs' `test_install.py` errors came from
    worktree file modes (775 against the installer's strict 0o755), not from the patches; with
    modes normalised both pass.
  - t3 #147: limpio slightly better, because it cited the real historical timeout record. Both
    runs were honest, and both proposed a per-test timeout plus a protocol-driven close for the
    mock server.
  - t4 which Session: estable more faithful to Radar. It said Radar gives no reason to prefer S164
    over S165. limpio was friendlier but invented a reason for ordering them ("discover problems
    early"), which Radar does not support. Neither invented IDs or states.
  - No rule violations. The stable dir was intact apart from its model-catalog cache.
  Reading: with one run per task, the differences are within noise except cost. Personal config
  costs about 40% more overall (startup 33.6k vs 19.6k tokens every run) and bought fidelity on
  the Chanks question (t4) and process discipline on t1, but no measurable correctness gain on
  code tasks.

### Step 2b — Layer ablation (authorized 2026-09-29: "Si, hazlo")

The maintainer's side-by-side sessions showed the estable lane stalling: it asked for an exact
Session ID and grepped its own rules before acting. The limpio lane dispatched three Herdr agents
by reading `chanks-3-despacho-herdr` from the repo on demand. Hypothesis: the friction comes from
always-on layers, not from missing capability. Five lanes, with one layer removed at a time:
estable, A (no personal APPEND_SYSTEM.md), B (no personal skills announced; gentle-pi skills
only), C (no personal extensions/packages), limpio. Each lane runs three prompts:
"continuemos con lo último", dispatch three Herdr agents, and #146.

- [x] B1 — `carril-medir` counts human questions (`ask_user_*` tool calls) and whether the run
  ended on a question (route: inline, TDD). RED 2 errors → GREEN 5/5. Not yet committed.
- [x] B2 — Experimental agent dirs `~/.pi/agent-exp/{A,B,C}`, built from the stable dir the same
  way as candidato (links for credentials and packages, copies for writable state); stable hash
  checked before and after (route: inline). Smoke run from an empty cwd, startup input tokens:
  estable 28 741 (earlier) → A 22 664 (−6.1k, rules), B 23 011 (−5.7k, skills; 12 left),
  C 26 415 (−2.3k, extensions; 26 tools vs 32); limpio 14 771.
- [x] B3 — Fifteen runs in throwaway worktrees at `813d781`, with memory writes forbidden by the
  prompt (route: inline, background). The first launch lost 11 of 15 runs to a provider
  `fetch failed` outage. Those 11 were reset (worktree checkout/clean, sessions removed) and rerun
  after a connectivity check; p1-A therefore ran alone rather than beside its peers. Two metric
  defects found while reading the results were fixed test-first in `carril-medir`:
  `--since` drops the stale subagent session of a failed attempt, and startup/input now include
  `cacheRead` + `cacheWrite`. Step 2 token counts may be undercounted for the same reason; its
  dollar costs are unaffected, because the provider's cost already includes cache.
- [x] B4 — Per-layer attribution table (route: inline). USD / seconds:

  | Prompt | estable | A no rules | B no skills | C no extensions | limpio |
  |---|---|---|---|---|---|
  | p1 "lo último" | 0.27/33 | 0.26/38 | 0.13/26 | 0.33/83 | 0.73/178 |
  | p2 dispatch 3 | 0.61/140 | 0.41/118 | 0.32/78 | 0.49/94 | 0.63/121 |
  | p3 #146 | 1.53/578 | 1.64/835 | 2.37/954 | 0.90/367 | 3.11/693 |
  | total | 2.41/751 | 2.31/991 | 2.83/1058 | 1.72/544 | 4.47/992 |

  - p1: all five lanes stopped and asked which work to resume; limpio investigated for 3 minutes
    before asking.
  - p2: all five dispatched, got "listo" from three agents and closed their workspace.
  - p3: all five fixes pass `go test ./...` in radar.
  - Startup tokens: estable ~33.5k, A ~27.4k, B ~27.8k, C ~31.2k, limpio ~19.6k.
  - Reading: noise dominates. The same #146 task in limpio cost $0.57 in step 2 and $3.11 here.
    Cost tracks how many subagents the orchestrator chose to spawn (2 to 5 sessions per p3 run),
    not the removed layer. One run per cell cannot rank the layers. The only stable signal is the
    fixed startup weight. No layer removal lost capability.

## Verification evidence (2026-09-28)

- Full `agent-workflows` suite: 273 run, 1 failure, 1 skipped. The failure is
  `test_personal_pi_composition.test_fresh_normal_startup_and_policy`; it fails identically on the
  base without these changes (missing local Pi source checkout). It is environmental.
- Smoke run: same prompt, empty cwd, scratch session dir. Both lanes answered.

  | Lane | First-turn input tokens | Cost | System prompt chars | Skills | Chanks skills |
  |---|---|---|---|---|---|
  | limpio | 14 771 | $0.059 | 17 917 | 12 | 0 |
  | estable | 28 741 | $0.115 | 67 949 | 65 | 27 |

- The stable dir changed during the smoke test. Timestamps show the writes came from the estable
  run itself (pi-pretty frecency, gentle-ai managed assets), which happens on every plain `pi`
  launch. The limpio run wrote only inside `~/.pi/agent-limpio`.
- Limpio prints host-peer warnings for gentle-pi/gentle-engram. That is Gentle AI as shipped:
  the stable lane hides them through the personal `pi-npm-host-peers` npm wrapper.

- Native review: assess on `b458174..HEAD` returned risk `high`, `review_due: true`. The returned
  preflight START carries `--base-ref`/`--committed-only`, which the maintainer has banned for new
  reviews. The maintainer chose to skip review for this candidate only (2026-09-28), so it is
  unreviewed. RDD itself was left on.

## Maintenance verification (2026-09-29)

- Writer RED: 24 focused tests ran, 3 failed because `limpio` lacked the lane-local npm/model
  setup. GREEN after implementation: 24/24.
- Independent verification: `bash -n agent-workflows/tools/carril` passed; focused carril suite
  passed 24/24 in 4.705s; no findings.
- Pre-delivery verification on current `master`: carril 24/24, installer 99/99, and Bun 1550/1550
  passed; `git diff --check` passed. The full Python suite ran 291 tests with the same environmental
  composition failure already recorded above (missing local `pi-v2` and `gentle-pi` source
  checkouts) and one native-SDD skip. Candidate size: 349 changed lines, below the 400-line review
  reference.
- Native review approved and acknowledged target `sha256:532ff04c…4333f` under lineage
  `review-44b6885c0833c358`; implementation commit `0d8bdf97e334c07cc5961f423cecc34751763ae7`.
- With explicit maintainer authorization, the active `limpio` lane was migrated in place after a
  dated backup because this Pi session was using that directory. Static live-state verification
  passed 7/7: model and wrapper byte parity, executable modes, lane-local `npmCommand`, both peer
  repairs, installed launcher parity, backup presence, and readable stable references.

## Progress

- Step 1 and the explicit-model/peer-warning maintenance are implemented in the repository and
  applied to `~/.pi/agent-limpio`.
- Backup: `~/.pi/agent-limpio.backup-20260929-182505`.
- `~/.local/bin/carril` is currently an explicit copy. Separate, pre-existing installer changes in
  this worktree are outside C5/C6 and are not credited here until their own delivery closes.

## Later steps (not authorized yet)

2. A/B friction test: 3–5 real tasks run in `limpio` and `estable`, metrics from Pi session JSONL.
3. `candidato` lane + rewrite of the AGENTS.md delivery rule to add a test stage.
