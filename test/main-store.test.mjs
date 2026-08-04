import { afterEach, describe, expect, test } from "bun:test"
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { bindMainAuthority, createMainStore } from "../main-store/index.mjs"

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const temporaryDirectories = []
afterEach(() => temporaryDirectories.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })))

const binding = Object.freeze({
  project_id: "project-a",
  revision: 7,
  repository_root: "/repo/a",
  git_common_dir: "/repo/a/.git",
  remote: "git@example.invalid:a.git",
  branch: "main",
  main_session_id: "main-session-a",
  store_path: "/store/a",
  epoch: 3,
})
const setup = (options = {}) => {
  const root = mkdtempSync(join(tmpdir(), "ct-main-store-"))
  temporaryDirectories.push(root)
  const trustedBinding = Object.freeze({ ...binding, store_path: root })
  let providerCalls = 0
  const authority = bindMainAuthority({
    trustedBindingProvider: () => { providerCalls += 1; return trustedBinding },
    rederiveBinding: () => ({ ...trustedBinding }),
  })
  const capability = authority.capability
  const store = createMainStore({ root, authority, capability, ...options })
  return { authority, capability, root, store, providerCalls: () => providerCalls }
}
const code = (operation) => {
  try { operation() } catch (error) { return error?.code }
  return null
}
// A record that satisfies authorization-v1 and binds to the test binding above.
// `direct-push` is deliberate: the delivery shape is project policy, so the
// store must accept an authorization that never involves a pull request.
const authorizationRecord = (id) => ({
  schema: "authorization",
  schema_version: 1,
  authorization_id: id,
  action: "MERGE",
  project_id: "project-a",
  registry_revision: 7,
  plan_id: "plan-a",
  jornada_id: "jornada-a",
  jornada_revision: 1,
  delivery: {
    shape: "direct-push",
    repository: "owner/repository",
    target_branch: "master",
    base_sha: "a".repeat(40),
    head_sha: "b".repeat(40),
  },
  required_checks_digest: `sha256:${"a".repeat(64)}`,
  policy_report_digest: `sha256:${"b".repeat(64)}`,
  created_at: "2026-01-01T00:00:00Z",
  expires_at: "2099-01-01T00:00:00.000Z",
  nonce_hash: `sha256:${"c".repeat(64)}`,
})
const ref = (name) => Object.freeze({
  artifact_id: name,
  artifact_revision: 1,
  content_digest: `sha256:${name.padEnd(64, "0").slice(0, 64)}`,
})

describe("startup-only Main authority", () => {
  test("mints one unforgeable capability from a rederived trusted binding", () => {
    const { authority, capability, providerCalls } = setup()
    expect(providerCalls()).toBe(1)
    expect(JSON.stringify(capability)).toBe("{}")
    expect(code(() => authority.assert({}))).toBe("CT_AUTH_INVALID")
    expect(authority.assert(capability).project_id).toBe("project-a")
  })

  test("fails closed on changed binding facts and every non-Main actor", () => {
    expect(code(() => bindMainAuthority({
      trustedBindingProvider: () => binding,
      rederiveBinding: () => ({ ...binding, branch: "worker" }),
    }))).toBe("CT_AUTH_INVALID")

    const { store } = setup()
    for (const actor of ["MAINTAINER", "WORKER_CWD", "HERMES", "SUPPORT", "POLICY", "PLANNING", "IMPLEMENTATION", "WORKSPACE_MANAGER", "HOST_LAUNCHER", "TOWER", "FOREIGN_CAMPAIGN_LEADER"]) {
      expect(code(() => store.persistReport({ actor, project_id: "project-a", artifact_ref: ref(actor) }))).toBe("CT_AUTH_INVALID")
    }
  })

  test("rejects a store root different from the trusted absolute store_path", () => {
    const trustedRoot = mkdtempSync(join(tmpdir(), "ct-main-trusted-"))
    const differentRoot = mkdtempSync(join(tmpdir(), "ct-main-different-"))
    temporaryDirectories.push(trustedRoot, differentRoot)
    const trustedBinding = Object.freeze({ ...binding, store_path: trustedRoot })
    const authority = bindMainAuthority({
      trustedBindingProvider: () => trustedBinding,
      rederiveBinding: () => ({ ...trustedBinding }),
    })
    expect(code(() => createMainStore({ root: differentRoot, authority, capability: authority.capability }))).toBe("CT_AUTH_INVALID")
  })

  test("rejects a capability minted by a different authority instance", () => {
    const rootA = mkdtempSync(join(tmpdir(), "ct-main-authority-a-"))
    const rootB = mkdtempSync(join(tmpdir(), "ct-main-authority-b-"))
    temporaryDirectories.push(rootA, rootB)
    const bind = (project_id, root) => {
      const trustedBinding = { ...binding, project_id, store_path: root }
      return bindMainAuthority({
        trustedBindingProvider: () => trustedBinding,
        rederiveBinding: () => ({ ...trustedBinding }),
      })
    }
    const authorityA = bind("project-a", rootA)
    const authorityB = bind("project-b", rootB)

    expect(code(() => createMainStore({ root: rootB, authority: authorityB, capability: authorityA.capability }))).toBe("CT_AUTH_INVALID")
  })

  test("accepts only its live capability and rejects revoked or forged candidates", () => {
    const { authority, capability } = setup()
    expect(authority.assert(capability).project_id).toBe("project-a")
    expect(authority.revoke(capability)).toBe(true)
    expect(code(() => authority.assert(capability))).toBe("CT_AUTH_INVALID")
    expect(code(() => authority.assert(Object.freeze(Object.create(null))))).toBe("CT_AUTH_INVALID")
  })
})

describe("atomic owner-only Main store", () => {
  test("uses owner-only modes, rejects credentials, and preserves committed bytes on failure", () => {
    let failBeforeCommit = false
    const { root, store } = setup({ beforeCommit: () => { if (failBeforeCommit) throw new Error("forced") } })
    const first = store.persistReport({ actor: "MAIN", project_id: "project-a", artifact_ref: ref("report-a") })
    expect(statSync(root).mode & 0o777).toBe(0o700)
    expect(statSync(first.record_path).mode & 0o777).toBe(0o600)
    const original = readFileSync(first.record_path)

    expect(code(() => store.persistCampaign({ actor: "MAIN", project_id: "project-a", campaign_id: "secret", api_token: "nope" }))).toBe("CT_CREDENTIAL_FORBIDDEN")
    failBeforeCommit = true
    expect(code(() => store.persistReport({ actor: "MAIN", project_id: "project-a", artifact_ref: ref("report-a"), expected_revision: 1 }))).toBe("CT_STORE_WRITE_FAILED")
    expect(readFileSync(first.record_path)).toEqual(original)
    expect(readdirSync(dirname(first.record_path)).some((name) => name.includes(".tmp"))).toBe(false)
  })

  test("enforces CAS and foreign-project separation without changing prior state", () => {
    const { root, store } = setup()
    const first = store.persistCampaign({ actor: "MAIN", project_id: "project-a", campaign_id: "campaign-a", expected_revision: 0 })
    const before = readFileSync(first.record_path)
    expect(code(() => store.persistCampaign({ actor: "MAIN", project_id: "project-a", campaign_id: "campaign-a", expected_revision: 0 }))).toBe("CT_CAS_MISMATCH")
    expect(code(() => store.persistCampaign({ actor: "MAIN", project_id: "project-b", campaign_id: "campaign-b", expected_revision: 0 }))).toBe("CT_PROJECT_MISMATCH")
    expect(readFileSync(first.record_path)).toEqual(before)
    expect(readdirSync(join(root, "campaigns")).length).toBe(1)
  })

  test("persists the Main actor on every authority record", () => {
    const { store } = setup()
    const campaign = store.persistCampaign({ actor: "MAIN", project_id: "project-a", campaign_id: "campaign-actor", expected_revision: 0 })
    expect(campaign.actor).toBe("MAIN")
    expect(JSON.parse(readFileSync(campaign.record_path, "utf8")).actor).toBe("MAIN")
    expect(code(() => store.persistCampaign({ project_id: "project-a", campaign_id: "campaign-no-actor", expected_revision: 0 }))).toBe("CT_AUTH_INVALID")
  })

  test("permits exactly one concurrent CAS writer at one expected revision", async () => {
    const { root, store } = setup()
    store.persistCampaign({ actor: "MAIN", project_id: "project-a", campaign_id: "campaign-race", expected_revision: 0 })
    const worker = String.raw`
      import { existsSync, writeFileSync } from "node:fs";
      import { bindMainAuthority, createMainStore } from "./main-store/index.mjs";
      const [root, id] = process.argv.slice(1); const binding = { project_id:"project-a", revision:7, repository_root:"/repo/a", git_common_dir:"/repo/a/.git", remote:"git@example.invalid:a.git", branch:"main", main_session_id:"main-session-a", store_path:root, epoch:3 };
      const authority = bindMainAuthority({ trustedBindingProvider:()=>binding, rederiveBinding:()=>({...binding}) });
      const store = createMainStore({ root, authority, capability:authority.capability, beforeCommit:()=>{ writeFileSync(root+"/ready-"+id, "1"); while (!(existsSync(root+"/ready-a") && existsSync(root+"/ready-b"))) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,2); } });
      try { const result=store.persistCampaign({ actor:"MAIN", project_id:"project-a", campaign_id:"campaign-race", expected_revision:1, writer:id }); console.log(JSON.stringify({ok:true,revision:result.revision})); } catch(error) { console.log(JSON.stringify({ok:false,code:error.code})); }
    `
    const run = (id) => Bun.spawn([process.execPath, "-e", worker, root, id], { cwd: projectRoot, env: { ...process.env, BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0" }, stdout: "pipe", stderr: "pipe" })
    const processes = [run("a"), run("b")]
    const results = await Promise.all(processes.map(async (process) => {
      const output = await new Response(process.stdout).text()
      await process.exited
      return JSON.parse(output.trim())
    }))
    expect(results.filter(({ ok }) => ok)).toHaveLength(1)
    expect(results.filter(({ code }) => code === "CT_CAS_MISMATCH")).toHaveLength(1)
    expect(JSON.parse(readFileSync(join(root, "campaigns", "campaign-race.json"), "utf8")).revision).toBe(2)
  })

  test("moves exact authorizations out of PENDING once and appends terminal audit evidence", () => {
    const { store } = setup()
    const exact = { actor: "MAIN", ...authorizationRecord("auth-a") }
    expect(store.createAuthorization(exact).state).toBe("PENDING")
    const consumed = store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-a", decision: "APPROVED", expected_revision: 1 })
    expect(consumed.state).toBe("APPROVED")
    expect(consumed.audit_ref.kind).toBe("authorization-terminal")
    expect(code(() => store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-a", decision: "REVOKED", expected_revision: 2 }))).toBe("CT_AUTH_TERMINAL")
    expect(store.readAuthorization("auth-a").state).toBe("APPROVED")
  })

  test("rejects consumption after an authorization expires", () => {
    const { store } = setup()
    store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-expired"), expires_at: "2020-01-01T00:00:00.000Z" })
    expect(code(() => store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-expired", decision: "APPROVED", expected_revision: 1 }))).toBe("CT_AUTH_EXPIRED")
    expect(store.readAuthorization("auth-expired").state).toBe("PENDING")
  })

  test("rejects an unparseable persisted authorization expiry before consumption", () => {
    const { store } = setup()
    const created = store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-malformed-expiry") })
    writeFileSync(created.record_path, `${JSON.stringify({ ...store.readAuthorization("auth-malformed-expiry"), expires_at: "not-a-timestamp" })}\n`)
    expect(code(() => store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-malformed-expiry", decision: "APPROVED", expected_revision: 1 }))).toBe("CT_AUTH_EXPIRED")
    expect(store.readAuthorization("auth-malformed-expiry").state).toBe("PENDING")
  })

  test("records a rejected decision as its own terminal state", () => {
    const { store } = setup()
    store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-rejected") })
    const consumed = store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-rejected", decision: "REJECTED", expected_revision: 1 })
    expect(consumed.state).toBe("REJECTED")
    expect(consumed.terminal_audit.decision).toBe("REJECTED")
    expect(store.readAuthorization("auth-rejected").state).toBe("REJECTED")
  })

  test("refuses an authorization that does not satisfy authorization-v1", () => {
    const { store } = setup()
    const { nonce_hash: _dropped, ...incomplete } = authorizationRecord("auth-incomplete")
    expect(code(() => store.createAuthorization({ actor: "MAIN", ...incomplete }))).toBe("CT_AUTH_INVALID")

    const foreignShape = authorizationRecord("auth-foreign-shape")
    foreignShape.delivery = { ...foreignShape.delivery, number: 7 }
    expect(code(() => store.createAuthorization({ actor: "MAIN", ...foreignShape }))).toBe("CT_AUTH_INVALID")
  })

  test("binds an authorization to the current registry revision", () => {
    const { store } = setup()
    const stale = { ...authorizationRecord("auth-stale"), registry_revision: 6 }
    expect(code(() => store.createAuthorization({ actor: "MAIN", ...stale }))).toBe("CT_AUTH_INVALID")
  })

  test("persists no audit or partial state when terminal authorization replacement fails", () => {
    let failAuthorization = false
    const { root, store } = setup({ beforeCommit: (path) => { if (failAuthorization && path.includes("/authorizations/")) throw new Error("forced") } })
    store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-failure") })
    failAuthorization = true
    expect(code(() => store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-failure", decision: "APPROVED", expected_revision: 1 }))).toBe("CT_STORE_WRITE_FAILED")
    expect(store.readAuthorization("auth-failure").state).toBe("PENDING")
    expect(existsSync(join(root, "audit")) ? readdirSync(join(root, "audit")) : []).toEqual([])
  })
})

describe("opaque and disconnected boundaries", () => {
  test("persists READY and BLOCKED reports through the same mechanical shape", () => {
    const { store } = setup()
    const ready = store.persistReport({ actor: "MAIN", project_id: "project-a", artifact_ref: ref("ready") })
    const blocked = store.persistReport({ actor: "MAIN", project_id: "project-a", artifact_ref: ref("blocked") })
    const normalize = ({ record_path, artifact_ref, ...value }) => ({ ...value, artifact_ref: "opaque", record_path: basename(record_path) })
    expect(normalize(ready)).toEqual({ ...normalize(blocked), record_path: basename(ready.record_path) })
    expect(JSON.stringify(ready)).not.toContain("READY")
    expect(JSON.stringify(blocked)).not.toContain("BLOCKED")
  })

  test("has no registry, enrollment, identity selection, activation, or legacy P7/P8 dependency", () => {
    const sources = ["main-store/authority.mjs", "main-store/store.mjs", "main-store/index.mjs"].map((path) => readFileSync(join(projectRoot, path), "utf8")).join("\n")
    for (const forbidden of ["project-registry", "alias resolution", "enrollment", "selectMain", "ACTIVE", "P7", "P8", "core.mjs"]) expect(sources).not.toContain(forbidden)
  })

  test("recursively keeps Tower entry points away from product contracts and semantic parsers", () => {
    const visited = new Set()
    const walk = (relativePath) => {
      if (visited.has(relativePath)) return
      visited.add(relativePath)
      const source = readFileSync(join(projectRoot, relativePath), "utf8")
      for (const match of source.matchAll(/(?:import|export)\s+(?:[^"']*?from\s*)?["'](\.\.?\/[^"']+)["']/g)) {
        expect(match[1]).not.toMatch(/(?:contracts|schemas|openspec|yaml|policy-report|plan-manifest)/i)
        const dependency = resolve(dirname(join(projectRoot, relativePath)), match[1])
        if (dependency.startsWith(projectRoot) && dependency.endsWith(".mjs")) walk(dependency.slice(projectRoot.length + 1))
      }
    }
    for (const entry of ["core.mjs", "mcp.mjs"]) walk(entry)
    expect(visited.size).toBeGreaterThan(1)
  })
})
