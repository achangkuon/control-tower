import { describe, expect, test } from "bun:test"

import * as support from "../../continuation/support.mjs"

const code = (operation) => {
  try { operation() } catch (error) { return error.code }
  return null
}
const proposal = () => ({
  schema: "support-proposal", schema_version: 1, proposal_id: "proposal-a", project_id: "project-a", caller_role: "MAIN",
  checkpoint_ref: "evidence/checkpoint.json", plan_enumeration_digest: `sha256:${"a".repeat(64)}`, ledger_digest: `sha256:${"b".repeat(64)}`,
  worker_claim: "claim-a", primary: { module_id: "M5.1.2", task_ids: ["T5.1.2.1"] }, alternatives: [], conflicts: [], evidence_refs: [], expires_at: "2099-01-01T00:00:00.000Z", state: "EXECUTABLE",
})

describe("Support subagent boundary", () => {
  test("does not export a callable host bridge or mint route", () => {
    expect(support).not.toHaveProperty("admitIsolatedSupportHost")
    expect(support).not.toHaveProperty("invokeSupport")
  })

  test("adapts structured Support output only into Main persistence", () => {
    const persisted = []
    const result = support.persistSupportResult({ output: proposal(), main_store: { persistSupportProposal: (record) => { persisted.push(record); return record } } })
    expect(result).toMatchObject({ proposal_id: "proposal-a", caller_role: "MAIN" })
    expect(result).not.toHaveProperty("assignment")
    expect(persisted).toHaveLength(1)
  })

  test("fails closed on malformed output before persistence", () => {
    expect(code(() => support.persistSupportResult({ output: null, main_store: { persistSupportProposal: () => { throw new Error("must not persist") } } }))).toBe("CT_HOST_CAPABILITY_MISSING")
  })
})
