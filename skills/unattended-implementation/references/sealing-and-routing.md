# Sealing and Routing

## Authority Map

| Concern | Sole authority | Unattended mode |
|---|---|---|
| Fact discovery and brief transport | `agente-soporte` | Normalize facts; transport only an already approved sealed contract. Never seal. |
| Readiness and sealing | `unattended-implementation` | Reject or seal one immutable Sesión contract. |
| Chain semantics | `chained-pr` | Planning-only; resolve strategy and exact base/target map. Never create branches or PRs. |
| Commit boundary | `work-unit-commits` | Freeze-only; describe a future commit boundary without committing. |
| Implementation | `sdd-apply` | Consume the exact Sesión/task and base/target mapping. Never select another Sesión or redefine the chain. |
| Runtime state | Active project's registered Tower authority | Supervision-only; stop at `READY` or `BLOCKED`; no delivery token. |

Load only the authorities needed for the current route. A child must return facts to the coordinator rather than invoke the coordinator, preventing cycles.

## Seal Gate

Validate the JSON schema, then reject as `NOT_READY` if any semantic predicate fails:

1. Repository identity, root, assigned worktree, branch, base ref, and 40-character base SHA are exact; every governing artifact has a SHA-256 digest.
2. Exactly one Sesión and explicit task IDs are authorized. `sesion_id` is positional (`S2.3`) and carries no owner initials. `continuation` is `none`; no next-Sesión inference or unlisted task is permitted.
3. Read, edit, command, network, process, and cleanup allowlists are exhaustive. Path and effect denylists explicitly prohibit commit, amend, rebase, tag, push, PR create/update, merge, release, publication, deploy, DB mutation, and global closure.
4. Exclusive ownership covers all edited paths and explicitly classifies package manifests, lockfiles, generated outputs, SDD progress files, shared resources, and known conflicts. Shared ownership or an unresolved conflict fails sealing.
5. Every possible output is classified as authored tracked, generated tracked, ephemeral untracked, or forbidden generated. `node_modules`, `.codegraph`, and caches each have a declared disposition and paths. Ignore and cleanup policies are concrete and compatible with path permissions.
6. Tower mode is exactly `active-supervision`, is locked for the contract lifetime, and forbids `git-delivery`. Every invocation requires the live Tower ACTIVE; absent or inactive supervision is `NOT_READY` before dispatch or `BLOCKED` after dispatch. Never toggle Tower.
7. Chain strategy is resolved, including `single-pr`; position/total, exact Sesión branch/base/target map, at-most-400 authored line budget, and rollback boundary agree. Forecast flags, delivery strategy, and chain map cannot contradict one another.
8. Baseline and candidate commands are exact and identical where comparison is required. Validation method is `separate-regular-clone`. The sealer MUST canonicalize all four real paths and Git common-dir identities; require source fields to equal the canonical live repository root/common dir, then enforce `clone_root_realpath != source_root_realpath` and `clone_common_dir_realpath != source_common_dir_realpath` while repository identity matches. JSON Schema requires the four fields but cannot express these sibling equalities/inequalities. Reject symlink aliases, path aliases resolving to either source identity, and linked worktrees; they share the live Git common dir and `.git/control-tower/ACTIVE`.
9. The sealed candidate recipe lists each unique expected tracked path, mode, and class without fabricated bytes or hashes. The post-run observed candidate must use the same unique paths and modes and add byte counts, per-file SHA-256, deterministic tree digest, and command evidence. Sesión IDs in the base/target map are unique and the assigned Sesión occurs exactly once.
10. Before final required verification, allow at most one same-input transient retry and two implementation correction cycles, all within sealed scope; authorization/scope retries remain zero. Run final required verification once. Its first failure is terminal `BLOCKED`, with zero retries or corrections afterward. `expires_at` is explicit and later than sealing.

Reject literal or semantic placeholders including `pending`, `TBD`, `TODO`, angle-bracket templates, unknowns, alternatives, or prose that delegates a choice to runtime. Empty arrays are valid only where they unambiguously mean no authorized item; required commands, tasks, artifacts, candidate-recipe entries, and denied effects cannot be empty. Require every structural prohibition boolean to be `true`.

## Immutable Seal

Canonicalize the pre-dispatch contract with `contract_digest` and `runtime_result` omitted, compute SHA-256, insert the digest, and obtain attended approval for that exact digest. Runtime appends `runtime_result` without changing the sealed input. Any change to recipe modes/paths, commands, artifacts, base, ownership, policy, expiry, or mapping creates a new contract and requires renewed approval. Support transports the complete contract or a lossless locator plus digest; summaries are not execution authority.

## Runtime Route

1. Verify current time, repository/worktree/branch/base, artifact digests, contract digest, Tower mode, validation isolation, and ownership before any edit. Do not reserve or require a READY slot yet.
2. On mismatch, expiry, occupied ownership, or unavailable supervision, preserve existing state and evidence and terminate early with `state: BLOCKED` and `final_verification: {attempts: 0, status: not_run}` without retrying authorization or scope.
3. Invoke `sdd-apply` for only the sealed Sesión/tasks. Permit only enumerated reads, edits, commands, network/process effects, generated outputs, and cleanup.
4. Before final required verification only, use one same-input retry for a classified transient and at most two implementation correction cycles within sealed scope. Exhaustion terminates `BLOCKED`.
5. Materialize the observed candidate against the recipe and record unique paths, modes, sizes, file hashes, tree digest, and evidence. Inspect the sole READY slot before final required verification. If occupied, preserve the exact completed candidate/evidence and terminate `BLOCKED` with `final_verification: {attempts: 0, status: not_run}`; do not displace another unit.
6. If the slot is free, run final required verification exactly once. On its first failure, preserve evidence and terminate with `state: BLOCKED` and `final_verification: {attempts: 1, status: failed}`; no retry, correction, or continuation follows. On pass, record `{attempts: 1, status: passed}`, stage the exact observed candidate, append READY evidence, set `READY`, and stop.

No runtime success state other than `READY` exists. No failure state other than `BLOCKED` exists after dispatch. `NOT_READY` is pre-dispatch only. Attended delivery authorization is a separate future process and must reverify the sealed candidate; this route never requests, receives, acquires, or transfers `git-delivery`.

## Required Evidence

Return contract ID/digest and expiry; exact repository/worktree/branch/base; Sesión/task IDs; Tower mode and slot observation; baseline/candidate environment and command evidence; retry counters; required `final_verification`; staged paths/modes/sizes/hashes/tree digest when observed; terminal state; and blockers. Preserve all available evidence on `BLOCKED`.
