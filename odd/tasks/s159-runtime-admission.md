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
- [ ] T4 — Run focused/regression verification and native review or fallback, deliver the coherent size-exception commit, record closure, then perform the approved final skill installation/propagation and separately resolve Claude hook wiring.

## Restart checkpoint

The first uncommitted draft was discarded with explicit maintainer authorization after its single correction round still mislabeled one switch-transition result. The source tree is back at base `ce2a48c`; this task record preserves the approved decisions.

The fresh candidate must implement from the outset: ordinary-only marker admission; fail-closed Cimientos/Recursos; per-tool-call descriptor-bound `write`/`edit` effects; read-only confined bash rather than pathname-racy writable mounts; switch state bound at call start so an off-path completion is never mistaken for a missing lease; exact parallel/error/shutdown cleanup; Main guidance with transition-only 💪; and an executable but unwired Claude hook. Next: delegate a new bounded writer and require RED→GREEN plus independent verification before any review or delivery.
