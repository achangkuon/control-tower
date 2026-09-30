---
name: control-tower
description: "Use for Control Tower V1 entry, adoption, authority questions, or an approved product Session."
---

# Control Tower V1

## Entry contract

Use this skill when a human asks about Control Tower, wants to adopt its V1 workflow, or asks to execute product work through it. This is the one public V1 entry point. Identify the intent before loading a reference. Ordinary questions accept free text: answer, explain, or investigate without treating the question as authorization to execute. A request to execute product work requires a bounded human selection from the eligible work and its stated scope; do not choose work on the human's behalf or infer approval from a question. If no selection is present, present concrete eligible choices and stop for the human's choice.

ODD is the default technical path once work is authorized. SDD is used only when explicitly requested by the human; complexity alone does not select it. Keep product authority and technical implementation distinct: an approved selection authorizes its bounded work, not a new product decision or an expanded edit surface.

## Questions and authority

Answer informational questions directly. For product execution, show the specific eligible choices and their consequences before proceeding; if a decision changes the product contract or scope, pause for an explicit human answer. Treat project plans and evidence as inputs to eligibility, not as permission to self-assign. See the authority reference only when the intent needs selection or decision handling.

## Native in-session delegation

Pi uses its native subagent mechanism for in-session delegation; it discovers project skills from `.agents/skills/` only for trusted projects. Claude Code uses its native subagents, `.claude/skills/`, and `CLAUDE.md`, not `AGENTS.md`. These are host-native capabilities, not a cross-host router. Everything required for this entry contract lives in this skill and its two references; no managed instruction blocks are needed in host instruction files.

## Lazy references

- For adoption intent, load only `references/adoption.md` when adoption is requested.
- For authority or question intent, load only `references/authority-and-questions.md` when selection or a decision is needed.

Load each reference only for its matching intent; never load both at startup. If an interaction later changes intent, load the newly relevant reference then, not preemptively.
