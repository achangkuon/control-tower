import { afterEach, describe, expect, test } from "bun:test"
import * as nodeFs from "node:fs"
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { bindMainAuthority } from "../../main-store/authority.mjs"
import { createAgentCapabilityRegistry } from "../../capabilities/registry.mjs"
import { createProjectRegistryStore } from "../../registry/store.mjs"

const roots = []
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))
const root = () => { const value = mkdtempSync(join(tmpdir(), "ct-capabilities-")); roots.push(value); return value }
const code = (operation) => { try { operation() } catch (error) { return error.code } return null }
const assertParity = (capabilityCode, projectCode, expected) => {
  expect(capabilityCode).toBe(expected)
  expect(projectCode).toBe(expected)
  expect(capabilityCode).toBe(projectCode)
}
const binding = (project_id, revision = 1) => ({
  project_id, revision, repository_root: `/repo/${project_id}`, git_common_dir: `/repo/${project_id}/.git`,
  remote: `git@example.invalid:${project_id}.git`, branch: "main", main_session_id: `${project_id}-main`, store_path: `/store/${project_id}`, epoch: 1,
})
const authorityFor = (project_id, revision = 1) => {
  const trusted = binding(project_id, revision)
  const authority = bindMainAuthority({ trustedBindingProvider: () => trusted, rederiveBinding: () => ({ ...trusted }) })
  return { authority, capability: authority.capability }
}
const entry = (role = "SUPPORT", capability = "support-proposal", revision = 1) => ({
  agent_identity: `${role.toLowerCase()}-a`, agent_role: role, capability,
  input_schema: "support-proposal", output_schema: "policy-report",
  source_ref: `capabilities/${role.toLowerCase()}.mjs`, source_digest: `sha256:${"a".repeat(64)}`,
  jornada_id: "jornada-a", jornada_revision: 1, expires_at: "2099-01-01T00:00:00.000Z",
  registry_entry_revision: revision,
})
const document = (project_id = "project-a", registry_revision = 1, capabilities = [entry()]) => ({
  schema: "agent-capability-registry", schema_version: 1, project_id, main_identity: `${project_id}-main`, registry_revision, capabilities,
})
const projectDocument = (registry_revision = 1) => ({
  schema: "project-registry", schema_version: 1, registry_revision,
  projects: [{ project_id: "project-a", aliases: ["project-a"], canonical_root: "/projects/a", git_common_dir: "/projects/a/.git", expected_remote: "git@example.invalid:a.git", main_branch: "main", main_session: "project-a-main", manifest_path: "openspec/plans/manifest.yaml", roadmap_path: "openspec/plans/master-index.md", main_store_path: "/state/a", allowed_hosts: ["opencode"], registry_entry_revision: 1 }],
})
const request = (overrides = {}) => ({
  project_id: "project-a", agent_role: "SUPPORT", capability: "support-proposal",
  input_schema: "support-proposal", output_schema: "policy-report",
  jornada: { jornada_id: "jornada-a", jornada_revision: 1 }, now: Date.parse("2026-01-01T00:00:00.000Z"),
  ...overrides,
})
const makeRegistry = ({ project_id = "project-a", options = {} } = {}) => {
  const home = root(), registryPath = join(home, "state/capabilities.json")
  const { authority, capability } = authorityFor(project_id)
  return { registryPath, authority, capability, registry: createAgentCapabilityRegistry({ registryPath, authority, capability, ...options }) }
}

describe("agent capability registry", () => {
  test("resolves only the matching project, role, capability, and invoked schemas", () => {
    const alpha = makeRegistry(), beta = makeRegistry({ project_id: "project-b" })
    alpha.registry.save({ document: document(), expectedRevision: 0 })
    beta.registry.save({ document: document("project-b"), expectedRevision: 0 })

    expect(alpha.registry.resolve(request()).agent_identity).toBe("support-a")
    expect(code(() => alpha.registry.resolve(request({ project_id: "project-b" })))).toBe("CT_CAPABILITY_PROJECT_MISMATCH")
    expect(code(() => alpha.registry.resolve(request({ agent_role: "POLICY" })))).toBe("CT_CAPABILITY_UNAVAILABLE")
    expect(code(() => alpha.registry.resolve(request({ input_schema: "policy-report" })))).toBe("CT_CAPABILITY_SCHEMA_DRIFT")
    expect(code(() => alpha.registry.resolve(request({ output_schema: "support-proposal" })))).toBe("CT_CAPABILITY_SCHEMA_DRIFT")
  })

  test("fails closed on missing or drifted Jornada bindings and expiry", () => {
    const { registry } = makeRegistry()
    registry.save({ document: document(), expectedRevision: 0 })
    expect(code(() => registry.resolve(request({ jornada: undefined })))).toBe("CT_CAPABILITY_JORNADA_MISMATCH")
    expect(code(() => registry.resolve(request({ jornada: { jornada_id: "jornada-a", jornada_revision: 2 } })))).toBe("CT_CAPABILITY_JORNADA_MISMATCH")
    expect(code(() => registry.resolve(request({ now: Date.parse("2100-01-01T00:00:00.000Z") })))).toBe("CT_CAPABILITY_EXPIRED")
  })

  test("invalidates every R1 binding when a CAS update creates R2", () => {
    const { registry } = makeRegistry()
    registry.save({ document: document(), expectedRevision: 0 })
    const binding = registry.resolve(request())
    const changed = document("project-a", 2, [{ ...entry("SUPPORT", "support-proposal", 2), source_ref: "capabilities/support-v2.mjs" }])
    registry.save({ document: changed, expectedRevision: 1 })
    expect(code(() => registry.resolve(request({ binding })))).toBe("CT_CAPABILITY_BINDING_STALE")
    expect(code(() => registry.resolve(request({ binding, now: Date.parse("2100-01-01T00:00:00.000Z") })))).toBe("CT_CAPABILITY_BINDING_STALE")
  })

  test("starts new entries at one and changes entry revisions only for canonical content changes", () => {
    const { registry } = makeRegistry()
    registry.save({ document: document(), expectedRevision: 0 })
    expect(code(() => registry.save({ document: document("project-a", 2, [entry("SUPPORT", "support-proposal", 2)]), expectedRevision: 1 }))).toBe("CT_CAS_MISMATCH")
    expect(registry.save({ document: document("project-a", 2, [{ ...entry(), source_ref: "capabilities/next.mjs", registry_entry_revision: 2 }]), expectedRevision: 1 }).capabilities[0].registry_entry_revision).toBe(2)
    expect(code(() => registry.save({ document: document("project-a", 3, [{ ...entry(), source_ref: "capabilities/next.mjs", registry_entry_revision: 3 }]), expectedRevision: 2 }))).toBe("CT_CAS_MISMATCH")
  })

  test("requires the asserted Main capability and has no self-registration surface", () => {
    const { registryPath, authority } = makeRegistry()
    expect(code(() => createAgentCapabilityRegistry({ registryPath, authority }).save({ document: document(), expectedRevision: 0 }))).toBe("CT_AUTH_INVALID")
    expect(Object.keys(makeRegistry().registry).sort()).toEqual(["load", "resolve", "save"])
  })

  test("matches project-registry rejection codes for unsafe atomic write boundaries", () => {
    const cases = ["symlink", "modes", "foreign-owner", "busy-lock", "stale-revision"]
    for (const scenario of cases) {
      const home = root(), capabilityPath = join(home, "cap/state.json"), projectPath = join(home, "project/state.json")
      const { authority, capability } = authorityFor("project-a")
      const capabilities = createAgentCapabilityRegistry({ registryPath: capabilityPath, authority, capability, lockTimeoutMs: 0 })
      const projects = createProjectRegistryStore({ registryPath: projectPath, lockTimeoutMs: 0 })
      if (scenario === "symlink") {
        mkdirSync(dirname(capabilityPath), { recursive: true, mode: 0o700 }); mkdirSync(dirname(projectPath), { recursive: true, mode: 0o700 })
        const target = join(home, "target"); writeFileSync(target, "{}", { mode: 0o600 }); symlinkSync(target, capabilityPath); symlinkSync(target, projectPath)
        assertParity(code(() => capabilities.load()), code(() => projects.load()), "CT_REGISTRY_UNSAFE")
      } else if (scenario === "modes") {
        capabilities.save({ document: document(), expectedRevision: 0 }); projects.save({ document: projectDocument(), expectedRevision: 0 })
        nodeFs.chmodSync(capabilityPath, 0o644); nodeFs.chmodSync(projectPath, 0o644)
        assertParity(code(() => capabilities.load()), code(() => projects.load()), "CT_REGISTRY_UNSAFE")
      } else if (scenario === "foreign-owner") {
        capabilities.save({ document: document(), expectedRevision: 0 }); projects.save({ document: projectDocument(), expectedRevision: 0 })
        const fs = { ...nodeFs, lstatSync: (path) => {
          const stats = nodeFs.lstatSync(path), altered = Object.create(stats)
          Object.defineProperty(altered, "uid", { value: -1 })
          return altered
        } }
        const unsafeCapabilities = createAgentCapabilityRegistry({ registryPath: capabilityPath, authority, capability, fs })
        const unsafeProjects = createProjectRegistryStore({ registryPath: projectPath, fs })
        assertParity(code(() => unsafeCapabilities.load()), code(() => unsafeProjects.load()), "CT_REGISTRY_UNSAFE")
      } else if (scenario === "busy-lock") {
        mkdirSync(dirname(capabilityPath), { recursive: true, mode: 0o700 }); mkdirSync(dirname(projectPath), { recursive: true, mode: 0o700 }); writeFileSync(`${capabilityPath}.lock`, "", { mode: 0o600 }); writeFileSync(`${projectPath}.lock`, "", { mode: 0o600 })
        assertParity(code(() => capabilities.save({ document: document(), expectedRevision: 0 })), code(() => projects.save({ document: projectDocument(), expectedRevision: 0 })), "CT_REGISTRY_BUSY")
      } else {
        capabilities.save({ document: document(), expectedRevision: 0 }); projects.save({ document: projectDocument(), expectedRevision: 0 })
        assertParity(code(() => capabilities.save({ document: document("project-a", 2, [entry("SUPPORT", "support-proposal", 2)]), expectedRevision: 0 })), code(() => projects.save({ document: projectDocument(2), expectedRevision: 0 })), "CT_CAS_MISMATCH")
      }
    }
  })

  test("does not turn resolution into authority or a Support-to-Worker route", () => {
    const { registry } = makeRegistry()
    registry.save({ document: document(), expectedRevision: 0 })
    const resolved = registry.resolve(request())
    expect(resolved).toEqual(expect.objectContaining({ agent_role: "SUPPORT", capability: "support-proposal" }))
    expect(JSON.stringify(resolved)).not.toContain("authority")
    expect(JSON.stringify(resolved)).not.toContain("WORKER")
  })
})
