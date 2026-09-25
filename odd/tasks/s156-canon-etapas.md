# S156 — Canonical stage-transition and review-size language

## Session identity and authority

`S156 (Método V1 › metodo — El canon y las skills de las etapas 1 y 2 dejan de describir el clic de activación y la revisión única por Sesión, y tratan el tope de 400 líneas como referencia y no como cupo., 🟢 LISTO)`

Implement the approved native Encargo on `master` from fresh Radar admission at `ad8b9173b6d209d7cde30543189818dd6ab87e39`. Radar offered stage 3 (`Despachar`); exact status/session digests were `cb7d87aa49ccd9e030e191a2fdc4a8b45e27318f06a467f909a4f7313428de01` and `be689d09aff86a6419f1cab50c19980473f11d4ad354faa47ecfa51e6a062ab7`. This record is subordinate ODD continuity, not product-plan authority.

## Scope and constraints

- Edit only the five exact S156 repository paths plus this ODD record. Do not rename skills or modify kickoff/bridge behavior reserved for S157.
- Remove planning-click/key language only from stage-1 authority and stage-2 preparation skills; current session-kickoff activation assertions remain until S157.
- Canonical review policy belongs inside stage 4 per work-unit commit and never authorizes delivery. Remove the canon's one-review-per-Session rule without falsely asserting that the still-unmodified bridge already changed.
- Treat 400 authored implementation lines as a planning/review reference: forecast, ask before exceeding it, then use sequential reversible units or an explicit size exception. It is not a quota to consume.
- Strict TDD: update contract assertions first, observe RED, implement the minimum prose changes, run the focused builder-flow suite and applicable full suite, then independent verification and native review.

## Tasks

- [x] T1 — Add strict-TDD assertions for stage-transition language, absence of planning activation clicks, stage-4 per-work-unit review semantics, and 400-as-reference wording while preserving current S157-owned bridge/kickoff expectations. Proof: focused RED→GREEN; commit `40235d3fcf6ee5f893da5695f25e495298b6c448`.
- [x] T2 — Update the canonical convention, authority/preparation skills, and adoption reference without renaming skills or expanding behavior. Proof: structural readback and final independent PASS; commit `40235d3fcf6ee5f893da5695f25e495298b6c448`.
- [x] T3 — Verify skill structure and contract tests, run independent verification/native review, deliver the coherent S156 commit, propagate/install only with explicit human confirmation, and record closure evidence. Proof: 16/16 builder-flow tests; pre-push 1,488/0; native review unavailable before lineage (`schema-incompatible`); direct push of `40235d3fcf6ee5f893da5695f25e495298b6c448`; maintainer chose one final propagation after S159.

## Delivery (2026-09-25)

- Strict TDD: the new S156 contract test failed against the old planning-key language, then passed after the five scoped edits.
- Correction: the complete builder-flow suite exposed a stale closure-skill source hash already present on clean HEAD; the exact authorized test fixture was updated to the independently proven HEAD digest, with no closure behavior change.
- Verification: focused S156/kickoff/bridge/closure checks passed; full `test_builder_flow.py` passed 16/16; `git diff --check` passed; independent verification returned PASS.
- Native review: intended-untracked selection returned `schema-incompatible` before lineage creation or authority mutation, so the review was unavailable and the independent PASS supplied the high-risk fallback evidence.
- Delivery: commit `40235d3fcf6ee5f893da5695f25e495298b6c448` was pushed directly to `master`; the pre-push suite passed 1,488 tests.
- Propagation: explicitly deferred by the maintainer until S159 so the final S156–S159 skill set is installed and verified once, avoiding repeated Pi-session disruption.

## Checkpoint

S156 implementation is delivered and its immutable commit is recorded in `openspec/plan.yaml`. This close record is pending its documentation commit/push; after that, recapture Radar before admitting S157.
