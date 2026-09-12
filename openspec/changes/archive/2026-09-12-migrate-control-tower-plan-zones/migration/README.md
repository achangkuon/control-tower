# Dormant legacy migration inventory

This directory contains **inactive preparation evidence** for the Control Tower plan migration. It is not the live planning contract. Legacy planning sources remain authoritative until the separately proven atomic activation introduces both canonical paths.

## Frozen source

- Source commit: `43130ad40af06f3ed05671000719217bee74f0a5`
- Role: immutable clean integrated base before C01
- Git-object rule: all source paths, modes, blobs, and Session headings are read from this commit, never from mutable worktree files.
- Canonical exclusion: `openspec/plan.yaml` and `openspec/ROADMAP.md` must remain absent before activation.

## Inventory contract

`source-inventory.yaml` records:

- 31 source blobs with exact repository path, mode, and blob OID;
- an explicit six-level precedence classification for every source;
- exactly 72 actual Markdown Session headings discovered across Plans 0–12;
- normalized `S`-prefixed Session IDs plus immutable source path, blob, line, and complete heading identity.

Tables, prose references, Mermaid nodes, queue entries, percentages, and unenumerated responsibilities are not Session rows. Plan 0 and Plan 6 contain no actual Session heading and therefore contribute no ledger row.

## Authority precedence

The approved migration proposal/spec/design governs migration scope. `agent-workflows/ASIGNACION-24-SESIONES.md` is the later approved authority for the 24 open assignments, `S100`–`S108`, and `S7.1`. It supersedes the stale unchecked “Decidir cómo se reasignan las Sesiones a zonas” item in `agent-workflows/PLANO-CONTROL-TOWER.md`; that item is retained only as comparison/archive evidence and does not reopen the assignment decision.

Later scoped maintainer decisions apply next. Immutable Git objects control repository facts. An owning legacy `STATUS.md` controls its Session contract when no higher authority supersedes it. Legacy indexes, manifests, release prose, percentages, and narrative are comparison/archive inputs only. Any equal-precedence contradiction blocks activation.

## Verification boundary

C02 changes only this README and `source-inventory.yaml`. Rollback is removal or revert of C02 alone; no legacy source is edited. The complete candidate is staged only after source-object, duplicate/omission, canonical-path absence, diff-integrity, and authored-line checks pass.

## Current Plan 9 supplement

The frozen 72-row corpus remains preserved. A scoped later authority adds current S9.9/S9.10 truth from `master@e6b7e673f671e6bba30f9a600bf0333a1cd90af2`, yielding 73 imports; its Plan 9 blob is `c404406554b55c3345aabb68670fd6b161bf7771` (`4082b1ed8627e2deb52482257f0c6f4968f4589118031e1187c4f326af4afa8f`).
