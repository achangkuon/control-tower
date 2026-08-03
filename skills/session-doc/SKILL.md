---
name: session-doc
description: "Trigger: final session closure, close session, document session. Reconcile technical openspec status and the project's Notion snapshot non-destructively."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.0"
---

## Activation Contract

Load only as the final closure step after integral `verify`, when a session's
technical state, blocker, owner, remaining work, or next action must be reconciled.

## Hard Rules

- `session-kickoff` owns source discovery and execution order; consume its verified route and Session state.
- Update technical openspec status and the project's Notion snapshot non-destructively when state changed.
- Notion is a living snapshot, never a dated changelog. Do not append `Registro` entries.
- Preserve child content and keep deletion disabled for routine edits. Stop on unverified or contradictory sources.
- Resolve the Notion target only from the repository's `.session-doc.json`; never guess it.
- Load `cognitive-doc-design` before writing Notion prose.

## Decision Gates

| Condition | Action |
|---|---|
| Verification failed | Do not close; return the failed criteria. |
| No tracked state changed | Skip Notion and report why. |
| Roadmap and detailed section disagree | Stop and report the contradiction. |
| New tracked item exists | Add its roadmap row and detailed section together. |
| Routine edit would delete content | Stop; do not force deletion. |

## Execution Steps

1. Read the parent/router result, repository instructions, `.session-doc.json`, and verified technical status.
2. Reconcile the technical source and update the plan `STATUS.md`/master index as required by the project.
3. If a tracked state changed, load `cognitive-doc-design`, fetch Notion, and update its roadmap row plus all required detailed fields.
4. Compare both destinations against the verified source and report changed, skipped, and preserved content.

## Output Contract

Return the parent/router used, verified sources, openspec files written, Notion page
id touched or skipped, roadmap/detail changes, contradictions, and confirmation that
no content was deleted. End with `skill_resolution: paths-injected`.

## References

- `references/links.md`
- `assets/session-doc.schema.json`
- `assets/project-notion-map.json`
