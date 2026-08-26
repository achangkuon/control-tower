import { afterEach, describe, expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { assertFloorProtected, readDeliveryPolicy, resolveDeliveryPolicy } from "../../policy/delivery-policy.mjs"

const roots = []
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))
const error = (operation) => { try { operation() } catch (caught) { return caught } return null }
const code = (operation) => error(operation)?.code ?? null
const policy = (overrides = {}) => ({ schema: "delivery-policy", schema_version: 1, project_id: "project-a", source_path: "AGENTS.md", source_digest: `sha256:${"a".repeat(64)}`, revision: 1, merge: { authorizing_party: "automatic" }, delivery: { shape: "direct-push", target_branch: "main" }, planning: { horizon_ceiling: 3 }, ...overrides })
const writePolicy = (contents) => {
  const root = mkdtempSync(join(tmpdir(), "ct-policy-")); roots.push(root)
  const file = join(root, "AGENTS.md"); writeFileSync(file, contents)
  return { root, file }
}

describe("delivery-policy resolution", () => {
  test("fails closed for absent, malformed, unknown, and unbound policy", () => {
    expect(resolveDeliveryPolicy({}).code).toBe("CT_POLICY_UNRESOLVED")
    expect(readDeliveryPolicy(writePolicy("# no block")).code).toBe("CT_POLICY_UNRESOLVED")
    expect(readDeliveryPolicy(writePolicy("```yaml\nschema: delivery-policy\nschema_version: 1\ndelivery: [\n```")).code).toBe("CT_POLICY_UNRESOLVED")
    expect(resolveDeliveryPolicy({ global_policy: policy({ delivery: { shape: "unknown", target_branch: "main" } }), project_policy: policy() }).code).toBe("CT_POLICY_UNRESOLVED")
  })

  test("resolves the reduced coordination-only policy", () => {
    const resolved = resolveDeliveryPolicy({ global_policy: policy(), project_policy: policy() })
    expect(resolved.resolved).toBe(true)
    expect(Object.keys(resolved).sort()).toEqual(["delivery", "merge", "planning", "resolved"])
  })

  test("fails closed for an unknown root policy field", () => {
    expect(resolveDeliveryPolicy({ global_policy: policy({ unexpected: true }), project_policy: policy() }).code).toBe("CT_POLICY_UNRESOLVED")
  })

  test("fails closed for an unknown nested policy field", () => {
    expect(resolveDeliveryPolicy({ global_policy: policy({ delivery: { shape: "direct-push", target_branch: "main", unexpected: true } }), project_policy: policy() }).code).toBe("CT_POLICY_UNRESOLVED")
  })

  test("anchors reads to the canonical root and verified digest", () => {
    const source = "```yaml\nschema: delivery-policy\nschema_version: 1\nmerge:\n  authorizing_party: human\ndelivery:\n  shape: pull-request\n  target_branch: master\nplanning:\n  horizon_ceiling: 1\n```"
    const { root, file } = writePolicy(source)
    const digest = `sha256:${createHash("sha256").update(source).digest("hex")}`
    expect(readDeliveryPolicy({ repository_root: root }).code).toBe("CT_POLICY_UNRESOLVED")
    expect(readDeliveryPolicy({ repository_root: root, project_id: "project-a", expected_digest: digest }).resolved).toBe(true)
    expect(readDeliveryPolicy({ repository_root: root, expected_digest: `sha256:${"a".repeat(64)}` }).code).toBe("CT_POLICY_UNRESOLVED")
    expect(readDeliveryPolicy({ repository_root: root, source_path: "../AGENTS.md" }).code).toBe("CT_POLICY_UNRESOLVED")
    const linked = join(root, "linked.md"); symlinkSync(file, linked)
    expect(readDeliveryPolicy({ repository_root: root, source_path: "linked.md" }).code).toBe("CT_POLICY_UNRESOLVED")
    const foreign = mkdtempSync(join(tmpdir(), "ct-policy-foreign-")); roots.push(foreign); mkdirSync(join(foreign, "nested")); writeFileSync(join(foreign, "nested", "AGENTS.md"), source)
    expect(readDeliveryPolicy({ repository_root: foreign, source_path: join(root, "AGENTS.md") }).code).toBe("CT_POLICY_UNRESOLVED")
  })

  test("inherits only stricter values and rejects every security floor", () => {
    const resolved = resolveDeliveryPolicy({ global_policy: policy({ merge: { authorizing_party: "human" }, delivery: { shape: "pull-request", target_branch: "master" }, planning: { horizon_ceiling: 2 } }), project_policy: policy() })
    expect(resolved).toMatchObject({ resolved: true, merge: { authorizing_party: "human" }, delivery: { shape: "pull-request", target_branch: "master" }, planning: { horizon_ceiling: 2 } })
    for (const floor of ["EARLY_REMOTE_MUTATION", "FROZEN_CANDIDATE_REWRITE", "LEDGER_DELETION", "WORKER_SELF_ASSIGNMENT", "NON_MAIN_DISPATCH"]) {
      const rejected = error(() => assertFloorProtected({ floor, exception: {} }))
      expect(rejected).toMatchObject({ code: "CT_POLICY_DENIED" })
      expect(rejected.message).toContain(floor)
    }
  })
})
