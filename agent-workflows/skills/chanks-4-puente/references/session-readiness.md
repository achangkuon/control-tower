# Session readiness handoff

Use for the admitted Session in its same marked checkout, whether a dedicated worktree or the
primary checkout. One Session does not require parallel machinery.

## Record locator

At kickoff, pass Gentle AI the lowercase Session ID and request a Session-bound native ODD
record: `odd/tasks/<id>.md` or `odd/tasks/<id>-<feature>.md`. Radar accepts exactly one matching
document in the marked checkout, not a loose filename wildcard. This locator is coordination
evidence; Gentle AI owns the document's technical decomposition and continuity.

## Returned evidence

Before signaling readiness, the responsible parent confirms:

- The returned immutable commit resolves in Git in the same marked checkout and belongs to the
  admitted Session's branch, with the changed paths and observed outcome/constraint checks.
- The returned task record is an actual regular file for that Session with at least one checked
  task and no unchecked tasks. Checkboxes alone are not proof: reconcile them with the commit,
  actual work, and Gentle AI's observed evidence. Missing or failed evidence stays pending.
- The Session/checkout identity has not drifted. Do not invent a marker, rename an unrelated
  feature to obtain stage 5, or mark unfinished tasks complete to satisfy Radar.

Only then coordinate the installed `radar marcar <ID> --listo -C <repo>` and confirm the installed
`radar etapa <ID> -C <repo>` offers stage 5. A refusal or any other stage leaves readiness pending;
report its exact reason without bypassing it. This applies to a single Session and to each member
of an approved parallel lot.

`--listo` records a local readiness witness, not a technical review, delivery permission, product
closure, or integration. Chanks adds no additional review. Gentle AI owns the applicable checks
and review handling; stage 5 still requires the integrated immutable commit and closure evidence.
