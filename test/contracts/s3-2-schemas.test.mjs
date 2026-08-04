import { describe, expect, test } from "bun:test"

import { schemaNames } from "../../contracts/schema-registry.mjs"
import { validate } from "../../contracts/validate.mjs"

const sha = (letter) => `sha256:${letter.repeat(64)}`
const ref = "evidence/record.json"
const fixtures = {
  reconciledCheckpoint: { schema: "reconciled-checkpoint", schema_version: 1, checkpoint_id: "checkpoint-a", project_id: "project-a", assignment_id: "assignment-a", generation: 1, repository: { root: "/repo", git_common_dir: "/repo/.git", remote: "origin", ref: "main" }, base_sha: "a".repeat(40), result_sha: "b".repeat(40), manifest_ref: ref, candidate_ref: ref, ledger_digest: sha("a"), runtime_projection_revision: 1, host_epoch: 1, jornada_id: "jornada-a", jornada_revision: 1, registry_revision: 1, capability_revision: 1, state: "VALID" },
  supportProposal: { schema: "support-proposal", schema_version: 1, proposal_id: "proposal-a", project_id: "project-a", caller_role: "MAIN", checkpoint_ref: ref, plan_enumeration_digest: sha("a"), ledger_digest: sha("b"), worker_claim: "claim-a", primary: { module_id: "M3.2.1", task_ids: ["T3.2.1.1"] }, alternatives: [], conflicts: [], evidence_refs: [], expires_at: "2099-01-01T00:00:00.000Z", state: "EXECUTABLE" },
  policyReportV2: { schema: "policy-report", schema_version: 2, report_id: "report-a", project_id: "project-a", proposal_ref: ref, checkpoint_ref: ref, policy_capability_ref: ref, jornada_id: "jornada-a", jornada_revision: 1, manifest_ref: ref, runtime_projection_revision: 1, decision: "ALLOW", rationale: "allowed", gates: [], expires_at: "2099-01-01T00:00:00.000Z" },
  assignmentV2: { schema: "assignment", schema_version: 2, assignment_id: "assignment-a", project_id: "project-a", proposal_ref: ref, report_ref: ref, checkpoint_ref: ref, capability_ref: ref, jornada_id: "jornada-a", jornada_revision: 1, base_sha: "a".repeat(40), host: "opencode", attempt: 1, expires_at: "2099-01-01T00:00:00.000Z", main_attestation: sha("a") },
  recoveryProof: { schema: "recovery-proof", schema_version: 1, proof_id: "proof-a", project_id: "project-a", old_claim_ref: ref, old_delivery_ref: ref, old_assignment_ref: ref, generation: 1, disposition: "NOT_STARTED", termination_pairing_ref: ref, effect_readback: {}, repository_root: "/repo", workspace_path: "/work", base_sha: "a".repeat(40), mode: "safe", runtime_binding_ref: ref, role_binding_ref: ref },
  deliveryPolicy: { schema: "delivery-policy", schema_version: 1, project_id: "project-a", source_path: "AGENTS.md", source_digest: sha("a"), revision: 1, merge: { authorizing_party: "human" }, delivery: { shape: "pull-request", target_branch: "master" }, planning: { horizon_ceiling: 1 }, documentation_close: { module: "full", session: "full" } },
}

describe("S3.2 schema contracts", () => {
  test("registers and validates all six versioned fixtures", () => {
    for (const name of Object.keys(fixtures)) {
      expect(schemaNames).toContain(name)
      expect(validate(name, fixtures[name])).toEqual(fixtures[name])
    }
  })
})
