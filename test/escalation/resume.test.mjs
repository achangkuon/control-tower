import { describe, expect, test } from "bun:test"

import { createParkedDecision, createParkedDecisionResponse } from "../../contracts/parked-decision.mjs"
import { createResumeFacade } from "../../escalation/resume.mjs"

const digest = (char) => `sha256:${char.repeat(64)}`, sha = (char) => char.repeat(40)
const candidate_revision = digest("c")
const parked_decision = createParkedDecision({ schema: "parked-decision", schema_version: 1, parked_decision_id: "parked-a",
  question: "Choose.", evidence: [{ path: "plan.md", line_start: 1, line_end: 2, contradiction: "Decision required." }],
  options: [{ option_id: "option-a", label: "Resume", consequence: "Continue." }, { option_id: "option-b", label: "Stop", consequence: "Remain parked." }], origin: { session_id: "S5.5", module_id: "M5.5.4" },
  checkpoint: "checkpoint exact", decision_class: "seguridad y permisos", created_at: "2026-08-20T10:00:00Z",
  frozen_scope: { session_plan_snapshot_digest: digest("b"), session_ids: ["S5.5"], area: ["escalation/**"], resources: ["parking-ledger"] } })
const response = createParkedDecisionResponse({ parked_decision, response_id: "response-a", authorization_id: "auth-a",
  authorization_revision: 1, option_id: "option-a", responded_at: "2026-08-20T10:05:00Z" })
const parking = Object.freeze({ actor: "MAIN", project_id: "project-a", parked_decision })
const binding = Object.freeze({ parked_decision_id: "parked-a", parked_decision_digest: parked_decision.parked_decision_digest,
  parked_checkpoint: "checkpoint exact", reconciliation_state: "VALID", repository: "/repo/worktree-a", project_id: "project-a",
  assignment_id: "assignment-a", generation: 3, base_sha: sha("d"), result_sha: sha("e"), binding_digest: digest("f") })
const authorization = Object.freeze({ authorization_id: "auth-a", project_id: "project-a", state: "APPROVED", revision: 2,
  created_at: "2026-08-20T10:00:00Z", expires_at: "2026-08-20T11:00:00Z",
  extensions: { "control-tower/candidate-revision": candidate_revision }, revision_history: [{ authorization_id: "auth-a", project_id: "project-a", state: "PENDING", revision: 1, extensions: { "control-tower/candidate-revision": candidate_revision } }],
  terminal_audit: { kind: "authorization-terminal", authorization_id: "auth-a", authorization_revision: 1, decision: "APPROVED", project_id: "project-a", parked_decision_response: response } })
const context = (overrides = {}) => ({ project_id: "project-a", assignment_id: "assignment-a", repository: "/repo/worktree-a",
  generation: 3, base_sha: sha("d"), candidate_revision, ...overrides })
const error = (operation) => { try { operation() } catch (cause) { return cause }; return null }
const setup = (overrides = {}) => {
  const calls = [], ports = { readParking: (id) => { calls.push(["parking", id]); return parking },
    readParkedCheckpointBinding: (id) => { calls.push(["binding", id]); return binding },
    readAuthorization: (id) => { calls.push(["authorization", id]); return authorization }, ...overrides }
  return { calls, facade: createResumeFacade(ports) }
}

describe("resume from authoritative Main terminal evidence", () => {
  test("resumes only the exact canonical response, checkpoint, worktree, and terminal context", () => {
    const value = setup(), before = JSON.stringify({ parking, binding, authorization })
    expect(value.facade.resume({ parked_decision_id: "parked-a", authorization_id: "auth-a", current_context: context() })).toEqual({ state: "RESUME",
      checkpoint: "checkpoint exact", repository: "/repo/worktree-a", assignment_id: "assignment-a", generation: 3,
      result_sha: sha("e"), option_id: "option-a" })
    expect(value.calls).toEqual([["parking", "parked-a"], ["binding", "parked-a"], ["authorization", "auth-a"]])
    expect(JSON.stringify({ parking, binding, authorization })).toBe(before)
  })

  test("requires reconciliation for base drift and rejects foreign or non-approved terminal evidence read-only", () => {
    expect(setup().facade.resume({ parked_decision_id: "parked-a", authorization_id: "auth-a", current_context: context({ base_sha: sha("9") }) }).state).toBe("RECONCILIATION_REQUIRED")
    const cases = [
      { ...authorization, state: "EXPIRED" }, { ...authorization, terminal_audit: { ...authorization.terminal_audit, decision: "REJECTED" } },
      { ...authorization, revision_history: [{ ...authorization.revision_history[0], revision: 2 }] },
      { ...authorization, extensions: { "control-tower/candidate-revision": digest("9") } },
      { ...authorization, terminal_audit: { ...authorization.terminal_audit, parked_decision_response: { ...response, option_id: "option-b" } } },
    ]
    for (const record of cases) {
      const before = JSON.stringify(record), value = setup({ readAuthorization: () => record })
      expect(error(() => value.facade.resume({ parked_decision_id: "parked-a", authorization_id: "auth-a", current_context: context() }))?.code).toBe("CT_RESUME_EVIDENCE_INVALID")
      expect(JSON.stringify(record)).toBe(before)
    }
  })
})
