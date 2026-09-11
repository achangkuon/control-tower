# Standalone sealed approval

There is no runtime here. A standalone sealed approval is a bounded document for one approved
Sesión, not a replacement coordinator.

- Do not infer state from files, create a state store, create a lock, or simulate an external call.
- Do not start another session, agent, worktree, queue, or delivery process.
- Do not relay questions. Preserve a self-contained decision block for the responsible parent.
- Do not commit, push, open/update a PR, merge, release, deploy, or mutate a database.
- Delivery remains a later human-directed decision under ordinary repository policy.

If an implementer later consumes the seal, it verifies repository, branch, base, scope, and
permissions first. A mismatch stops work and returns evidence; it does not degrade into a looser
mode or create a new approval.
