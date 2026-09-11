# Standalone sealing and routing

## Authority map

| Concern | Authority |
|---|---|
| Planning evidence | `chanks-0-agente-soporte` returns read-only evidence. |
| Readiness and sealing | `chanks-4-unattended-implementation` validates and seals one contract. |
| Chain semantics | `chained-pr` supplies planning-only boundaries. |
| Commit boundary | `work-unit-commits` supplies a freeze-only rollback boundary. |
| Implementation | A separately human-directed implementer may consume the sealed contract. |
| Plan evidence | The responsible parent records confirmed evidence. |

A child returns facts to its caller. No child creates a peer, external session, live claim, queue,
or delivery action.

## Seal gate

Validate the JSON schema, then return `NOT_READY` if any predicate fails:

1. Repository identity, branch, and 40-character base SHA are exact; every governing artifact has a SHA-256 digest.
2. Exactly one positional Sesión and explicit task IDs are authorized; `continuation` is `none`.
3. Read/edit/command allowlists are bounded, while denied effects prohibit commit, push, PR, merge, release, deploy, database mutation, external sessions, locks, queues, and global closure.
4. The approved scope declares every edited path, shared-path risk, required check, binary criterion, and rollback boundary.
5. No required human decision, scope ambiguity, contradictory evidence, or Git contamination affecting the base remains unresolved.
6. `expires_at` is explicit. JSON Schema validates its shape but cannot prove that `expires_at` is later than `sealed_at`; the runtime semantic check compares those instants before any edit. Any changed base, scope, artifact, permission, or decision requires a new seal and approval.
7. Runtime semantic checks canonicalize the four repository/common-dir paths, require source and clone identities to differ, reject symlink aliases and linked worktrees, and verify every command is explicitly approved for this contract. JSON Schema cannot compare sibling paths, prove repository identity, or decide command authorization.
8. Before final verification, runtime checks preserve immutable candidate identity: unique recipe paths/modes/classes, observed sizes and hashes, deterministic tree digest, ownership/conflict evidence, and the retry/terminal limits declared by the schema.

Reject placeholders, alternatives, implicit continuation, or prose that delegates a choice to unattended execution.

## Immutable seal

Canonicalize the contract without `contract_digest`, compute SHA-256, insert the digest, and
obtain human approval for that exact digest. A summary is not execution authority. The output is
a standalone sealed approval only; it neither launches work nor authorizes delivery.

## Required evidence

Return contract ID/digest and expiry; repository/branch/base; Sesión/task IDs; permissions;
criteria and checks; rollback boundary; human approval; and blockers. Preserve all available
evidence when not ready or blocked.
