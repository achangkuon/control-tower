# Main-Owned Visible Root Specification

## Purpose

Define the approved product boundary for one durable OpenCode primary root per assigned worktree while keeping the automatically attached local TUI visible and non-authoritative. This specification supersedes Herdr-critical lifecycle assumptions for future work; it does not rewrite the delivered `S4.2` evidence.

## Requirements

### Requirement: Main owns the durable primary root

Main MUST own the backend lifecycle and exactly one primary `gentle-orchestrator` root binding per assigned worktree. The binding MUST identify the exact assignment, worktree, backend, process, root session, agent role and epoch. Missing, ambiguous or foreign identity MUST fail closed.

#### Scenario: Exact primary root is accepted

- GIVEN a Main-owned binding for the current assignment and worktree
- WHEN backend, process, root session, role and epoch all match
- THEN the root is accepted as the unique primary root
- AND no view process contributes authority to that proof.

### Requirement: Backend lifecycle is isolated per worktree

Main MUST launch and own one OpenCode backend server for each assigned worktree. Each backend MUST have its own process, loopback port, authentication secret, primary-root binding and lifecycle evidence. Main MUST NOT share any of those identities across worktrees.

#### Scenario: Backend identity crosses worktrees

- GIVEN two assigned worktrees with Main-owned backends
- WHEN a process, port, secret, root binding or lifecycle record from one is presented for the other
- THEN validation fails closed
- AND neither backend or root binding is mutated.

### Requirement: Child sessions never replace root identity

The primary root MAY use allowlisted native subagents. A child session ID MUST NOT replace, update or satisfy the persisted primary-root identity.

#### Scenario: Child identity is reported as root

- GIVEN an allowlisted child spawned by the primary root
- WHEN its ID is presented as the assignment root
- THEN validation fails closed
- AND the persisted root binding remains unchanged.

### Requirement: The visible TUI is automatic and non-authoritative

After Main owns the isolated backend and exact primary root, Herdr MUST temporarily open a replaceable pane running `opencode attach` for that root ID. Local TUI input MAY steer or converse with the root, but MUST NOT authorize dispatch, delivery, security-sensitive action, identity change or another Main-owned transition. The pane MUST NOT be treated as the root, and Intercom MUST NOT be used as transport. Closing or failing Herdr, the pane or the TUI MUST NOT stop, replace or invalidate the backend, root or epoch. A manual `opencode attach` command for the same root MUST remain available as fallback.

#### Scenario: Attached view closes

- GIVEN a healthy Main-owned backend and primary root with a Herdr-attached TUI
- WHEN Herdr, the pane or the TUI exits or fails
- THEN backend/root/epoch health and identity remain unchanged
- AND the operator can attach manually without replacing the root.

### Requirement: Herdr is outside the critical lifecycle

No backend/root launch, health, stop, rehydration or recovery proof MAY depend on Herdr pane identity or Herdr availability. Herdr is selected only as the temporary replaceable view launcher under decision 39. A future direct Main-owned terminal launcher MAY replace it without changing backend, root or epoch semantics.

#### Scenario: Herdr is absent

- GIVEN a valid Main-owned backend/root binding
- WHEN Herdr is unavailable or not installed
- THEN the critical lifecycle remains operable
- AND manual `opencode attach` remains the required visible fallback.

### Requirement: View loss reconnects the live root

When the backend and primary root remain alive, loss of Herdr, pane or TUI MUST be treated only as view loss. Main MUST reopen `opencode attach` against the same persisted `root_session_id`; it MUST NOT increment `host_epoch`, create a backend or root, or mark the live root stale.

#### Scenario: View disappears while root remains healthy

- GIVEN a healthy backend and primary root at the current epoch
- WHEN the attached view exits or becomes unavailable
- THEN Main reattaches a view to the same root ID
- AND backend, root binding and epoch remain unchanged.

### Requirement: Proven root death creates a fresh logical successor

After canonical proof that the backend and primary root are dead, Main MUST mark the predecessor root terminal/stale, increment `host_epoch`, create a fresh isolated backend and a fresh primary `gentle-orchestrator` root in the same assigned worktree, persist explicit predecessor lineage, and automatically open a new attached TUI. The successor `root_session_id` MUST differ from the predecessor. Main MUST reject every message, claim or effect bound to the prior epoch. The old root MUST NOT be reused or resurrected.

#### Scenario: Backend and root are proven dead

- GIVEN canonical stop proof for the bound backend/root and an exact same-host worktree/checkpoint
- WHEN Main starts recovery
- THEN the predecessor becomes terminal/stale and the epoch increments once
- AND a fresh backend/root/TUI successor is created with explicit predecessor lineage
- AND every prior-epoch effect fails `CT_ASSIGNMENT_STALE`.

### Requirement: Recovery context is rebuilt from durable authority

Main MUST build a bounded recovery brief in this authority order: current Main binding and epoch; authoritative Git/worktree identity plus pending candidate evidence; canonical OpenSpec index, Plan status, acceptance criteria and decisions; selected Engram context; latest durable checkpoint with tests, evidence and next command. Engram MUST be treated as contextual memory, not sole authority. Notion MUST NOT participate in runtime recovery authority. Process-local subagents, in-flight memory and uncheckpointed state MUST NOT be reconstructed.

#### Scenario: Context source conflicts or is incomplete

- GIVEN a recovery brief whose Git/OpenSpec/checkpoint evidence conflicts, or whose only support is Engram or Notion
- WHEN Main validates the brief
- THEN recovery fails closed before creating a successor
- AND the conflict is returned to Main for resolution.

## Resolved decision boundaries

Decision 38 selects one isolated Main-owned backend per assigned worktree. Decision 39 selects Herdr temporarily only as a replaceable, non-critical `opencode attach` view launcher with mandatory manual fallback. Decision 40 selects same-root reconnection for view loss and a fresh backend/root/epoch successor after proven death; same-ID resurrection is prohibited.
