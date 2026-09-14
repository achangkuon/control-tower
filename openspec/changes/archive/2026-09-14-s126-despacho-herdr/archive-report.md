# Archive Report: s126-despacho-herdr

**Status:** ARCHIVED on 2026-09-14.

| Field | Value |
|---|---|
| Sesión | S126 (Zona `metodo`, route `direct`) |
| Spec delta | None by design: the `direct` route has no proposal or change-local specs (intentional no-op). |
| Native dispatcher | `gentle-ai sdd-status` reports archive blocked for missing proposal/specs; archived under the plan canon. |
| Delivery | `f9f4ac7` (M126.1), `b93619a` (M126.2), `d2a56ce` (M126.3, `entrega.commit`), `01f7bc4` SDD artifacts, `9f82c71` plan record; pushed to master. |
| Review | RDD consent declined by the maintainer for each Módulo candidate. |
| SDD attempt | Settled `complete` before the reports were written; no reset needed. |

## Final state after verify (supersedes the verify snapshot)

- Criterion 1 is now **PASS**: `tools/install.py` installed `chanks-3-despacho-herdr` and `references/retiro.md`
  identically in all four runtime roots, and the routing block in all four instruction files (`--check`: OK).
- Criterion 14 remains **PENDING**: a live Pi session with the Torre off must be asked to dispatch approved
  Sesiones. The routing block now declares that dispatch an explicit Herdr request; the maintainer-owned
  paragraph in the Pi copy of the `herdr` skill is adjusted outside the repository.
- Finding kept open: `git branch -d` refuses a branch integrated only by cherry-pick or rebase; `retiro.md`
  keeps and reports that branch instead of forcing.
- Worktree `Worktrees/s126` is retired after this archive is pushed.
