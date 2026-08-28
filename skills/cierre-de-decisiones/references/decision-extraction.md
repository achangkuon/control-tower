# Decision extraction — where they live and how to count them

## Where to look

| Artifact | What it holds |
|---|---|
| `openspec/plans/decision-register.md` | Canonical. Resolved decisions numbered; open ones enumerated separately |
| `openspec/plans/plan-N/STATUS.md` | Per-Session `Decisiones` blocks with exact question, class, evidence, options |
| `openspec/plans/master-index.md` | Where the plan is, not what it is waiting on |
| `openspec/plans/release-chain.md` | Which Sessions are in the release scope at all |
| `openspec/plans/implementation-state.md` | Gaps that are not decisions — treat as residue |

Grep the STATUS files directly:

```
rg -n '^- `escala`' openspec/plans/plan-*/STATUS.md | rg -v 'RESUELTA'
```

## Counting pitfalls — all observed in practice

- **The register's total is scoped.** A count like "34 escalate decisions" usually enumerates only the Sessions in the release chain. Plans outside the chain can hold open decisions the register never counted. Always sweep every `STATUS.md`, then state the audited scope.
- **`RESUELTA` is not the only resolved marker.** Variants like `Resuelta y ejecutada el <date>` exist. A naive `rg -v RESUELTA` produces false positives; read each hit before reporting it.
- **`derivable` decisions are not free.** They need a falsifiable criterion and a named authority. A `derivable` without either is an `escala` in disguise.
- **A decision with no owning Session leaves enumeration debt.** Resolving the owner does not create the Session. Report both.

## Vocabulary

- `derivable` — the agent may resolve it, but only with approved authority **and** a falsifiable criterion.
- `escala` — requires the maintainer. Must declare its class and its `Contamina:` list.

## The eight always-escalate classes — closed set

1. Contrato visible del producto
2. Operaciones irreversibles
3. Migraciones o pérdida de datos
4. API pública
5. Seguridad y permisos
6. Dinero, precios o cuotas
7. Expansión de alcance
8. Dependencias o evidencia contradictorias

A decision in any of these never becomes `derivable`, regardless of how obvious the answer looks.

## Ranking for presentation

Order by what each resolution unblocks, not by ID. Surface three relationships explicitly:

- **Free consequences** — one choice makes another cost nothing. Present them adjacent and say so.
- **Enablers** — one resolution makes another *decidable* that otherwise could not be answered.
- **Derivable-from-existing-authority** — the PRD, an accepted decision, or a prior precedent already answers it. Say which, and recommend consistency.

## Residues that are not decisions

Do not count these as resolved and do not hide them:

- A candidate parked `NOT_READY` needing re-authorization.
- Scope with no enumerated owning Session.
- A falsifier that has not been rerun, especially one that previously spawned new Sessions.
