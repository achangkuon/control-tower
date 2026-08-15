import { describe, expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { homedir, tmpdir } from "node:os"
import { join } from "node:path"
import { createExecutionContractPreparer } from "../../jornada/execution-contract.mjs"
import { createSupervisionState } from "../../supervision/state.mjs"

const NOW = Date.parse("2026-01-02T00:00:00.000Z")
const SHA = "a".repeat(40), HEX = "a".repeat(64)
const canonical = (value) => value === null || typeof value !== "object" ? JSON.stringify(value)
  : Array.isArray(value) ? `[${value.map(canonical).join(",")}]`
    : `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`
const digest = (value) => createHash("sha256").update(canonical(value)).digest("hex")
const binding = {
  project_id: "project-a", repository_identity: "repo-a", worktree: "/repo/a",
  base_sha: SHA, sesion_id: "S10.1", contract_digest: HEX,
  expires_at: "2026-01-03T00:00:00.000Z",
}
const expected = Object.fromEntries(Object.entries(binding).filter(([key]) => !["project_id", "expires_at"].includes(key)))
const errorCode = async (operation) => { try { await operation() } catch (error) { return error?.code } return null }
const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), "ct-supervision-"))
  const state = createSupervisionState({ root, projectId: binding.project_id, now: () => NOW })
  return { root, state, close: () => rmSync(root, { recursive: true, force: true }) }
}
const contract = () => {
  const value = {
    schema_version: "gentle-ai.unattended-execution-contract/v1", contract_id: "contract-a",
    sealed_at: "2026-01-01T00:00:00.000Z", expires_at: binding.expires_at, contract_digest: HEX,
    repository: { identity: "repo-a", root: "/repo/a", common_dir: "/repo/a/.git", worktree: "/repo/a", branch: "main", base_ref: "origin/main", base_sha: SHA },
    artifacts: [{ kind: "tasks", locator: "plans/s10-1/tasks", sha256: HEX }],
    assignment: { sesion_id: "S10.1", task_ids: ["T10.1.1.1"], objective: "Prepare passively", continuation: "none" },
    permissions: { read_paths: [], edit_paths: ["jornada/**"], commands: [], network: [], processes: [], cleanup_paths: [], denied_paths: [], denied_effects: ["execute"], prohibitions: Object.fromEntries(["commit","amend","rebase","tag","push","pr_create","pr_update","merge","release","deploy","db_mutation","global_closure","token_request","token_acquire","token_transfer","token_release","unlisted_sesion"].map((key) => [key, true])) },
    ownership: { exclusive_paths: ["jornada/**"], package_manifests: [], lockfiles: [], generated_outputs: [], sdd_progress_files: [], shared_resources: [], known_conflicts: [] },
    artifact_policy: { authored_tracked: ["jornada/execution-contract.mjs"], generated_tracked: [], ephemeral_untracked: [], forbidden_generated: [], ignore_policy: "preserve", cleanup_policy: "none", node_modules: { disposition: "read-only", paths: ["node_modules"] }, codegraph: { disposition: "absent", paths: [] }, caches: { disposition: "absent", paths: [] } },
    tower: { mode: "active-supervision", mode_locked: true, git_delivery_token: "forbidden", active_marker_scope: ".git/control-tower/ACTIVE" },
    chain: { strategy: "single-pr", delivery_strategy: "single-pr", budget_risk: "Low", chained_recommended: false, decision_needed: false, position: 1, total: 1, base_target_map: [{ sesion_id: "S10.1", branch: "main", base: "origin/main", target: "main" }], line_budget: 400, rollback_boundary: "supervision state" },
    validation: { live_tower_active: true, method: "separate-regular-clone", source_root_realpath: "/repo/a", source_common_dir_realpath: "/repo/a/.git", clone_root_realpath: "/clone/a", clone_common_dir_realpath: "/clone/a/.git", baseline_commands: ["bun test"], candidate_commands: ["bun test"] },
    candidate_recipe: { entries: [{ path: "jornada/execution-contract.mjs", mode: "100644", class: "authored-tracked" }], identity_algorithm: "sorted-path-mode-size-sha256", staging_required: true, commit_required: false },
    retries: { same_input_transient_before_final_verification: 1, implementation_corrections_before_final_verification: 2, authorization_scope: 0, final_verification_attempts: 1, retries_after_final_verification_failure: 0, corrections_after_final_verification_failure: 0 },
    terminal: { states: ["READY", "BLOCKED"], ready_definition: "exact-staged-uncommitted-candidate", occupied_ready_slot: "preserve-and-block-with-evidence" },
  }
  value.contract_digest = digest(Object.fromEntries(Object.entries(value).filter(([key]) => !["contract_digest", "runtime_result"].includes(key))))
  return value
}

describe("external supervision state", () => {
  test("producer, reader, validator, and the injected S10.1 seam accept exact live state", async () => {
    const item = fixture()
    try {
      const liveBinding = { ...binding, contract_digest: contract().contract_digest }
      const evidence = await item.state.publish(liveBinding)
      const stored = await item.state.read(evidence)
      const attestation = item.state.validate(stored, { ...expected, contract_digest: liveBinding.contract_digest }, NOW)
      expect(attestation).toMatchObject({ valid: true, ...expected, contract_digest: liveBinding.contract_digest, expires_at: binding.expires_at })
      expect(attestation.evidence_digest).toMatch(/^[0-9a-f]{64}$/)

      const persistence = { owner: "JORNADA", root: "/repo/a/jornada", persistPrepared: async (record) => ({ persisted: true, owner: "JORNADA", root: "/repo/a/jornada", record_digest: record.record_digest }) }
      const prepare = createExecutionContractPreparer({ persistence, verifySupervision: item.state.verifySupervision, now: () => NOW }).prepare
      const prepared = await prepare({ contractJson: JSON.stringify(contract()), currentContext: { repository_identity: "repo-a", repository_root: "/repo/a", git_common_dir: "/repo/a/.git", worktree: "/repo/a", branch: "main", base_ref: "origin/main", base_sha: SHA, sesion_id: "S10.1", jornada_root: "/repo/a/jornada" }, supervisionEvidence: evidence })
      expect(prepared.state).toBe("prepared")
      expect(prepared.supervision_evidence_digest).toBe(attestation.evidence_digest)
    } finally { item.close() }
  })

  test("absent, malformed, unsafe, symlinked, foreign, and expired state fail closed", async () => {
    const cases = [
      ["absent", async ({ state }) => state.read({ project_id: "project-a", evidence_digest: HEX })],
      ["malformed", async ({ root, state }) => { mkdirSync(join(root, "project-a"), { mode: 0o700 }); writeFileSync(join(root, "project-a/state.json"), "{", { mode: 0o600 }); return state.read({ project_id: "project-a", evidence_digest: HEX }) }],
      ["unsafe directory permissions", async ({ root, state }) => { const evidence = await state.publish(binding); chmodSync(join(root, "project-a"), 0o755); return state.read(evidence) }],
      ["unsafe file permissions", async ({ root, state }) => { const evidence = await state.publish(binding); chmodSync(join(root, "project-a/state.json"), 0o644); return state.read(evidence) }],
      ["symlinked directory", async ({ root, state }) => { mkdirSync(join(root, "target"), { mode: 0o700 }); symlinkSync(join(root, "target"), join(root, "project-a")); return state.read({ project_id: "project-a", evidence_digest: HEX }) }],
      ["symlinked state", async ({ root, state }) => { mkdirSync(join(root, "project-a"), { mode: 0o700 }); writeFileSync(join(root, "target.json"), "{}", { mode: 0o600 }); symlinkSync(join(root, "target.json"), join(root, "project-a/state.json")); return state.read({ project_id: "project-a", evidence_digest: HEX }) }],
      ["foreign project", async ({ state }) => { const evidence = await state.publish(binding); return state.read({ ...evidence, project_id: "project-b" }) }],
      ["expired", async ({ state }) => { const evidence = await state.publish(binding); return state.verifySupervision(evidence, expected, Date.parse(binding.expires_at)) }],
    ]
    for (const [name, operation] of cases) {
      const item = fixture()
      try { expect(await errorCode(() => operation(item)), name).toBe("CT_SUPERVISION_STATE") }
      finally { chmodSync(item.root, 0o700); item.close() }
    }
  })

  test("every exact identity divergence fails closed", async () => {
    const item = fixture()
    try {
      const evidence = await item.state.publish(binding)
      for (const key of ["repository_identity", "worktree", "base_sha", "sesion_id", "contract_digest"]) {
        expect(await errorCode(() => item.state.verifySupervision(evidence, { ...expected, [key]: "other" }, NOW)), key).toBe("CT_SUPERVISION_STATE")
      }
      expect(await errorCode(() => createSupervisionState({ root: item.root, projectId: "project-b", now: () => NOW }).verifySupervision(evidence, expected, NOW)), "project_id").toBe("CT_SUPERVISION_STATE")
    } finally { item.close() }
  })

  test("uses only the external per-project namespace and an exclusive writer lock", async () => {
    const stateHome = process.env.XDG_STATE_HOME || join(homedir(), ".local/state")
    expect(createSupervisionState({ projectId: "project-a" }).root).toBe(join(stateHome, "control-tower/supervision/project-a"))
    const previousStateHome = process.env.XDG_STATE_HOME
    process.env.XDG_STATE_HOME = "/external-state"
    expect(createSupervisionState({ projectId: "project-a" }).root).toBe("/external-state/control-tower/supervision/project-a")
    if (previousStateHome === undefined) delete process.env.XDG_STATE_HOME; else process.env.XDG_STATE_HOME = previousStateHome
    const item = fixture()
    try {
      mkdirSync(join(item.root, "project-a"), { mode: 0o700 })
      writeFileSync(join(item.root, "project-a/writer.lock"), "occupied", { mode: 0o600 })
      expect(await errorCode(() => item.state.publish(binding))).toBe("CT_SUPERVISION_STATE")
      expect(existsSync(join(item.root, ".git/control-tower/ACTIVE"))).toBe(false)
    } finally { item.close() }
  })
})
