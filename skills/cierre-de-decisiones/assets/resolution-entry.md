# Required shape of a resolved decision

## In the canonical register — append to the numbered resolved list

```markdown
N. **<Resolution stated as a fact, not as a question.>** <Why this option, in one or two
sentences.> **Descartadas:** <each rejected option and the concrete reason it lost.>
**Falsificable:** <the observation that would prove the resolution violated.>
**Clase resuelta:** <one or more of the eight classes.> **Contaminaba:** <exact IDs.>
```

Rules:

- Lead with the decision as a settled fact. Never restate it as an open question.
- Name the rejected options and why they lost. A resolution without discarded alternatives is unauditable later.
- `Contaminaba` is past tense once resolved, and lists exact IDs, never prose.
- Date the batch with the maintainer and the day it was decided.

## In the Session's `STATUS.md` — mark in place, preserve history

```markdown
- `escala` — **RESUELTA por el maintainer el <YYYY-MM-DD> (decisión N): <the resolution>.**
  <Original exact question, kept verbatim.> **Clase:** <classes.> **Evidencia:** <unchanged.>
  **Resolución:** <what was chosen and why the alternatives lost.>
  **Falsificable:** <observable violation.> **Contaminaba:** <exact IDs.>
```

Never delete the original question. It is the evidence that the resolution answered the right thing.

## State recomputation after writing

For each affected Session, state which of these it now is:

| State | Meaning |
|---|---|
| Unblocked | No open decision and no unmet dependency. Move to 🟢 LISTO |
| Decision-clean, dependency-blocked | Stays 🔴; say explicitly that the block is no longer a decision |
| Decision-clean, prerequisite-blocked | Stays 🔴; name the missing Session that must be enumerated |

Also update: the plan's derived percentage, the index retake point, and the release chain row and graph node.

## Zero-open declaration

Only write it scoped:

```markdown
**Cero decisiones `escala` ABIERTAS en <the exact enumerated set>.**
```

Follow immediately with any decision that lives outside that set, and why it does not contaminate it.
