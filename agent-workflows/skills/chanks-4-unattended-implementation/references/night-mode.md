# Unattended approval window

This reference describes the human approval needed before a dispatched worker works without an
immediate answer. It is policy, not an execution process: it creates no external session and
starts no work.

## Pre-flight gates

Return `NOT_READY` unless all conditions hold:

1. The Session is `LISTO` in a fresh `radar status --json`/`radar sesion <ID>` read, with no
   unresolved escalating decision contaminating its outcome, its first required work, or another
   Session.
2. Delivery ceiling, the RDD consent policy, and `expires_at` are the human's own explicit
   answers, recorded once in the seal — never inferred defaults and never left for the worker to
   ask mid-run.
3. `expires_at` ends before the human's declared return time.
4. Reachability is `unreachable`; questions are preserved for the responsible parent rather than
   relayed.
5. Repository, branch, base, and Git contamination evidence match the seal.
6. `solicitud_sdd`, if requested, carries the human's one- or two-line evidence; otherwise ODD
   applies with no exception.

## Questions and wake evidence

A dispatched Pi worker who encounters a question outside the seal stops that Session only and
returns one self-contained decision block: question, evidence, options with consequences,
decision class, contamination, and checkpoint. Other dispatched Sessions continue independently.
The responsible parent records the result after the human responds.

A wake report is the worker's terminal Intercom notice — `COMPLETED`, `BLOCKED`, or `FAILED`,
naming the exact Sesión and worker — carrying only evidence: completed checks, commits on
`work/<ID>`, changed paths, RDD reviews run or skipped under the sealed policy, stopped questions,
and budget used. Main reads it at Chanks stage 5 (Entregar y cerrar). Nothing in this report
authorizes a commit beyond the sealed ceiling, a push, a merge, a PR, a release, or a deployment;
those remain Main's decision under ordinary repository policy.
