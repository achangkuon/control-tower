# S9.10 Seat Materialization Design

## Status and authority

This design enters SDD at `design` through the approved `design-tasks` route. No proposal artifact exists for this change; the approved S9.10 Session contract is the phase input instead.

Binding authorities:

- `openspec/plans/plan-9/STATUS.md`, S9.10: materialize a clean permanent seat from an exact approved non-master `base_sha`; keep `asignar` and `jornada.sh --reciclar` unchanged.
- `openspec/plans/decision-register.md`, Decision 108: S9.10 is a separate prerequisite of S101, outside the completed S9.9 bootstrap.
- Engram 10522: the human-approved public contract is a separate full-binding `materializar` operation.
- Engram 10523 and 6158: automatic hybrid SDD, Strict TDD with `bun test`, direct push without a PR, Tower OFF, no Herdr, and one independently revertible executable commit of at most 400 authored lines.

## Architecture decision

Extend the existing seat boundary rather than create another module:

```text
bin/torre
  -> hosts/seat-cli.mjs
       -> workspace/slots.mjs
            -> injected Git argv port
```

`bin/torre` already forwards every `torre asiento ...` invocation to `hosts/seat-cli.mjs`; it needs no executable change. `hosts/seat-cli.mjs` owns command parsing and public JSON/error rendering. `workspace/slots.mjs` already owns permanent-seat assignment and Git-derived availability, and is already part of the installed runtime payload. It gains materialization while `assign()` remains read-only.

No new source module is justified. A new module would also require generated runtime-payload and payload-test changes without introducing a separate owner. `jornada.sh`, Herdr topology, Tower state, runtime DB, and network delivery remain outside the call graph.

## Public contract

### CLI

```text
torre asiento materializar \
  --seat <implementer-1|implementer-2|implementer-3> \
  --role <planning|implementation> \
  --lane <planning|apply> \
  --branch <type>/s<session>-<slug> \
  --base-sha <exact-40-lowercase-hex-commit> \
  --confirmar
```

Rules:

1. All six flags are mandatory. `--confirmar` is a standalone boolean flag, may appear in any position, and must appear exactly once.
2. Unknown flags, duplicate flags, positional values, a value after `--confirmar`, malformed pairs, or missing values are rejected.
3. Confirmation is scoped to the exact values in that process invocation. There is no prompt, stdin token, stored consent, dry-run implication, or reusable confirmation.
4. Existing `asignar` parsing and behavior are not changed. The strict parser is command-specific to `materializar`.
5. The command is available while Tower is OFF and never reads `ACTIVE` or calls Herdr.

### Module API

`createSlotPool({ git, trunk }).materialize(mainPath, binding)` accepts exactly:

```js
{
  seat,
  role,
  lane,
  branch,
  base_sha,
  confirmed: true,
}
```

The method is synchronous, matching the current Git port. It returns only after all postconditions are proven.

### Success output

The CLI writes one JSON object to stdout and exits zero:

```json
{
  "operation": "materializar",
  "binding": {
    "seat": "implementer-3",
    "path": "/absolute/Worktrees/implementer-3",
    "role": "implementation",
    "lane": "apply",
    "branch": "feat/s9.10-seat-materialization",
    "base_sha": "<40 hex>"
  },
  "before": { "branch": "idle/implementer-3", "head": "<40 hex>", "clean": true },
  "after": { "branch": "feat/s9.10-seat-materialization", "head": "<base_sha>", "clean": true },
  "preserved_ref": { "branch": "idle/implementer-3", "head": "<same before head>" }
}
```

The output does not claim persisted assignment state. Role and lane are validated binding inputs, not stored seat properties.

### Failure output

`runSeatCli` throws an error with one of these codes. The executable writes exactly `<code>: <message>` plus a newline to stderr, writes no success JSON, and exits nonzero.

| Code | Meaning |
|---|---|
| `CT_SEAT_REJECTED` | Invalid/unknown/duplicate/missing CLI input, unsupported seat, invalid role/lane/branch/SHA shape, or absent confirmation. |
| `CT_SEAT_OCCUPIED` | The permanent seat is absent, detached, dirty, or has commits not integrated into trunk under the existing pool rule. |
| `CT_SEAT_BASE_INVALID` | `base_sha` does not resolve exactly to that commit or is contained by the current `master` ref. |
| `CT_SEAT_BRANCH_EXISTS` | The requested local branch already exists, including an attempted replay. |
| `CT_SEAT_DRIFT` | A precondition differs between the first and immediately pre-mutation snapshots. |
| `CT_SEAT_MUTATION_FAILED` | Git rejected branch creation/switch and the original state was proven or restored. |
| `CT_SEAT_POSTCONDITION_FAILED` | Git returned success but the required final state does not match; safe rollback restored the seat. |
| `CT_SEAT_ROLLBACK_FAILED` | Exact restoration could not be proven; diagnostic state is preserved for manual recovery. |

Errors produced after mutation carry internal structured details for tests and diagnosis: `before`, `observed`, and `rollback` (`not-required`, `restored`, or `preserved-partial`). The CLI message names the seat, old branch, requested branch, and rollback state without printing arbitrary Git output.

## Pure validation boundary

Extract a side-effect-free binding validator inside `workspace/slots.mjs` and reuse it from `assign()` and `materialize()`:

- role and lane use the existing accepted enums, without introducing a new role/lane pairing rule;
- branch uses the existing `SEAT_BRANCH_PATTERN`;
- `base_sha` remains exactly 40 lowercase hexadecimal characters;
- an optional seat remains valid for `assign()`, while `materialize()` requires a named permanent seat;
- `materialize()` additionally requires the closed input shape and `confirmed === true`.

All shape and confirmation checks complete before the first Git call. Reusing the validator may refactor `assign()` internally but must preserve its return value, Git observations, errors, and zero-mutation semantics.

## Git port and observations

Keep the current injected argv-only port: `git(args) -> stdout or throw`. Production continues to use `spawnSync("git", args)`; tests use `test/helpers/git.mjs`, which fixes `cwd`, removes Git routing environment variables, and avoids shell interpolation.

Use read commands that return empty output for negative facts instead of depending on an expected nonzero exit:

- `git worktree list --porcelain` for canonical seat path, branch, and worktree HEAD;
- `git -C <seat> status --porcelain` for cleanliness;
- `git -C <seat> cherry master <old-branch>` for the existing free-seat rule;
- `git -C <seat> rev-parse --verify <oid>^{commit}` for exact commit resolution;
- `git for-each-ref --format=%(objectname) refs/heads/<branch>` for local branch existence;
- `git for-each-ref --contains=<base_sha> --format=%(refname) refs/heads/master` to reject a base reachable from trunk.

“Non-master” therefore has a falsifiable graph meaning: current `refs/heads/master` must not contain the approved commit. Merely differing from the current trunk tip is insufficient.

A seat snapshot contains: seat name/path, attached branch, worktree HEAD, old branch ref OID, porcelain status, `git cherry` output, resolved trunk OID, resolved base OID, and requested-branch ref state. The worktree parser retains `HEAD` internally but the existing `list()` output remains unchanged.

## Data flow and mutation sequence

1. Parse the strict `materializar` CLI shape and confirmation without Git.
2. Purely validate the complete binding.
3. Capture snapshot A. Require the named permanent seat to exist, be attached, have empty status, have empty `git cherry master <old-branch>`, and have worktree HEAD equal to the old branch ref.
4. Resolve `base_sha^{commit}` and require byte-for-byte equality with the supplied SHA. Reject a base contained by `master`.
5. Require `refs/heads/<requested-branch>` to be absent.
6. Capture snapshot B immediately before mutation. Compare every precondition field with snapshot A. Any difference is `CT_SEAT_DRIFT` and no switch is attempted.
7. Execute exactly one forward mutation: `git -C <seat-path> switch --create <requested-branch> --no-track <base_sha>`.
8. Capture the post-snapshot and require all of the following:
   - the selected worktree is attached to the requested branch;
   - worktree HEAD and the requested branch ref both equal the exact `base_sha`;
   - status is empty;
   - the displaced branch ref still equals its pre-snapshot OID;
   - every other worktree entry is unchanged;
   - the trunk/base facts used by the precondition have not drifted.
9. Return the success object only after all checks pass.

No reset, clean, stash, force-switch, checkout of paths, branch overwrite, old-ref deletion, fetch, push, network operation, persistence, or database operation is permitted.

## Rollback and partial failure

The displaced branch is recoverable before mutation because its name and exact ref OID are captured and verified. It is never deleted or rewritten.

On a thrown switch or failed postcondition:

1. Observe the seat and both refs without assuming which part of `git switch --create` completed.
2. If the original branch/HEAD/clean state is already exact, record `not-required`.
3. Otherwise, switch back to the displaced branch only when the worktree is clean and the displaced ref still equals its captured OID.
4. After exact restoration, delete the newly created requested ref only if it was absent in both pre-snapshots, still equals `base_sha`, and no worktree uses it. Verify absence after deletion.
5. If any safety proof fails, do not reset, clean, stash, delete, or force anything. Preserve both refs and all working-tree bytes, return `CT_SEAT_ROLLBACK_FAILED`, and expose the observed state for manual disposition.

This policy prefers a visible extra branch or a seat left on the requested branch over losing work. “Rollback succeeded” is reported only when branch, HEAD, cleanliness, displaced ref, and requested-ref absence all match the pre-state.

## Idempotency and replay

Materialization is intentionally at-most-once per requested branch. A completed call leaves that branch present, so every replay fails with `CT_SEAT_BRANCH_EXISTS`, even when seat and SHA match. The system cannot prove that replayed role/lane values equal a prior invocation without adding forbidden persistence. Operators must submit a new approved branch name or explicitly dispose the existing ref outside this operation.

Failures before mutation are side-effect free. Failures after mutation either prove exact rollback or preserve all uncertain state and fail closed; they never report convergence.

## Exact implementation and test Area

Executable work is limited to these four paths:

1. `workspace/slots.mjs` — pure binding validation, snapshots, materialization, postconditions, and bounded rollback.
2. `hosts/seat-cli.mjs` — new command, strict command-specific parser, CLI-to-module mapping, usage, and public result/error handling.
3. `test/workspace/slots.test.mjs` — unit command-order/failure matrix plus disposable real-Git harness.
4. `test/hosts/seat-cli.test.mjs` — public syntax, confirmation, output, error precedence, no-Herdr behavior, and unchanged `asignar` behavior.

Explicitly unchanged: `bin/torre` (already a generic seat dispatcher), `jornada.sh`, `workspace/seat-inventory.mjs`, Herdr files, runtime payload manifests/tests, Tower/runtime/DB files, and planning records. Because both modified source files are already in the runtime payload, no payload membership change is needed.

## Strict TDD test map

### RED: public and pure boundary

- Accept only the exact full-binding CLI with standalone `--confirmar`.
- Reject every missing field, unknown/duplicate flag, malformed pair, invalid enum/branch/SHA, unsupported seat, and missing/valued confirmation before Git mutation.
- Freeze the existing `asignar` expectations and assert it emits no `switch`, `checkout`, `branch`, `reset`, or ref update.
- Assert `materializar` never calls Herdr.

### RED: Git safety matrix

Using deterministic injected ports, require failures for absent, detached, dirty, and unmerged/occupied seats; unresolved/nonexact/trunk-contained base; existing requested branch; pre-snapshot drift; switch failure; wrong post branch/HEAD/ref; dirty post-state; displaced-ref drift; and other-worktree drift. Every case asserts the exact code, command boundary, and absence of destructive Git argv.

### RED: disposable real-Git harness

Build a temporary repository with `master`, three permanent linked worktrees, clean idle branches, and a side-branch commit not reachable from `master`. Use `test/helpers/git.mjs` so Git routing variables are isolated.

The harness must prove:

- success creates the requested branch at the exact side-branch commit, leaves the seat attached and clean, and preserves the displaced branch/ref;
- dirty and unmerged/occupied seats fail without changing branch or HEAD;
- a pre-existing target branch fails without mutation;
- a decorated real Git port that dirties the seat between snapshots produces `CT_SEAT_DRIFT` before switch;
- a decorated real Git port that creates a commit immediately after switch produces a postcondition failure, preserves that unexpected commit/ref, preserves the displaced ref, and performs no reset/clean/stash;
- a safe postcondition failure restores the old branch and removes only the exact operation-created unchanged target ref.

### GREEN and REFACTOR

Implement only enough behavior to satisfy the focused RED. Then consolidate repeated observations without weakening the two-snapshot or rollback proofs. Run the focused command first and the full `bun test` suite on the exact final bytes. Record exact pass/fail counts, authored-line count, runtime harness result, and rollback boundary.

## Workload and delivery forecast

Expected authored executable lines (additions plus deletions):

| Path group | Forecast |
|---|---:|
| `workspace/slots.mjs` | 95–125 |
| `hosts/seat-cli.mjs` | 25–40 |
| `test/workspace/slots.test.mjs` | 150–185 |
| `test/hosts/seat-cli.test.mjs` | 35–50 |
| **Total** | **305–400** |

This is one cohesive behavior and one independently revertible direct-push commit with tests. The 400-line maximum is hard: implementation must measure authored additions plus deletions before candidate presentation and stop for a new human scope/delivery decision if the honest total exceeds 400. Tests may not be removed or compressed to manufacture compliance.

The design artifact may be committed separately as a documentation-only commit of at most 400 lines. No PR, Herdr, Tower activation, runtime/DB mutation, or network delivery is part of this phase. S101 remains blocked until S9.10 is implemented, verified, delivered, and archived.
