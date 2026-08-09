import { afterEach, describe, expect, test } from "bun:test"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { emitDecisionRequest } from "../../escalation/request.mjs"
import { bindMainAuthority, createMainStore } from "../../main-store/index.mjs"

const roots = []
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))

const candidateRevision = `sha256:${"d".repeat(64)}`
const authorization = (id = "decision-a") => ({
  schema: "authorization",
  schema_version: 1,
  authorization_id: id,
  action: "MERGE",
  project_id: "project-a",
  registry_revision: 7,
  plan_id: "plan-a",
  jornada_id: "jornada-a",
  jornada_revision: 3,
  delivery: {
    shape: "direct-push",
    repository: "owner/repository",
    target_branch: "master",
    base_sha: "a".repeat(40),
    head_sha: "b".repeat(40),
  },
  required_checks_digest: `sha256:${"a".repeat(64)}`,
  policy_report_digest: `sha256:${"b".repeat(64)}`,
  created_at: "2099-01-01T00:00:00.000Z",
  expires_at: "2099-01-01T01:00:00.000Z",
  nonce_hash: `sha256:${"c".repeat(64)}`,
  extensions: { "control-tower/candidate-revision": candidateRevision },
})
const origin = Object.freeze({ session_id: "S5.4", module_id: "M5.4.1", task_id: "T5.4.1.1" })
const code = (operation) => {
  try { operation() } catch (error) { return error?.code }
  return null
}

describe("decision request emission", () => {
  test("persists an exact target, origin, and expiry through the S5.1 authorization-store port", () => {
    const calls = []
    const authorizationStore = {
      createAuthorization(input) {
        calls.push(structuredClone(input))
        return Object.freeze({ ...input, state: "PENDING", revision: 1 })
      },
    }

    const result = emitDecisionRequest({
      authorizationStore,
      authorization: authorization(),
      target: "Choose whether deployment window A is approved",
      origin,
    })

    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      actor: "MAIN",
      expires_at: "2099-01-01T01:00:00.000Z",
      extensions: {
        "control-tower/decision-target": "Choose whether deployment window A is approved",
        "control-tower/decision-origin": origin,
      },
    })
    expect(result).toMatchObject({ authorization_id: "decision-a", state: "PENDING", revision: 1 })
  })

  test("fails closed before store access when target, origin, or expiry is not exact", () => {
    let calls = 0
    const authorizationStore = { createAuthorization() { calls += 1 } }
    const base = { authorizationStore, authorization: authorization(), target: "Approve exact candidate A", origin }

    expect(code(() => emitDecisionRequest({ ...base, target: "  " }))).toBe("CT_ESCALATION_TARGET_INVALID")
    expect(code(() => emitDecisionRequest({ ...base, origin: { session_id: "S5.4", module_id: "M5.4.1" } }))).toBe("CT_ESCALATION_ORIGIN_INVALID")
    expect(code(() => emitDecisionRequest({ ...base, authorization: { ...base.authorization, expires_at: "ambiguous" } }))).toBe("CT_ESCALATION_EXPIRY_INVALID")
    expect(code(() => emitDecisionRequest({ ...base, authorizationStore: null }))).toBe("CT_ESCALATION_STORE_INVALID")
    expect(calls).toBe(0)
  })

  test("integrates with the canonical S5.1 store without a second request ledger", () => {
    const root = mkdtempSync(join(tmpdir(), "ct-escalation-store-")); roots.push(root)
    const binding = { project_id: "project-a", revision: 7, repository_root: "/repo/a", git_common_dir: "/repo/a/.git", remote: "git@example.invalid:a.git", branch: "master", main_session_id: "main-a", store_path: root, epoch: 3 }
    const authority = bindMainAuthority({ trustedBindingProvider: () => binding, rederiveBinding: () => ({ ...binding }) })
    const store = createMainStore({ root, authority, capability: authority.capability })

    emitDecisionRequest({ authorizationStore: store, authorization: authorization("decision-real"), target: "Approve exact candidate B", origin })

    const recordPath = join(root, "authorizations", "decision-real.json")
    expect(existsSync(recordPath)).toBe(true)
    expect(JSON.parse(readFileSync(recordPath, "utf8"))).toMatchObject({
      state: "PENDING",
      extensions: {
        "control-tower/decision-target": "Approve exact candidate B",
        "control-tower/decision-origin": origin,
      },
    })
    expect(existsSync(join(root, "escalation-requests"))).toBe(false)
  })
})
