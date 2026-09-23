---
name: chanks-3-session-kickoff
description: "Trigger: start session, continue session, resume session. Revalidate an approved Session without selecting work."
license: Apache-2.0
metadata:
  author: emili
  version: "6.0"
---

## Activation Contract

Activate after a human-approved Session handoff in the approved repository and branch. Admit the
named Session only; never select a ready row, dispatch a worker, or write plan evidence.

## Host-Owned Pi Admission

Fresh Radar admission is the only planning/admission evidence. The responsible host/coordinator—not
the model—must bind exact current `HEAD`, Session ID, SHA-256 digests of exact installed
`radar status --json` and `radar sesion <ID>` stdout, the human-selected Session, exact authorized
files/Cimientos, actual exclusive-or-serial Recurso confirmation, exact runtime identity, and
compatible-execution evidence.

<!-- PI-ADMISSION-HANDOFF:JSON -->
```json
{
  "envelope_keys": [
    "admission",
    "radarExecutable",
    "gitExecutable",
    "identityFile"
  ],
  "proof_keys": [
    "repositoryRoot",
    "sessionId",
    "baseCommit",
    "candidateDigest",
    "runtimeIdentity",
    "statusDigest",
    "sessionDigest"
  ],
  "sequence": [
    "host_captures_git_radar_evidence",
    "host_creates_external_proof_and_one_use_envelope",
    "host_launches_isolated_pi",
    "shim_consumes_and_deletes_environment",
    "shim_validates_before_solicitation",
    "model_requests_activation_only",
    "host_ui_requests_confirmation",
    "only_exact_human_true_accepts",
    "shim_revalidates_every_capability_use",
    "shim_rewrites_actual_tool_input"
  ],
  "model_responsibilities": {
    "forbidden": [
      "admission",
      "executable_paths",
      "proof_path_content",
      "writable_paths",
      "grants",
      "acceptance",
      "resource_confirmation",
      "confinement_options"
    ],
    "permitted": [
      "request_activation"
    ]
  },
  "blocking_conditions": [
    "missing_malformed_stale_or_contradictory_evidence",
    "ui_absent",
    "human_decline_or_cancel",
    "lifecycle_change",
    "runtime_disconnected_or_replaced",
    "widened_files"
  ],
  "revocation_conditions": [
    "lifecycle_change",
    "runtime_disconnected",
    "runtime_replaced"
  ],
  "evidence_boundaries": {
    "s151_t3": {
      "classification": "executable_generated_shim_evidence",
      "path": "agent-workflows/tests/test_install.py",
      "suite": "PiAuthorityExtensionTests"
    },
    "s151_t5": {
      "classification": "separate_real_pi_bubblewrap_journey",
      "status": "not_implemented_or_simulated_by_t4"
    }
  }
}
```
<!-- /PI-ADMISSION-HANDOFF:JSON -->

- Only that responsible host/coordinator creates the exact one-use `CHANKS_PI_ADMISSION` envelope
  with `admission`, `radarExecutable`, `gitExecutable`, and `identityFile`. It supplies trusted,
  absolute Git/Radar executables; the model/worker cannot create or edit the envelope, executable
  paths, writable paths, acceptance, resource confirmation, or the identity proof file.
- The host places the live identity proof outside the repository and every writable set, retains it
  live, and updates it in place for the same candidate/runtime. It launches an isolated Pi process
  with that one-use environment and never installs or enables the shim globally for a Session run.
  A later candidate requires a fresh host admission/confirmation, not reuse of an old envelope.
- A model/worker may request activation; it is not acceptance. The host UI shows the exact
  confirmation: Session, repository, authorized files, Cimientos, confirmed resources with mode,
  base, candidate, and runtime. Only exact human acceptance activates. Missing UI, decline, cancel,
  unavailable confirmation, lifecycle change, disconnected/replaced runtime, widened files, or any
  missing, malformed, stale, or contradictory evidence blocks with no fallback. No commands for the user.
- The generated shim rewrites Bash input under Bubblewrap before execution. Direct and derived
  Write/Edit/Bash effects remain limited to the exact files/Cimientos admitted by the host.
  Unsupported PowerShell and unprovable effects block; no tool, path, or shell fallback widens scope.

## Hard Rules

- Receive Radar evidence only through `../chanks-0-agente-soporte/SKILL.md`. Never read the plan
  directly, execute a repository binary, or fall back when installed Radar rejects admission.
- Require the host's fresh bundle bound to current `HEAD`, Session ID, and SHA-256 digests of exact
  `radar status --json` and `radar sesion <ID>` stdout. The host recaptures both commands immediately.
- `start` requires `LISTO`. `continue`/`resume` accept `LISTO` or `EN CURSO` only under the
  contract discriminator: native Encargo uses same Session identity reconciliation; legacy uses
  first pending Módulo for legacy. Rejected states return only state, blocker, and Zone-ordered
  LISTO choices; there is no fallback from a rejected state.
- Preserve Git contamination and actual shared-resource evidence. Forecasts are never live locks.
- Revalidate scope only against declared exact files. Expanded scope/files require human approval
  and fresh compatibility before affected mutation.
- ODD is native default. Do not choose SDD; preserve only an explicit human `solicitud_sdd`.

## Decision Gates

| Evidence | Result |
|---|---|
| Fresh admission and native Encargo | Reconcile same identity, native record, code, and evidence. |
| Fresh admission and legacy contract | Resume at first pending Módulo for legacy. |
| Missing/stale/mismatched admission | Stop and return permitted non-admissible evidence. |
| Scope/resource conflict or authority gap | Stop with human decision/compatibility evidence. |

## Execution Steps

1. Verify the host-attested repository, branch, HEAD, and Git contamination against the handoff.
2. Require the host's immediate recapture of both Radar commands and identical SHA-256 digests of exact output bytes.
3. Validate admission, then reconcile native record, code, and evidence under the same Session identity; legacy resumes from first pending Módulo for legacy.
4. Confirm exact-file and Cimiento/Recurso compatibility before mutation. A declared Recurso requires confirmed exclusive or serial execution evidence; release only actual resources demonstrably acquired, and report rather than acquire a fictitious lock.
5. Return the admissible execution evidence to the responsible parent and bridge. Do not write a route revalidation for native ODD.

## Output Contract

Return repository/branch/HEAD, exact contamination, admission binding, native or legacy resume
basis, compatibility evidence, human decision needed, and bridge handoff. State explicitly that
no plan, lock, topology, or delivery authority was created.

## References

- `../chanks-0-agente-soporte/SKILL.md`
- `../chanks-4-puente/SKILL.md`
