# Design: Canonical Parked-Decision Contracts

## Boundary

`contracts/parked-decision.mjs` is a pure ESM contract module. It imports only canonical digesting, contract errors, and the shared validator. Registry and validator changes are additive; no runtime module imports the new contract in S5.7.

## Public API

```js
parkedDecisionDigest(value)
parkedDecisionResponseDigest(value)
createParkedDecision(input)
createParkedDecisionResponse({ parked_decision, response_id, authorization_id, authorization_revision, option_id, responded_at })
assertParkedDecisionResponseBinding(response, parkedDecision)
```

Both digest helpers remove only their own digest field and call `digestArtifact(identity, "rfc8785-jcs")`. Constructors compute—not trust—the digest, call the named canonical validator once, and return its deep-frozen clone. The response constructor first validates the complete parked record and resolves `option_id` by exact equality in `options`; label, array index, or narrative are never accepted. The binding assertion validates both records and compares decision ID/digest, snapshot digest, and enumerated option; it performs no authority lookup.

## Schema decisions

`parked-decision-v1` is closed and requires:

- identity: `parked_decision_id`, `parked_decision_digest`, `created_at`;
- §11: `question`, evidence `{path,line_start,line_end,contradiction}`, options `{option_id,label,consequence}`, origin `{session_id,module_id}`, `checkpoint`, `decision_class`;
- frozen scope: `{session_plan_snapshot_digest,session_ids,area,resources}`.

`parked-decision-response-v1` is closed and requires `response_id`, `response_digest`, `authorization_id`, `authorization_revision`, `parked_decision_id`, `parked_decision_digest`, `option_id`, `session_plan_snapshot_digest`, and `responded_at`. It deliberately has no authority state, boolean validation claim, selected label, narrative substitute, extension, store, or effect field.

Both schemas reuse `artifact-ref-v1` `$defs` for slugs, revisions, relative paths, timestamps, and digests. Local `$defs` cover Session/Módulo IDs and the approved eight decision classes.

## Invariants

`validate.mjs` enforces parked digest identity, unique option IDs, non-inverted evidence ranges, origin Session inclusion in frozen scope, and response digest identity. Cross-record enumeration and binding remain in `assertParkedDecisionResponseBinding` because a standalone response intentionally does not embed or duplicate the parked record.

## TDD and workload

RED adds absent registry/constructor/binding expectations first. GREEN adds both schemas, registry names, fixtures, constructors, and invariants together so no orphan schema exists. TRIANGULATE mutates every response binding, duplicates options, substitutes labels, and reorders object properties. Expected implementation is 240–330 authored changed lines; stop before 400.

## Rollback

One conventional commit contains schemas, registry, invariants, fixtures, module, and tests. `git revert` removes the complete unused contract surface without migration or state repair.
