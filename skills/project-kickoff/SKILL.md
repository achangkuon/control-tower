---
name: project-kickoff
description: "Trigger: legacy project kickoff invocation. Redirects new-project setup to the canonical mini-parent without writing artifacts."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.0"
---

## Activation Contract

Use only when an old invocation reaches this compatibility shell.

## Hard Rules

- Write no documents or setup artifacts here.
- Load `../chanks-1-project-kickoff/SKILL.md` immediately.
- Preserve every human gate.

## Decision Gates

| Input | Action |
|---|---|
| New project | Redirect to the canonical mini-parent. |
| Existing project | Use the applicable authority variant instead. |

## Execution Steps

1. Load the canonical mini-parent.
2. Continue under its ordered child contracts.

## Output Contract

Return the canonical skill result and note that compatibility routing occurred.

## References

- `../chanks-1-project-kickoff/SKILL.md`
- `../chanks-1-autoridad/SKILL.md`
