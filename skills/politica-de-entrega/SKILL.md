---
name: politica-de-entrega
description: "Trigger: declare, detect, or repair a project's delivery policy — \"declarar política de entrega\", \"cómo entrega este repo\", \"delivery policy\", onboarding a repo into the Tower, or a Tower gate reporting unresolved policy. Runs once per project and writes one machine-readable block. Detects before asking; never guesses."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

# Delivery policy declaration

The Tower separates **safety floors** from **project policy**. Floors are the
product's; policy is the repo's. This skill exists so a project states its policy
once, in a form the Tower can resolve deterministically, instead of the product
imposing one team's workflow on every project.

Run once per project. After that the block is the answer and this skill is not
needed again unless the way of working changes.

## Contract

- Write exactly one `delivery-policy` block, in the repo's canonical policy file
  (`AGENTS.md` when it exists, otherwise the file `CLAUDE.md` points to).
- **Detect before asking.** Ask only what evidence cannot settle.
- **Show what you detected and get explicit confirmation before writing.** A
  detected value is a proposal, not a fact.
- Never invent a value to fill a field. An undeclared field is legitimate — it
  resolves to its most restrictive default and that is a safe outcome.
- Never touch a safety floor, and never add fields outside the schema below.
- One block per repo. If one already exists, repair it in place; do not append a
  second.

## Detection order

Gather evidence first, in this order, and record where each finding came from:

| Signal | Where | Settles |
|---|---|---|
| Branch protection / rulesets on the target branch | `gh api repos/{owner}/{repo}/branches/{branch}/protection`, `gh api repos/{owner}/{repo}/rulesets` | `merge.authorizing_party`, `delivery.shape` |
| Presence of `.github/workflows/**` | filesystem | whether a PR runs real checks or is ceremony |
| Existing prose policy | `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md` | every field |
| Recent delivery history | `git log --merges --oneline -30`, `gh pr list --state merged --limit 20` | `delivery.shape`, `delivery.target_branch` |
| Default branch | `git symbolic-ref refs/remotes/origin/HEAD` | `delivery.target_branch` |
| Plan documents | `openspec/plans/**/STATUS.md` | `documentation_close.*`, `planning.horizon_ceiling` |

A repo with no branch protection, no `.github/`, and a merge-free history is
delivering by direct push — say so, with the evidence, and let the maintainer
confirm.

Conflicting signals are not a tie to break silently. Report both and ask.

## The block

````markdown
```yaml
schema: delivery-policy
schema_version: 1
merge:
  authorizing_party: human        # human | automatic
delivery:
  shape: direct-push              # direct-push | pull-request
  target_branch: master
planning:
  horizon_ceiling: 2              # integer >= 1
documentation_close:
  module: engram-only             # engram-only | full
  session: full                   # engram-only | full
```
````

| Field | Meaning |
|---|---|
| `merge.authorizing_party` | Who issues merge authorization. Authorization stays mandatory and bound to the immutable candidate; this names the issuer only. |
| `delivery.shape` | Shape of the remote effect. Never alters the commit → verify tree → freeze SHA ordering. |
| `delivery.target_branch` | Where delivery lands. |
| `planning.horizon_ceiling` | How many Sesiones may be planned ahead. |
| `documentation_close.module` | Close depth when a Módulo finishes. |
| `documentation_close.session` | Close depth when a Sesión finishes. |

## What this can never do

No combination of values may permit remote mutation before `DELIVERY_READY`,
rewrite a frozen candidate, delete from the ledger, let a Worker assign itself,
or grant dispatch authority to anyone but Main. If a requested value would reach
a floor, refuse it and name the floor. That refusal is the whole point of the
split — report it plainly rather than working around it.

## Fail-closed defaults

An absent field, an unknown value, or an unparseable block **is not a permissive
default**. It resolves to the most restrictive value and the reason is named:

| Field | Restrictive default |
|---|---|
| `merge.authorizing_party` | `human` |
| `delivery.shape` | `pull-request` only if evidence shows PRs; otherwise leave undeclared and report it |
| `planning.horizon_ceiling` | `2` |
| `documentation_close.*` | `full` |

A repo without the block behaves exactly as it did before the block existed.
Say this to the maintainer — it is the reason declaring policy is safe.

## Procedure

1. Locate the canonical policy file. If none exists, report that and stop; do not
   create one without the maintainer choosing where policy lives.
2. Run detection. Keep the source of every finding.
3. Present a table: field, detected value, evidence (`file:line` or the command
   that produced it), and confidence. Mark anything undetected as such.
4. Ask **only** about undetected or conflicting fields. One question at a time.
5. On explicit confirmation, write the block plus a short prose paragraph in the
   file's existing language. Prose and block must agree; if the file already had
   contradicting prose, fix it in the same edit.
6. Report the exact bytes written and where. Do not commit — the maintainer
   decides when.

## When the Tower reports unresolved policy

A `CT_POLICY_UNRESOLVED` forecast means the block is absent, unparseable, or not
bound to the candidate. Do not patch the field the gate happened to want. Read
the block, find why resolution failed, fix that cause, and re-report. A gate
satisfied by a guessed value is worse than a blocked one.
