# Unattended approval window

This reference describes the human approval needed before someone works without an immediate
answer. It is policy, not an execution process: it creates no external session and starts no work.

## Pre-flight gates

Return `NOT_READY` unless all conditions hold:

1. Every admitted Sesión has its own sealed approval and bounded scope.
2. No unresolved product, security, data-loss, API, money, or contradictory-evidence decision can arise inside the work.
3. `expires_at` is explicit and ends before the human's declared return time.
4. Budget and stop condition are explicit.
5. Reachability is `unreachable`; questions are preserved for the responsible parent rather than relayed.
6. Repository, branch, base, and Git contamination evidence match the seal.

## Questions and wake evidence

An implementer who encounters a question outside the seal stops that Sesión and returns one
self-contained decision block: question, evidence, options with consequences, decision class,
contamination, and checkpoint. The responsible parent records the result after the human responds.

A wake report contains only evidence: sealed Sesión ID, completed checks, changed paths, stopped
questions, blockers, budget used, and candidates awaiting ordinary repository delivery policy.
Nothing in this report authorizes a commit, push, merge, PR, release, or deployment.
