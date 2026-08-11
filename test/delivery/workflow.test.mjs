import { describe, expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { chmodSync, linkSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

import { createDeliveryLedger } from "../../delivery/ledger.mjs"
import { executeDelivery } from "../../delivery/workflow.mjs"

const sha = (character) => character.repeat(40)
const digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`
const candidateInput = Object.freeze({
  schema: "candidate-revision", schema_version: 1,
  project_id: "project-a", plan_id: "plan-a", session_id: "S5.2", artifact_ref: "artifacts/a.json",
  base_sha: sha("a"), result_sha: sha("b"), tree_sha: sha("c"), commit_sha: sha("d"), head_sha: sha("d"),
  target: { repository: "owner/repository", branch: "master" }, assignment_id: "assignment-a", host_epoch: 1,
  policy_revision: 1, jornada_id: "jornada-a", jornada_revision: 3, manifest_revision: 1, registry_revision: 7,
  capability_revision: 1, verification_digest: `sha256:${"e".repeat(64)}`,
  policy_report_digest: `sha256:${"9".repeat(64)}`, required_checks_digest: `sha256:${"f".repeat(64)}`,
  required_reviews_digest: `sha256:${"0".repeat(64)}`,
})
const directPolicy = `# Policy\n\n\`\`\`yaml\nschema: delivery-policy\nschema_version: 1\nmerge:\n  authorizing_party: human\ndelivery:\n  shape: direct-push\n  target_branch: master\nplanning:\n  horizon_ceiling: 2\ndocumentation_close:\n  module: full\n  session: full\n\`\`\`\n`
const authorizationFor = (candidate = candidateInput, overrides = {}) => ({
  authorization_id: "auth-a", project_id: candidate.project_id, plan_id: candidate.plan_id, registry_revision: candidate.registry_revision,
  jornada_id: candidate.jornada_id, jornada_revision: candidate.jornada_revision,
  policy_report_digest: candidate.policy_report_digest, required_checks_digest: candidate.required_checks_digest,
  delivery: { shape: "direct-push", repository: candidate.target.repository, target_branch: candidate.target.branch,
    base_sha: candidate.base_sha, head_sha: candidate.head_sha }, ...overrides,
})
const errorCode = async (operation) => { try { await operation() } catch (error) { return error.code } return null }

describe("append-only delivery ledger", () => {
  test("uses candidate_revision as identity with filesystem CAS and terminal immutability", async () => {
    const root = mkdtempSync(join(tmpdir(), "ct-delivery-ledger-"))
    const ledger = createDeliveryLedger({ root, clock: () => "2026-08-10T00:00:00.000Z" })
    const candidate_revision = `sha256:${"a".repeat(64)}`
    const base = { candidate_revision, shape: "direct-push", authorization_ref: "auth-a" }

    await ledger.append({ ...base, state: "ATTEMPT_FAILED", attempt: 1, classification: "provider_unavailable" }, 0)
    await ledger.append({ ...base, state: "UNRECONCILED", attempt: 1, classification: "unknown" }, 1)

    expect((await ledger.history(candidate_revision)).map(({ revision, state }) => [revision, state])).toEqual([[1, "ATTEMPT_FAILED"], [2, "UNRECONCILED"]])
    expect(await errorCode(() => ledger.append({ ...base, state: "DELIVERED", attempt: 2 }, 0))).toBe("CT_CAS_MISMATCH")
    expect(await errorCode(() => ledger.append({ ...base, state: "DELIVERED", attempt: 2 }, 2))).toBe("CT_DELIVERY_TERMINAL")
  })
})

describe("authorized delivery workflow", () => {
  test("orders commit, exact verification, freeze, authorization admission, reconciliation, and declared delivery", async () => {
    const repository_root = mkdtempSync(join(tmpdir(), "ct-delivery-workflow-"))
    writeFileSync(join(repository_root, "AGENTS.md"), directPolicy)
    const events = []
    mkdirSync(join(repository_root, ".delivery"), { mode: 0o700 })
    const ledger = createDeliveryLedger({ root: join(repository_root, ".delivery"), clock: () => "2026-08-10T00:00:00.000Z" })
    const request = {
      candidate_input: candidateInput,
      policy_request: { repository_root, project_id: "project-a", expected_digest: digest(readFileSync(join(repository_root, "AGENTS.md"))), revision: 1 },
      authorization_store: {
        readAuthorization() { return authorizationFor() },
        admitCandidateEffect(input) { events.push(["authorization", input.candidate_revision]); return { admitted: true } },
      },
      authorization_id: "auth-a", ledger,
      commit: async () => { events.push(["commit"]); return { commit_sha: sha("d"), tree_sha: sha("c") } },
      verify: async (commit) => { events.push(["verify", commit.commit_sha, commit.tree_sha]); return true },
      reconcile: async () => { events.push(["reconcile"]); return { status: "absent" } },
      effects: {
        directPush: async () => { events.push(["push"]); return { delivered: true } },
        pullRequest: async () => { events.push(["pr"]); return { delivered: true } },
      },
    }
    const result = await executeDelivery(request)

    expect(result.status).toBe("DELIVERED")
    expect(result.shape).toBe("direct-push")
    expect(events.map(([name]) => name)).toEqual(["commit", "verify", "authorization", "reconcile", "push"])
    expect(events[2][1]).toBe(result.candidate_revision)
    expect((await ledger.history(result.candidate_revision)).at(-1).state).toBe("DELIVERED")
    events.length = 0
    expect((await executeDelivery(request)).status).toBe("DELIVERED")
    expect(events.map(([name]) => name)).toEqual(["verify", "authorization"])
  })

  test("a repository without a policy block fails closed to pull-request delivery", async () => {
    const repository_root = mkdtempSync(join(tmpdir(), "ct-delivery-default-"))
    mkdirSync(join(repository_root, ".delivery"), { mode: 0o700 })
    const ledger = createDeliveryLedger({ root: join(repository_root, ".delivery"), clock: () => "2026-08-10T00:00:00.000Z" })
    const effects = []
    const result = await executeDelivery({
      candidate_input: candidateInput,
      policy_request: { repository_root, project_id: "project-a", source_path: "AGENTS.md", expected_digest: `sha256:${"a".repeat(64)}`, revision: 1 },
      authorization_store: { readAuthorization() { return authorizationFor(candidateInput, { delivery: { ...authorizationFor().delivery, shape: "pull-request" } }) }, admitCandidateEffect() { return { admitted: true } } }, authorization_id: "auth-a", ledger,
      commit: async () => ({ commit_sha: sha("d"), tree_sha: sha("c") }), verify: async () => true,
      reconcile: async () => ({ status: "absent" }),
      effects: { directPush: async () => { effects.push("push"); return { delivered: true } }, pullRequest: async () => { effects.push("pr"); return { delivered: true } } },
    })

    expect(result.shape).toBe("pull-request")
    expect(effects).toEqual(["pr"])
  })
})
