# Session handoff and returned evidence

Use for the Session the human chose, in its own checkout, whether a dedicated worktree or the
primary checkout. One Session does not require parallel machinery.

## Record locator

At handover, pass Gentle AI the lowercase Session ID and request a Session-bound native ODD
record: `odd/tasks/<id>.md` or `odd/tasks/<id>-<feature>.md`, exactly one document per Session in
that checkout, not a loose filename wildcard. This locator is coordination evidence; Gentle AI owns
the document's technical decomposition and continuity.

## Returned evidence

Before handing the Session to stage 5, the responsible parent confirms:

- The returned immutable commit resolves in Git in the same checkout and belongs to the Session's
  branch, with the changed paths and observed outcome/constraint checks.
- The returned task record is an actual regular file for that Session with at least one checked
  task and no unchecked tasks. Checkboxes alone are not proof: reconcile them with the commit,
  actual work, and Gentle AI's observed evidence. Missing or failed evidence stays pending.
- The Session/checkout identity has not drifted. Do not rename an unrelated feature or mark
  unfinished tasks complete to reach stage 5.

Missing or failed evidence leaves stage 5 pending; report its exact reason. This applies to a
single Session and to each member of an approved parallel lot.

Chanks adds no additional review and records no readiness witness in V1: the Session stays `LISTO`
until stage 5 records the integrated commit. Gentle AI owns the applicable checks and review
handling; stage 5 still requires the integrated immutable commit and closure evidence. Session
reservation and readiness markers are deferred to V2 (Pista).
