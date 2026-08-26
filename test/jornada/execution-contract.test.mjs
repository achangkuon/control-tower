import { describe, expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createExecutionContractPreparer } from "../../jornada/execution-contract.mjs"

const fixtures = JSON.parse(readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../fixtures/contracts/schema-cases-v1.json"),
  "utf8",
))
const v2Compatibility = fixtures._executionContractV2Compatibility
const NOW = Date.parse("2026-01-02T00:00:00.000Z")
const HEX = "a".repeat(64), SHA = "a".repeat(40)
const canonical = (value) => value === null || typeof value !== "object" ? JSON.stringify(value)
  : Array.isArray(value) ? `[${value.map(canonical).join(",")}]`
    : `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`
const digest = (value) => createHash("sha256").update(canonical(value)).digest("hex")
const context = {
  repository_identity: "repo-a", repository_root: "/repo/a", git_common_dir: "/repo/a/.git",
  worktree: "/repo/a", branch: "main", base_ref: "origin/main", base_sha: SHA,
  sesion_id: "S10.1", jornada_root: "/repo/a/jornada",
}
const contract = (overrides = {}) => {
  const value = {
    schema_version: "gentle-ai.unattended-execution-contract/v1", contract_id: "contract-a",
    sealed_at: "2026-01-01T00:00:00.000Z", expires_at: "2026-01-03T00:00:00.000Z", contract_digest: HEX,
    repository: { identity: "repo-a", root: "/repo/a", common_dir: "/repo/a/.git", worktree: "/repo/a", branch: "main", base_ref: "origin/main", base_sha: SHA },
    artifacts: [{ kind: "tasks", locator: "plans/s10-1/tasks", sha256: HEX }],
    assignment: { sesion_id: "S10.1", task_ids: ["T10.1.1.1"], objective: "Prepare passively", continuation: "none" },
    permissions: { read_paths: [], edit_paths: ["jornada/**"], commands: [], network: [], processes: [], cleanup_paths: [], denied_paths: [], denied_effects: ["execute"], prohibitions: Object.fromEntries(["commit","amend","rebase","tag","push","pr_create","pr_update","merge","release","deploy","db_mutation","global_closure","token_request","token_acquire","token_transfer","token_release","unlisted_sesion"].map((key) => [key, true])) },
    ownership: { exclusive_paths: ["jornada/**"], package_manifests: [], lockfiles: [], generated_outputs: [], sdd_progress_files: [], shared_resources: [], known_conflicts: [] },
    artifact_policy: { authored_tracked: ["jornada/execution-contract.mjs"], generated_tracked: [], ephemeral_untracked: [], forbidden_generated: [], ignore_policy: "preserve", cleanup_policy: "none", node_modules: { disposition: "read-only", paths: ["node_modules"] }, codegraph: { disposition: "absent", paths: [] }, caches: { disposition: "absent", paths: [] } },
    tower: { mode: "active-supervision", mode_locked: true, git_delivery_token: "forbidden", active_marker_scope: ".git/control-tower/ACTIVE" },
    chain: { strategy: "single-pr", delivery_strategy: "single-pr", budget_risk: "Low", chained_recommended: false, decision_needed: false, position: 1, total: 1, base_target_map: [{ sesion_id: "S10.1", branch: "main", base: "origin/main", target: "main" }], line_budget: 400, rollback_boundary: "two files" },
    validation: { live_tower_active: true, method: "separate-regular-clone", source_root_realpath: "/repo/a", source_common_dir_realpath: "/repo/a/.git", clone_root_realpath: "/clone/a", clone_common_dir_realpath: "/clone/a/.git", baseline_commands: ["bun test"], candidate_commands: ["bun test"] },
    candidate_recipe: { entries: [{ path: "jornada/execution-contract.mjs", mode: "100644", class: "authored-tracked" }], identity_algorithm: "sorted-path-mode-size-sha256", staging_required: true, commit_required: false },
    retries: { same_input_transient_before_final_verification: 1, implementation_corrections_before_final_verification: 2, authorization_scope: 0, final_verification_attempts: 1, retries_after_final_verification_failure: 0, corrections_after_final_verification_failure: 0 },
    terminal: { states: ["READY", "BLOCKED"], ready_definition: "exact-staged-uncommitted-candidate", occupied_ready_slot: "preserve-and-block-with-evidence" },
    ...overrides,
  }
  value.contract_digest = digest(Object.fromEntries(Object.entries(value).filter(([key]) => !["contract_digest", "runtime_result"].includes(key))))
  return value
}
const code = async (operation) => { try { await operation() } catch (error) { return error?.code } return null }
const setup = (options = {}) => {
  const calls = []
  const defaultPersistence = { owner: "JORNADA", root: context.jornada_root, persistPrepared: async (record) => ({ persisted: true, owner: "JORNADA", root: context.jornada_root, record_digest: record.record_digest }) }
  const configuredPersistence = Object.hasOwn(options, "persistence") ? options.persistence : defaultPersistence
  const persistence = configuredPersistence && typeof configuredPersistence.persistPrepared === "function" ? {
    ...configuredPersistence,
    persistPrepared: async (record) => { calls.push(["persist", record]); return configuredPersistence.persistPrepared(record) },
  } : configuredPersistence
  const defaultVerifier = async (_evidence, expected) => ({ valid: true, expires_at: "2026-01-03T00:00:00.000Z", ...expected, evidence_digest: HEX })
  const configuredVerifier = Object.hasOwn(options, "verifySupervision") ? options.verifySupervision : defaultVerifier
  const verifySupervision = typeof configuredVerifier === "function" ? async (...args) => {
    calls.push(["verify", ...args])
    return configuredVerifier(...args)
  } : configuredVerifier
  return { calls, prepare: createExecutionContractPreparer({ persistence, verifySupervision, now: () => NOW }).prepare }
}

describe("execution contract preparation", () => {
  test("accepts the exact portable v2 Tower-safe bytes without reconstruction", async () => {
    const { calls, prepare } = setup()

    const result = await prepare({
      contractJson: v2Compatibility.tower_safe_contract_json,
      currentContext: context,
      supervisionEvidence: {},
    })

    expect(result.contract_digest).toBe("22f481f251b20ecdcbaaf98820d006b18820fc6056d6966c2778e24453fb555d")
    expect(calls.map(([kind]) => kind)).toEqual(["verify", "persist"])
  })

  test("continues to accept numeric 1 and the exact Gentle v1 string", async () => {
    for (const schemaVersion of [1, "gentle-ai.unattended-execution-contract/v1"]) {
      const compatible = contract({ schema_version: schemaVersion })
      const { calls, prepare } = setup()

      const result = await prepare({ contractJson: JSON.stringify(compatible), currentContext: context, supervisionEvidence: {} })

      expect(result.contract_digest).toBe(compatible.contract_digest)
      expect(calls.map(([kind]) => kind)).toEqual(["verify", "persist"])
    }
  })

  test("accepts optional opaque runtime and existing harness objects without using their contents as authority", async () => {
    const opaque = contract({
      runtime: { mode: "standalone", phase: { command: ["custom", 2], budget: { nested: false } } },
      chain: { nested: { command: "custom", phases: ["alpha", 2, false] } },
      validation: { runner: { name: "custom-check", options: [null, { deep: true }] } },
      retries: { policy: { limits: [0, 7], labels: { transient: "maybe" } } },
    })
    const { calls, prepare } = setup()

    const result = await prepare({ contractJson: JSON.stringify(opaque), currentContext: context, supervisionEvidence: {} })

    expect(result.contract_digest).toBe(opaque.contract_digest)
    expect(calls.map(([kind]) => kind)).toEqual(["verify", "persist"])
  })

  test("accepts contracts that omit runtime, chain, validation, and retries", async () => {
    const optionalFieldsOmitted = contract()
    delete optionalFieldsOmitted.chain
    delete optionalFieldsOmitted.validation
    delete optionalFieldsOmitted.retries
    optionalFieldsOmitted.contract_digest = digest(Object.fromEntries(Object.entries(optionalFieldsOmitted).filter(([key]) => key !== "contract_digest")))
    const { calls, prepare } = setup()

    const result = await prepare({ contractJson: JSON.stringify(optionalFieldsOmitted), currentContext: context, supervisionEvidence: {} })

    expect(result.contract_digest).toBe(optionalFieldsOmitted.contract_digest)
    expect(calls.map(([kind]) => kind)).toEqual(["verify", "persist"])
  })

  test("rejects present non-object runtime and harness values before effects", async () => {
    for (const [key, value] of [
      ["runtime", []], ["runtime", "standalone"], ["runtime", 3], ["runtime", null],
      ["chain", []], ["validation", "custom"], ["retries", 3],
    ]) {
      const invalid = contract({ [key]: value })
      const { calls, prepare } = setup()

      expect(await code(() => prepare({ contractJson: JSON.stringify(invalid), currentContext: context, supervisionEvidence: {} }))).toBe("CT_EXECUTION_CONTRACT_SCHEMA")
      expect(calls).toHaveLength(0)
    }
  })

  test("rejects v2 standalone and every missing or unsafe Tower floor before effects", async () => {
    const mutations = [
      (value) => { value.tower.mode = "absent" },
      (value) => { delete value.tower },
      (value) => { value.tower.mode_locked = false },
      (value) => { value.tower.git_delivery_token = "available" },
      (value) => { value.permissions.prohibitions.commit = false },
      (value) => { value.permissions.prohibitions.push = false },
      (value) => { value.permissions.prohibitions.pr_create = false },
      (value) => { value.candidate_recipe.commit_required = true },
      (value) => { value.terminal.states = ["BLOCKED", "READY"] },
      (value) => { value.terminal.ready_definition = "exact-committed-candidate" },
      (value) => { value.terminal.occupied_ready_slot = "overwrite" },
    ]
    for (const mutate of mutations) {
      const unsafe = JSON.parse(v2Compatibility.tower_safe_contract_json)
      mutate(unsafe)
      const { calls, prepare } = setup()

      expect(await code(() => prepare({ contractJson: JSON.stringify(unsafe), currentContext: context, supervisionEvidence: {} }))).toBe("CT_EXECUTION_CONTRACT_SCHEMA")
      expect(calls).toHaveLength(0)
    }
  })

  test("accepts non-SDD artifact kinds and rejects an empty kind", async () => {
    const customKind = contract({ artifacts: [{ kind: "runtime-log", locator: "artifacts/runtime.log", sha256: HEX }] })
    const validSetup = setup()

    const result = await validSetup.prepare({ contractJson: JSON.stringify(customKind), currentContext: context, supervisionEvidence: {} })

    expect(result.contract_digest).toBe(customKind.contract_digest)
    expect(validSetup.calls.map(([kind]) => kind)).toEqual(["verify", "persist"])

    const emptyKind = contract({ artifacts: [{ kind: "", locator: "artifacts/runtime.log", sha256: HEX }] })
    const invalidSetup = setup()
    expect(await code(() => invalidSetup.prepare({ contractJson: JSON.stringify(emptyKind), currentContext: context, supervisionEvidence: {} }))).toBe("CT_EXECUTION_CONTRACT_SCHEMA")
    expect(invalidSetup.calls).toHaveLength(0)
  })

  test("rejects malformed, schema-invalid, post-run, drifted, expired, and divergent contracts before effects", async () => {
    const cases = [
      ["{", "CT_EXECUTION_CONTRACT_PARSE"],
      ["null", "CT_EXECUTION_CONTRACT_SCHEMA"],
      [JSON.stringify({}), "CT_EXECUTION_CONTRACT_SCHEMA"],
      [JSON.stringify(contract({ runtime_result: {} })), "CT_EXECUTION_CONTRACT_RUNTIME_RESULT"],
      [JSON.stringify({ ...contract(), contract_digest: HEX }), "CT_EXECUTION_CONTRACT_DIGEST"],
      [JSON.stringify(contract({ sealed_at: "2026-01-01" })), "CT_EXECUTION_CONTRACT_SCHEMA"],
      [JSON.stringify(contract({ sealed_at: "2026-02-30T00:00:00Z" })), "CT_EXECUTION_CONTRACT_SCHEMA"],
      [JSON.stringify(contract({ expires_at: "not-a-date" })), "CT_EXECUTION_CONTRACT_SCHEMA"],
      [JSON.stringify(contract({ expires_at: "2026-01-03" })), "CT_EXECUTION_CONTRACT_SCHEMA"],
      [JSON.stringify(contract({ expires_at: "2026-02-30T00:00:00Z" })), "CT_EXECUTION_CONTRACT_SCHEMA"],
      [JSON.stringify(contract({ expires_at: "2026-01-01T00:00:00.000Z" })), "CT_EXECUTION_CONTRACT_EXPIRED"],
      ...["repository_identity", "repository_root", "git_common_dir", "worktree", "branch", "base_ref", "base_sha", "sesion_id"]
        .map((key) => [JSON.stringify(contract()), "CT_EXECUTION_CONTRACT_CONTEXT", { ...context, [key]: "other" }]),
    ]
    for (const [contractJson, expected, currentContext = context] of cases) {
      const { calls, prepare } = setup()
      expect(await code(() => prepare({ contractJson, currentContext, supervisionEvidence: {} }))).toBe(expected)
      expect(calls).toHaveLength(0)
    }
  })

  test("rejects unavailable, failed, stale, malformed, or divergent supervision before persistence", async () => {
    const expected = { contract_digest: contract().contract_digest, repository_identity: "repo-a", worktree: "/repo/a", base_sha: SHA, sesion_id: "S10.1" }
    const valid = { valid: true, expires_at: "2026-01-03T00:00:00.000Z", ...expected, evidence_digest: HEX }
    const absent = setup()
    expect(await code(() => absent.prepare({ contractJson: JSON.stringify(contract()), currentContext: context }))).toBe("CT_EXECUTION_SUPERVISION")
    expect(absent.calls).toHaveLength(0)
    const cases = [
      [null, 0], ["not-a-function", 0], [async () => { throw new Error("unavailable") }, 1],
      [async () => undefined, 1], [async () => ({ ...valid, valid: false }), 1],
      [async () => ({ ...valid, expires_at: "not-a-date" }), 1],
      [async () => ({ ...valid, expires_at: "2026-01-01T00:00:00.000Z" }), 1],
      [async () => ({ ...valid, evidence_digest: "bad" }), 1],
      ...Object.keys(expected).map((key) => [async () => ({ ...valid, [key]: "other" }), 1]),
    ]
    for (const [verifySupervision, verifierCalls] of cases) {
      const { calls, prepare } = setup({ verifySupervision })
      expect(await code(() => prepare({ contractJson: JSON.stringify(contract()), currentContext: context, supervisionEvidence: { opaque: { token: 1 } } }))).toBe("CT_EXECUTION_SUPERVISION")
      expect(calls.filter(([kind]) => kind === "verify")).toHaveLength(verifierCalls)
      expect(calls.filter(([kind]) => kind === "persist")).toHaveLength(0)
    }
  })

  test("normalizes hostile attestation values without persistence or a prepared result", async () => {
    const expected = { contract_digest: contract().contract_digest, repository_identity: "repo-a", worktree: "/repo/a", base_sha: SHA, sesion_id: "S10.1" }
    const valid = { valid: true, expires_at: "2026-01-03T00:00:00.000Z", ...expected, evidence_digest: HEX }
    const cases = [
      { ...valid, expires_at: Symbol("bad") },
      { ...valid, evidence_digest: Symbol("bad") },
      { ...valid, contract_digest: Symbol("bad") },
      new Proxy({}, { get() { throw new TypeError("hostile getter") } }),
    ]
    for (const attestation of cases) {
      const { calls, prepare } = setup({ verifySupervision: async () => attestation })
      let prepared = false
      const resultCode = await code(async () => { await prepare({ contractJson: JSON.stringify(contract()), currentContext: context, supervisionEvidence: {} }); prepared = true })
      expect(resultCode).toBe("CT_EXECUTION_SUPERVISION")
      expect(prepared).toBe(false)
      expect(calls.filter(([kind]) => kind === "verify")).toHaveLength(1)
      expect(calls.filter(([kind]) => kind === "persist")).toHaveLength(0)
    }
  })

  test("rejects a literal false supervision verdict before persistence", async () => {
    const { calls, prepare } = setup({ verifySupervision: async () => false })
    expect(await code(() => prepare({ contractJson: JSON.stringify(contract()), currentContext: context, supervisionEvidence: {} }))).toBe("CT_EXECUTION_SUPERVISION")
    expect(calls.map(([kind]) => kind)).toEqual(["verify"])
  })

  test("passes frozen opaque evidence and exact frozen bindings to supervision", async () => {
    const { calls, prepare } = setup({ verifySupervision: async (received, expected, clock) => {
      expect(Object.isFrozen(received)).toBe(true)
      expect(Object.isFrozen(received.opaque)).toBe(true)
      expect(Object.isFrozen(expected)).toBe(true)
      expect(clock).toBe(NOW)
      return { valid: true, expires_at: "2026-01-03T00:00:00.000Z", ...expected, evidence_digest: HEX }
    } })
    expect(await code(() => prepare({ contractJson: JSON.stringify(contract()), currentContext: context, supervisionEvidence: { opaque: { token: 1 } } }))).not.toBe("CT_EXECUTION_SUPERVISION")
    expect(calls.map(([kind]) => kind)).toEqual(["verify", "persist"])
  })

  test("rejects unavailable or foreign persistence and failed or divergent readback", async () => {
    const receipt = (record, overrides = {}) => ({ persisted: true, owner: "JORNADA", root: context.jornada_root, record_digest: record.record_digest, ...overrides })
    const cases = [
      [null, 0], [{ owner: "JORNADA", root: context.jornada_root }, 0],
      [{ owner: "OTHER", root: context.jornada_root, persistPrepared: async () => ({}) }, 0],
      [{ owner: "JORNADA", root: "/foreign", persistPrepared: async () => ({}) }, 0],
      [{ owner: "JORNADA", root: context.jornada_root, persistPrepared: async () => { throw new Error("write failed") } }, 1],
      [{ owner: "JORNADA", root: context.jornada_root, persistPrepared: async () => undefined }, 1],
      ...["persisted", "owner", "root", "record_digest"].map((key) => [{ owner: "JORNADA", root: context.jornada_root, persistPrepared: async (record) => receipt(record, { [key]: key === "persisted" ? false : "other" }) }, 1]),
    ]
    for (const [persistence, persistenceCalls] of cases) {
      const { calls, prepare } = setup({ persistence })
      expect(await code(() => prepare({ contractJson: JSON.stringify(contract()), currentContext: context, supervisionEvidence: {} }))).toBe("CT_EXECUTION_PERSISTENCE")
      expect(calls.filter(([kind]) => kind === "persist")).toHaveLength(persistenceCalls)
      expect(calls.filter(([kind]) => kind === "persist").length).toBeLessThanOrEqual(1)
    }
  })

  test("matches independent fixed contract and prepared-record digest vectors", async () => {
    const fixedContractDigest = "0319c670b489023c5aec7e9f8e4f064197596c83bbd6fbb49fd8861ddffa3a0e"
    const fixedRecordDigest = "0e132aa736b258102bc91831ef0247a04dc9747f87ca3200433bc3e799abd1bb"
    const fixedContract = contract()
    expect(fixedContract.contract_digest).toBe(fixedContractDigest)
    fixedContract.contract_digest = fixedContractDigest
    const { prepare } = setup({ persistence: { owner: "JORNADA", root: context.jornada_root, persistPrepared: async (record) => {
      expect(record.record_digest).toBe(fixedRecordDigest)
      return { persisted: true, owner: "JORNADA", root: context.jornada_root, record_digest: record.record_digest }
    } } })
    const result = await prepare({ contractJson: JSON.stringify(fixedContract), currentContext: context, supervisionEvidence: {} })
    expect(result.contract_digest).toBe(fixedContractDigest)
    expect(result.record_digest).toBe(fixedRecordDigest)
  })

  test("persists one frozen record and returns deeply frozen data only after exact readback", async () => {
    const { calls, prepare } = setup({ persistence: { owner: "JORNADA", root: context.jornada_root, persistPrepared: async (record) => {
      expect(Object.isFrozen(record)).toBe(true)
      return { persisted: true, owner: "JORNADA", root: context.jornada_root, record_digest: record.record_digest }
    } } })
    const result = await prepare({ contractJson: JSON.stringify(contract()), currentContext: context, supervisionEvidence: {} })
    expect(calls.map(([kind]) => kind)).toEqual(["verify", "persist"])
    expect(result.state).toBe("prepared")
    expect(result.contract_id).toBe("contract-a")
    expect(result.supervision_evidence_digest).toBe(HEX)
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.values(result).some((value) => typeof value === "function")).toBe(false)
  })
})
