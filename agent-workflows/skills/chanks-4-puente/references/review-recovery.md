# Review recovery over a diverged base

Use when a native review reports a finding that looks misattributed because the Session branch and
the integrated branch diverged. This is recovery guidance for the bridge: it changes no review
authority and adds no gate.

## Rebase first

Prevention is the rule. Before review starts, confirm the Session base is an ancestor of the
integrated branch (`git merge-base --is-ancestor <base> master`). If master advanced past the base,
rebase the Session branch first. A clean rebase makes the review diff contain only the candidate's
own changes, so base divergence never reaches the lenses and integrated-side work is never read as
a removal.

## When a correction would contradict the contract

A lens may report a CRITICAL such as "the candidate removed a flag" when the branch never touched
that file. If the only in-budget correction would reverse another delivered Session's work, do not
apply it. That contradiction is the signal the finding is misattributed to this candidate, not
evidence it must be obeyed. Rebase and re-run rather than correct the tree to satisfy a phantom
removal.

## Abandon preconditions

`review abandon` is the last resort, when rebase and re-run are not possible. The native CLI only
accepts the closed reason vocabulary `operator_disposition` or `retired_schema`; there is no free
text. Abandon also needs a maintainer authorization binding, assembled from the exact fields the
native input-required envelope demands. Successive round trips are normal: supply exactly what each
envelope asks for, never an invented value or a guessed field name.

## Evidence preservation

A rejected-correction payload is preserved under `.git/gentle-ai/rejected-results/<lineage>/`.
Treat those artifacts as review evidence: reference them when re-running the review so the recovered
run shows what was rejected and why, instead of silently rebuilding the same finding.

## Upstream boundary

A first-class causality dispute route — one that lets a review declare a base divergence and
re-scope itself — is upstream work for gentle-ai. Locally the mitigation is the rebase rule above.
Report the dispute as an upstream gap; do not reimplement review authority here.
