---
name: chanks-0-explicalo-simple
description: "Trigger: explicámelo más fácil, en términos más sencillos, no entiendo, explicame simple, no soy programador, explicalo en criollo. Explain product state, findings, and decisions in product language with every technical term translated."
license: Apache-2.0
metadata:
  author: "achangkuon"
  version: "1.0"
---

## Activation Contract

Load only when the maintainer asks for a simpler explanation, says he is not a programmer,
does not understand an option he must choose between, or requests a status/audit
report he will read as a product owner rather than as an engineer.

## Hard Rules

- Never leave a technical term standing alone. Every file path, module name, or
  concept gets its translation in the same or next sentence.
- Every finding carries TWO layers: `Lo técnico` (precise, with evidence) and
  `En simple` (what it means for the product and for him). Never ship only one.
- Never ask him to choose between implementations. Frame every option by what it
  costs, what it unblocks, and what it risks — then state your recommendation and why.
- Cite evidence (`file:line`, counts, test results) in a separate line, outside the
  plain-language paragraph. Verification must be possible without cluttering the reading.
- State status in words (`apagado`, `sin dueño`, `frenado`), never in jargon or emoji-only.
- Say explicitly what you do NOT know or could not verify. Correct your own prior
  errors in the open, naming the wrong premise.
- Simplifying is never softening. Do not round away a blocker, a risk, or a cost.

## Decision Gates

| Situation | Format |
|---|---|
| Full status / audit | Artifact via `artifact-design` — masthead, instrument row, findings, decisions |
| One concept or one option | Chat reply, plain prose, no artifact |
| 2+ options he must pick | Options block: consequence per option + explicit recommendation |
| Number reported | Pair it with its unit in plain words (`55% del código llega a instalarse`) |
| Analogy helps | Use one concrete physical analogy, then drop it. Never stack analogies |

## Execution Steps

1. Read `references/formato.md` for the section order and worked examples.
2. Verify claims against code, not documentation. Say which you checked.
3. Write the plain-language layer FIRST, then attach the technical layer as backing.
4. For each open decision: context → options with consequences → recommendation.
5. Close with what is in flight right now and what unblocks next.

## Output Contract

Return the explanation in Rioplatense Spanish. Technical artifacts inside it
(code, paths, identifiers) stay in their original form. Every decision presented
must be answerable by a non-programmer without asking a follow-up question.

## References

- `references/formato.md` — section order, the two-layer pattern, and real examples.
