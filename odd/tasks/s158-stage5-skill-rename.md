# S158 — Stage-five skill rename and delivery-policy reader

## Authority

- Approved Session: S158 — chanks-6-politica-de-entrega se renombra chanks-5-politica-de-entrega y suma el modo leer para la etapa 5; chanks-7-session-doc se renombra chanks-5-session-doc completa; toda referencia cruzada vigente apunta al nombre nuevo.
- Base: `ed36a61a9334cde06bda65edb7dd1ec3ae504758` on `master`.
- Fresh Radar state: `LISTO`; stage 3 (`Despachar`).
- `radar status --json` SHA-256: `7685d06d98e6d59872a5ec9054afb0134c69ecc4308c8bd4f409d9146c553feb`.
- `radar sesion S158` SHA-256: `f662caccf2fd96aa53813b5c127780ae092a1d0f30fe9fca6436fd7c58ceab4c`.
- Route: native ODD; strict TDD applies.
- S158 and S159 overlap `agent-workflows/tools/install.py` and `agent-workflows/tests/test_install.py`; the approved chain runs them serially, S158 first.
- `AGENTS.md` Cimiento reservation: exact mentions only. Main holds the serial intervention; the live Intercom roster reported no other session in this cwd before the first write. No other Cimiento path is authorized.
- Skill installation/propagation remains deferred until S159.

## Scope interpretation

- Rename the complete live `chanks-7-session-doc` tree without rewriting descriptive asset payload identifiers; the approved result says to move that tree with the same content.
- Update live operational references, not frozen historical snapshots. Historical evidence remains byte-identical.
- S123 stays `DIFERIDO`; at closure, only its reserved file path moves from `chanks-7-session-doc/SKILL.md` to `chanks-5-session-doc/SKILL.md`.
- `.atl/skill-registry.md` is outside the exact Session scope and is not regenerated here. Repository installation and five-agent propagation happen only after S159.

## Tasks

- [x] T1 — Add strict-TDD contracts for the new skill trees, delivery-policy read mode, installation/retirement lists, live cross-references, and preserved historical evidence. Proof: focused RED preceded implementation; builder 21/21, focused installer 3/3, coordinator 30/30.
- [x] T2 — Rename both stage-five skills and implement delivery-policy read routing while preserving the existing declaration mode and session-doc payload content. Proof: independent verifier confirmed both complete trees and byte-identical session-doc assets/references.
- [x] T3 — Update every authorized live consumer, installer reference, template, canonical convention, method document, and exact `AGENTS.md` mentions; repoint only S123's reserved path at closure. Proof: one scoped RED→GREEN correction replaced the stale `.chanks-7-session-doc.json` reference with the real `.session-doc.json`; independent verifier returned PASS.
- [x] T4 — Run focused and regression verification, native review or recorded fallback, deliver the coherent implementation commit, then record closure evidence without propagating skills. Proof: independent PASS; native review unavailable before lineage; direct push of `929ac91594a94b81c5747a7340f5c123f0a18355`; propagation remains deferred to S159.

## Delivery (2026-09-25)

- Strict TDD: focused contracts failed before the new names/read mode existed and passed after implementation. One scoped verifier correction added RED→GREEN coverage for the actual `.session-doc.json` filename.
- Verification: builder flow passed 21/21; focused installer contracts passed 3/3; coordinator discovery passed 30/30; `git diff --check` passed; independent verification returned PASS.
- Existing debt: a direct full Python installer run retains two base-identical assertions against out-of-scope kickoff wording; S158 neither introduced nor changed them.
- Native review: intended-untracked selection returned `schema-incompatible` before lineage creation or authority mutation, so independent verification supplied the high-risk fallback evidence.
- Delivery: implementation commit `929ac91594a94b81c5747a7340f5c123f0a18355` was pushed directly to `master`. The pre-push suite produced 1,487 PASS / 1 unrelated concurrency FAIL; the failing test passed once in isolated independent diagnosis. The maintainer explicitly authorized `--no-verify` rather than repeating the long suite.
- Closure scope: S123 remains `DIFERIDO`; only its reserved skill path was repointed to `chanks-5-session-doc/SKILL.md`.
- Propagation: remains intentionally deferred until S159 so the final repository skill/runtime set is installed and verified once.

## Checkpoint

S158 implementation is delivered and its immutable commit plus S123 reservation repoint are recorded in `openspec/plan.yaml`. This close record is pending its documentation commit/push; after that, recapture Radar before admitting S159.
