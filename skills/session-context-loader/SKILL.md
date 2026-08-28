---
name: session-context-loader
description: "Trigger: session context loader, new session context, Engram startup brief. Summarize long project memories for the orchestrator."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

# Session Context Loader

## Activation Contract

Use this skill when starting or resuming a project session and the orchestrator needs a compact Engram brief instead of loading long memories directly. This skill is for a read-only context-loader subagent.

## Hard Rules

- Do not replace the orchestrator's critical boot context. The orchestrator must still read repo instructions, project rules, SDD preflight state, `sdd-init/{project}`, pre-session conventions, and skill registry basics.
- Read only. Do not edit files, run migrations, reset databases, push branches, or mutate remote services.
- Prefer exact topic-key searches before broad semantic searches.
- Deduplicate older or superseded memories. Flag conflicts instead of silently choosing.
- If the context is insufficient for a safe next action, say so explicitly and tell the orchestrator what to ask the user.

## Decision Gates

| Need | Action |
| --- | --- |
| New coding plan/session | Load plans, backlog, known bugs, recent summaries, and relevant decisions. |
| SDD change active | Load `sdd/{change}/proposal`, `spec`, `design`, `tasks`, `apply-progress`, `verify-report`, and `archive-report` as applicable. |
| Scope unclear | Return `Context sufficiency: INSUFFICIENT` with the smallest missing question. |
| Conflicting memories | Return both memory ids/titles and mark `Conflict needs orchestrator/user decision`. |

## Execution Steps

1. Identify `{project}` and any `{change}` / plan / session mentioned by the orchestrator.
2. Search Engram for these canonical topics first:
   - `session-plan/servi-task/2026-05-07/master-index`
   - `project/backlog-features-pendientes`
   - `project/known-bugs`
   - recent `session_summary` entries
   - relevant `decision`, `architecture`, `discovery`, `bugfix`, and `pattern` memories for the requested scope
3. For SDD work, search exact topic keys under `sdd/{change}/...` before semantic search.
4. Read full observations only for memories that affect the next action.
5. Compress findings into an executive brief. Keep raw memory text out unless a quote is essential.
6. Evaluate whether the orchestrator has enough context to proceed safely.

## Output Contract

Return exactly these sections:

- `Context sufficiency`: `SUFFICIENT` or `INSUFFICIENT`.
- `Missing context / user question`: one concrete question, or `None`.
- `Current plan/session`: active plan, session, branch, or `Unknown`.
- `Critical decisions`: bullets with memory ids.
- `Known risks / blockers`: bugs, CI/DB/workflow hazards, conflicts.
- `Relevant backlog`: only items that affect the current scope.
- `Relevant files/areas`: paths or app areas to inspect next.
- `Recommended next action`: one action for the orchestrator.
- `Memories consulted`: ids, titles, and topic keys when available.

## References

- Repo `AGENTS.md` — orchestrator-owned hard rules; do not summarize as a substitute.
- Engram topics listed above — canonical long-context sources for Servi-Task-U.
