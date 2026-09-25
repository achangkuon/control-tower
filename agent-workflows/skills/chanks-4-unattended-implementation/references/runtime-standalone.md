# Standalone sealed approval

There is no runtime here. A standalone sealed approval is a bounded document for one `LISTO` plan
Session, not a replacement coordinator and not a second plan.

- Do not infer state from files, create a state store, create a lock, or simulate a dispatch or a
  wake report.
- Do not start a session, agent, worktree, queue, or delivery process. Dispatch belongs to
  `chanks-3-despacho-herdr`, with the Torre off; this skill only prepares the record it carries.
- Do not relay questions. Preserve a self-contained decision block for the responsible parent.
- Do not commit, push, open/update a PR, merge, release, deploy, mutate a database, or write
  `openspec/plan.yaml`.
- Delivery beyond the sealed `commit`-on-`work/<ID>` ceiling remains a later human-directed
  decision under ordinary repository policy, at Chanks stage 5.

When `chanks-3-despacho-herdr` later dispatches the sealed Session, the worker first verifies
repository, branch, base, and Session identity through its own `chanks-3-session-kickoff` run —
a fresh `radar status --json`/`radar sesion <ID>` admission bundle, not the seal's bytes trusted
blindly. A mismatch stops work and returns evidence; it does not degrade into a looser mode or
create a new approval on the worker's own authority.
