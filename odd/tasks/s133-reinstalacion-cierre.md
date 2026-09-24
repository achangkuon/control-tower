# S133 — Require tool reinstall evidence at Session closure

Technical continuity only; product authority is the native Session contract from installed Radar. Admission HEAD: `a51b3c3d76182eef3c0d8350ca310927bcc5bc51`, LISTO, native Encargo. The maintainer expressly authorized this exact ODD record; Main amended the plan and `radar check` returned 0 errors with all three Sessions still compatible.

## Objective and scope

Make closure consult the repository's `AGENTS.md` for post-delivery tool reinstall requirements by changed path; record the command executed and verification. If reinstall evidence is missing, report pending work instead of declaring closure. Require human confirmation before installing skills because synchronization can terminate open Pi sessions. If no repository reinstall rule exists, state that and require none. This is a skill contract, not permission to install tools now.

Authorized implementation: `agent-workflows/skills/chanks-7-session-doc/SKILL.md`, `agent-workflows/tests/test_builder_flow.py`, plus this record. Do not edit another path or install/reinstall skills without explicit human confirmation. Execute serially in Main.

## Execution

- [ ] S133-W1 (delegated): Add post-delivery reinstall decision/evidence and human skill-installation gate in the closure skill; add regression assertions for every rule and update the skill digest fixture within the authorized test. RED → GREEN → REFACTOR under explicit strict TDD. Verify `python3 agent-workflows/tests/test_builder_flow.py` and the applicable Method suite; read back exact diff. Complete one normalized Session review before delivery; the maintainer explicitly authorized this candidate's local Conventional Commit despite unavailable native review; no push or installation. Evidence: delegated writer observed RED (eight absent rules plus the verification rule), GREEN and refactor. `PYTHONDONTWRITEBYTECODE=1 python3 agent-workflows/tests/test_builder_flow.py`: 15 tests OK; `git diff --check`: PASS. Only the authorized skill and test changed (60 authored diff lines); frozen historical snapshot hash was preserved. No installer ran. Independent verifier reran the focused suite (15 tests OK) and full Method Python suite (164 tests OK, 1 skipped because native SDD binary unavailable); `git diff --check` passed. Only the two authorized files changed, with frozen historical digests preserved. Native review inspect stopped `managed_assets_outdated` without lineage; assess was unassessable and required the independent verifier. Local S133 commit authorized and pending; push and any actual post-delivery reinstall remain pending.

Acceptance: closure never declares complete without reinstall command and verification when AGENTS.md requires them; skill install waits for human confirmation; repository without a rule is explicitly exempt; tests fail if any rule is removed. Rollback: only the authorized skill and its contract test.

Route: delegated bounded writer (2 nontrivial files). TDD source: `openspec/config.yaml` has `strict_tdd: true`; Python test and Method suite are the relevant runners. Delivery strategy: ask-on-risk; preliminary authored estimate 40–90 diff lines. Only the local S133 commit is authorized; no push or tool installation. Do not mark task complete without checks and authorized commit.

Next: commit exactly the verified S133 skill, test and record locally; do not run managed-asset sync, install skills or push without separate authorization.
