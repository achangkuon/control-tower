---
name: big-files-remediation-loop
description: "Trigger: arreglemos big files, remediación de archivos grandes, loop de big files, big files remediation. Orchestrate explore→remediate→verify loop over oversized files."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Load when the user wants to systematically remediate one or more oversized/complex files through a repeatable explore→fix→verify loop. Skip for a single trivial edit.

## Hard Rules

- You are the ORCHESTRATOR. Delegate reading and fixing to sub-agents; never read the full big file inline.
- Process ONE file per loop iteration. Do not batch unrelated files into one fix.
- Never mark a file done until its verification step passes.
- Sub-agents get fresh context: pass them the file path and the prior step's findings, not your whole history.

## Decision Gates

| Situation | Action |
|-----------|--------|
| Reading/understanding the big file | Delegate to the Explore sub-agent (or explorer skill); it returns findings to you |
| Applying the fix | Load the remediation skill; delegate the edit to one writer sub-agent |
| Change is risky (auth, payments, security, data migration, >400 lines) | Run `judgment-day` after the fix |
| Change is routine | Run `verify` after the fix |
| No big files remain | Exit loop; optionally invoke `session-doc` |

## Execution Steps

1. Build the work-list of target big files (largest/most complex first).
2. For each file, run one iteration:
   a. EXPLORE — sub-agent reads the file, reports structure, smells, and a remediation plan.
   b. REMEDIATE — load the remediation skill; one writer sub-agent applies the fix per the plan.
   c. VERIFY — pick `judgment-day` or `verify` per the Decision Gates table.
   d. If verification fails, loop back to REMEDIATE with the failure notes.
3. Mark the file done only after verification passes; move to the next.
4. When the work-list is empty, summarize and optionally hand off to `session-doc`.

## Output Contract

Return: files remediated, verification path used per file (`judgment-day`/`verify`), files still pending, and any file that failed verification twice (flag for human review).

## References

- `references/links.md`
