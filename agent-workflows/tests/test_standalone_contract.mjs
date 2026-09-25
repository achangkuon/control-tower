import assert from "node:assert/strict"
import Ajv from "ajv/dist/2020.js"

const schema = await Bun.file(new URL("../skills/chanks-4-unattended-implementation/assets/execution-contract.schema.json", import.meta.url)).json()
const validate = new Ajv({ strict: false, allErrors: true }).compile(schema)

const contract = () => ({
  schema_version: "gentle-ai.unattended-execution-contract/v4",
  contract_id: "sealed-s1",
  sealed_at: "2026-09-12T10:00:00Z",
  expires_at: "2026-09-12T12:00:00Z",
  contract_digest: "a".repeat(64),
  repository: { identity: "example", root: "/repo", branch: "work/s1", base_ref: "main", base_sha: "b".repeat(40) },
  session: {
    sesion_id: "S1",
    radar_status_stdout_sha256: "c".repeat(64),
    radar_sesion_stdout_sha256: "d".repeat(64),
    listo_confirmed: true,
    unresolved_escalating_decision: false,
    solicitud_sdd: { requested: false },
  },
  permissions: {
    read_paths: ["src/index.ts"], edit_paths: ["src/index.ts"], commands: ["bun test tests/unit.test.ts"], network: ["none"], processes: ["bun"], cleanup_paths: [".cache/check"], denied_paths: [".env"], denied_effects: ["external-session"],
    prohibitions: { commit: false, amend: true, rebase: true, tag: true, push: true, pr_create: true, pr_update: true, merge: true, release: true, deploy: true, db_mutation: true, global_closure: true, unlisted_sesion: true, plan_yaml_write: true },
  },
  ownership: { exclusive_paths: ["src/index.ts"], package_manifests: ["package.json"], lockfiles: ["bun.lockb"], generated_outputs: ["dist/report.json"], progress_files: ["odd/tasks/s1.md"], shared_resources: ["none"], known_conflicts: ["none"] },
  artifact_policy: { authored_tracked: ["src/index.ts"], generated_tracked: ["dist/report.json"], ephemeral_untracked: [".cache/check"], forbidden_generated: ["coverage"], ignore_policy: "existing ignore policy", cleanup_policy: "remove only declared cache", node_modules: { disposition: "read-only", paths: ["node_modules"] }, codegraph: { disposition: "read-only", paths: [".codegraph"] }, caches: { disposition: "ephemeral", paths: [".cache/check"] } },
  execution: { executor: "pi-worker-dispatched-by-chanks-3-despacho-herdr", worker_kickoff_skill: "chanks-3-session-kickoff", delivery_ceiling: "commit", state_root: "/state" },
  review_policy: { high: "granted_in_advance", medium: "declined", passive: "no_consent_needed" },
  retries: { same_input_transient_before_final_verification: 1, implementation_corrections_before_final_verification: 2, authorization_scope: 0, final_verification_attempts: 1, retries_after_final_verification_failure: 0, corrections_after_final_verification_failure: 0 },
})

const rejects = (mutate) => {
  const candidate = contract()
  mutate(candidate)
  assert.equal(validate(candidate), false, JSON.stringify(validate.errors))
}

assert.equal(validate(contract()), true, JSON.stringify(validate.errors))
rejects((value) => { value.repository.root = "relative/root" })
rejects((value) => { value.repository.branch = "master" })
rejects((value) => { value.permissions.read_paths = ["src/**"] })
rejects((value) => { value.permissions.commands = ["curl https://example.invalid"] })
rejects((value) => { value.permissions.prohibitions = { commit: false } })
rejects((value) => { value.permissions.prohibitions.push = false })
rejects((value) => { value.execution.executor = "tower" })
rejects((value) => { value.execution.delivery_ceiling = "push" })
rejects((value) => { value.execution.delivery_ceiling = "none" }) // ceiling/prohibition mismatch: commit stays false
rejects((value) => { value.review_policy.medium = "granted_in_advance" })
rejects((value) => { value.session.listo_confirmed = false })
rejects((value) => { value.session.unresolved_escalating_decision = true })
rejects((value) => { value.session.solicitud_sdd = { requested: true } }) // missing required evidence
rejects((value) => { value.artifacts = [{ kind: "tasks", locator: "openspec/tasks.md", sha256: "c".repeat(64) }] }) // retired SDD-artifacts shape
rejects((value) => { value.assignment = { sesion_id: "S1", task_ids: ["T1"], objective: "bounded work", continuation: "none" } }) // retired SDD-assignment shape
rejects((value) => { value.chain = { strategy: "single-pr" } }) // retired planning-shaped chain block
rejects((value) => { value._retired_runtime = { mode: "absent", mode_locked: true, git_delivery_token: "forbidden", active_marker_scope: ".git/retired-runtime/ACTIVE" } })
rejects((value) => { value.tower = { mode: "absent", mode_locked: true, git_delivery_token: "forbidden", active_marker_scope: ".git/control-tower/ACTIVE" } })

// The sealed record's optional wake-report shape, carried by the worker's terminal Intercom notice.
assert.equal(validate({
  ...contract(),
  result: {
    state: "COMPLETED",
    sesion_id: "S1",
    worker: "implementer-1",
    checks: [{ command: "bun test", exit_code: 0, stdout_sha256: "e".repeat(64), stderr_sha256: "f".repeat(64), started_at: "2026-09-12T11:00:00Z", ended_at: "2026-09-12T11:05:00Z" }],
    commits: ["1".repeat(40)],
    changed_paths: ["src/index.ts"],
    reviews: [{ risk: "medium", outcome: "declined" }],
    stopped_questions: [],
    budget_used: "1 of 2 implementation corrections",
  },
}), true, JSON.stringify(validate.errors))
rejects((value) => { value.result = { state: "READY", sesion_id: "S1" } })

const prose = await Bun.file(new URL("../skills/chanks-4-unattended-implementation/references/sealing-and-routing.md", import.meta.url)).text()
assert.ok(prose.includes("cannot prove that `expires_at` is later than `sealed_at`"))
console.log("standalone contract schema safety: PASS")
