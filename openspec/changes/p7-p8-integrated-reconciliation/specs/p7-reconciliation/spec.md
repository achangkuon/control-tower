# Delta for P7 Reconciliation

## ADDED Requirements

### Requirement: Evidence-Based P7 Integration Readiness

P7 apply readiness MUST require an approved, separate P7 reconciliation record proving merged P6 evidence, valid manifest/ArtifactRefs, and the invariants below. Native `apply-ready` or artifact presence alone MUST NOT authorize apply. The existing P7 specification remains normative and unchanged.

#### Scenario: Existing artifacts do not bypass reconciliation

- GIVEN P7 artifacts exist and native status says `apply-ready`
- WHEN the P7 reconciliation record is absent or unresolved
- THEN P7 remains blocked and no apply readiness is asserted

#### Scenario: Reconciled P7 may proceed

- GIVEN the P7 record is approved, refs validate, and merged P6 evidence is identified
- WHEN P7 readiness is evaluated
- THEN P7 may proceed under its unchanged normative specification
- AND P8 remains subject to its own gate

### Requirement: P7 Integrated Boundaries

The P7 record MUST validate both paths, `P6 → P7 → P8 → Change E` and `A → B/C → D → Change E`, and state no Change A dependency. It MUST preserve role ownership, distinct project/plan/slice/assignment/jornada/session and host identities, separate `binding_epoch`, Main-owned `host_epoch`, controller-local `generation`, and assignment-bound ephemeral worktrees. P7 MUST NOT create, retire, or recycle worktrees.

#### Scenario: Boundary mismatch fails closed

- GIVEN evidence has a missing ID, conflated epoch, unauthorized base SHA, or out-of-container worktree
- WHEN the P7 record is validated
- THEN the record is not approvable and P7 remains blocked

### Requirement: Historical P6 Evidence Is Preserved

M0 MUST refresh current roadmap status and provenance without rewriting historical P6 `apply-progress.md`. The P7 record MUST cite current authoritative evidence separately from that historical record.

#### Scenario: Roadmap refresh does not rewrite history

- GIVEN stale historical counts and newer merged evidence
- WHEN M0 reconciles P7 inputs
- THEN the roadmap cites the newer evidence
- AND historical P6 apply progress remains byte-for-byte unchanged
