# Manual Handoff Protocol

Fallback path, used when the `control-tower` MCP is absent or erroring. With it
connected, `references/tower-transport.md` governs delivery instead — everything
below about block content and closure still applies unchanged.

The Tower drafts coordination blocks; the user manually copy-pastes each one into an
agent already running in a user-created, user-assigned worktree. The Tower never
launches agents or manipulates worktrees.

Planning blocks are not emitted here. Discovering units, sizing counts, and drafting
the first assignment belong to `agente-soporte`; by the time work reaches the Tower it
is already approved and assigned.

## Emission Rules

- Emit exactly one fenced `text` copy-paste block per agent; never combine recipients.
- Use the asset that matches the transition: `candidate-review-freeze.md`,
  `delivery-green-light.md`, `blocked-wait.md`, `db-verification.md`, or
  `session-close.md`.
- Keep explanations outside the copy block. Replace every placeholder; unresolved
  worktree identity becomes `pending user verification` and blocks mutation.
- State explicit STOP conditions, allowed/forbidden scope, DB mode, tests, evidence,
  dependencies, and return contract.
- Use only the states in `state-machine.md`. Finer phase detail goes in prose or in
  the `note` field, never as a state name.
- A waiting unit receives `blocked-wait`, never a second green light.
- Any correction is a new explicit handoff. Never reinterpret an old block silently.

## Resumable Global Closure

Tower records one merged-state identity and three evidence checkpoints: technical
docs/status, Notion, and final memory. On partial failure, re-verify the current
merged state; if unchanged, retry only incomplete checkpoints and preserve completed
evidence. If it changed, recalculate closure before writing. Repeated runs must be
idempotent. Never report global closure until all three checkpoints are reconciled
and evidenced.
