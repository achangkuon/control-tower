import assert from "node:assert/strict"
import Ajv from "ajv/dist/2020.js"

const schema = await Bun.file(new URL("../skills-diferidas/v3/chanks-4-unattended-implementation/assets/execution-contract.schema.json", import.meta.url)).json()
const validate = new Ajv({ strict: false, allErrors: true }).compile(schema)

// One ordered dependency step: a step groups Sessions that may run in parallel.
const session = (overrides = {}) => ({
  sesion_id: "S1",
  worker: "implementer-1",
  branch: "work/S1",
  radar_status_stdout_sha256: "c".repeat(64),
  radar_sesion_stdout_sha256: "d".repeat(64),
  listo_confirmed: true,
  unresolved_escalating_decision: false,
  solicitud_sdd: { requested: false },
  ...overrides,
})

const step = (number, sesiones) => ({ step: number, sesiones })

const contract = () => ({
  schema_version: "gentle-ai.unattended-execution-contract/v5",
  contract_id: "sealed-mandate-1",
  sealed_at: "2026-09-12T10:00:00Z",
  expires_at: "2026-09-12T12:00:00Z",
  contract_digest: "a".repeat(64),
  repository: { identity: "example", root: "/repo", base_ref: "main", base_sha: "b".repeat(40) },
  mandate: { steps: [step(1, [session()])] },
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

// --- Schema accepts the mandate shape: one Session, and dependency-ordered parallel groups.
assert.equal(validate(contract()), true, JSON.stringify(validate.errors))
assert.equal(validate({
  ...contract(),
  mandate: { steps: [step(1, [session(), session({ sesion_id: "S2", worker: "implementer-2", branch: "work/S2" })]), step(2, [session({ sesion_id: "S3", worker: "implementer-3", branch: "work/S3" })])] },
}), true, JSON.stringify(validate.errors))

// --- Repository and per-Session bindings stay strict.
rejects((value) => { value.repository.root = "relative/root" })
rejects((value) => { value.repository.base_sha = "short" })
rejects((value) => { value.mandate.steps[0].sesiones[0].branch = "master" })
rejects((value) => { value.mandate.steps[0].sesiones[0].worker = "" })

// --- Empty mandate, empty step, and a missing order are all rejected.
rejects((value) => { value.mandate.steps = [] })
rejects((value) => { value.mandate.steps[0].sesiones = [] })
rejects((value) => { delete value.mandate.steps[0].step })
rejects((value) => { value.mandate.steps[0].step = 0 })
rejects((value) => { delete value.mandate })
rejects((value) => { value.mandate = {} })

// --- Every Session keeps today's LISTO/decision/SDD validations.
rejects((value) => { value.mandate.steps[0].sesiones[0].listo_confirmed = false })
rejects((value) => { value.mandate.steps[0].sesiones[0].unresolved_escalating_decision = true })
rejects((value) => { value.mandate.steps[0].sesiones[0].radar_sesion_stdout_sha256 = "nope" })
rejects((value) => { value.mandate.steps[0].sesiones[0].solicitud_sdd = { requested: true } }) // missing required evidence

// --- A single mandate `expires_at` only: a per-Session expiry is a NOT_READY shape.
rejects((value) => { value.mandate.steps[0].sesiones[0].expires_at = "2026-09-12T11:00:00Z" })
rejects((value) => { value.mandate.expires_at = "2026-09-12T11:00:00Z" })
rejects((value) => { delete value.expires_at })

// --- Permissions and prohibitions are unchanged.
rejects((value) => { value.permissions.read_paths = ["src/**"] })
rejects((value) => { value.permissions.commands = ["curl https://example.invalid"] })
rejects((value) => { value.permissions.prohibitions = { commit: false } })
rejects((value) => { value.permissions.prohibitions.push = false })
rejects((value) => { value.permissions.prohibitions.unlisted_sesion = false })
rejects((value) => { value.execution.executor = "tower" })
rejects((value) => { value.execution.delivery_ceiling = "push" })
rejects((value) => { value.execution.delivery_ceiling = "none" }) // ceiling/prohibition mismatch: commit stays false
rejects((value) => { value.review_policy.medium = "granted_in_advance" })

// --- Retired single-Session and planning shapes never reappear.
rejects((value) => { value.session = session() }) // retired singular Session block
rejects((value) => { value.artifacts = [{ kind: "tasks", locator: "openspec/tasks.md", sha256: "c".repeat(64) }] }) // retired SDD-artifacts shape
rejects((value) => { value.assignment = { sesion_id: "S1", task_ids: ["T1"], objective: "bounded work", continuation: "none" } }) // retired SDD-assignment shape
rejects((value) => { value.chain = { strategy: "single-pr" } }) // retired planning-shaped chain block
rejects((value) => { value._retired_runtime = { mode: "absent", mode_locked: true, git_delivery_token: "forbidden", active_marker_scope: ".git/retired-runtime/ACTIVE" } })
rejects((value) => { value.tower = { mode: "absent", mode_locked: true, git_delivery_token: "forbidden", active_marker_scope: ".git/control-tower/ACTIVE" } })

// The sealed record's optional wake-report shape, one terminal record per mandated Session.
assert.equal(validate({
  ...contract(),
  results: [{
    state: "COMPLETED",
    sesion_id: "S1",
    worker: "implementer-1",
    checks: [{ command: "bun test", exit_code: 0, stdout_sha256: "e".repeat(64), stderr_sha256: "f".repeat(64), started_at: "2026-09-12T11:00:00Z", ended_at: "2026-09-12T11:05:00Z" }],
    commits: ["1".repeat(40)],
    changed_paths: ["src/index.ts"],
    reviews: [{ risk: "medium", outcome: "declined" }],
    stopped_questions: [],
    budget_used: "1 of 2 implementation corrections",
  }],
}), true, JSON.stringify(validate.errors))
rejects((value) => { value.results = [] })
rejects((value) => { value.results = [{ state: "READY", sesion_id: "S1" }] })

const compact = (text) => text.split(/\s+/).join(" ")

const prose = compact(await Bun.file(new URL("../skills-diferidas/v3/chanks-4-unattended-implementation/references/sealing-and-routing.md", import.meta.url)).text())
assert.ok(prose.includes("cannot prove that `expires_at` is later than `sealed_at`"))
assert.ok(prose.includes("inert"))

// The mandate is dependency-ordered: steps are the declared order, parallel inside a step.
assert.ok(prose.includes("ordered steps ARE the declared dependency"))
assert.ok(prose.includes("Sessions in the same step are independent"))
assert.ok(prose.includes("single mandate-wide `expires_at`"))
assert.ok(prose.includes("a per-Session expiry is `NOT_READY`"))
assert.ok(prose.includes("`sesion_id` repeats across the mandate"))
assert.ok(prose.includes("step numbers are exactly 1..N"))
assert.ok(prose.includes("advances only inside the sealed mandate"))
assert.ok(prose.includes("does not start"), "dependents of a stopped Session must not start")

// The dispatch marker is the seal's own state change (LISTO -> EN CURSO), not drift: each
// mandated worker's revalidation tolerates exactly that one change and nothing else.
assert.ok(prose.includes("radar.despacho/v1"))
assert.ok(prose.includes("chanks/despachos/<ID>.json"))
assert.ok(prose.includes("is a regular file, never a symlink"))
assert.ok(prose.includes("Exactly one `Estado:` line may differ"))
assert.ok(prose.includes("radar_status_stdout_sha256` proves only the snapshot Radar showed at seal time"))
assert.ok(prose.includes("never recompares it after dispatch"))
assert.ok(prose.includes("Before dispatch, with no marker on disk"))

const skillProse = compact(await Bun.file(new URL("../skills-diferidas/v3/chanks-4-unattended-implementation/SKILL.md", import.meta.url)).text())
assert.ok(skillProse.includes("Worker-side revalidation after dispatch tolerates exactly one drift"))
for (const phrase of (
  "dependency-ordered mandate",
  "a single mandate-wide `expires_at`",
  "affects that Session only",
  "other dispatched Sessions continue independently",
  "Sessions that depend on it do not start",
  "advances only inside the mandate's sealed steps",
  "`NOT_READY` for an expired, empty, or repeated mandate, or one without an explicit step order",
  "self-admission",
  "prepares a record, never executes one",
)) {
  assert.ok(skillProse.includes(phrase), `SKILL.md missing mandate phrase: ${phrase}`)
}

const nightProse = compact(await Bun.file(new URL("../skills-diferidas/v3/chanks-4-unattended-implementation/references/night-mode.md", import.meta.url)).text())
assert.ok(nightProse.includes("single mandate-wide `expires_at`"))

console.log("standalone contract schema safety: PASS")
