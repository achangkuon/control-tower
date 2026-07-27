# Delta for P8 Reconciliation

## ADDED Requirements

### Requirement: Evidence-Based P8 Readiness After Integrated P7

P8 apply readiness MUST require an approved, separate P8 reconciliation record and evidence that P7 is reconciled and integrated. Native artifact presence or `apply-ready` MUST NOT bypass either gate. The existing P8 specification remains normative and unchanged.

#### Scenario: P8 waits for integrated P7

- GIVEN P8 artifacts exist but P7 evidence is absent, unresolved, or not integrated
- WHEN P8 readiness is evaluated
- THEN P8 remains blocked regardless of native status

#### Scenario: Both reconciliation gates pass

- GIVEN approved P7 evidence, an approved P8 record, and valid shared refs
- WHEN P8 readiness is evaluated
- THEN P8 may proceed under its unchanged normative specification

### Requirement: P8 Shares the Integrated DAG and Boundaries

The P8 record MUST validate `P6 → P7 → P8 → Change E` and `A → B/C → D → Change E`, with no Change A dependency. It MUST preserve ArtifactRef/manifest validity, role authority, distinct project/plan/slice/assignment/jornada/session and host identities, separate `binding_epoch`, Main-owned `host_epoch`, controller-local `generation`, and assignment-bound ephemeral worktrees. P8 MUST NOT assume launcher, failover, or worktree authority owned by Change E or Workspace Manager.

#### Scenario: P8 record rejects boundary drift

- GIVEN integrated P7 evidence has an invalid digest, identity, epoch, branch, or worktree boundary
- WHEN the P8 record is validated
- THEN it is not approvable and P8 remains blocked

### Requirement: Reconciliation Records Are Independent

P7 and P8 MUST have separate reconciliation records with separate evidence and approval. Neither record MAY replace, rewrite, or approve the other; the P8 record MUST reference P7 evidence without absorbing its historical or normative content.

#### Scenario: One record cannot satisfy both gates

- GIVEN only an approved P7 reconciliation record
- WHEN P8 readiness is evaluated
- THEN P8 remains blocked until its own record is approved
