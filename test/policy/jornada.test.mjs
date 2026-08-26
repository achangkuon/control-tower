import { describe, expect, test } from "bun:test"

import { resolveEligibility } from "../../policy/jornada.mjs"

const code = (operation) => { try { operation() } catch (error) { return error?.code } return null }
const input = () => ({
  caller_role: "MAIN",
  jornada: { jornada_id: "jornada-a", jornada_revision: 1, project_id: "project-a", state: "ACTIVE", execution_host: "opencode", expires_at: "2099-01-01T00:00:00.000Z" },
  proposal: { proposal_id: "proposal-a", project_id: "project-a", state: "EXECUTABLE", worker_claim: "claim-a" },
  report: { project_id: "project-a", jornada_id: "jornada-a", jornada_revision: 1, decision: "ALLOW", expires_at: "2099-01-01T00:00:00.000Z" },
  policy: { resolved: true, planning: { horizon_ceiling: 2 } },
  worker_claim: "claim-a",
  execution_host: "opencode",
  horizon: 2,
})
const authorization = () => ({
  schema: "authorization",
  schema_version: 1,
  authorization_id: "authorization-a",
  action: "MERGE",
  project_id: "project-a",
  registry_revision: 1,
  plan_id: "plan-a",
  jornada_id: "jornada-a",
  jornada_revision: 1,
  delivery: { shape: "direct-push", repository: "owner/repository", target_branch: "master", base_sha: "a".repeat(40), head_sha: "b".repeat(40) },
  policy_report_digest: `sha256:${"b".repeat(64)}`,
  created_at: "2026-01-01T00:00:00.000Z",
  expires_at: "2099-01-01T00:00:00.000Z",
  nonce_hash: `sha256:${"c".repeat(64)}`,
  state: "PENDING",
})

describe("Jornada eligibility", () => {
  test("allows only a current executable scope within the resolved horizon", () => {
    expect(resolveEligibility(input())).toEqual({ eligible: true, project_id: "project-a", proposal_id: "proposal-a", horizon: 2 })
    expect(code(() => resolveEligibility({ ...input(), horizon: 3 }))).toBe("CT_HORIZON_EXCEEDED")
  })

  test("rejects inactive or expired Jornada and stale reports", () => {
    expect(code(() => resolveEligibility({ ...input(), jornada: { ...input().jornada, state: "PAUSED" } }))).toBe("CT_REPORT_STALE")
    expect(code(() => resolveEligibility({ ...input(), jornada: { ...input().jornada, expires_at: "2020-01-01T00:00:00.000Z" } }))).toBe("CT_REPORT_STALE")
    expect(code(() => resolveEligibility({ ...input(), report: { ...input().report, expires_at: "2020-01-01T00:00:00.000Z" } }))).toBe("CT_REPORT_STALE")
  })

  test("rejects denial, expansion, claim mismatch, missing scope, and irreversible actions", () => {
    expect(code(() => resolveEligibility({ ...input(), report: { ...input().report, decision: "DENY" } }))).toBe("CT_POLICY_DENIED")
    expect(code(() => resolveEligibility({ ...input(), proposal: { ...input().proposal, state: "NO_SCOPE" } }))).toBe("CT_NO_EXECUTABLE_SCOPE")
    expect(code(() => resolveEligibility({ ...input(), worker_claim: "claim-b" }))).toBe("CT_CLAIM_MISMATCH")
    expect(code(() => resolveEligibility({ ...input(), action: { irreversible: true } }))).toBe("CT_POLICY_DENIED")
    expect(code(() => resolveEligibility({ ...input(), proposal: { ...input().proposal, project_id: "project-b" } }))).toBe("CT_REPORT_STALE")
    expect(code(() => resolveEligibility({ ...input(), host_capable: false }))).toBe("CT_HOST_CAPABILITY_MISSING")
  })

  test("rejects ALLOW reports bound to another Jornada or revision", () => {
    expect(code(() => resolveEligibility({ ...input(), report: { ...input().report, jornada_id: "jornada-b" } }))).toBe("CT_REPORT_STALE")
    expect(code(() => resolveEligibility({ ...input(), report: { ...input().report, jornada_revision: 2 } }))).toBe("CT_REPORT_STALE")
  })

  test("rejects a capable host when it is not the Jornada execution host", () => {
    expect(code(() => resolveEligibility({ ...input(), execution_host: "claude", host_capable: true }))).toBe("CT_HOST_CAPABILITY_MISSING")
  })

  test("rejects a partial authorization that only satisfies the eligibility subset", () => {
    expect(code(() => resolveEligibility({ ...input(), action: { irreversible: true, authorization: { forged: true } } }))).toBe("CT_POLICY_DENIED")
    expect(code(() => resolveEligibility({ ...input(), action: { irreversible: true, authorization: {
      schema: "authorization", schema_version: 1, state: "PENDING", action: "MERGE",
      project_id: "project-a", jornada_id: "jornada-a", jornada_revision: 1,
    } } }))).toBe("CT_POLICY_DENIED")
  })

  test("allows a fully canonical pending merge authorization bound to the current Jornada", () => {
    expect(resolveEligibility({ ...input(), action: { irreversible: true, authorization: authorization() } }))
      .toEqual({ eligible: true, project_id: "project-a", proposal_id: "proposal-a", horizon: 2 })
  })
})
