# Session Handoff: VPS Observation Dashboard Skeleton

## Current state

The dashboard-only child change has completed proposal and specification. No application code, Control Tower runtime, bot, Telegram transport, laptop daemon, or real projection integration was implemented.

Native SDD routing resolves the next phase as `design`.

## Workspace

| Item | Value |
|---|---|
| Change | `vps-observation-dashboard-skeleton` |
| Worktree | `/home/emili/projects/control-tower-Worktrees/dashboard-skeleton` |
| Branch | `feat/dashboard/skeleton` |
| Base | `feat/dashboard/exploration` at `a81f44a` |
| Execution mode | Interactive |
| Artifact store | OpenSpec + Engram |
| PR strategy | Auto-forecast |
| Review budget | 800 changed lines |
| Strict TDD | Enabled; `bun test` when apply/verify begins |

## Locked scope

- Read-only browser dashboard deployable on the VPS.
- Revocable username/password authentication.
- Mobile-first list grouped by project.
- Exactly five displayed data fields: project name, agent name, state, task title, and branch name.
- Populated, loading, authentication-failure, and empty presentation states.
- Mock data behind a replaceable source/view-model seam.
- Dark navy command-center visual direction with cyan/teal accents, restrained glow, and explicit text state cues.

## Hard boundaries

- No bot or Telegram work.
- No edits to `core.mjs`, `mcp.mjs`, Control Tower runtime files, or `autonomous-continuation-control-tower` artifacts.
- No laptop-to-VPS projection payload, transport, persistence, freshness, or P4-P6 semantics.
- No dashboard commands, approvals, mutations, or other write capability.
- No operational metadata beyond the five allowed fields.

## Artifacts produced

- `proposal.md` — independently deliverable dashboard skeleton scope, risks, success criteria, deferred bindings, and rollback.
- `specs/observation-dashboard/spec.md` — RFC 2119 requirements and Given/When/Then scenarios for auth non-disclosure, observation-only authority, exact field boundary, mobile hierarchy, explicit states, source replacement, and VPS deployability.
- Engram `sdd/vps-observation-dashboard-skeleton/proposal` — observation `6327`.
- Engram `sdd/vps-observation-dashboard-skeleton/spec` — observation `6332`.

## Visual reference

`/mnt/c/Users/emili/OneDrive/Pictures/Screenshots/Screenshot 2026-07-23 150857.png`

Use only its visual language: dark navy surfaces, cyan/teal accents, restrained glow, and clear status indicators. Do not copy its desktop density, navigation, command modules, metrics, voice controls, or extra data.

## Isolation incident

Unrelated `torre-console-transport` planning appeared concurrently in `dashboard-orchestration`. The dashboard change was moved to the dedicated worktree and branch listed above. The foreign changes were left untouched.

## Verification performed

- Read back and compared both OpenSpec artifacts with their Engram copies.
- Confirmed native SDD status: proposal `done`, specs `done`, next recommended `design`.
- Confirmed the isolated worktree contains only the untracked dashboard change directory.
- No tests were run because this session produced planning artifacts only.

## Next action

Run `sdd-design` for `vps-observation-dashboard-skeleton` in the isolated worktree. The design must choose the minimal web stack, authentication boundary, source/view-model architecture, test strategy, and VPS deployment shape without crossing into Control Tower or real projection integration.
