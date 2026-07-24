# Session Handoff: VPS Observation Dashboard Skeleton

## Current state

Work Units 1-4 are complete and merged into `master`. Work Units 5 and 6 are complete locally as separate reviewable slices, and integrated verification passes. Delivery of WU5/WU6 and archive remain pending separate maintainer decisions.

The publication checkpoint is complete: PRs [#14](https://github.com/achangkuon/control-tower/pull/14) through [#18](https://github.com/achangkuon/control-tower/pull/18) were merged in stacked-to-main order, issue [#13](https://github.com/achangkuon/control-tower/issues/13) is closed, and remote `master` is `cbe27655e633056569a9ef037fae52fa74205311`.

| Work unit | Outcome | Source slice | Merged PR diff |
|---|---|---:|---:|
| WU1 | Five-field view model and escaped renderer | 373 / 400 | #14 — 240 lines |
| WU2 | Revocable authentication | 400 / 400 | #15 — 312 lines |
| WU3 | Guarded `Bun.serve` HTTP surface and auth non-disclosure | 378 / 400 | #16 — 293 lines |
| WU4 | Replaceable mock source and explicit presentation states | 221 / 400 | #17 — 151 lines |
| OpenSpec docs | Proposal, spec, design, tasks, progress, and handoff | Explicit `size:exception` approved | #18 — 1,373 lines |

## Verification evidence

- Source full suite after WU4: `bun test` — **PASS**, 81 pass, 0 fail, 698 assertions across 8 files.
- WU4 focused source checks:
  - `bun test test/dashboard/server.test.mjs --test-name-pattern 'loading|populated|empty|source|unavailable'` — **PASS**, 4 pass, 0 fail, 48 assertions.
  - `bun test test/dashboard/architecture.test.mjs --test-name-pattern 'fixture|source|public asset'` — **PASS**, 4 pass, 0 fail, 26 assertions.
- WU4 runtime harness: real isolated `Bun.serve` on `127.0.0.1:0`; authenticated shell remained source-free at factory/load `0/0`, authenticated content resolved at `1/1`, and the server stopped without residue.
- Fresh independent WU4 verification passed.
- Final prepared delivery stack before close: `bun test` — **PASS**, 144 pass, 0 fail.
- Integrated dashboard verification: **PASS** — focused suites auth 10/0, view model 4/0, renderer 7/0, server 14/0, architecture 14/0; full suite 157/0 with 1370 assertions.
- WU5: **281/400**, verified Chromium 149 at 320 CSS px with no horizontal overflow across login failure, loading, populated, and empty states.
- WU6: **349/400**, verified deployment examples and future approval-gated smoke/rollback; no real-host action occurred.
- Canonical evidence: `verify-report.md`.

## Merged delivery stack

The four code slices remained at or below 400 changed lines. The OpenSpec documentation slice retained the maintainer-approved `size:exception`. Each child PR was retargeted to `master` only after its parent merged and its focused diff was reverified as clean.

| Order | PR | Merge commit | Result |
|---:|---|---|---|
| 1 | #14 | `9c6f53d437b7dfccead0b7f7d1104f0bb4d641bb` | View model and renderer merged |
| 2 | #15 | `7c36c3d29a43444c55a96996778f53f12a5e99cd` | Authentication merged |
| 3 | #16 | `95b2550cf805fa26590ee2cba50431cc763679ff` | Guarded HTTP surface merged |
| 4 | #17 | `d11d1032200c930ab60330b0689b96f7f677c516` | Source states merged |
| 5 | #18 | `cbe27655e633056569a9ef037fae52fa74205311` | OpenSpec record merged |

Delivery paths:

- Source worktree: `/home/emili/projects/control-tower/Worktrees/dashboard-skeleton`
- Delivery worktree: `/home/emili/projects/control-tower/Worktrees/dashboard-delivery`

## Locked scope and hard boundaries

- Read-only, independently deployable VPS browser dashboard with revocable username/password authentication.
- Mobile-first project-grouped presentation with exactly five data fields: project name, agent name, state, task title, and branch name.
- Populated, loading, authentication-failure, empty, and generic unavailable presentation states.
- Representative mock data remains behind a replaceable source/view-model seam.
- No bot, Telegram, dashboard commands, approvals, mutations, or other write authority.
- No edits or imports involving `core.mjs`, `mcp.mjs`, Control Tower runtime/database paths, or `autonomous-continuation-control-tower` artifacts.
- **No real laptop-to-VPS projection payload, transport, persistence, freshness, continuation behavior, or P4-P6 integration is implemented or implied.**
- No operational metadata beyond the five permitted fields.

## Local-only exclusions

The source worktree's untracked local-only `.gitignore` and `.session-doc.json` remain excluded from delivery. The prior baseline fix `5c95b853008cce82034d6fa2aa18f21882ae506d` remains preserved by `fix/worktree-runtime-boundary`; Tower/autonomous work and unrelated exploration documentation remain excluded.

## Exact next action

Review `verify-report.md`, choose the separate WU5/WU6 delivery and chain strategy, and preserve local-only `.gitignore`/`.session-doc.json`. Do not deploy or archive until that explicit maintainer decision is recorded.
