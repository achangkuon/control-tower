# Permanent seats reconciled and temporary seats retired

The maintainer authorized destructive reconciliation in Engram decision 10031. With the Tower OFF and canonical Main at `38cb3daaec230b38642b3849ec0bc1525603d27b`, semantic audits found no resumable implementation bytes: three obsolete permanent-seat candidates were discarded, four temporary worktrees and their local branches were retired, and no parking commit or delivery/progress credit was created.

## Outcome

| Seat | Before | Disposition | After |
|---|---|---|---|
| `implementer-1` | `feat/s9.4-validated-pure-route-supervisor@a7d724dc72e566d061565f69bc1526d34b73dff0`, dirty | Candidate abandoned; untracked files and obsolete branch deleted | `idle/implementer-1@38cb3daaec230b38642b3849ec0bc1525603d27b`, clean |
| `implementer-2` | `feat/s5.14-configurable-planning-depth@3ffc8a844fea2811e73ae30cbf6e3419ad79b906`, dirty `AGENTS.md` draft | Candidate and draft discarded; obsolete branch deleted | `feat/s1.20-tower-mode-probe@38cb3daaec230b38642b3849ec0bc1525603d27b`, clean; no `S1.20` progress |
| `implementer-3` | `feat/s9.4-pi-supervisor-binding@8a12144b3c421ff7467e691dc6ff342147235680`, dirty tracked and untracked OpenSpec files | Candidate abandoned; dirty files and obsolete branch deleted | `idle/implementer-3@38cb3daaec230b38642b3849ec0bc1525603d27b`, clean |
| `diagnostic-launch-timeout` | Temporary, failed untracked candidate | Worktree and local branch removed; pane `p3` closed | Removed |
| `plan-12` | Temporary; clean tip was an ancestor, 0 unique commits | Worktree and local branch removed | Removed |
| `s12-8-pi` | Temporary; clean tip was an ancestor, 0 unique commits | Worktree and local branch removed; pane `p5` closed | Removed |
| `s9-6-pi` | Temporary, failed untracked candidate | Worktree and local branch removed; pane `p4` closed | Removed |

## Authority and safety boundary

| Evidence | Result |
|---|---|
| Authority | Explicit maintainer authorization; Engram decision 10031; frozen Support evidence |
| Runtime state | Tower OFF before and after reconciliation |
| Canonical base | `master@38cb3daaec230b38642b3849ec0bc1525603d27b` |
| Semantic gate | Each dirty permanent candidate was audited before deletion; none contained resumable implementation bytes |
| Parking | No parking commits: preserving unusable bytes as resumable work would have been false |
| Product credit | Zero delivery credit and zero progress credit |
| Validation boundary | Documentation reconciliation only; no runtime, DB, migration, code, tests, remote, or radiography mutation |

## Candidate evidence and disposition

| Candidate | Frozen evidence | Authored size | Finding |
|---|---|---:|---|
| `implementer-1` / `S9.4` | unique patch `4d6a311391de1ade3939291c76bcfe23278b30fc2405fe05280aee4ebda1a53d`; dirty runtime `012d6aee86644649d93e759469bc44720dfaed2a616a8a1f6bfbf17a4c913406`; dirty test `64e9b14c7eafd3e92b304819ab89016b845d9da7c93fdca13108d2ad5c5998de` | 296 dirty; 470 total before deletion | No supervisor bytes reusable |
| `implementer-2` / `S5.14` | committed patch `06a27b9ea05960e55b2afedb740cc85dc798d46aeb66f61dcca150346e78c8b5`; dirty patch `1f81e5c78a4b3ce9fc16117fb11c765bf639c5fefd692dee17d80efb70afda72` | 8 dirty; 94 total | Contract insight survives; old bytes and cherry-pick do not |
| `implementer-3` / `S9.4` | committed patch `3fc3f7f1df38f36f5d66b5cc289cea578230affd54bd10b8819b31f3f97016c0`; dirty tracked patch `fef73566b07bfa4b8c725fbf78e581a268139b8fdd04200029470990824e9277` | 913 dirty; 1,429 branch plus dirty | No supervisor/OpenSpec bytes reusable |
| `diagnostic-launch-timeout` | runtime `fd0e072ca0e4cf29bee0c906533722218e690e169dbcf0717943f790056eefc5`; test `eacfd6fdb6be6901aadaa61a69c18791fa9a85e1d7f28ba6b52112532aeeb8f8` | 342 untracked authored lines removed | Failed candidate; deletion explicitly authorized |
| `s9-6-pi` | runtime `1c313829d7de3a7cb304d5c8bd9809a10687fc3fe456b480194dc755156571fa`; test `e0d936f5b3f30419040a9ccc592a0dbca5b312b84834564ce478df04e8c9246e` | 397 untracked authored lines removed | Failed candidate; deletion explicitly authorized |

The deleted `implementer-3` blobs were frozen separately:

| Path | SHA-256 |
|---|---|
| `workspace/pi-binding.mjs` | `a0fd7d36af941772993ab8dde39e2f1c171afe930e8770528c4c1343ec0b85dc` |
| `test/workspace/pi-binding.test.mjs` | `932edff25f9d0ddafcc327a6845b8b851f6c555789355afa16c0d407928ba36a` |
| `workspace/pi-supervisor.mjs` | `220a62376c128ad4db872f2196fdb6b56c946519416d0805d8ca38715482504c` |
| `test/workspace/pi-supervisor.test.mjs` | `c8b18c3c42533ef763eaf6b307b99c9d105286a6cfb9028c2efac431a6f4e26c` |
| `openspec/changes/s9-4-pi-supervisor-binding/apply-progress.md` | `f87af06da077c242233b223c59aef9e6adf42805235f90f830185dc9ca4e3789` |
| `openspec/changes/s9-4-pi-supervisor-binding/design.md` | `501246f3ebab74ff5aebae6ac238bab9d05047434af8f5a1b6d439b1f7645596` |
| `openspec/changes/s9-4-pi-supervisor-binding/proposal.md` | `fd6af43e16ce98dd40da47f47305d88e2ebcfe9a66ace8e65455825574437771` |
| `openspec/changes/s9-4-pi-supervisor-binding/specs/pi-binding/spec.md` | `aab382e00f6077d34d6f2f641731f8b57170ef1ac9cbe2ab0f021e0f9ea04de7` |
| `openspec/changes/s9-4-pi-supervisor-binding/specs/pi-supervisor/spec.md` | `ec41d2a7b88ca99196abbbc277b1fb9802fde7fe095a8f0310983b0f095043a9` |
| `openspec/changes/s9-4-pi-supervisor-binding/tasks.md` | `facd9e052aa3f08f8f64936054ef25801a983a1270fe6bd1309796c15e5b500d` |

## Reusable conclusions

1. **Future `S4.12` review:** after awaited acquisition yields a cleanup-bearing resource, retain that exact resource before fencing. Stale or invalid paths consume it, or quarantine uncertainty. The obsolete `S9.4` supervisor bytes are not a source for reuse.
2. **Fresh `S5.14` work:** opaque, non-empty, fail-closed `prepare_through` remains valid. The discarded continuation incorrectly accepted caller-controlled, self-consistent values without binding them to resolved policy. Resume by resolving the `Área` and configuration source, then bind resolved policy before callbacks. Do not cherry-pick the retired candidate.

## Executed reconciliation

At the semantic level, the authorized operation:

1. captured Support's patch, file-hash, authored-count, ancestry, and semantic-audit evidence;
2. deleted the dirty candidate files only after the maintainer authorized their irreversible loss;
3. moved the three permanent worktrees to clean current-base branches;
4. deleted obsolete branches `feat/s9.4-validated-pure-route-supervisor`, `feat/s5.14-configurable-planning-depth`, and `feat/s9.4-pi-supervisor-binding`;
5. removed temporary worktrees and corresponding local branches for `diagnostic-launch-timeout`, `plan-12`, `s12-8-pi`, and `s9-6-pi`;
6. closed temporary panes `p3`, `p4`, and `p5`, leaving Main `p1` and Support `p2`;
7. created no parking commit, ran no test, and changed no remote ref.

## Irreversible loss

The authorized deletion permanently removed 342 authored untracked lines from `diagnostic-launch-timeout` and 397 from `s9-6-pi`. Dirty permanent-seat candidates were also removed after their hashes and counts were frozen above. The useful result is semantic only: the two reusable conclusions are preserved, while zero discarded bytes receive implementation or delivery credit.

## Final topology

Five registered worktrees remain:

| Worktree | Branch and HEAD |
|---|---|
| `Main` | `master@38cb3daaec230b38642b3849ec0bc1525603d27b` |
| `implementer-1` | `idle/implementer-1@38cb3daaec230b38642b3849ec0bc1525603d27b` |
| `implementer-2` | `feat/s1.20-tower-mode-probe@38cb3daaec230b38642b3849ec0bc1525603d27b` |
| `implementer-3` | `idle/implementer-3@38cb3daaec230b38642b3849ec0bc1525603d27b` |
| `support-agent` | `support/read-only-20260830@086e5169d79c71361dab59fb6be0a24945892eff` |

Main `p1` and Support `p2` are the only panes. Permanent implementers remain routine capacity; new temporary seats are exceptional and must have an explicit need and disposition. This maintenance does not change `S9.4` completion, `S5.14` readiness, any percentage, or the execution queue.
