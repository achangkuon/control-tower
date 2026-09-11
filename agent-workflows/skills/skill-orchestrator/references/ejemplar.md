# Orchestration exemplar — evidence before authority

Use this reference to audit the shape of an orchestrator without importing a product-specific
runtime. The current generic builder is intentionally **not** an orchestrator: its responsible
parent coordinates human-approved subagents directly and does not pretend it owns live state.

| Hard rule | Evidence required before an orchestrator may claim it |
|---|---|
| State read before decision | An actual runtime command/API and authoritative fields. |
| Closed modes | Enumerated runtime states with one safe rule each. |
| Fail closed | A written stop behavior when state is unavailable or contradictory. |
| Readback and reversal | A real readback and a reversal limited to effects the runtime created. |
| Authority ≠ evidence | A named human/parent authority; reports and logs remain evidence. |
| No automatic disposal | Explicit human authorization and a preview. |
| Children retain procedure | Route references, not copied child instructions. |
| No implementation | The orchestrator returns coordination evidence, never product edits. |

Do not generalize an example from a product-specific runtime into a mandatory generic role,
seat, external session, lock, queue, delivery token, or API. When the runtime surface is absent,
use the generic responsible-parent flow and report the missing control surface.
