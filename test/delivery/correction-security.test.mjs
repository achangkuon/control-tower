import { describe, expect, test } from "bun:test"
import { appendFileSync, chmodSync, linkSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { createHash } from "node:crypto"

import { candidateRevision } from "../../contracts/candidate-revision.mjs"
import { createDeliveryLedger } from "../../delivery/ledger.mjs"
import { executeDelivery } from "../../delivery/workflow.mjs"

const digest = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`
const revision = `sha256:${"a".repeat(64)}`
const baseRecord = { candidate_revision: revision, shape: "direct-push", authorization_ref: "auth-a", state: "DELIVERED", attempt: 1, reconciled: false }
const code = async (operation) => { try { await operation() } catch (error) { return error.code } return null }
const root = () => mkdtempSync(join(tmpdir(), "ct-delivery-secure-"))
const recordBytes = (overrides = {}) => `${JSON.stringify({ schema: "delivery-record", schema_version: 1, candidate_revision: revision,
  revision: 1, previous_revision: 0, state: "DELIVERED", shape: "direct-push", authorization_ref: "auth-a",
  attempt: 1, reconciled: false, created_at: "2026-08-10T00:00:00.000Z", ...overrides })}\n`

const sha = (character) => character.repeat(40)
const candidate = Object.freeze({ schema: "candidate-revision", schema_version: 1, project_id: "project-a", plan_id: "plan-a",
  session_id: "S5.2", artifact_ref: "artifacts/a.json", base_sha: sha("a"), result_sha: sha("b"), tree_sha: sha("c"),
  commit_sha: sha("d"), head_sha: sha("d"), target: { repository: "owner/repository", branch: "master" },
  assignment_id: "assignment-a", host_epoch: 1, policy_revision: 1, jornada_id: "jornada-a", jornada_revision: 3,
  manifest_revision: 1, registry_revision: 7, capability_revision: 1, verification_digest: `sha256:${"e".repeat(64)}`,
  policy_report_digest: `sha256:${"9".repeat(64)}`, required_checks_digest: `sha256:${"f".repeat(64)}`,
  required_reviews_digest: `sha256:${"0".repeat(64)}` })
const historicalCandidate = (() => { const { policy_report_digest: _ignored, ...value } = candidate; return Object.freeze(value) })()
const authorization = (overrides = {}) => ({ authorization_id: "auth-a", project_id: candidate.project_id, plan_id: candidate.plan_id,
  registry_revision: candidate.registry_revision, jornada_id: candidate.jornada_id, jornada_revision: candidate.jornada_revision,
  policy_report_digest: candidate.policy_report_digest, required_checks_digest: candidate.required_checks_digest,
  delivery: { shape: "direct-push", repository: candidate.target.repository, target_branch: candidate.target.branch,
    base_sha: candidate.base_sha, head_sha: candidate.head_sha }, ...overrides })
const policy = `\`\`\`yaml\nschema: delivery-policy\nschema_version: 1\nmerge:\n  authorizing_party: human\ndelivery:\n  shape: direct-push\n  target_branch: master\nplanning:\n  horizon_ceiling: 2\ndocumentation_close:\n  module: full\n  session: full\n\`\`\`\n`
const requestFor = (repositoryRoot, ledger, authorizationRecord, counters = {}) => ({ candidate_input: candidate,
  policy_request: { repository_root: repositoryRoot, project_id: "project-a", expected_digest: digest(policy), revision: 1 },
  authorization_store: { readAuthorization: () => authorizationRecord,
    admitCandidateEffect: () => { counters.admit = (counters.admit ?? 0) + 1; return { admitted: true } } },
  authorization_id: "auth-a", ledger, commit: async () => ({ commit_sha: sha("d"), tree_sha: sha("c") }), verify: async () => true,
  reconcile: async () => ({ status: "absent" }), effects: { directPush: async () => { counters.effect = (counters.effect ?? 0) + 1; return { delivered: true } }, pullRequest: async () => ({ delivered: true }) } })

describe("owner-only durable delivery ledger boundary", () => {
  test("rejects absent, symlinked, unsafe-mode, and foreign-owner roots", async () => {
    const absent = join(root(), "absent")
    const target = root(), linked = join(root(), "ledger-link")
    symlinkSync(target, linked)
    const unsafe = root(); chmodSync(unsafe, 0o755)
    expect(await code(() => createDeliveryLedger({ root: absent }))).toBe("CT_DELIVERY_LEDGER_UNSAFE")
    expect(await code(() => createDeliveryLedger({ root: linked }))).toBe("CT_DELIVERY_LEDGER_UNSAFE")
    expect(await code(() => createDeliveryLedger({ root: unsafe }))).toBe("CT_DELIVERY_LEDGER_UNSAFE")
    expect(await code(() => createDeliveryLedger({ root: "/proc" }))).toBe("CT_DELIVERY_LEDGER_UNSAFE")
  })

  test("rejects candidate-directory and record symlinks, hardlinks, and unsafe record modes", async () => {
    const cases = ["directory-symlink", "record-symlink", "hardlink", "mode"]
    for (const kind of cases) {
      const ledgerRoot = root(), external = root(), candidateDir = join(ledgerRoot, revision.slice(7))
      if (kind === "directory-symlink") symlinkSync(external, candidateDir)
      else {
        mkdirSync(candidateDir, { mode: 0o700 })
        const source = join(external, "record.json"); writeFileSync(source, recordBytes(), { mode: 0o600 })
        const destination = join(candidateDir, "000001.json")
        if (kind === "record-symlink") symlinkSync(source, destination)
        else if (kind === "hardlink") linkSync(source, destination)
        else { writeFileSync(destination, recordBytes(), { mode: 0o644 }) }
      }
      const ledger = createDeliveryLedger({ root: ledgerRoot })
      expect(await code(() => ledger.history(revision))).toBe("CT_DELIVERY_LEDGER_UNSAFE")
    }
  })

  test("serializes two real processes so one delivered effect occurs and failed attempts remain globally bounded", async () => {
    const moduleUrl = pathToFileURL(join(process.cwd(), "delivery/ledger.mjs")).href
    const source = `import { appendFileSync } from "node:fs"; import { createDeliveryLedger } from ${JSON.stringify(moduleUrl)};
const [root, mode] = process.argv.slice(2); const revision = ${JSON.stringify(revision)}; const ledger = createDeliveryLedger({ root, clock: () => "2026-08-10T00:00:00.000Z" });
await ledger.withCandidateLock(revision, async () => { if (mode === "delivered") { const history = await ledger.history(revision); if (!history.length) { appendFileSync(root + "/effects", "effect\\n"); await Bun.sleep(100); await ledger.append({ candidate_revision: revision, shape: "direct-push", authorization_ref: "auth-a", state: "DELIVERED", attempt: 1, reconciled: false }, 0) } }
else { for (let index = 0; index < 2; index++) { const history = await ledger.history(revision); const attempt = history.length + 1; if (attempt > 3) break; appendFileSync(root + "/effects", "attempt\\n"); await ledger.append({ candidate_revision: revision, shape: "direct-push", authorization_ref: "auth-a", state: "ATTEMPT_FAILED", attempt, classification: "provider_unavailable" }, history.length) } } });`
    for (const mode of ["delivered", "failed"]) {
      const ledgerRoot = root(), child = join(ledgerRoot, "child.mjs"); writeFileSync(child, source)
      const children = [0, 1].map(() => Bun.spawn([process.execPath, child, ledgerRoot, mode], { stdout: "pipe", stderr: "pipe" }))
      expect(await Promise.all(children.map(({ exited }) => exited))).toEqual([0, 0])
      expect(readFileSync(join(ledgerRoot, "effects"), "utf8").trim().split("\n")).toHaveLength(mode === "delivered" ? 1 : 3)
    }
  })
})

describe("canonical authorization binding", () => {
  test("rejects missing or changed policy report digest and every authorized delivery tuple mismatch before admission", async () => {
    const repositoryRoot = root(); writeFileSync(join(repositoryRoot, "AGENTS.md"), policy)
    const mismatches = [
      [historicalCandidate, authorization(), "missing candidate digest"],
      [candidate, authorization({ policy_report_digest: undefined }), "missing authorization digest"],
      [candidate, authorization({ policy_report_digest: `sha256:${"8".repeat(64)}` }), "policy digest"],
      [candidate, authorization({ required_checks_digest: `sha256:${"7".repeat(64)}` }), "checks digest"],
      [candidate, authorization({ authorization_id: "other" }), "authorization id"],
      [candidate, authorization({ project_id: "other" }), "project"],
      [candidate, authorization({ plan_id: "other" }), "plan"],
      [candidate, authorization({ registry_revision: 8 }), "registry"],
      [candidate, authorization({ jornada_id: "other" }), "Jornada"],
      [candidate, authorization({ jornada_revision: 4 }), "Jornada revision"],
      ...["shape", "repository", "target_branch", "base_sha", "head_sha"].map((field) =>
        [candidate, authorization({ delivery: { ...authorization().delivery, [field]: field === "shape" ? "pull-request" : "other" } }), `delivery ${field}`]),
    ]
    for (const [candidateInput, authorizationRecord] of mismatches) {
      const ledgerRoot = root(), ledger = createDeliveryLedger({ root: ledgerRoot }), counters = {}
      const request = { ...requestFor(repositoryRoot, ledger, authorizationRecord, counters), candidate_input: candidateInput }
      expect(await code(() => executeDelivery(request))).toBe("CT_DELIVERY_AUTH_MISMATCH")
      expect(counters).toEqual({})
    }
    const ledger = createDeliveryLedger({ root: root() }), counters = {}, stalePolicy = requestFor(repositoryRoot, ledger, authorization(), counters)
    stalePolicy.policy_request = { ...stalePolicy.policy_request, revision: 2 }
    expect(await code(() => executeDelivery(stalePolicy))).toBe("CT_DELIVERY_AUTH_MISMATCH")
    expect(counters).toEqual({})
  })

  test("a forged terminal ledger record cannot bypass canonical authorization comparison and admission", async () => {
    const repositoryRoot = root(); writeFileSync(join(repositoryRoot, "AGENTS.md"), policy)
    const ledgerRoot = root(), ledger = createDeliveryLedger({ root: ledgerRoot }), identity = candidateRevision(candidate)
    await ledger.append({ ...baseRecord, candidate_revision: identity }, 0)
    const counters = {}, mismatch = authorization({ delivery: { ...authorization().delivery, repository: "owner/other" } })
    expect(await code(() => executeDelivery(requestFor(repositoryRoot, ledger, mismatch, counters)))).toBe("CT_DELIVERY_AUTH_MISMATCH")
    expect(counters).toEqual({})
  })
})
