import { afterEach, describe, expect, test } from "bun:test"
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { bindMainAuthority, createMainStore } from "../main-store/index.mjs"
import { createParkedDecision, createParkedDecisionResponse, parkedDecisionResponseDigest } from "../contracts/parked-decision.mjs"
import { createParkingComposition } from "../escalation/parking-composition.mjs"
import { createCompletedWorkBinding } from "../contracts/completed-work-binding.mjs"
import { freezeCandidate } from "../contracts/candidate-revision.mjs"
import { captureCheckpoint } from "../workspace/checkpoint.mjs"
import { reconcileCheckpoint } from "../workspace/reconciliation.mjs"
import { git as runGit } from "./helpers/git.mjs"

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
  const { trustedBindingOverrides = {}, assertCurrentHost = () => true, ...storeOptions } = options
  const trustedBinding = Object.freeze({ ...binding, ...trustedBindingOverrides, store_path: root })
  let providerCalls = 0
  const authority = bindMainAuthority({
    trustedBindingProvider: () => { providerCalls += 1; return trustedBinding },
    rederiveBinding: () => ({ ...trustedBinding }),
  })
  const capability = authority.capability
  const store = createMainStore({ root, authority, capability, assertCurrentHost, ...storeOptions })
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
  jornada_revision: 3,
  delivery: {
    shape: "direct-push",
    repository: "owner/repository",
    target_branch: "master",
    base_sha: "a".repeat(40),
    head_sha: "b".repeat(40),
  },
  policy_report_digest: `sha256:${"b".repeat(64)}`,
  created_at: "2099-01-01T00:00:00Z",
  expires_at: "2099-01-01T01:00:00.000Z",
  nonce_hash: `sha256:${"c".repeat(64)}`,
  extensions: {
    "control-tower/candidate-revision": candidateRevision,
    "control-tower/decision-origin": { session_id: "S5.8", module_id: "M5.8.1" },
    "control-tower/decision-target": "Which canonical option should authorize this transition?",
  },
})
const candidateRevision = `sha256:${"d".repeat(64)}`
const parkedResponse = (authorization_id, overrides = {}) => {
  const parked_decision = createParkedDecision({
    schema: "parked-decision", schema_version: 1, parked_decision_id: `parked-${authorization_id}`,
    question: "Which canonical option should authorize this transition?",
    evidence: [{ path: "openspec/changes/s5-8-response-binding/design.md", line_start: 1, line_end: 2, contradiction: "Main requires one selected option." }],
    options: [{ option_id: "option-a", label: "Approve", consequence: "Apply the terminal transition." }, { option_id: "option-b", label: "Reject", consequence: "Reject the terminal transition." }],
    origin: { session_id: "S5.8", module_id: "M5.8.1" }, checkpoint: "Before terminal authorization.",
    decision_class: "seguridad y permisos", created_at: "2026-08-11T13:00:00Z",
    frozen_scope: { session_plan_snapshot_digest: `sha256:${"e".repeat(64)}`, session_ids: ["S5.8"], area: ["main-store/store.mjs"], resources: ["Main authorization store"] },
  })
  const parked_decision_response = createParkedDecisionResponse({ parked_decision, response_id: `response-${authorization_id}`, authorization_id, authorization_revision: 1, option_id: "option-a", responded_at: "2026-08-11T13:05:00Z", ...overrides })
  return { parked_decision, parked_decision_response }
}
const responseRequest = (authorization_id, overrides = {}) => ({ actor: "MAIN", authorization_id, candidate_revision: candidateRevision, decision: "APPROVED", expected_revision: 1, ...parkedResponse(authorization_id), ...overrides })
const git = (cwd, args) => {
  const output = runGit(cwd, args, { stdio: ["ignore", "pipe", "pipe"] })
  return args[0] === "cat-file" || args.includes("-z") ? output : output.toString("utf8").trim()
}
const provenance = (suffix = "a", project_id = "project-a") => {
  const root = mkdtempSync(join(tmpdir(), "ct-parking-provenance-")); temporaryDirectories.push(root)
  git(root, ["init", "-q", "-b", "main"]); git(root, ["config", "user.email", "tower-test@example.invalid"]); git(root, ["config", "user.name", "Tower Test"])
  writeFileSync(join(root, "tracked.txt"), "base\n"); git(root, ["add", "tracked.txt"]); git(root, ["commit", "-q", "-m", "base"])
  const base = { commit: git(root, ["rev-parse", "HEAD"]), tree: git(root, ["rev-parse", "HEAD^{tree}"]) }
  const content = `result-${suffix}\n`; writeFileSync(join(root, "tracked.txt"), content); git(root, ["add", "tracked.txt"]); git(root, ["commit", "-q", "-m", "result"])
  const result = { commit: git(root, ["rev-parse", "HEAD"]), tree: git(root, ["rev-parse", "HEAD^{tree}"]) }
  git(root, ["reset", "-q", "--mixed", base.commit]); git(root, ["add", "tracked.txt"])
  const checkpoint_request = { project_id, assignment_id: `assignment-s5-12-${suffix}`, generation: 1, repositoryRoot: root, base, result, files: [{ path: "tracked.txt", bytes: new TextEncoder().encode(content), mode: "raw-bytes" }] }
  const checkpoint_capture = captureCheckpoint(checkpoint_request, { git })
  const reconciliation_evidence = { project_id: checkpoint_capture.project_id, assignment_id: checkpoint_capture.assignment_id, generation: checkpoint_capture.generation, repository_root: checkpoint_capture.repository_root, git_common_dir: checkpoint_capture.git_common_dir, base, result, manifest_ref: "openspec/plans/manifest.yaml", candidate_ref: "candidates/s5-12.json", ledger_digest: `sha256:${"f".repeat(64)}`, runtime_projection_revision: 4, host_epoch: 2, jornada_id: "jornada-s5-12", jornada_revision: 3, registry_revision: 7, capability_revision: 5 }
  return { checkpoint_request, reconciliation_evidence, checkpoint_capture, reconciled_checkpoint: reconcileCheckpoint({ capture: checkpoint_capture, evidence: reconciliation_evidence }) }
}
const parkingInput = (parked_decision, evidence, overrides = {}) => ({ actor: "MAIN", project_id: "project-a", parked_decision, checkpoint_capture: evidence.checkpoint_capture, reconciled_checkpoint: evidence.reconciled_checkpoint, ...overrides })
const jornadaRecord = (id) => ({
  schema: "jornada",
  schema_version: 1,
  jornada_id: id,
  jornada_revision: 1,
  project_id: "project-a",
  registry_revision: 7,
  plan_id: "plan-a",
  preset: "standard",
  preset_revision: 1,
  effective_limits: { apply_ceiling: 1 },
  starts_at: "2026-01-01T00:00:00.000Z",
  expires_at: "2099-01-01T00:00:00.000Z",
  execution_host: "opencode",
  allowed_operations: ["CREATE_COMMIT"],
  manifest_ref: pointer("manifest-a"),
  authorization_ref: pointer("authorization-a"),
  state: "DRAFT",
})
const activateJornada = (store, id = "jornada-a") => {
  store.createJornada({ actor: "MAIN", ...jornadaRecord(id) })
  store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id: id, state: "PENDING_AUTHORIZATION", expected_revision: 1 })
  return store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id: id, state: "ACTIVE", expected_revision: 2 })
}
const ref = (name) => Object.freeze({
  artifact_id: name,
  artifact_revision: 1,
  content_digest: `sha256:${name.padEnd(64, "0").slice(0, 64)}`,
})
const pointer = (name) => ({
  schema: "artifact-ref",
  schema_version: 1,
  artifact_id: name,
  artifact_revision: 1,
  repository_id: "repository-a",
  repo_relative_path: `${name}.json`,
  media_type: "application/json",
  digest_mode: "rfc8785-jcs",
  source_commit: "a".repeat(40),
  content_digest: `sha256:${"a".repeat(64)}`,
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

  test("atomically parks one canonical decision and both live provenance artifacts", () => {
    const { root, store } = setup()
    const parked = parkedResponse("parking-a").parked_decision, evidence = provenance()
    const first = store.parkDecision(parkingInput(parked, evidence))
    const bytes = readFileSync(first.record_path)

    expect(first.parked_decision).toEqual(parked)
    expect(first.checkpoint_capture).toEqual(evidence.checkpoint_capture)
    expect(first.reconciled_checkpoint).toEqual(evidence.reconciled_checkpoint)
    expect(first.parked_checkpoint_binding).toMatchObject({ parked_decision_id: parked.parked_decision_id, parked_checkpoint: parked.checkpoint,
      capture_checkpoint_id: evidence.checkpoint_capture.checkpoint_id, reconciled_checkpoint_id: evidence.reconciled_checkpoint.reconciliation_id,
      reconciliation_state: "VALID" })
    expect([first.revision, first.replayed]).toEqual([1, false])
    expect(basename(dirname(first.record_path))).toBe("decision-parkings")
    expect(readdirSync(dirname(first.record_path))).toEqual(["parked-parking-a.json"])
    expect(store.parkDecision(parkingInput(parked, evidence))).toMatchObject({ revision: 1, replayed: true })
    expect(readFileSync(first.record_path)).toEqual(bytes)
    const readback = store.readParking(parked.parked_decision_id)
    expect(readback).toEqual(JSON.parse(bytes))
    expect(Object.isFrozen(readback)).toBeTrue()
    expect(Object.isFrozen(readback.checkpoint_capture.files)).toBeTrue()
    const bindingReadback = store.readParkedCheckpointBinding(parked.parked_decision_id)
    expect(bindingReadback).toEqual(first.parked_checkpoint_binding)
    expect(Object.isFrozen(bindingReadback)).toBeTrue()
    expect(code(() => store.readParkedCheckpointBinding("parked-missing"))).toBe("CT_PARKING_BINDING_NOT_FOUND")
    expect(existsSync(join(root, "checkpoint-captures"))).toBeFalse()
    expect(existsSync(join(root, "reconciled-checkpoints"))).toBeFalse()
  })

  test("runs the real producer-to-Main-to-parking path without caller provenance", () => {
    const { store } = setup(), fixture = provenance("composition")
    const parked_decision = parkedResponse("parking-composition").parked_decision
    const composition = createParkingComposition({
      checkpointProducer: (input) => captureCheckpoint(input, { git }),
      reconciliationProducer: reconcileCheckpoint,
      parkingStore: store,
    })
    const result = composition.park({ parked_decision, checkpoint_request: fixture.checkpoint_request, reconciliation_evidence: fixture.reconciliation_evidence })

    expect(result.replayed).toBeFalse()
    expect(result.checkpoint_capture).toEqual(fixture.checkpoint_capture)
    expect(result.reconciled_checkpoint).toEqual(fixture.reconciled_checkpoint)
    expect(store.readParkedCheckpointBinding(parked_decision.parked_decision_id)).toEqual(result.parked_checkpoint_binding)
    expect(store.readParking(parked_decision.parked_decision_id)).toMatchObject({ parked_decision, revision: 1 })
  })

  test("rejects noncanonical, mismatched, divergent, or failed parking without partial state", () => {
    let failParking = false
    const { root, store } = setup({ beforeCommit: (path) => { if (failParking && path.includes("/decision-parkings/")) throw new Error("forced") } })
    const parked = parkedResponse("parking-reject").parked_decision, firstEvidence = provenance("first"), secondEvidence = provenance("second")
    const path = join(root, "decision-parkings", "parked-parking-reject.json")

    for (const invalid of [
      parkingInput(parked, { ...firstEvidence, checkpoint_capture: structuredClone(firstEvidence.checkpoint_capture) }),
      parkingInput(parked, { checkpoint_capture: firstEvidence.checkpoint_capture, reconciled_checkpoint: secondEvidence.reconciled_checkpoint }),
      parkingInput(parked, firstEvidence, { provenance: {} }),
      parkingInput(parked, firstEvidence, { parked_checkpoint_binding: {} }),
      parkingInput(parked, firstEvidence, { actor: "SUPPORT" }),
      parkingInput(parked, firstEvidence, { project_id: "project-b" }),
    ]) expect(code(() => store.parkDecision(invalid))).not.toBe(null)
    expect(existsSync(path)).toBeFalse()

    failParking = true
    expect(code(() => store.parkDecision(parkingInput(parked, firstEvidence)))).toBe("CT_STORE_WRITE_FAILED")
    expect(existsSync(path)).toBeFalse()
    failParking = false
    store.parkDecision(parkingInput(parked, firstEvidence))
    const bytes = readFileSync(path)
    const divergent = createParkedDecision({ ...parked, parked_decision_digest: undefined, checkpoint: `${parked.checkpoint} changed` })
    expect(code(() => store.parkDecision(parkingInput(divergent, firstEvidence)))).toBe("CT_PARKING_REPLAY_DIVERGENT")
    expect(code(() => store.parkDecision(parkingInput(parked, secondEvidence)))).toBe("CT_PARKING_REPLAY_DIVERGENT")
    expect(readFileSync(path)).toEqual(bytes)
    const corrupted = JSON.parse(bytes)
    corrupted.parked_checkpoint_binding.binding_digest = `sha256:${"0".repeat(64)}`
    writeFileSync(path, `${JSON.stringify(corrupted)}\n`)
    const corruptedBytes = readFileSync(path)
    expect(code(() => store.readParkedCheckpointBinding(parked.parked_decision_id))).toBe("CT_PARKING_BINDING_INVALID")
    expect(readFileSync(path)).toEqual(corruptedBytes)
  })

  test("rejects a coherent copied foreign-project parking envelope without mutation", () => {
    const foreign = setup({ trustedBindingOverrides: { project_id: "project-b" } })
    const parked = parkedResponse("parking-copied-foreign").parked_decision
    const evidence = provenance("copied-foreign", "project-b")
    const persisted = foreign.store.parkDecision(parkingInput(parked, evidence, { project_id: "project-b" }))
    const foreignBytes = readFileSync(persisted.record_path)
    const local = setup()
    const canonicalPath = join(local.root, "decision-parkings", `${parked.parked_decision_id}.json`)
    mkdirSync(dirname(canonicalPath))
    writeFileSync(canonicalPath, foreignBytes)
    const copiedBytes = readFileSync(canonicalPath)

    expect(code(() => local.store.readParkedCheckpointBinding(parked.parked_decision_id))).toBe("CT_STORE_INVALID")
    expect(readFileSync(canonicalPath)).toEqual(copiedBytes)
    expect(readFileSync(persisted.record_path)).toEqual(foreignBytes)
  })

  test("rejects a substituted parked-decision identity path without mutation", () => {
    const { root, store } = setup()
    const parked = parkedResponse("parking-authoritative").parked_decision
    const persisted = store.parkDecision(parkingInput(parked, provenance("substituted-path")))
    const authoritativeBytes = readFileSync(persisted.record_path)
    const substitutedId = "parked-parking-substituted"
    const substitutedPath = join(root, "decision-parkings", `${substitutedId}.json`)
    writeFileSync(substitutedPath, authoritativeBytes)
    const substitutedBytes = readFileSync(substitutedPath)

    expect(code(() => store.readParkedCheckpointBinding(substitutedId))).toBe("CT_PARKING_BINDING_INVALID")
    expect(readFileSync(substitutedPath)).toEqual(substitutedBytes)
    expect(readFileSync(persisted.record_path)).toEqual(authoritativeBytes)
  })

  test("fails closed on parking-envelope ownership or closed-shape drift without mutation", () => {
    for (const [name, mutate] of [
      ["actor", (record) => { record.actor = "SUPPORT" }],
      ["project", (record) => { record.project_id = "project-b" }],
      ["unknown field", (record) => { record.substituted = true }],
    ]) {
      const { store } = setup(), parked = parkedResponse(`parking-envelope-${name.replaceAll(" ", "-")}`).parked_decision
      const persisted = store.parkDecision(parkingInput(parked, provenance(`envelope-${name.replaceAll(" ", "-")}`)))
      const record = JSON.parse(readFileSync(persisted.record_path, "utf8")); mutate(record)
      writeFileSync(persisted.record_path, `${JSON.stringify(record)}\n`)
      const corruptedBytes = readFileSync(persisted.record_path)

      expect(code(() => store.readParkedCheckpointBinding(parked.parked_decision_id))).toBe("CT_PARKING_BINDING_INVALID")
      expect(readFileSync(persisted.record_path)).toEqual(corruptedBytes)
    }
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
    activateJornada(store)
    const exact = { actor: "MAIN", ...authorizationRecord("auth-a") }
    expect(store.createAuthorization(exact).state).toBe("PENDING")
    const consumed = store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-a", candidate_revision: candidateRevision, decision: "APPROVED", expected_revision: 1 })
    expect(consumed.state).toBe("APPROVED")
    expect(consumed.audit_ref.kind).toBe("authorization-terminal")
    expect(code(() => store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-a", candidate_revision: candidateRevision, decision: "REVOKED", expected_revision: 2 }))).toBe("CT_AUTH_TERMINAL")
    expect(store.readAuthorization("auth-a").state).toBe("APPROVED")
  })

  test("atomically binds one canonical parked response and replays exact canonical bytes", () => {
    let root, lockObserved = false
    const result = setup({ beforeCommit: (path) => { if (path.includes("/authorizations/") && existsSync(path)) lockObserved = existsSync(join(root, "jornadas", "jornada-a.json.lock")) } })
    root = result.root; activateJornada(result.store)
    const created = result.store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-response") })
    const request = responseRequest("auth-response"), consumed = result.store.consumeAuthorization(request)
    expect(consumed.terminal_audit.parked_decision_response).toEqual(request.parked_decision_response)
    expect(consumed.revision_history.at(-1)).toMatchObject({ state: "PENDING", revision: 1 })
    expect(lockObserved).toBe(true)
    const terminal = readFileSync(created.record_path)
    expect(result.store.consumeAuthorization({ ...request, parked_decision_response: Object.fromEntries(Object.entries(request.parked_decision_response).reverse()) })).toMatchObject({ revision: 2, replayed: true })
    expect(readFileSync(created.record_path)).toEqual(terminal)
  })

  test("rejects invalid pairs and stable binding or replay divergence without changing bytes", () => {
    const { store } = setup(); activateJornada(store)
    const created = store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-bindings") })
    const request = responseRequest("auth-bindings"), before = readFileSync(created.record_path)
    expect(code(() => store.consumeAuthorization({ ...request, parked_decision: undefined }))).toBe("CT_AUTH_RESPONSE_INVALID")
    const badDigest = { ...request.parked_decision_response, response_digest: `sha256:${"f".repeat(64)}` }
    let error
    try { store.consumeAuthorization({ ...request, parked_decision_response: badDigest }) } catch (caught) { error = caught }
    expect(error?.code).toBe("CT_AUTH_RESPONSE_BINDING")
    expect(error?.message).toBe(`Rejected response binding response_digest: expected ${parkedDecisionResponseDigest(badDigest)}, actual ${badDigest.response_digest}`)
    expect(readFileSync(created.record_path)).toEqual(before)
    store.consumeAuthorization(request)
    const terminal = readFileSync(created.record_path)
    const divergent = createParkedDecisionResponse({ parked_decision: request.parked_decision, response_id: "response-different", authorization_id: "auth-bindings", authorization_revision: 1, option_id: "option-a", responded_at: "2026-08-11T13:05:00Z" })
    expect(code(() => store.consumeAuthorization({ ...request, parked_decision_response: divergent }))).toBe("CT_AUTH_RESPONSE_REPLAY_DIVERGENT")
    expect(readFileSync(created.record_path)).toEqual(terminal)
  })

  test("checks authoritative origin, revision, candidate, and legacy terminal", () => {
    for (const [id, mutate, expected] of [
      ["auth-response-revision", (request) => ({ ...request, expected_revision: 2 }), "CT_CAS_MISMATCH"],
      ["auth-response-candidate", (request) => ({ ...request, candidate_revision: `sha256:${"a".repeat(64)}` }), "CT_AUTH_INVALID"],
      ["auth-response-origin", (request) => ({ ...request, parked_decision: createParkedDecision({ ...request.parked_decision, parked_decision_digest: undefined, origin: { session_id: "S5.8", module_id: "M5.8.2" } }) }), "CT_AUTH_RESPONSE_BINDING"],
    ]) {
      const { store } = setup(); activateJornada(store)
      const created = store.createAuthorization({ actor: "MAIN", ...authorizationRecord(id) }), before = readFileSync(created.record_path)
      expect(code(() => store.consumeAuthorization(mutate(responseRequest(id))))).toBe(expected)
      expect(readFileSync(created.record_path)).toEqual(before)
    }
    const { store } = setup(); activateJornada(store)
    store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-legacy-terminal") })
    store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-legacy-terminal", candidate_revision: candidateRevision, decision: "APPROVED", expected_revision: 1 })
    expect(code(() => store.consumeAuthorization(responseRequest("auth-legacy-terminal")))).toBe("CT_AUTH_TERMINAL")
  })

  test("byte-witnesses selected-response authority and lifecycle rejection", () => {
    const reject = ({ id, authorization = {}, request = {}, mutate, expected = "CT_AUTH_INVALID" }) => {
      const result = setup(); activateJornada(result.store)
      const created = result.store.createAuthorization({ actor: "MAIN", ...authorizationRecord(id), ...authorization })
      if (mutate) mutate(result, created)
      const before = readFileSync(created.record_path)
      const rejection = code(() => result.store.consumeAuthorization({ ...responseRequest(id), ...request }))
      if (expected) expect(rejection).toBe(expected); else expect(rejection).not.toBe(null)
      expect(readFileSync(created.record_path)).toEqual(before)
    }
    reject({ id: "auth-non-main-response", request: { actor: "SUPPORT" }, expected: "CT_AUTH_INVALID" })
    const revoked = setup(); activateJornada(revoked.store)
    const revokedRecord = revoked.store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-revoked-response") })
    const revokedBytes = readFileSync(revokedRecord.record_path); revoked.authority.revoke(revoked.capability)
    expect(code(() => revoked.store.consumeAuthorization(responseRequest("auth-revoked-response")))).toBe("CT_AUTH_INVALID")
    expect(readFileSync(revokedRecord.record_path)).toEqual(revokedBytes)
    for (const missing of ["parked_decision", "parked_decision_response"]) reject({ id: `auth-missing-${missing.replaceAll("_", "-")}`, request: { [missing]: undefined }, expected: "CT_AUTH_RESPONSE_INVALID" })
    for (const [name, value] of [["expired", "2020-01-01T00:00:00.000Z"], ["malformed-expiry", "not-a-timestamp"]]) reject({ id: `auth-response-${name}`, mutate: ({ store }, created) => writeFileSync(created.record_path, `${JSON.stringify({ ...store.readAuthorization(`auth-response-${name}`), expires_at: value })}\n`), expected: null })
    reject({ id: "auth-response-inactive-jornada", mutate: ({ store, root }) => writeFileSync(join(root, "jornadas", "jornada-a.json"), `${JSON.stringify({ ...store.readJornada("jornada-a"), state: "PAUSED" })}\n`) })
    reject({ id: "auth-response-stale-jornada", authorization: { jornada_revision: 2 } })
    for (const [name, field, value] of [["foreign-project", "project_id", "project-b"], ["foreign-registry", "registry_revision", 6], ["absent-origin", "control-tower/decision-origin"], ["absent-target", "control-tower/decision-target"]]) reject({
      id: `auth-response-${name}`,
      mutate: ({ store }, created) => { const record = structuredClone(store.readAuthorization(`auth-response-${name}`)); if (field.startsWith("control-tower/")) delete record.extensions[field]; else record[field] = value; writeFileSync(created.record_path, `${JSON.stringify(record)}\n`) },
      expected: field.startsWith("control-tower/") ? "CT_AUTH_RESPONSE_BINDING" : "CT_AUTH_INVALID",
    })
  })

  test("checks the complete terminal context gate before response replay", () => {
    const cases = [
      ["project", (record) => { record.project_id = "project-b" }], ["registry", (record) => { record.registry_revision = 6 }],
      ["candidate", (record) => { record.extensions["control-tower/candidate-revision"] = `sha256:${"9".repeat(64)}` }],
      ["consumed-revision", (record) => { record.revision_history.at(-1).revision = 2 }],
      ["origin", (record) => { delete record.extensions["control-tower/decision-origin"] }], ["target", (record) => { delete record.extensions["control-tower/decision-target"] }],
    ]
    for (const [name, mutate] of cases) {
      const { store } = setup(); activateJornada(store)
      const id = `auth-terminal-context-${name}`, created = store.createAuthorization({ actor: "MAIN", ...authorizationRecord(id) }), request = responseRequest(id)
      store.consumeAuthorization(request)
      const record = structuredClone(store.readAuthorization(id)); mutate(record); writeFileSync(created.record_path, `${JSON.stringify(record)}\n`)
      const before = readFileSync(created.record_path)
      expect([name, code(() => store.consumeAuthorization(request))]).not.toEqual([name, null])
      expect(readFileSync(created.record_path)).toEqual(before)
    }
  })

  test("keeps response mode additive and preserves bytes on pre-replacement failure", () => {
    let failAuthorization = false
    const { store } = setup({ beforeCommit: (path) => { if (failAuthorization && path.includes("/authorizations/")) throw new Error("forced") } })
    activateJornada(store)
    store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-legacy") })
    expect(store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-legacy", candidate_revision: candidateRevision, decision: "APPROVED", expected_revision: 1 }).terminal_audit.parked_decision_response).toBeUndefined()
    const created = store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-response-failure") }), before = readFileSync(created.record_path)
    failAuthorization = true
    expect(code(() => store.consumeAuthorization(responseRequest("auth-response-failure")))).toBe("CT_STORE_WRITE_FAILED")
    expect(readFileSync(created.record_path)).toEqual(before)
  })

  test("reports post-replacement durability failure and reconciles by exact replay", () => {
    let breakDirectoryFsync = false, authorizationDirectory
    const { store } = setup({ beforeCommit: (path) => {
      if (breakDirectoryFsync && path.includes("/authorizations/")) {
        authorizationDirectory = dirname(path)
        chmodSync(authorizationDirectory, 0o300)
      }
    } })
    activateJornada(store)
    store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-durability") })
    const request = responseRequest("auth-durability")
    breakDirectoryFsync = true
    let error
    try { store.consumeAuthorization(request) } catch (caught) { error = caught }
    finally { if (authorizationDirectory) chmodSync(authorizationDirectory, 0o700) }
    expect(error?.code).toBe("CT_STORE_WRITE_FAILED")
    expect(error?.message).toContain("durability is indeterminate")
    const terminal = store.readAuthorization("auth-durability")
    expect(terminal).toMatchObject({ state: "APPROVED", revision: 2 })
    expect(terminal.revision_history).toHaveLength(1)
    expect(store.consumeAuthorization(request)).toMatchObject({ replayed: true, revision: 2 })
    expect(store.readAuthorization("auth-durability").revision_history).toHaveLength(1)
  })

  test("names the full independently resealed binding matrix and preserves pending bytes", () => {
    const resealParked = (parked, changes) => createParkedDecision({ ...parked, parked_decision_digest: undefined, ...changes })
    const resealResponse = (parked, response, changes = {}) => createParkedDecisionResponse({
      parked_decision: parked, response_id: response.response_id, authorization_id: response.authorization_id,
      authorization_revision: response.authorization_revision, option_id: response.option_id,
      responded_at: response.responded_at, ...changes,
    })
    const resealRawResponse = (response, changes) => {
      const changed = { ...response, ...changes, response_digest: undefined }
      changed.response_digest = parkedDecisionResponseDigest(changed)
      return changed
    }
    const cases = [
      ["authorization_id", (parked, response) => [parked, resealResponse(parked, response, { authorization_id: "auth-other" })]],
      ["authorization_revision", (parked, response) => [parked, resealResponse(parked, response, { authorization_revision: 2 })]],
      ["parked_decision_id", (parked, response) => [resealParked(parked, { parked_decision_id: "parked-other" }), response]],
      ["parked_decision_digest", (parked, response) => [resealParked(parked, { checkpoint: `${parked.checkpoint} changed` }), response]],
      ["option_id", (parked, response) => { const changed = resealParked(parked, { options: parked.options.map((option) => option.option_id === response.option_id ? { ...option, option_id: "option-c" } : option) }); return [changed, resealRawResponse(response, { parked_decision_digest: changed.parked_decision_digest })] }],
      ["session_plan_snapshot_digest", (parked, response) => { const changed = resealParked(parked, { frozen_scope: { ...parked.frozen_scope, session_plan_snapshot_digest: `sha256:${"9".repeat(64)}` } }); return [changed, resealRawResponse(response, { parked_decision_digest: changed.parked_decision_digest })] }],
      ["origin", (parked, response) => { const changed = resealParked(parked, { origin: { ...parked.origin, module_id: "M5.8.2" } }); return [changed, resealResponse(changed, response)] }],
      ["decision_target", (parked, response) => { const changed = resealParked(parked, { question: `${parked.question} changed` }); return [changed, resealResponse(changed, response)] }],
    ]
    for (const [bindingName, drift] of cases) {
      const { store } = setup(); activateJornada(store)
      const id = `auth-drift-${bindingName.replaceAll("_", "-")}`, created = store.createAuthorization({ actor: "MAIN", ...authorizationRecord(id) })
      const request = responseRequest(id), before = readFileSync(created.record_path)
      const [parked_decision, parked_decision_response] = drift(request.parked_decision, request.parked_decision_response)
      let error
      try { store.consumeAuthorization({ ...request, parked_decision, parked_decision_response }) } catch (caught) { error = caught }
      expect(error?.code).toBe("CT_AUTH_RESPONSE_BINDING")
      expect(error?.message).toContain(`binding ${bindingName}`)
      expect(readFileSync(created.record_path)).toEqual(before)
    }
  })

  test("orders stable binding rejection before a well-formed divergent response digest", () => {
    const { store } = setup(); activateJornada(store)
    const created = store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-binding-order") })
    const request = responseRequest("auth-binding-order"), before = readFileSync(created.record_path)
    const response = { ...request.parked_decision_response, authorization_id: "auth-other", response_digest: `sha256:${"9".repeat(64)}` }
    let error
    try { store.consumeAuthorization({ ...request, parked_decision_response: response }) } catch (caught) { error = caught }
    expect(error?.code).toBe("CT_AUTH_RESPONSE_BINDING")
    expect(error?.message).toContain("binding authorization_id")
    expect(readFileSync(created.record_path)).toEqual(before)
  })

  test("preserves response-less MERGE and START_JORNADA result and record shapes", () => {
    for (const action of ["MERGE", "START_JORNADA"]) {
      const { store } = setup(); activateJornada(store)
      const id = `auth-compatible-${action.toLowerCase().replaceAll("_", "-")}`
      const authorization = { ...authorizationRecord(id), action }
      if (action === "START_JORNADA") { delete authorization.delivery; authorization.jornada_snapshot = {} }
      const created = store.createAuthorization({ actor: "MAIN", ...authorization })
      const result = store.consumeAuthorization({ actor: "MAIN", authorization_id: id, candidate_revision: candidateRevision, decision: "APPROVED", expected_revision: 1 })
      const persisted = store.readAuthorization(id)
      expect(result).toMatchObject({ action, state: "APPROVED", revision: 2 })
      expect(persisted).toEqual(Object.fromEntries(Object.entries(result).filter(([key]) => key !== "record_path")))
      expect(persisted.terminal_audit.parked_decision_response).toBeUndefined()
      expect(created.revision).toBe(1)
    }
  })

  test("rejects stable-binding and complete-response replay divergence without growth", () => {
    const { store } = setup(); activateJornada(store)
    const id = "auth-replay-matrix", created = store.createAuthorization({ actor: "MAIN", ...authorizationRecord(id) })
    const request = responseRequest(id)
    store.consumeAuthorization(request)
    const terminal = readFileSync(created.record_path)
    const reseal = (parked, changes = {}) => createParkedDecisionResponse({
      parked_decision: parked, response_id: request.parked_decision_response.response_id, authorization_id: id,
      authorization_revision: 1, option_id: "option-a", responded_at: request.parked_decision_response.responded_at, ...changes,
    })
    const changedOrigin = createParkedDecision({ ...request.parked_decision, parked_decision_digest: undefined, origin: { ...request.parked_decision.origin, module_id: "M5.8.2" } })
    const changedSnapshot = createParkedDecision({ ...request.parked_decision, parked_decision_digest: undefined, frozen_scope: { ...request.parked_decision.frozen_scope, session_plan_snapshot_digest: `sha256:${"9".repeat(64)}` } })
    const divergent = [
      [{ ...request, parked_decision_response: reseal(request.parked_decision, { authorization_revision: 2 }) }, "CT_AUTH_RESPONSE_BINDING"],
      [{ ...request, parked_decision_response: reseal(request.parked_decision, { option_id: "option-b" }) }, "CT_AUTH_RESPONSE_REPLAY_DIVERGENT"],
      [{ ...request, parked_decision: changedOrigin, parked_decision_response: reseal(changedOrigin) }, "CT_AUTH_RESPONSE_BINDING"],
      [{ ...request, parked_decision: changedSnapshot, parked_decision_response: reseal(changedSnapshot) }, "CT_AUTH_RESPONSE_REPLAY_DIVERGENT"],
      [{ ...request, parked_decision_response: { ...request.parked_decision_response, response_digest: `sha256:${"9".repeat(64)}` } }, "CT_AUTH_RESPONSE_BINDING"],
      [{ ...request, decision: "REJECTED" }, "CT_AUTH_RESPONSE_REPLAY_DIVERGENT"],
      [{ ...request, parked_decision_response: reseal(request.parked_decision, { response_id: "response-other" }) }, "CT_AUTH_RESPONSE_REPLAY_DIVERGENT"],
      [{ ...request, parked_decision_response: reseal(request.parked_decision, { responded_at: "2026-08-11T13:06:00Z" }) }, "CT_AUTH_RESPONSE_REPLAY_DIVERGENT"],
    ]
    for (const [candidate, expected] of divergent) {
      expect(code(() => store.consumeAuthorization(candidate))).toBe(expected)
      expect(readFileSync(created.record_path)).toEqual(terminal)
    }
    expect(store.readAuthorization(id)).toMatchObject({ revision: 2, revision_history: [{ revision: 1 }] })
  })

  test("serializes identical and competing response callers across independent processes", async () => {
    const worker = String.raw`
      import { bindMainAuthority, createMainStore } from "./main-store/index.mjs";
      const [root, encoded] = process.argv.slice(1), request = JSON.parse(encoded);
      const binding = { project_id:"project-a", revision:7, repository_root:"/repo/a", git_common_dir:"/repo/a/.git", remote:"git@example.invalid:a.git", branch:"main", main_session_id:"main-session-a", store_path:root, epoch:3 };
      const authority = bindMainAuthority({ trustedBindingProvider:()=>binding, rederiveBinding:()=>({...binding}) });
      const store = createMainStore({ root, authority, capability:authority.capability });
      try { const result=store.consumeAuthorization(request); console.log(JSON.stringify({ok:true,replayed:result.replayed??false,revision:result.revision})); }
      catch(error) { console.log(JSON.stringify({ok:false,code:error.code})); }
    `
    const run = (root, request) => Bun.spawn([process.execPath, "-e", worker, root, JSON.stringify(request)], {
      cwd: projectRoot, env: { ...process.env, BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0" }, stdout: "pipe", stderr: "pipe",
    })
    const race = async (requests) => {
      const processes = requests.map((request) => run(requests.root, request))
      return Promise.all(processes.map(async (process) => {
        const output = await new Response(process.stdout).text()
        await process.exited
        return JSON.parse(output.trim())
      }))
    }
    for (const competing of [false, true]) {
      const { root, store } = setup(); activateJornada(store)
      const id = `auth-response-race-${competing ? "competing" : "identical"}`
      store.createAuthorization({ actor: "MAIN", ...authorizationRecord(id) })
      const first = responseRequest(id)
      const second = competing ? { ...first, parked_decision_response: createParkedDecisionResponse({
        parked_decision: first.parked_decision, response_id: "response-competing", authorization_id: id,
        authorization_revision: 1, option_id: "option-a", responded_at: first.parked_decision_response.responded_at,
      }) } : first
      const requests = [first, second]; requests.root = root
      const results = await race(requests)
      const terminal = store.readAuthorization(id)
      expect(terminal).toMatchObject({ revision: 2, state: "APPROVED" })
      expect(terminal.revision_history).toHaveLength(1)
      if (competing) {
        expect(results.filter(({ ok }) => ok)).toHaveLength(1)
        expect(results.filter(({ code }) => code === "CT_AUTH_RESPONSE_REPLAY_DIVERGENT")).toHaveLength(1)
      } else {
        expect(results.filter(({ ok }) => ok)).toHaveLength(2)
        expect(results.filter(({ replayed }) => replayed)).toHaveLength(1)
      }
    }
  })

  test("rejects consumption after an authorization expires", () => {
    const { store } = setup()
    activateJornada(store)
    const created = store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-expired") })
    writeFileSync(created.record_path, `${JSON.stringify({ ...store.readAuthorization("auth-expired"), expires_at: "2020-01-01T00:00:00.000Z" })}\n`)
    expect(code(() => store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-expired", candidate_revision: candidateRevision, decision: "APPROVED", expected_revision: 1 }))).toBe("CT_AUTH_EXPIRED")
    expect(store.readAuthorization("auth-expired").state).toBe("PENDING")
  })

  test("rejects an unparseable persisted authorization expiry before consumption", () => {
    const { store } = setup()
    activateJornada(store)
    const created = store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-malformed-expiry") })
    writeFileSync(created.record_path, `${JSON.stringify({ ...store.readAuthorization("auth-malformed-expiry"), expires_at: "not-a-timestamp" })}\n`)
    expect(code(() => store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-malformed-expiry", candidate_revision: candidateRevision, decision: "APPROVED", expected_revision: 1 }))).toBe("CT_AUTH_EXPIRED")
    expect(store.readAuthorization("auth-malformed-expiry").state).toBe("PENDING")
  })

  test("records a rejected decision as its own terminal state", () => {
    const { store } = setup()
    activateJornada(store)
    store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-rejected") })
    const consumed = store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-rejected", candidate_revision: candidateRevision, decision: "REJECTED", expected_revision: 1 })
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
    activateJornada(store)
    store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-failure") })
    failAuthorization = true
    expect(code(() => store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-failure", candidate_revision: candidateRevision, decision: "APPROVED", expected_revision: 1 }))).toBe("CT_STORE_WRITE_FAILED")
    expect(store.readAuthorization("auth-failure").state).toBe("PENDING")
    expect(existsSync(join(root, "audit")) ? readdirSync(join(root, "audit")) : []).toEqual([])
  })

  test("fails closed when authorization consumption lacks an active current Jornada", () => {
    const { store } = setup()
    store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-jornada") })
    expect(code(() => store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-jornada", candidate_revision: candidateRevision, decision: "APPROVED", expected_revision: 1 }))).toBe("CT_JORNADA_INVALID")

    activateJornada(store)
    store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id: "jornada-a", state: "PAUSED", expected_revision: 3 })
    expect(code(() => store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-jornada", candidate_revision: candidateRevision, decision: "APPROVED", expected_revision: 1 }))).toBe("CT_AUTH_INVALID")
    expect(store.readAuthorization("auth-jornada").state).toBe("PENDING")
  })

  test("rejects candidate effects without a live approved authorization bound to the candidate", () => {
    const { root, store } = setup()
    const effectPath = join(root, "candidate-effects", candidateRevision.slice(7) + ".json")
    const admit = (authorization_id, revision = candidateRevision) => store.admitCandidateEffect({
      actor: "MAIN", project_id: "project-a", authorization_id, candidate_revision: revision,
    })

    expect(code(() => admit(undefined))).toBe("CT_AUTH_INVALID")
    expect(code(() => admit("auth-absent"))).toBe("CT_AUTH_INVALID")
    expect(existsSync(effectPath)).toBe(false)

    activateJornada(store)
    store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-pending") })
    expect(code(() => admit("auth-pending"))).toBe("CT_AUTH_INVALID")
    store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-pending", candidate_revision: candidateRevision, decision: "APPROVED", expected_revision: 1 })
    expect(code(() => admit("auth-pending", `sha256:${"e".repeat(64)}`))).toBe("CT_AUTH_INVALID")

    const expired = store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-expired-effect") })
    store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-expired-effect", candidate_revision: candidateRevision, decision: "APPROVED", expected_revision: 1 })
    writeFileSync(expired.record_path, `${JSON.stringify({ ...store.readAuthorization("auth-expired-effect"), state: "APPROVED", expires_at: "2020-01-01T00:00:00.000Z" })}\n`)
    expect(code(() => admit("auth-expired-effect"))).toBe("CT_AUTH_EXPIRED")
    expect(existsSync(effectPath)).toBe(false)
  })

  test("rejects candidate effects when the authorization Jornada is absent, inactive, or stale", () => {
    const approved = (authorization_id) => {
      const result = setup()
      activateJornada(result.store)
      result.store.createAuthorization({ actor: "MAIN", ...authorizationRecord(authorization_id) })
      result.store.consumeAuthorization({ actor: "MAIN", authorization_id, candidate_revision: candidateRevision, decision: "APPROVED", expected_revision: 1 })
      return result
    }
    const admit = ({ store }, authorization_id) => store.admitCandidateEffect({
      actor: "MAIN", project_id: "project-a", authorization_id, candidate_revision: candidateRevision,
    })

    const absent = approved("auth-jornada-absent")
    rmSync(join(absent.root, "jornadas", "jornada-a.json"))
    expect(code(() => admit(absent, "auth-jornada-absent"))).toBe("CT_JORNADA_INVALID")

    const inactive = approved("auth-jornada-inactive")
    const inactivePath = join(inactive.root, "jornadas", "jornada-a.json")
    writeFileSync(inactivePath, `${JSON.stringify({ ...inactive.store.readJornada("jornada-a"), state: "PAUSED" })}\n`)
    expect(code(() => admit(inactive, "auth-jornada-inactive"))).toBe("CT_AUTH_INVALID")

    const stale = approved("auth-jornada-stale")
    stale.store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id: "jornada-a", state: "PAUSED", expected_revision: 3 })
    stale.store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id: "jornada-a", state: "ACTIVE", expected_revision: 4 })
    expect(code(() => admit(stale, "auth-jornada-stale"))).toBe("CT_AUTH_INVALID")
    for (const result of [absent, inactive, stale]) expect(existsSync(join(result.root, "candidate-effects"))).toBe(false)
  })

  test("admits an approved candidate once while holding its Jornada lock through effect commit", () => {
    let root
    let observedJornadaLock = false
    const result = setup({ beforeCommit: (path) => {
      if (path.includes("/candidate-effects/")) observedJornadaLock = existsSync(join(root, "jornadas", "jornada-a.json.lock"))
    } })
    root = result.root
    const { store } = result
    activateJornada(store)
    store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-effect") })
    store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-effect", candidate_revision: candidateRevision, decision: "APPROVED", expected_revision: 1 })
    const input = { actor: "MAIN", project_id: "project-a", authorization_id: "auth-effect", candidate_revision: candidateRevision }

    expect(store.admitCandidateEffect(input)).toMatchObject({ admitted: true, authorization_id: "auth-effect", candidate_revision: candidateRevision })
    expect(observedJornadaLock).toBe(true)

    const replayAuthority = bindMainAuthority({ trustedBindingProvider: () => ({ ...binding, store_path: root }), rederiveBinding: () => ({ ...binding, store_path: root }) })
    const replay = createMainStore({ root, authority: replayAuthority, capability: replayAuthority.capability })
    expect(replay.admitCandidateEffect(input)).toMatchObject({ admitted: false, authorization_id: "auth-effect", candidate_revision: candidateRevision })
    expect(readdirSync(join(root, "candidate-effects"))).toHaveLength(1)
    expect(code(() => replay.admitCandidateEffect({ ...input, actor: "SUPPORT" }))).toBe("CT_AUTH_INVALID")
    expect(code(() => replay.admitCandidateEffect({ ...input, project_id: "project-b" }))).toBe("CT_PROJECT_MISMATCH")
  })

  test("issues one immutable lifecycle-bound launch binding and consumes it only once", () => {
    const { root, store } = setup()
    activateJornada(store)
    store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-launch") })
    store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-launch", candidate_revision: candidateRevision, decision: "APPROVED", expected_revision: 1 })
    const request = {
      actor: "MAIN", project_id: "project-a", request_ref: "request-launch-a", authorization_id: "auth-launch",
      brief: "Implement the approved assignment.", brief_ref: "briefs/launch-a.json", assignment_ref: "assignments/launch-a.json",
      candidate_revision: candidateRevision, host_epoch: 3,
    }

    store.registerAssignmentLocation({ actor: "MAIN", project_id: "project-a", assignment_ref: request.assignment_ref, worktree: "/worktrees/launch-a", fence_path: "/runtime/fence-a" })
    const issued = store.issueLaunchBinding(request)
    expect(issued).toMatchObject({ request_ref: request.request_ref, authorization_id: request.authorization_id, candidate_revision: candidateRevision, jornada_id: "jornada-a", jornada_revision: 3 })
    expect(issued.actor).toBeUndefined()
    expect(Object.isFrozen(issued)).toBeTrue()
    expect(readFileSync(issued.record_path, "utf8")).toContain('"request_ref":"request-launch-a"')
    expect(code(() => store.issueLaunchBinding({ ...request, worktree: "/worktrees/other" }))).toBe("CT_LAUNCH_BINDING_INVALID")

    const consumed = store.consumeLaunchBinding("request-launch-a")
    expect(consumed).toEqual({
      assignment_ref: "assignments/launch-a.json", brief: "Implement the approved assignment.", brief_ref: "briefs/launch-a.json",
      candidate_revision: candidateRevision, fence_path: "/runtime/fence-a", host_epoch: 3, project_id: "project-a", worktree: "/worktrees/launch-a",
    })
    expect(code(() => store.consumeLaunchBinding("request-launch-a"))).toBe("CT_LAUNCH_BINDING_CONSUMED")
    expect(existsSync(join(root, "launch-consumptions", "request-launch-a.json"))).toBe(true)
  })

  test("proves exact current host identity at launch issue and inside consumption", () => {
    const calls = [], { root, store } = setup({ assertCurrentHost: (identity) => {
      calls.push(identity)
      if (calls.length === 3) throw Object.assign(new Error("advanced"), { code: "CT_ASSIGNMENT_STALE" })
      return true
    } })
    activateJornada(store)
    store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-epoch") })
    store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-epoch", candidate_revision: candidateRevision, decision: "APPROVED", expected_revision: 1 })
    store.registerAssignmentLocation({ actor: "MAIN", project_id: "project-a", assignment_ref: "assignments/epoch.json", worktree: "/worktrees/epoch", fence_path: "/runtime/fence-epoch" })
    store.issueLaunchBinding({ actor: "MAIN", project_id: "project-a", request_ref: "request-epoch", authorization_id: "auth-epoch", brief: "Approved", brief_ref: "briefs/epoch.json", assignment_ref: "assignments/epoch.json", candidate_revision: candidateRevision, host_epoch: 3 })
    expect(code(() => store.consumeLaunchBinding("request-epoch"))).toBe("CT_ASSIGNMENT_STALE")
    expect(calls).toEqual(Array(3).fill({ project_id: "project-a", assignment_ref: "assignments/epoch.json", candidate_revision: candidateRevision, host_epoch: 3, fence_path: "/runtime/fence-epoch" }))
    expect(existsSync(join(root, "launch-consumptions", "request-epoch.json"))).toBe(false)
  })

  test("derives immutable launch locations from Main-owned assignment records", () => {
    const { root, store } = setup()
    activateJornada(store)
    store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-location") })
    store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-location", candidate_revision: candidateRevision, decision: "APPROVED", expected_revision: 1 })
    const location = { actor: "MAIN", project_id: "project-a", assignment_ref: "assignments/location-a.json", worktree: "/worktrees/location-a", fence_path: "/runtime/fence-location-a" }

    expect(store.registerAssignmentLocation(location)).toMatchObject({ assignment_ref: location.assignment_ref, worktree: location.worktree, fence_path: location.fence_path })
    expect(code(() => store.registerAssignmentLocation({ ...location, worktree: "/worktrees/substituted" }))).toBe("CT_ASSIGNMENT_LOCATION_IMMUTABLE")
    expect(code(() => store.issueLaunchBinding({ actor: "MAIN", project_id: "project-a", request_ref: "request-location-a", authorization_id: "auth-location", brief: "Approved", brief_ref: "briefs/location-a.json", assignment_ref: location.assignment_ref, candidate_revision: candidateRevision, host_epoch: 3 }))).toBe(null)
    expect(store.consumeLaunchBinding("request-location-a")).toMatchObject({ worktree: location.worktree, fence_path: location.fence_path })
    expect(readFileSync(join(root, "launch-bindings", "request-location-a.json"), "utf8")).toContain('"worktree":"/worktrees/location-a"')
    expect(code(() => store.issueLaunchBinding({ actor: "MAIN", project_id: "project-a", request_ref: "request-location-missing", authorization_id: "auth-location", brief: "Approved", brief_ref: "briefs/location-missing.json", assignment_ref: "assignments/missing.json", candidate_revision: candidateRevision, host_epoch: 3 }))).toBe("CT_ASSIGNMENT_LOCATION_MISSING")
    expect(existsSync(join(root, "launch-bindings", "request-location-missing.json"))).toBe(false)
    writeFileSync(join(root, "assignment-locations", "assignments%2Flocation-a.json.json"), JSON.stringify({ assignment_ref: location.assignment_ref, project_id: "project-a", worktree: "/worktrees/../substituted", fence_path: location.fence_path }))
    expect(code(() => store.issueLaunchBinding({ actor: "MAIN", project_id: "project-a", request_ref: "request-location-invalid", authorization_id: "auth-location", brief: "Approved", brief_ref: "briefs/location-invalid.json", assignment_ref: location.assignment_ref, candidate_revision: candidateRevision, host_epoch: 3 }))).toBe("CT_ASSIGNMENT_LOCATION_INVALID")
    expect(existsSync(join(root, "launch-bindings", "request-location-invalid.json"))).toBe(false)
  })

  test("preserves the first assignment location when conflicting registration races issuance", () => {
    let raced = false
    const { root, store } = setup({ beforeCommit: (path) => {
      if (!raced && path.includes("/assignment-locations/")) {
        raced = true
        store.registerAssignmentLocation({ actor: "MAIN", project_id: "project-a", assignment_ref: "assignments/race.json", worktree: "/worktrees/first", fence_path: "/runtime/fence-first" })
      }
    } })
    const conflicting = { actor: "MAIN", project_id: "project-a", assignment_ref: "assignments/race.json", worktree: "/worktrees/second", fence_path: "/runtime/fence-second" }

    expect(code(() => store.registerAssignmentLocation(conflicting))).toBe("CT_ASSIGNMENT_LOCATION_IMMUTABLE")
    expect(JSON.parse(readFileSync(join(root, "assignment-locations", "assignments%2Frace.json.json"), "utf8"))).toMatchObject({ worktree: "/worktrees/first", fence_path: "/runtime/fence-first" })
  })

  test("publishes immutable Main epochs before atomically advancing the current epoch pointer", () => {
    const { root } = setup()
    expect(JSON.parse(readFileSync(join(root, "epoch-records", "3.json"), "utf8"))).toEqual({ epoch: 3, project_id: "project-a" })
    expect(JSON.parse(readFileSync(join(root, "current-epoch.json"), "utf8"))).toEqual({ epoch: 3, project_id: "project-a" })

    const rotated = { ...binding, store_path: root, epoch: 4 }
    const authority = bindMainAuthority({ trustedBindingProvider: () => rotated, rederiveBinding: () => ({ ...rotated }) })
    createMainStore({ root, authority, capability: authority.capability })

    expect(JSON.parse(readFileSync(join(root, "epoch-records", "3.json"), "utf8"))).toEqual({ epoch: 3, project_id: "project-a" })
    expect(JSON.parse(readFileSync(join(root, "epoch-records", "4.json"), "utf8"))).toEqual({ epoch: 4, project_id: "project-a" })
    expect(JSON.parse(readFileSync(join(root, "current-epoch.json"), "utf8"))).toEqual({ epoch: 4, project_id: "project-a" })
  })

  test("serializes epoch rotation against binding consumption without post-publication old-epoch effects", async () => {
    const waitFor = (path) => {
      const deadline = Date.now() + 1_000
      while (!existsSync(path)) {
        if (Date.now() >= deadline) throw new Error(`barrier unavailable: ${path}`)
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2)
      }
    }
    const seed = (request_ref) => {
      const fixture = setup(), { root, store } = fixture
      activateJornada(store)
      store.createAuthorization({ actor: "MAIN", ...authorizationRecord(`auth-${request_ref}`) })
      store.consumeAuthorization({ actor: "MAIN", authorization_id: `auth-${request_ref}`, candidate_revision: candidateRevision, decision: "APPROVED", expected_revision: 1 })
      store.registerAssignmentLocation({ actor: "MAIN", project_id: "project-a", assignment_ref: `assignments/${request_ref}.json`, worktree: `/worktrees/${request_ref}`, fence_path: `/runtime/${request_ref}` })
      store.issueLaunchBinding({ actor: "MAIN", project_id: "project-a", request_ref, authorization_id: `auth-${request_ref}`, brief: "Approved", brief_ref: `briefs/${request_ref}.json`, assignment_ref: `assignments/${request_ref}.json`, candidate_revision: candidateRevision, host_epoch: 3 })
      return fixture
    }
    const consumer = String.raw`
      import { existsSync, writeFileSync } from "node:fs";
      import { createLaunchBindingConsumer } from "./main-store/launch-consumer.mjs";
      const [root, request, barrier] = process.argv.slice(1);
      const wait = (name) => { while (!existsSync(barrier+"/"+name)) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,2); };
      try {
        writeFileSync(barrier+"/consumer-started", "1");
        const binding = createLaunchBindingConsumer({ root, assertCurrentHost:()=>true, testEpochTransactionHook: (event) => { if (event === "contended") return writeFileSync(barrier+"/consumer-contended", "1"); writeFileSync(barrier+"/consumer-acquired", "1"); wait("consumer-go"); } }).consume(request);
        writeFileSync(barrier+"/host-effect", JSON.stringify(binding)); console.log(JSON.stringify({ ok:true }));
      } catch (error) { console.log(JSON.stringify({ ok:false, code:error.code })); }
    `
    const rotation = String.raw`
      import { existsSync, writeFileSync } from "node:fs";
      import { bindMainAuthority, createMainStore } from "./main-store/index.mjs";
      const [root, barrier] = process.argv.slice(1); const binding = { project_id:"project-a", revision:7, repository_root:"/repo/a", git_common_dir:"/repo/a/.git", remote:"git@example.invalid:a.git", branch:"main", main_session_id:"main-session-a", store_path:root, epoch:4 };
      const authority = bindMainAuthority({ trustedBindingProvider:()=>binding, rederiveBinding:()=>({...binding}) });
      writeFileSync(barrier+"/rotation-started", "1"); createMainStore({ root, authority, capability:authority.capability, testEpochTransactionHook: (event) => { if (event === "contended") return writeFileSync(barrier+"/rotation-contended", "1"); writeFileSync(barrier+"/rotation-acquired", "1"); while (!existsSync(barrier+"/rotation-go")) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,2); } }); console.log(JSON.stringify({ ok:true }));
    `
    const spawn = (source, args) => Bun.spawn([process.execPath, "-e", source, ...args], { cwd: projectRoot, env: { ...process.env, NODE_ENV: "test", BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0" }, stdout: "pipe", stderr: "pipe" })
    const result = async (process) => { const output = await new Response(process.stdout).text(); await process.exited; return JSON.parse(output.trim()) }

    const first = seed("epoch-consumer-first"), firstBarrier = mkdtempSync(join(tmpdir(), "ct-epoch-a-")); temporaryDirectories.push(firstBarrier)
    const oldConsumer = spawn(consumer, [first.root, "epoch-consumer-first", firstBarrier]); waitFor(join(firstBarrier, "consumer-acquired"))
    const contendingRotation = spawn(rotation, [first.root, firstBarrier]); waitFor(join(firstBarrier, "rotation-started"))
    waitFor(join(firstBarrier, "rotation-contended"))
    expect(JSON.parse(readFileSync(join(first.root, "current-epoch.json"), "utf8"))).toEqual({ epoch: 3, project_id: "project-a" })
    writeFileSync(join(firstBarrier, "consumer-go"), "1")
    expect(await result(oldConsumer)).toEqual({ ok: true })
    expect(JSON.parse(readFileSync(join(first.root, "launch-consumptions", "epoch-consumer-first.json"), "utf8"))).toMatchObject({ request_ref: "epoch-consumer-first" })
    expect(readdirSync(join(first.root, "launch-consumptions"))).toEqual(["epoch-consumer-first.json"])
    expect(JSON.parse(readFileSync(join(firstBarrier, "host-effect"), "utf8"))).toMatchObject({ project_id: "project-a" })
    waitFor(join(firstBarrier, "rotation-acquired")); expect(JSON.parse(readFileSync(join(first.root, "current-epoch.json"), "utf8"))).toEqual({ epoch: 3, project_id: "project-a" })
    writeFileSync(join(firstBarrier, "rotation-go"), "1"); expect(await result(contendingRotation)).toEqual({ ok: true })
    expect(JSON.parse(readFileSync(join(first.root, "current-epoch.json"), "utf8"))).toEqual({ epoch: 4, project_id: "project-a" })

    const second = seed("epoch-rotation-first"), secondBarrier = mkdtempSync(join(tmpdir(), "ct-epoch-b-")); temporaryDirectories.push(secondBarrier)
    const firstRotation = spawn(rotation, [second.root, secondBarrier]); waitFor(join(secondBarrier, "rotation-acquired"))
    const staleConsumer = spawn(consumer, [second.root, "epoch-rotation-first", secondBarrier]); waitFor(join(secondBarrier, "consumer-started"))
    waitFor(join(secondBarrier, "consumer-contended"))
    writeFileSync(join(secondBarrier, "rotation-go"), "1"); expect(await result(firstRotation)).toEqual({ ok: true })
    waitFor(join(secondBarrier, "consumer-acquired")); expect(JSON.parse(readFileSync(join(second.root, "current-epoch.json"), "utf8"))).toEqual({ epoch: 4, project_id: "project-a" })
    writeFileSync(join(secondBarrier, "consumer-go"), "1")
    expect(await result(staleConsumer)).toEqual({ ok: false, code: "CT_LAUNCH_BINDING_STALE" })
    expect(existsSync(join(second.root, "launch-consumptions", "epoch-rotation-first.json"))).toBe(false)
    expect(existsSync(join(secondBarrier, "host-effect"))).toBe(false)
  })

  test("fails closed before issuing or consuming a launch binding with stale authority or lifecycle", () => {
    const { root, store } = setup()
    const request = {
      actor: "MAIN", project_id: "project-a", request_ref: "request-launch-b", authorization_id: "missing",
      brief: "Implement the approved assignment.", brief_ref: "briefs/launch-b.json", assignment_ref: "assignments/launch-b.json",
      candidate_revision: candidateRevision, host_epoch: 3,
    }
    expect(code(() => store.issueLaunchBinding(request))).toBe("CT_AUTH_INVALID")
    expect(existsSync(join(root, "launch-bindings"))).toBe(false)

    activateJornada(store)
    store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-launch-b") })
    store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-launch-b", candidate_revision: candidateRevision, decision: "APPROVED", expected_revision: 1 })
    store.registerAssignmentLocation({ actor: "MAIN", project_id: "project-a", assignment_ref: request.assignment_ref, worktree: "/worktrees/launch-b", fence_path: "/runtime/fence-b" })
    const issued = store.issueLaunchBinding({ ...request, authorization_id: "auth-launch-b" })
    store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id: "jornada-a", state: "PAUSED", expected_revision: 3 })
    expect(code(() => store.consumeLaunchBinding(issued.request_ref))).toBe("CT_LAUNCH_BINDING_STALE")
    expect(existsSync(join(root, "launch-consumptions", "request-launch-b.json"))).toBe(false)
  })

  test("bounds authorization lifetime and holds the Jornada lock through consumption", () => {
    const { root, store } = setup({ beforeCommit: (path) => {
      if (path.includes("/authorizations/") && existsSync(path)) expect(existsSync(join(root, "jornadas", "jornada-a.json.lock"))).toBe(true)
    } })
    expect(code(() => store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-too-long"), expires_at: "2099-01-01T01:00:00.001Z" }))).toBe("CT_AUTH_INVALID")
    activateJornada(store)
    store.createAuthorization({ actor: "MAIN", ...authorizationRecord("auth-locked") })
    expect(store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-locked", candidate_revision: candidateRevision, decision: "APPROVED", expected_revision: 1 }).state).toBe("APPROVED")
  })

  test("persists and reads only schema-valid Jornadas through Main CAS", () => {
    const { store } = setup()
    const created = store.createJornada({ actor: "MAIN", ...jornadaRecord("jornada-store") })
    expect(created.state).toBe("DRAFT")
    expect(created.jornada_revision).toBe(1)
    const { record_path: _path, ...persisted } = created
    expect(store.readJornada("jornada-store")).toEqual(persisted)

    const { manifest_ref: _dropped, ...invalid } = jornadaRecord("jornada-invalid")
    expect(code(() => store.createJornada({ actor: "MAIN", ...invalid }))).toBe("CT_JORNADA_INVALID")
    expect(code(() => store.createJornada({ actor: "SUPPORT", ...jornadaRecord("jornada-support") }))).toBe("CT_AUTH_INVALID")
    expect(code(() => store.createJornada({ actor: "MAIN", ...jornadaRecord("jornada-foreign"), project_id: "project-b" }))).toBe("CT_PROJECT_MISMATCH")
    expect(code(() => store.createJornada({ actor: "MAIN", ...jornadaRecord("jornada-store"), expected_revision: 0 }))).toBe("CT_CAS_MISMATCH")
  })

  test("keeps handoff coordinates and matching Worker claims in Main-owned records", () => {
    const { store } = setup()
    expect(store.recordHandoffCoordinate({ actor: "MAIN", project_id: "project-a", handoff_id: "handoff-a", module_id: "M5.1.2" }).module_id).toBe("M5.1.2")
    expect(store.readHandoffCoordinate("handoff-a")).toMatchObject({ handoff_id: "handoff-a", module_id: "M5.1.2" })
    expect(store.recordWorkerClaim({ actor: "MAIN", project_id: "project-a", handoff_id: "handoff-a", expected_claim: "M5.1.2", actual_claim: "M5.1.2" }).actual_claim).toBe("M5.1.2")
    expect(store.recordWorkerClaim({ actor: "MAIN", project_id: "project-a", handoff_id: "handoff-a", expected_claim: "M5.1.2", actual_claim: "M5.1.2" }).replayed).toBe(true)
    expect(code(() => store.recordWorkerClaim({ actor: "SUPPORT", project_id: "project-a", handoff_id: "handoff-a", expected_claim: "M5.1.2", actual_claim: "M5.1.2" }))).toBe("CT_AUTH_INVALID")
    expect(code(() => store.recordWorkerClaim({ actor: "MAIN", project_id: "project-b", handoff_id: "handoff-a", expected_claim: "M5.1.2", actual_claim: "M5.1.2" }))).toBe("CT_PROJECT_MISMATCH")
  })

  test("persists Support proposals only through Main without assigning authority", () => {
    const { root, store } = setup()
    const proposal = {
      schema: "support-proposal", schema_version: 1, proposal_id: "proposal-store", project_id: "project-a", caller_role: "MAIN",
      checkpoint_ref: "evidence/checkpoint.json", plan_enumeration_digest: `sha256:${"a".repeat(64)}`, ledger_digest: `sha256:${"b".repeat(64)}`,
      worker_claim: "claim-a", primary: { module_id: "M5.1.2", task_ids: ["T5.1.2.1"] }, alternatives: [], conflicts: [], evidence_refs: [], expires_at: "2099-01-01T00:00:00.000Z", state: "EXECUTABLE",
    }
    expect(store.persistSupportProposal({ actor: "MAIN", ...proposal })).toMatchObject({ proposal_id: "proposal-store", caller_role: "MAIN" })
    expect(store.persistSupportProposal({ actor: "MAIN", ...proposal }).replayed).toBe(true)
    expect(code(() => store.persistSupportProposal({ actor: "SUPPORT", ...proposal, proposal_id: "proposal-support" }))).toBe("CT_AUTH_INVALID")
    expect(code(() => store.persistSupportProposal({ actor: "MAIN", ...proposal, project_id: "project-b", proposal_id: "proposal-foreign" }))).toBe("CT_PROJECT_MISMATCH")
    const invalid = { ...proposal, proposal_id: "proposal-invalid", alternatives: [{ nested: { assignment: { id: "forbidden" } } }] }
    expect(code(() => store.persistSupportProposal({ actor: "MAIN", ...invalid }))).toBe("CT_STORE_INVALID")
    expect(existsSync(join(root, "support-proposals", "proposal-invalid.json"))).toBe(false)
    const authority = { ...proposal, proposal_id: "proposal-authority", conflicts: [{ nested: { authority: "forbidden" } }] }
    expect(code(() => store.persistSupportProposal({ actor: "MAIN", ...authority }))).toBe("CT_STORE_INVALID")
    expect(existsSync(join(root, "support-proposals", "proposal-authority.json"))).toBe(false)
  })

  test("serializes identical Support proposals across independent Main-store processes", async () => {
    const { root } = setup()
    const worker = String.raw`
      import { existsSync, writeFileSync } from "node:fs";
      import { bindMainAuthority, createMainStore } from "./main-store/index.mjs";
      const [root, id] = process.argv.slice(1); const binding = { project_id:"project-a", revision:7, repository_root:"/repo/a", git_common_dir:"/repo/a/.git", remote:"git@example.invalid:a.git", branch:"main", main_session_id:"main-session-a", store_path:root, epoch:3 };
      const authority = bindMainAuthority({ trustedBindingProvider:()=>binding, rederiveBinding:()=>({...binding}) });
      const store = createMainStore({ root, authority, capability:authority.capability, beforeCommit:()=>{ writeFileSync(root+"/proposal-ready-"+id, "1"); while (!(existsSync(root+"/proposal-ready-a") && existsSync(root+"/proposal-ready-b"))) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,2); } });
      const proposal = { schema:"support-proposal", schema_version:1, proposal_id:"proposal-race", project_id:"project-a", caller_role:"MAIN", checkpoint_ref:"evidence/checkpoint.json", plan_enumeration_digest:"sha256:${"a".repeat(64)}", ledger_digest:"sha256:${"b".repeat(64)}", worker_claim:"claim-a", primary:{module_id:"M5.1.2",task_ids:["T5.1.2.1"]}, alternatives:[], conflicts:[], evidence_refs:[], expires_at:"2099-01-01T00:00:00.000Z", state:"EXECUTABLE" };
      try { console.log(JSON.stringify(store.persistSupportProposal({ actor:"MAIN", ...proposal }))); } catch(error) { console.log(JSON.stringify({ code:error.code })); }
    `
    const run = (id) => Bun.spawn([process.execPath, "-e", worker, root, id], { cwd: projectRoot, env: { ...process.env, BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0" }, stdout: "pipe", stderr: "pipe" })
    const processes = [run("a"), run("b")]
    const results = await Promise.all(processes.map(async (process) => {
      const output = await new Response(process.stdout).text()
      await process.exited
      return JSON.parse(output.trim())
    }))
    expect(results.filter(({ replayed }) => replayed === false)).toHaveLength(1)
    expect(results.filter(({ replayed }) => replayed === true)).toHaveLength(1)
  })

  test("serializes identical Worker claims across independent Main-store processes", async () => {
    const { root } = setup()
    const worker = String.raw`
      import { existsSync, writeFileSync } from "node:fs";
      import { bindMainAuthority, createMainStore } from "./main-store/index.mjs";
      const [root, id] = process.argv.slice(1); const binding = { project_id:"project-a", revision:7, repository_root:"/repo/a", git_common_dir:"/repo/a/.git", remote:"git@example.invalid:a.git", branch:"main", main_session_id:"main-session-a", store_path:root, epoch:3 };
      const authority = bindMainAuthority({ trustedBindingProvider:()=>binding, rederiveBinding:()=>({...binding}) });
      const store = createMainStore({ root, authority, capability:authority.capability, beforeCommit:()=>{ writeFileSync(root+"/claim-ready-"+id, "1"); while (!(existsSync(root+"/claim-ready-a") && existsSync(root+"/claim-ready-b"))) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,2); } });
      try { console.log(JSON.stringify(store.recordWorkerClaim({ actor:"MAIN", project_id:"project-a", handoff_id:"handoff-race", expected_claim:"M5.1.2", actual_claim:"M5.1.2" }))); } catch(error) { console.log(JSON.stringify({ code:error.code })); }
    `
    const run = (id) => Bun.spawn([process.execPath, "-e", worker, root, id], { cwd: projectRoot, env: { ...process.env, BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0" }, stdout: "pipe", stderr: "pipe" })
    const processes = [run("a"), run("b")]
    const results = await Promise.all(processes.map(async (process) => {
      const output = await new Response(process.stdout).text()
      await process.exited
      return JSON.parse(output.trim())
    }))
    expect(results.filter(({ replayed }) => replayed === false)).toHaveLength(1)
    expect(results.filter(({ replayed }) => replayed === true)).toHaveLength(1)
  })

  test("creates only canonical DRAFT Jornadas", () => {
    const { store } = setup()
    for (const state of ["PENDING_AUTHORIZATION", "ACTIVE", "PAUSED", "BLOCKED", "REJECTED", "EXPIRED", "REVOKED", "COMPLETED"]) {
      expect(code(() => store.createJornada({ actor: "MAIN", ...jornadaRecord(`jornada-${state.toLowerCase()}`), state }))).toBe("CT_JORNADA_INVALID")
    }
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

describe("completed work binding", () => {
  const cases = JSON.parse(readFileSync(join(projectRoot, "test/fixtures/contracts/schema-cases-v1.json"), "utf8"))
  // The work must sit inside the decision's frozen scope, and parkedResponse freezes S5.8.
  const candidate = () => { const { candidate_revision: _frozen, ...identity } = cases.candidateRevision; return { ...identity, session_id: "S5.8" } }
  const revision = () => freezeCandidate(candidate()).candidate_revision
  const assumption = Object.freeze({
    statement: "No maintainer option applied, so the work proceeded under the frozen scope only.",
    origin: { session_id: "S5.8", module_id: "M5.8.1" },
  })
  // A binding may only name sources this store actually holds: a parked decision it parked, and an
  // authorization it approved for this exact candidate. Building that state IS the precondition under test.
  const governed = (store, id = "auth-work-a") => {
    activateJornada(store)
    const { parked_decision, parked_decision_response } = parkedResponse(id)
    const base = authorizationRecord(id)
    store.createAuthorization({ actor: "MAIN", ...base, extensions: { ...base.extensions, "control-tower/candidate-revision": revision() } })
    store.consumeAuthorization({ actor: "MAIN", authorization_id: id, candidate_revision: revision(), decision: "APPROVED", expected_revision: 1, parked_decision, parked_decision_response })
    store.parkDecision(parkingInput(parked_decision, provenance()))
    return { parked_decision, parked_decision_response }
  }
  const optionInput = (g) => ({ actor: "MAIN", project_id: "project-a", candidate: candidate(), parked_decision: g.parked_decision, parked_decision_response: g.parked_decision_response })
  const assumedInput = (g) => ({ actor: "MAIN", project_id: "project-a", candidate: candidate(), parked_decision: g.parked_decision, assumption })
  const expected = (g) => createCompletedWorkBinding({ candidate: candidate(), parked_decision: g.parked_decision, parked_decision_response: g.parked_decision_response })

  test("persists the binding through the canonical writer and reads back the exact derived record", () => {
    const { store, root } = setup(), g = governed(store)
    const result = store.bindCompletedWork(optionInput(g))
    expect(result.replayed).toBe(false)
    expect(result.revision).toBe(1)
    expect(result.completed_work_binding).toEqual(expected(g))
    expect(store.readCompletedWorkBinding(expected(g).binding_id)).toEqual(expected(g))
    expect(existsSync(join(root, "completed-work-bindings", `${expected(g).binding_id}.json`))).toBe(true)
  })

  test("records an explicit assumption under the same writer, with its own derived digest", () => {
    const { store } = setup(), g = governed(store)
    const result = store.bindCompletedWork(assumedInput(g))
    expect(result.completed_work_binding.governed_by).toBe("ASSUMPTION")
    expect(result.completed_work_binding.assumption).toEqual(assumption)
    expect(Object.hasOwn(result.completed_work_binding, "option_id")).toBe(false)
    expect(store.readCompletedWorkBinding(result.completed_work_binding.binding_id)).toEqual(result.completed_work_binding)
  })

  // The heart of it: a self-consistent decision and response are computable offline, so deriving from them
  // is caller assertion with extra steps unless this store actually holds both.
  test("refuses a decision this store never parked, however well-formed the artifacts are", () => {
    const { store, root } = setup()
    const forged = parkedResponse("auth-never-parked")
    expect(code(() => store.bindCompletedWork(optionInput(forged)))).toBe("CT_WORK_BINDING_UNPARKED")
    expect(code(() => store.bindCompletedWork(assumedInput(forged)))).toBe("CT_WORK_BINDING_UNPARKED")
    expect(existsSync(join(root, "completed-work-bindings"))).toBeFalse()
  })

  test("refuses an option whose authorization this store never approved for this work", () => {
    const { store } = setup()
    const { parked_decision, parked_decision_response } = parkedResponse("auth-unapproved")
    store.parkDecision(parkingInput(parked_decision, provenance()))
    expect(code(() => store.bindCompletedWork(optionInput({ parked_decision, parked_decision_response })))).toBe("CT_AUTH_INVALID")
    // The assumption genus applies no option, so it needs the parking only — and that one is real.
    expect(store.bindCompletedWork(assumedInput({ parked_decision })).completed_work_binding.governed_by).toBe("ASSUMPTION")
  })

  // A self-consistent pair reusing the id of a decision parked here: only the persisted digest catches it.
  test("refuses a parked decision whose persisted digest differs from the one supplied", () => {
    const { store } = setup(), g = governed(store)
    const divergent = createParkedDecision({ ...g.parked_decision, parked_decision_digest: undefined, checkpoint: `${g.parked_decision.checkpoint} changed` })
    const response = createParkedDecisionResponse({ parked_decision: divergent, response_id: "response-divergent", authorization_id: "auth-work-a", authorization_revision: 1, option_id: "option-a", responded_at: "2026-08-11T13:05:00Z" })
    expect(divergent.parked_decision_id).toBe(g.parked_decision.parked_decision_id)
    expect(code(() => store.bindCompletedWork({ ...optionInput(g), parked_decision: divergent, parked_decision_response: response }))).toBe("CT_WORK_BINDING_UNPARKED")
  })

  test("byte-identical replay is idempotent and adds no second effect", () => {
    const { store } = setup(), g = governed(store)
    const first = store.bindCompletedWork(optionInput(g))
    const second = store.bindCompletedWork(optionInput(g))
    expect(second).toMatchObject({ revision: 1, replayed: true })
    expect(second.completed_work_binding).toEqual(first.completed_work_binding)
    expect(readFileSync(second.record_path, "utf8")).toBe(readFileSync(first.record_path, "utf8"))
  })

  test("divergent replay fails closed and leaves the persisted bytes untouched", () => {
    const { store } = setup(), g = governed(store)
    const first = store.bindCompletedWork(optionInput(g))
    const before = readFileSync(first.record_path, "utf8")
    expect(code(() => store.bindCompletedWork(assumedInput(g)))).toBe("CT_WORK_BINDING_REPLAY_DIVERGENT")
    expect(readFileSync(first.record_path, "utf8")).toBe(before)
  })

  test("refuses both genera at once, neither genus, a foreign project and a non-Main actor", () => {
    const { store } = setup(), g = governed(store)
    expect(code(() => store.bindCompletedWork({ ...optionInput(g), assumption }))).toBe("CT_WORK_BINDING_INPUT_INVALID")
    const { parked_decision_response: _dropped, ...neither } = optionInput(g)
    expect(code(() => store.bindCompletedWork(neither))).toBe("CT_WORK_BINDING_INPUT_INVALID")
    expect(code(() => store.bindCompletedWork({ ...optionInput(g), project_id: "project-b" }))).toBe("CT_PROJECT_MISMATCH")
    expect(code(() => store.bindCompletedWork({ ...optionInput(g), actor: "WORKER" }))).toBe("CT_AUTH_INVALID")
  })

  test("refuses work whose Sesión the decision never froze", () => {
    const { store } = setup(), g = governed(store)
    const foreign = { ...candidate(), session_id: "S7.3" }
    expect(code(() => store.bindCompletedWork({ ...optionInput(g), candidate: foreign }))).toBe("CT_WORK_BINDING_INVALID")
    expect(code(() => store.bindCompletedWork({ ...assumedInput(g), candidate: foreign }))).toBe("CT_WORK_BINDING_INVALID")
    expect(code(() => store.bindCompletedWork({ ...assumedInput(g), assumption: { ...assumption, origin: { session_id: "S7.3", module_id: "M7.3.1" } } }))).toBe("CT_WORK_BINDING_INVALID")
  })

  test("refuses a response that selects an unenumerated option or a candidate that forges its own revision", () => {
    const { store } = setup(), g = governed(store)
    expect(code(() => store.bindCompletedWork({ ...optionInput(g), parked_decision_response: { ...g.parked_decision_response, option_id: "option-z" } }))).toBe("CT_WORK_BINDING_INVALID")
    expect(code(() => store.bindCompletedWork({ ...optionInput(g), candidate: { ...candidate(), candidate_revision: `sha256:${"0".repeat(64)}` } }))).toBe("CT_WORK_BINDING_INVALID")
  })

  test("reads back nothing for an unknown binding rather than inventing one", () => {
    const { store } = setup()
    expect(code(() => store.readCompletedWorkBinding("completed-work-missing"))).toBe("CT_WORK_BINDING_NOT_FOUND")
  })

  test("writes atomically: a failing commit persists no partial record", () => {
    let failing = false
    const { store, root } = setup({ beforeCommit: () => { if (failing) throw new Error("commit barrier") } })
    const g = governed(store)
    const path = join(root, "completed-work-bindings", `${expected(g).binding_id}.json`)
    failing = true
    expect(code(() => store.bindCompletedWork(optionInput(g)))).toBe("CT_STORE_WRITE_FAILED")
    expect(existsSync(path)).toBeFalse()
    failing = false
    store.bindCompletedWork(optionInput(g))
    expect(existsSync(path)).toBeTrue()
  })

  test("refuses a persisted record whose stored provenance no longer derives its binding", () => {
    for (const tamper of [
      (record) => { record.completed_work_binding.option_id = "option-b" },
      (record) => { record.completed_work_binding.candidate_revision = `sha256:${"0".repeat(64)}` },
      (record) => { record.parked_decision_response.option_id = "option-b" },
      (record) => { record.candidate.base_sha = "d".repeat(40) },
      (record) => { record.completed_work_binding.governed_by = "ASSUMPTION" },
      (record) => { record.revision = 2 },
      (record) => { record.actor = "WORKER" },
      (record) => { record.assumption = assumption },
    ]) {
      const { store } = setup(), g = governed(store)
      const result = store.bindCompletedWork(optionInput(g))
      const record = JSON.parse(readFileSync(result.record_path, "utf8"))
      tamper(record)
      writeFileSync(result.record_path, JSON.stringify(record))
      expect(code(() => store.readCompletedWorkBinding(expected(g).binding_id))).toBe("CT_WORK_BINDING_INVALID")
    }
  })

  // A coherently foreign payload under an envelope that names our project: the envelope check alone misses it.
  test("refuses a readback whose binding belongs to another project even when the envelope claims ours", () => {
    const { store, root } = setup(), g = governed(store)
    const foreignCandidate = { ...candidate(), project_id: "project-b" }
    const foreign = createCompletedWorkBinding({ candidate: foreignCandidate, parked_decision: g.parked_decision, parked_decision_response: g.parked_decision_response })
    mkdirSync(join(root, "completed-work-bindings"), { recursive: true, mode: 0o700 })
    writeFileSync(join(root, "completed-work-bindings", `${foreign.binding_id}.json`), `${JSON.stringify({
      actor: "MAIN", project_id: "project-a", candidate: freezeCandidate(foreignCandidate),
      parked_decision: g.parked_decision, parked_decision_response: g.parked_decision_response,
      completed_work_binding: foreign, revision: 1, revision_history: [],
    })}\n`)
    expect(code(() => store.readCompletedWorkBinding(foreign.binding_id))).toBe("CT_WORK_BINDING_INVALID")
  })

  // A record we cannot read is our failure, not a verdict on the work.
  test("separates a record it cannot read from a record that is invalid", () => {
    const { store } = setup(), g = governed(store)
    const result = store.bindCompletedWork(optionInput(g))
    writeFileSync(result.record_path, "{ truncated")
    expect(code(() => store.readCompletedWorkBinding(expected(g).binding_id))).toBe("CT_WORK_BINDING_UNREADABLE")
    writeFileSync(result.record_path, JSON.stringify({ actor: "MAIN", project_id: "project-a" }))
    expect(code(() => store.readCompletedWorkBinding(expected(g).binding_id))).toBe("CT_WORK_BINDING_INVALID")
  })

  test("recovers a lost commit race into an idempotent replay", () => {
    let inject = false
    const { store } = setup({ beforeCommit: (path, value) => { if (inject && path.includes("completed-work-bindings")) { inject = false; writeFileSync(path, `${JSON.stringify(value)}\n`) } } })
    const g = governed(store)
    inject = true
    const result = store.bindCompletedWork(optionInput(g))
    expect(result.replayed).toBe(true)
    expect(result.revision).toBe(1)
    expect(result.completed_work_binding).toEqual(expected(g))
  })

  test("returns a deeply frozen binding, so a reader cannot mutate the provenance it was handed", () => {
    const { store } = setup(), g = governed(store)
    const result = store.bindCompletedWork(optionInput(g))
    const readback = store.readCompletedWorkBinding(expected(g).binding_id)
    expect(Object.isFrozen(result.completed_work_binding)).toBeTrue()
    expect(Object.isFrozen(readback)).toBeTrue()
    expect(() => { "use strict"; readback.option_id = "option-b" }).toThrow(TypeError)
    expect(store.readCompletedWorkBinding(expected(g).binding_id).option_id).toBe("option-a")
  })
})
