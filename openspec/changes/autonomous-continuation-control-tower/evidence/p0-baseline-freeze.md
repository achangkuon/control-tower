# P0 Baseline Freeze Evidence

Generated on 2026-07-22 from the local Git object database. Git commit/tree IDs
freeze file names, modes, and exact blob bytes; the deterministic `git archive`
digest provides an independently reproducible byte-stream check.

## Tool versions

- Git: `git version 2.54.0`
- Bun: `1.3.14`

## Frozen snapshots

| Label | Requested ref | Commit | Tree | Tracked files | Archive bytes | SHA-256 of `git archive --format=tar <commit>` |
|---|---|---|---|---:|---:|---|
| Historical baseline | `f583df7` | `f583df7187252f92d4a63c06e4fa6f160d21e9d9` | `f3cd37a342543a557a2d251a640f553dcfa40d06` | 12 | 102400 | `d2d522bf458c06af8098c47e431c3d4c59969c8dceff331a420fc40ae10764e5` |
| Plan A HEAD | `71ab571` | `71ab5714dc967942fb202576a75fa93b75f45c1b` | `02e38b90318e5fa06d0baa4bd912654e77040e3f` | 12 | 102400 | `98a80cddf8507deca8fc199d8c8be6d6600481ac0a7cc6a7f11c4a84b005b0f2` |

## Repository preservation evidence

- Starting branch: `master` at `71ab5714dc967942fb202576a75fa93b75f45c1b`.
- P0 branch: `feat/control-tower/autonomous-continuation`.
- Starting status preserved these untracked paths: `.atl/`,
  `NEXT-SESSION-off-enforcement.md`, and `openspec/`.
- No tracked production behavior file was edited by P0.

## Reproduction

```sh
git rev-parse <ref>^{commit} <ref>^{tree}
git ls-tree -r --name-only <commit>
git archive --format=tar <commit> | sha256sum
```
