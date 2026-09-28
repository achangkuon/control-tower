# Issue #151 — private Pi overlay and composition repair

Issue-Patch Mode on `work/issue-151`, base `ee9791cf5cef45ed2779d48d06776c2a1fd6f8f5`. This technical ODD record is not a product plan. Owner: `issue-resolver`; no push or installation. Scope is the nine approved files in the handoff. Effective Strict TDD is on (`openspec/config.yaml` `strict_tdd: true`); focused Python unittest is the applicable runner. RED precedes production edits. Each task closes only after focused checks, native review and its own Conventional Commit.

- [ ] Unit 1: Pin the reviewed 13-path private Pi patch in a manifest, build a fail-closed isolated materializer with local override, test identity/base/digest/result/conflict, and document partner-safe use. Patch bytes are generated and excluded from the 400-line implemented-work reference, but included in candidate identity. Rollback: remove `agent-workflows/personal-pi/` and its materializer test, retaining installed Pi untouched.
- [ ] Unit 2: Change only installer read/bash ownership to Pi tool-call annotations; retain Chanks write/edit and tool_call/tool_result guards, and add fake-based regression tests. Rollback: revert installer and unit tests, preserving the private overlay.
- [ ] Unit 3: Exercise real personalized Pi and genuine quiet-tools in isolated temporary configuration, proving startup, owner uniqueness, inline labels, fail-closed custom rendering, and preserved gates without touching installed/global bytes. Run broader applicable suite once. Rollback: revert the real-composition test while retaining units 1 and 2.

Unit 1 RED: `python3 -m unittest agent-workflows/tests/test_personal_pi_materialize.py -v` failed on missing materializer (1 failure). GREEN: same command, 3 tests passed. Isolated runtime harness: materialize and `--verify` from read-only `/home/emili/projects/pi-v2`, resulting tree `b38cc5a3a5f2c5a6fa3d10ea536dd09f343a0b6c`. Patch SHA-256 `513e018c76a3f3b2f31216124a318aacef95e6e5824d6a6d4b1855fc151ae6a6`; 29,339 bytes; no installation. Review/commit pending.

Evidence and commit OIDs are recorded here as each unit closes. No Cimientos or exclusive Recursos; read-only reference repositories only.
