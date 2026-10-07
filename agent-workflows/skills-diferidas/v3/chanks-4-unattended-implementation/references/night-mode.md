# Unattended approval window

This reference describes the human approval needed before a dispatched worker works without an
immediate answer. It is policy, not an execution process: it creates no external session and
starts no work.

## Pre-flight gates

Return `NOT_READY` unless all conditions hold:

1. Every Session in the mandate is `LISTO` in a fresh `radar status --json`/`radar sesion <ID>`
   read, with no unresolved escalating decision contaminating its outcome, its first required
   work, or another Session.
2. Delivery ceiling and a single mandate-wide `expires_at` are the human's own explicit
   answers, recorded once in the seal — never inferred defaults and never left for a worker to
   ask mid-run. No step and no Session declares its own expiry.
3. `expires_at` ends before the human's declared return time.
4. The mandate is an explicit, dependency-ordered list of steps: step numbers are exactly 1..N,
   no `sesion_id` repeats, and every Session names its own worker. A missing step order, an empty
   mandate, a repeated Session, or a per-Session expiry is `NOT_READY`.
5. Reachability is `unreachable`; questions are preserved for the responsible parent rather than
   relayed.
6. Repository, base, and Git contamination evidence match the seal.
7. `solicitud_sdd`, if requested for a Session, carries the human's one- or two-line evidence;
   otherwise ODD applies with no exception.

## Questions and wake evidence

A dispatched Pi worker who encounters a question outside the seal stops that Session only and
returns one self-contained decision block: question, evidence, options with consequences,
decision class, contamination, and checkpoint. Other dispatched Sessions continue independently;
Sessions that depend on the stopped one do not start, and the coordinator never chooses a Session
outside the sealed list. The responsible parent records the result after the human responds.

The worker is told to send it by `../../chanks-3-despacho-herdr/assets/worker-handoff.md`. A wake
report is the worker's terminal Intercom notice — `COMPLETED`, `BLOCKED`, or `FAILED`,
naming the exact Sesión and worker — carrying only evidence: completed checks, commits on
`work/<ID>`, changed paths, review outcomes Gentle AI produced, stopped questions (including any
consent envelope left for the human),
and budget used. Main reads it at Chanks stage 5 (Entregar y cerrar). Nothing in this report
authorizes a commit beyond the sealed ceiling, a push, a merge, a PR, a release, or a deployment;
those remain Main's decision under ordinary repository policy.
