# S159 — Automatic Radar admission and stage guidance

## Authority

- Approved Session: S159 — La extensión de Pi deja de pedir el clic de activación y bloquea escrituras de worktree sólo hasta que Radar admite la Sesión, guiando siempre a Main en vez de quedar inerte; un hook nuevo de Claude Code muestra el mismo menú de etapas llamando a `radar etapa`.
- Base: `ce2a48c6886841c941b9284d0b4e49154026fe15` on `master`.
- Fresh Radar state: `LISTO`; stage 3 (`Despachar`).
- `radar status --json` SHA-256: `94ac6ae3852bd84154c7e400416a39877492d8e85ceceb23dcac62fd0756fe0d`.
- `radar sesion S159` SHA-256: `3cf1cf6eb02a551b36b8d1a8f8e5f09135a2f118f18f6772dc9559acc2b9b6cc`.
- Route: native ODD; strict TDD applies.
- The maintainer explicitly accepted one coherent implementation commit despite a 550–850 line forecast. This is a size exception, not scope or verification relief.

## Technical interpretation

- The S155 dispatch marker is the durable human-approved binding between one exact Session and one exact worktree/branch. A worker runtime may derive the Session ID only from one valid marker matching its canonical worktree and branch, then require fresh Radar/HEAD evidence through the existing admission contracts. Missing, invalid, ambiguous, stale, or racing evidence keeps mutation blocked.
- The marker does not prove exact Cimiento reservation or exclusive/serial Recurso acquisition. By explicit maintainer decision, automatic admission unlocks only Sessions declaring neither; shared cases stay blocked and name the missing evidence. No code may convert a declaration into `confirmed: true`.
- Main has no worker dispatch binding. It becomes informative rather than inert: it can show the `radar etapa` guide but gains no write authority from the menu.
- `controls.mjs` and `interventions.mjs` keep every still-consumed export. Only click-specific dead code may disappear.
- The Claude hook script is delivered but not wired to `~/.claude/settings.json`. Wiring remains a separate explicit human decision after repository delivery.
- Repository skill installation and five-agent propagation happen only after the S159 implementation and closure are delivered; that propagation was approved for this chain.

## Tasks

- [x] T1 — Add strict-TDD contracts for click removal, exact marker-bound automatic admission, fail-closed drift/races, and preserved control exports. Proof: focused RED exposed caller-selected admission, the activation tool, mutable markers, and synthetic Cimiento confirmation; rebuilt candidate affected suite passed 237/237.
- [x] T2 — Replace the Pi activation flow with fresh per-mutation Radar admission while preserving switch, confinement, and authority boundaries. Proof: descriptor-bound symlink-swap, exact lease lifecycle/parallelism/off→on, ordinary-only admission, shared-case block, and real read-only bash tests passed; independent verifier returned PASS.
- [x] T3 — Add Main stage guidance and the portable non-blocking Claude hook, with 💪 only on observed stage transitions and no settings mutation. Proof: mode/syntax/payload, invalid-output, same-stage, and settings-free tests passed; independent verifier inspected lifecycle-bound process use.
- [x] T4 — Run focused/regression verification and native review or fallback, deliver the coherent size-exception commit, record closure, then perform the approved final skill installation/propagation. Proof: `f225de2` and closure `79d3c36` on `origin/master`; Radar reports S159 ✅ COMPLETO; `install.py --check` reports runtime copies and manual blocks match; Claude, Codex, OpenCode, and Pi hold byte-identical `chanks-*` skills including `chanks-5-*`.
- [ ] T5 — Resolve Claude hook wiring: `agent-workflows/tools/hooks/chanks-etapa.sh` is not referenced from `~/.claude/settings.json`; wiring it requires an explicit maintainer decision.

## Delivery checkpoint (2026-09-25)

- The first uncommitted draft was discarded with explicit maintainer authorization after its single correction round still mislabeled one switch-transition result.
- The fresh candidate implemented ordinary-only marker admission, fail-closed Cimientos/Recursos, per-tool-call descriptor-bound `write`/`edit`, read-only confined bash, call-start switch semantics, exact lease cleanup, Main guidance with transition-only 💪, and the executable unwired Claude hook.
- Strict TDD/regression evidence: affected Bun suite 237/237; focused Python Pi authority suite 28/28; hook syntax/mode and `git diff --check` passed. Full Python installer kept two base-identical out-of-scope kickoff string failures and introduced none.
- Independent verification returned PASS. Native review could not create a lineage because intended-untracked selection returned `schema-incompatible`; no authority mutation occurred.
- Implementation commit `f225de2f5dc26d6a67e2ac362e80abdcf6d1c980` was pushed directly to `master`; pre-push passed 1,486/1,486 repository tests.
- `openspec/plan.yaml` now records the immutable commit and the approved ordinary-only/shared-evidence and size-exception decisions.

## Installation checkpoint (2026-09-25)

- The approved installation completed for every runtime that `install.py` manages; the Pi process running it then exited with `ENOENT` from its recursive skills watcher, a known effect of the sync replacing skill directories under a live Pi session. The installed state was re-verified afterward from a separate session.
- Hermes (`~/.hermes/skills`) is not an `install.py` target and still holds the pre-S158 names `chanks-6-politica-de-entrega` and `chanks-7-session-doc`. This drift predates S159 and is outside its scope.

Next: ask the maintainer whether to wire the Claude hook (T5).
