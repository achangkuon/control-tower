import { afterEach, describe, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createAgentCapabilityRegistry } from "../../capabilities/registry.mjs"
import { bindMainAuthority, createMainStore } from "../../main-store/index.mjs"

const roots = []
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))
const code = (operation) => { try { operation() } catch (error) { return error?.code } return null }
const pointer = (name) => ({
  schema: "artifact-ref", schema_version: 1, artifact_id: name, artifact_revision: 1,
  repository_id: "repository-a", repo_relative_path: `${name}.json`, media_type: "application/json",
  digest_mode: "rfc8785-jcs", source_commit: "a".repeat(40), content_digest: `sha256:${"a".repeat(64)}`,
})
const jornada = (id, overrides = {}) => ({
  schema: "jornada", schema_version: 1, jornada_id: id, jornada_revision: 1, project_id: "project-a",
  registry_revision: 7, plan_id: "plan-a", preset: "standard", preset_revision: 1,
  effective_limits: { apply_ceiling: 1 }, starts_at: "2026-01-01T00:00:00.000Z",
  expires_at: "2099-01-01T00:00:00.000Z", execution_host: "opencode", allowed_operations: ["CREATE_COMMIT"],
  manifest_ref: pointer("manifest-a"), authorization_ref: pointer("authorization-a"), state: "DRAFT", ...overrides,
})
const setup = (options = {}) => {
  const root = mkdtempSync(join(tmpdir(), "ct-jornada-")); roots.push(root)
  const binding = { project_id: "project-a", revision: 7, repository_root: "/repo/a", git_common_dir: "/repo/a/.git", remote: "git@example.invalid:a.git", branch: "main", main_session_id: "main-session-a", store_path: root, epoch: 3 }
  const authority = bindMainAuthority({ trustedBindingProvider: () => binding, rederiveBinding: () => ({ ...binding }) })
  const capability = authority.capability
  return { root, capability, authority, store: createMainStore({ root, authority, capability, ...options }) }
}

describe("Jornada lifecycle", () => {
  test("allows only matrix transitions, makes terminal states irreversible, and increments revision", () => {
    const { store } = setup()
    store.createJornada({ actor: "MAIN", ...jornada("jornada-transition") })
    expect(code(() => store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id: "jornada-transition", state: "ACTIVE", expected_revision: 1 }))).toBe("CT_JORNADA_TRANSITION")

    const pending = store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id: "jornada-transition", state: "PENDING_AUTHORIZATION", expected_revision: 1 })
    const active = store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id: "jornada-transition", state: "ACTIVE", expected_revision: pending.revision })
    const completed = store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id: "jornada-transition", state: "COMPLETED", expected_revision: active.revision })
    expect([pending, active, completed].map(({ jornada_revision }) => jornada_revision)).toEqual([2, 3, 4])
    expect(code(() => store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id: "jornada-transition", state: "ACTIVE", expected_revision: completed.revision }))).toBe("CT_JORNADA_TERMINAL")
  })

  test("reports clock-expired Jornadas through the same terminal lifecycle result", () => {
    const { store } = setup()
    const created = store.createJornada({ actor: "MAIN", ...jornada("jornada-expired", { expires_at: "2020-01-01T00:00:00.000Z" }) })
    const bytes = readFileSync(created.record_path)
    expect(store.readJornada("jornada-expired")).toEqual(expect.objectContaining({ state: "EXPIRED", revision: 1, jornada_revision: 1 }))
    expect(readFileSync(created.record_path)).toEqual(bytes)
  })

  test("covers every allowed matrix edge and rejects a disallowed edge from each nonterminal state", () => {
    const cases = [
      ["DRAFT", ["PENDING_AUTHORIZATION"], "ACTIVE"],
      ["PENDING_AUTHORIZATION", ["ACTIVE", "REJECTED", "EXPIRED"], "PAUSED"],
      ["ACTIVE", ["PAUSED", "BLOCKED", "EXPIRED", "REVOKED", "COMPLETED"], "PENDING_AUTHORIZATION"],
      ["PAUSED", ["ACTIVE", "EXPIRED", "REVOKED"], "BLOCKED"],
      ["BLOCKED", ["ACTIVE", "EXPIRED", "REVOKED"], "PAUSED"],
    ]
    const reach = (store, jornada_id, state) => {
      let current = store.createJornada({ actor: "MAIN", ...jornada(jornada_id) })
      for (const next of ({ PENDING_AUTHORIZATION: ["PENDING_AUTHORIZATION"], ACTIVE: ["PENDING_AUTHORIZATION", "ACTIVE"], PAUSED: ["PENDING_AUTHORIZATION", "ACTIVE", "PAUSED"], BLOCKED: ["PENDING_AUTHORIZATION", "ACTIVE", "BLOCKED"] }[state] ?? [])) {
        current = store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id, state: next, expected_revision: current.revision })
      }
      return current
    }
    for (const [from, allowed, disallowed] of cases) {
      for (const state of allowed) {
        const { store } = setup(), jornada_id = `jornada-${from}-${state}`.toLowerCase().replaceAll("_", "-")
        const current = reach(store, jornada_id, from)
        expect(store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id, state, expected_revision: current.revision })).toEqual(expect.objectContaining({ state, jornada_revision: current.jornada_revision + 1 }))
      }
      const { store } = setup(), jornada_id = `jornada-${from}-invalid`.toLowerCase().replaceAll("_", "-")
      const current = reach(store, jornada_id, from)
      expect(code(() => store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id, state: disallowed, expected_revision: current.revision }))).toBe("CT_JORNADA_TRANSITION")
    }
  })

  test("never leaves any terminal state", () => {
    const cases = [
      ["REJECTED", ["PENDING_AUTHORIZATION", "REJECTED"]],
      ["EXPIRED", ["PENDING_AUTHORIZATION", "EXPIRED"]],
      ["REVOKED", ["PENDING_AUTHORIZATION", "ACTIVE", "REVOKED"]],
      ["COMPLETED", ["PENDING_AUTHORIZATION", "ACTIVE", "COMPLETED"]],
    ]
    for (const [terminal, states] of cases) {
      const { store } = setup()
      const jornada_id = `jornada-${terminal.toLowerCase()}`
      let current = store.createJornada({ actor: "MAIN", ...jornada(jornada_id) })
      for (const state of states) current = store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id, state, expected_revision: current.revision })
      expect(code(() => store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id, state: "ACTIVE", expected_revision: current.revision }))).toBe("CT_JORNADA_TERMINAL")
    }
  })

  test("persists an explicit terminal transition once and leaves prior bytes intact on atomic failure", () => {
    let failTerminal = false
    const { store } = setup({ beforeCommit: (path) => { if (failTerminal && path.includes("/jornadas/")) throw new Error("forced") } })
    const created = store.createJornada({ actor: "MAIN", ...jornada("jornada-atomic") })
    const pending = store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id: "jornada-atomic", state: "PENDING_AUTHORIZATION", expected_revision: created.revision })
    const active = store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id: "jornada-atomic", state: "ACTIVE", expected_revision: pending.revision })
    const bytes = readFileSync(active.record_path)
    failTerminal = true
    expect(code(() => store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id: "jornada-atomic", state: "COMPLETED", expected_revision: active.revision }))).toBe("CT_STORE_WRITE_FAILED")
    expect(readFileSync(active.record_path)).toEqual(bytes)
    failTerminal = false
    const completed = store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id: "jornada-atomic", state: "COMPLETED", expected_revision: active.revision })
    expect(completed).toEqual(expect.objectContaining({ state: "COMPLETED", revision: 4, jornada_revision: 4 }))
  })

  test("passively invalidates a capability by Jornada revision drift without changing its registry", () => {
    const { root, authority, capability, store } = setup()
    store.createJornada({ actor: "MAIN", ...jornada("jornada-capability") })
    const pending = store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id: "jornada-capability", state: "PENDING_AUTHORIZATION", expected_revision: 1 })
    store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id: "jornada-capability", state: "ACTIVE", expected_revision: pending.revision })
    const registry = createAgentCapabilityRegistry({ registryPath: join(root, "capabilities.json"), authority, capability })
    registry.save({
      expectedRevision: 0,
      document: {
        schema: "agent-capability-registry", schema_version: 1, project_id: "project-a", main_identity: "main-session-a", registry_revision: 1,
        capabilities: [{ agent_identity: "support-a", agent_role: "SUPPORT", capability: "support-proposal", input_schema: "support-proposal", output_schema: "policy-report", source_ref: "capabilities/support.mjs", source_digest: `sha256:${"a".repeat(64)}`, jornada_id: "jornada-capability", jornada_revision: 3, expires_at: "2099-01-01T00:00:00.000Z", registry_entry_revision: 1 }],
      },
    })
    const request = (current) => ({ project_id: "project-a", agent_role: "SUPPORT", capability: "support-proposal", input_schema: "support-proposal", output_schema: "policy-report", jornada: current, now: Date.parse("2026-01-01T00:00:00.000Z") })
    expect(registry.resolve(request(store.readJornada("jornada-capability"))).agent_identity).toBe("support-a")
    const revoked = store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id: "jornada-capability", state: "REVOKED", expected_revision: 3 })
    expect(code(() => registry.resolve(request(revoked)))).toBe("CT_CAPABILITY_JORNADA_MISMATCH")
  })

  test("relies on capability expiry instead of a synthetic Jornada revision", () => {
    const { root, authority, capability, store } = setup()
    const created = store.createJornada({ actor: "MAIN", ...jornada("jornada-capability-expired", { expires_at: "2020-01-01T00:00:00.000Z" }) })
    const registry = createAgentCapabilityRegistry({ registryPath: join(root, "capabilities-expired.json"), authority, capability })
    registry.save({
      expectedRevision: 0,
      document: {
        schema: "agent-capability-registry", schema_version: 1, project_id: "project-a", main_identity: "main-session-a", registry_revision: 1,
        capabilities: [{ agent_identity: "support-a", agent_role: "SUPPORT", capability: "support-proposal", input_schema: "support-proposal", output_schema: "policy-report", source_ref: "capabilities/support.mjs", source_digest: `sha256:${"a".repeat(64)}`, jornada_id: "jornada-capability-expired", jornada_revision: 1, expires_at: "2020-01-01T00:00:00.000Z", registry_entry_revision: 1 }],
      },
    })
    const expired = store.readJornada("jornada-capability-expired")
    expect(expired.jornada_revision).toBe(created.jornada_revision)
    expect(code(() => registry.resolve({ project_id: "project-a", agent_role: "SUPPORT", capability: "support-proposal", input_schema: "support-proposal", output_schema: "policy-report", jornada: expired, now: Date.parse("2026-01-01T00:00:00.000Z") }))).toBe("CT_CAPABILITY_EXPIRED")
  })
})
