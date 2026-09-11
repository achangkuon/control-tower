import assert from "node:assert/strict"
import Ajv from "ajv/dist/2020.js"

const schema = await Bun.file(new URL("../skills/chanks-4-unattended-implementation/assets/execution-contract.schema.json", import.meta.url)).json()
const validate = new Ajv({ strict: false, allErrors: true }).compile(schema)

const contract = () => ({
  schema_version: "gentle-ai.unattended-execution-contract/v3",
  contract_id: "sealed-s1",
  sealed_at: "2026-09-12T10:00:00Z",
  expires_at: "2026-09-12T12:00:00Z",
  contract_digest: "a".repeat(64),
  repository: { identity: "example", root: "/repo", common_dir: "/repo/.git", worktree: "/clone", branch: "work/s1", base_ref: "main", base_sha: "b".repeat(40) },
  artifacts: [{ kind: "tasks", locator: "openspec/tasks.md", sha256: "c".repeat(64) }],
  assignment: { sesion_id: "S1", task_ids: ["T1"], objective: "bounded work", continuation: "none" },
  permissions: {
    read_paths: ["src/index.ts"], edit_paths: ["src/index.ts"], commands: ["bun test tests/unit.test.ts"], network: ["none"], processes: ["bun"], cleanup_paths: [".cache/check"], denied_paths: [".env"], denied_effects: ["external-session"],
    prohibitions: { commit: true, amend: true, rebase: true, tag: true, push: true, pr_create: true, pr_update: true, merge: true, release: true, deploy: true, db_mutation: true, global_closure: true, unlisted_sesion: true },
  },
  ownership: { exclusive_paths: ["src/index.ts"], package_manifests: ["package.json"], lockfiles: ["bun.lockb"], generated_outputs: ["dist/report.json"], sdd_progress_files: ["openspec/tasks.md"], shared_resources: ["none"], known_conflicts: ["none"] },
  artifact_policy: { authored_tracked: ["src/index.ts"], generated_tracked: ["dist/report.json"], ephemeral_untracked: [".cache/check"], forbidden_generated: ["coverage"], ignore_policy: "existing ignore policy", cleanup_policy: "remove only declared cache", node_modules: { disposition: "read-only", paths: ["node_modules"] }, codegraph: { disposition: "read-only", paths: [".codegraph"] }, caches: { disposition: "ephemeral", paths: [".cache/check"] } },
  runtime: { mode: "standalone", mode_evidence: "human-approved standalone seal", delivery_ceiling: "none", state_root: "/state" },
  chain: { strategy: "single-pr", delivery_strategy: "single-pr", budget_risk: "Low", chained_recommended: false, decision_needed: false, position: 1, total: 1, base_target_map: [{ sesion_id: "S1", branch: "work/s1", base: "main", target: "main" }], line_budget: 400, rollback_boundary: "src/index.ts" },
  validation: { method: "separate-regular-clone", source_root_realpath: "/repo", source_common_dir_realpath: "/repo/.git", clone_root_realpath: "/clone", clone_common_dir_realpath: "/clone/.git", baseline_commands: ["bun test tests/unit.test.ts"], candidate_commands: ["bun test tests/unit.test.ts"] },
  candidate_recipe: { entries: [{ path: "src/index.ts", mode: "100644", class: "authored-tracked" }], identity_algorithm: "sorted-path-mode-size-sha256", staging_required: true, commit_required: false },
  retries: { same_input_transient_before_final_verification: 1, implementation_corrections_before_final_verification: 2, authorization_scope: 0, final_verification_attempts: 1, retries_after_final_verification_failure: 0, corrections_after_final_verification_failure: 0 },
  terminal: { states: ["READY", "BLOCKED"], ready_definition: "exact-staged-uncommitted-candidate", occupied_ready_slot: "preserve-and-block-with-evidence" },
})

const rejects = (mutate) => {
  const candidate = contract()
  mutate(candidate)
  assert.equal(validate(candidate), false, JSON.stringify(validate.errors))
}

assert.equal(validate(contract()), true, JSON.stringify(validate.errors))
rejects((value) => { value.repository.root = "relative/root" })
rejects((value) => { value.permissions.read_paths = ["src/**"] })
rejects((value) => { value.permissions.commands = ["curl https://example.invalid"] })
rejects((value) => { value.permissions.prohibitions = { commit: true } })
rejects((value) => { value.runtime.mode = "tower" })
rejects((value) => { value.tower = { mode: "absent", mode_locked: true, git_delivery_token: "forbidden", active_marker_scope: ".git/control-tower/ACTIVE" } })

const prose = await Bun.file(new URL("../skills/chanks-4-unattended-implementation/references/sealing-and-routing.md", import.meta.url)).text()
assert.ok(prose.includes("cannot prove that `expires_at` is later than `sealed_at`"))
console.log("standalone contract schema safety: PASS")
