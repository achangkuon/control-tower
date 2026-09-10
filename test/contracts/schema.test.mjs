import { describe, expect, test } from "bun:test"
import Ajv2020 from "ajv/dist/2020.js"
import { createHash } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { validate } from "../../contracts/validate.mjs"
import { schemaNames } from "../../contracts/schema-registry.mjs"
import { sessionPlanSnapshotDigest } from "../../contracts/session-plan-snapshot.mjs"
import { RUNTIME_PAYLOAD_FILES } from "../../install/runtime-payload.mjs"
import { freezeCandidate, isCurrentCandidate, successorCandidate } from "../../contracts/candidate-revision.mjs"

const fixtures = JSON.parse(readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../fixtures/contracts/schema-cases-v1.json"),
  "utf8",
))

const errorCode = (operation) => {
  try {
    operation()
  } catch (error) {
    return error.code
  }
  return null
}

const schemasDirectory = join(dirname(fileURLToPath(import.meta.url)), "../../schemas")
const bindingDeltaSchemaSource = readFileSync(join(schemasDirectory, "binding-delta-v1.schema.json"), "utf8")
const bindingDeltaSchema = JSON.parse(bindingDeltaSchemaSource)
const executionContractSchema = JSON.parse(readFileSync(
  join(schemasDirectory, "execution-contract-v1.schema.json"),
  "utf8",
))

describe("schema ownership", () => {
  test("keeps the complete schema inventory Tower-owned", () => {
    const schemaFiles = readdirSync(schemasDirectory)
      .filter((filename) => filename.endsWith(".schema.json"))
      .sort()
    const nonTowerSchemaIds = schemaFiles
      .map((filename) => [filename, JSON.parse(readFileSync(join(schemasDirectory, filename), "utf8")).$id])
      .filter(([, id]) => !id.startsWith("https://control-tower.local/"))

    expect(schemaFiles).toHaveLength(31)
    expect(nonTowerSchemaIds).toEqual([])
  })

  test("keeps binding delta inputs opaque and every other schema field unchanged", () => {
    const outsideInputs = structuredClone(bindingDeltaSchema)
    delete outsideInputs.$defs.inputs

    expect(bindingDeltaSchema.$defs.inputs).toEqual({ type: "object" })
    expect(bindingDeltaSchemaSource).not.toMatch(/\b(?:proposal|specs|design|tasks)\b/)
    expect(createHash("sha256").update(JSON.stringify(outsideInputs)).digest("hex"))
      .toBe(fixtures._bindingDeltaV1Compatibility.outside_inputs_sha256)
  })

  test("adopts the execution contract title and exact closed schema-version set", () => {
    const validateSchemaVersion = new Ajv2020().compile(executionContractSchema.properties.schema_version)
    const provenance = fixtures._executionContractV2Compatibility.provenance

    expect(executionContractSchema.title).toBe("Control Tower Unattended Execution Contract")
    expect(provenance).toEqual({
      logical_asset: "chanks-4-unattended-implementation/assets/execution-contract.schema.json",
      $id: "https://gentle-ai.local/schemas/unattended-execution-contract-v2.json",
      schema_version: "gentle-ai.unattended-execution-contract/v2",
      installed_asset_sha256: "c1b042d79e887c7f7fe9288d68f280b2e32ca28d6a6cb5543d49e7aa117e327d",
    })
    for (const version of [1, "gentle-ai.unattended-execution-contract/v1", provenance.schema_version]) {
      expect(validateSchemaVersion(version)).toBe(true)
    }
    for (const version of ["1", 2, "gentle-ai.unattended-execution-contract/v3"]) {
      expect(validateSchemaVersion(version)).toBe(false)
    }
  })
})

describe("V1 schema boundary", () => {
  test("registers the closed parked checkpoint binding fixture", () => {
    expect(schemaNames).toContain("parkedCheckpointBinding")
    expect(validate("parkedCheckpointBinding", fixtures.parkedCheckpointBinding)).toEqual(fixtures.parkedCheckpointBinding)
    expect(errorCode(() => validate("parkedCheckpointBinding", { ...fixtures.parkedCheckpointBinding, extra: true }))).toBe("CT_SCHEMA_INVALID")
  })

  test("registers origin-neutral reconciliation integrity and exact pair bindings", async () => {
    const contracts = await import("../../contracts/validate.mjs")
    expect(schemaNames).toEqual(expect.arrayContaining(["checkpointCapture", "reconciledCheckpoint"]))
    expect(contracts.reconciledCheckpointIdentity(fixtures.reconciledCheckpoint)).toBe(fixtures.reconciledCheckpoint.reconciliation_id)
    expect(contracts.reconciledCheckpointDigest(fixtures.reconciledCheckpoint)).toBe(fixtures.reconciledCheckpoint.digest)
    expect(validate("reconciledCheckpoint", fixtures.reconciledCheckpoint)).toEqual(fixtures.reconciledCheckpoint)
    expect(contracts.validateCheckpointProvenancePair(fixtures.checkpointCapture, fixtures.reconciledCheckpoint)).toEqual({
      capture: fixtures.checkpointCapture, reconciliation: fixtures.reconciledCheckpoint,
    })
  })

  test("rejects reconciliation tamper and every cross-artifact mismatch", async () => {
    const contracts = await import("../../contracts/validate.mjs")
    const reseal = (value) => {
      value.reconciliation_id = contracts.reconciledCheckpointIdentity(value)
      value.digest = contracts.reconciledCheckpointDigest(value)
      return value
    }
    for (const mutate of [
      (value) => { value.capture.checkpoint_id = `checkpoint-${"0".repeat(64)}` },
      (value) => { value.capture.digest = `sha256:${"0".repeat(64)}` },
      (value) => { value.project_id = "project-b" }, (value) => { value.assignment_id = "assignment-b" },
      (value) => { value.generation += 1 }, (value) => { value.repository_root = "/tmp/other" },
      (value) => { value.git_common_dir = "/tmp/other/.git" }, (value) => { value.base.commit = "0".repeat(40) },
      (value) => { value.base.tree = "1".repeat(40) }, (value) => { value.result.commit = "2".repeat(40) },
      (value) => { value.result.tree = "3".repeat(40) },
    ]) {
      const mismatch = structuredClone(fixtures.reconciledCheckpoint); mutate(mismatch); reseal(mismatch)
      expect(validate("reconciledCheckpoint", mismatch)).toEqual(mismatch)
      expect(errorCode(() => contracts.validateCheckpointProvenancePair(fixtures.checkpointCapture, mismatch))).toBe("CT_SCHEMA_INVALID")
    }
    for (const mutate of [
      (value) => { value.reconciliation_id = `reconciliation-${"f".repeat(64)}` },
      (value) => { value.digest = `sha256:${"f".repeat(64)}` },
      (value) => { value.state = "INVALID" },
      (value) => { value.evidence.host_epoch += 1 },
    ]) {
      const tamper = structuredClone(fixtures.reconciledCheckpoint); mutate(tamper)
      expect(errorCode(() => validate("reconciledCheckpoint", tamper))).toBe("CT_SCHEMA_INVALID")
    }
  })

  test("registers origin-neutral checkpoint capture integrity", async () => {
    const contracts = await import("../../contracts/validate.mjs")
    expect(schemaNames).toContain("checkpointCapture")
    expect(fixtures.checkpointCapture.schema).toBe("checkpoint-capture")
    expect(contracts.checkpointCaptureIdentity(fixtures.checkpointCapture)).toBe(fixtures.checkpointCapture.checkpoint_id)
    expect(contracts.checkpointCaptureDigest(fixtures.checkpointCapture)).toBe(fixtures.checkpointCapture.digest)
    expect(validate("checkpointCapture", fixtures.checkpointCapture)).toEqual(fixtures.checkpointCapture)

    for (const mutate of [
      (value) => { value.checkpoint_id = `checkpoint-${"f".repeat(64)}` },
      (value) => { value.digest = `sha256:${"f".repeat(64)}` },
      (value) => { value.project_id = "project-b" },
      (value) => { value.assignment_id = "assignment-b" },
      (value) => { value.generation += 1 },
      (value) => { value.repository_root = "/tmp/other" },
      (value) => { value.git_common_dir = "/tmp/other/.git" },
      (value) => { value.base.commit = "0".repeat(40) },
      (value) => { value.base.tree = "1".repeat(40) },
      (value) => { value.result.commit = "2".repeat(40) },
      (value) => { value.result.tree = "3".repeat(40) },
      (value) => { value.files[0].path = "other.txt" },
      (value) => { value.files[0].mode = "rfc8785-jcs" },
      (value) => { value.files[0].git_mode = "100755" },
      (value) => { value.files[0].digest = `sha256:${"f".repeat(64)}` },
    ]) {
      const drift = structuredClone(fixtures.checkpointCapture); mutate(drift)
      expect(errorCode(() => validate("checkpointCapture", drift))).toBe("CT_SCHEMA_INVALID")
    }

    const reseal = (value) => {
      value.checkpoint_id = contracts.checkpointCaptureIdentity(value)
      value.digest = contracts.checkpointCaptureDigest(value)
      return value
    }
    const duplicate = structuredClone(fixtures.checkpointCapture)
    duplicate.files.push(structuredClone(duplicate.files[0]))
    const unsorted = structuredClone(fixtures.checkpointCapture)
    unsorted.files.push({ ...structuredClone(unsorted.files[0]), path: "a.txt" })
    expect(errorCode(() => validate("checkpointCapture", reseal(duplicate)))).toBe("CT_SCHEMA_INVALID")
    expect(errorCode(() => validate("checkpointCapture", reseal(unsorted)))).toBe("CT_SCHEMA_INVALID")
  })

  test("registers and fixtures a closed local-to-external session graph", () => {
    const fixture = fixtures.sessionPlanSnapshot
    expect(schemaNames).toContain("sessionPlanSnapshot")
    expect(fixture.graph.local_session_ids).toContain("S5.6")
    expect(fixture.graph.external_session_ids).toEqual(["S5.4"])
    expect(fixture.graph.edges).toEqual([{ from: "S5.4", to: "S5.6" }])
    expect(validate("sessionPlanSnapshot", fixture).target.depends_on).toEqual(["S5.4"])
  })

  test("rejects a missing required session snapshot field without mutating input", () => {
    const input = structuredClone(fixtures.sessionPlanSnapshot)
    delete input.target.resource
    const before = JSON.stringify(input)
    expect(errorCode(() => validate("sessionPlanSnapshot", input))).toBe("CT_SCHEMA_INVALID")
    expect(JSON.stringify(input)).toBe(before)
  })

  test("registers both parked decision contracts with shared fixtures and invariants", () => {
    expect(schemaNames).toEqual(expect.arrayContaining(["parkedDecision", "parkedDecisionResponse"]))
    expect(validate("parkedDecision", fixtures.parkedDecision).options).toHaveLength(2)
    expect(validate("parkedDecisionResponse", fixtures.parkedDecisionResponse).option_id).toBe("option-a")
    const duplicate = structuredClone(fixtures.parkedDecision); duplicate.options[1].option_id = "option-a"
    const drifted = structuredClone(fixtures.parkedDecisionResponse); drifted.authorization_revision += 1
    expect(errorCode(() => validate("parkedDecision", duplicate))).toBe("CT_SCHEMA_INVALID")
    expect(errorCode(() => validate("parkedDecisionResponse", drifted))).toBe("CT_SCHEMA_INVALID")
  })

  test("treats binding delta inputs as opaque while preserving the current form", () => {
    const current = structuredClone(fixtures.bindingDelta)
    const alternative = {
      ...structuredClone(current),
      inputs: fixtures._bindingDeltaV1Compatibility.alternative_inputs,
    }

    expect(validate("bindingDelta", current)).toEqual(current)
    expect(validate("bindingDelta", alternative)).toEqual(alternative)
  })

  test("preserves binding delta registry and payload membership", () => {
    const compatibility = fixtures._bindingDeltaV1Compatibility

    expect(schemaNames).toContain(compatibility.registry_name)
    expect(RUNTIME_PAYLOAD_FILES).toContain(compatibility.payload_member)
  })

  for (const [name, payload] of Object.entries(fixtures).filter(([name]) => !name.startsWith("_"))) {
    test(`${name} accepts its declared contract`, () => {
      const result = validate(name, payload)
      expect(result).toEqual(payload)
      expect(Object.isFrozen(result)).toBe(true)
    })

    test(`${name} rejects undeclared fields without mutating input`, () => {
      const input = structuredClone(payload)
      input.unexpected = "must fail closed"
      const before = JSON.stringify(input)

      expect(errorCode(() => validate(name, input))).toBe("CT_SCHEMA_INVALID")
      expect(JSON.stringify(input)).toBe(before)
    })
  }

  test("accepts explicitly namespaced extensions", () => {
    const input = structuredClone(fixtures.artifactRef)
    input.extensions = { "com.example/evidence": { retained: true } }

    expect(validate("artifactRef", input).extensions).toEqual({
      "com.example/evidence": { retained: true },
    })
  })

  test("rejects an extension without a namespace", () => {
    const input = structuredClone(fixtures.artifactRef)
    input.extensions = { evidence: true }

    expect(errorCode(() => validate("artifactRef", input))).toBe("CT_SCHEMA_INVALID")
  })

  test("authorizes a direct-push delivery that carries no pull request number", () => {
    const input = structuredClone(fixtures.authorization)
    input.delivery = { ...input.delivery, shape: "direct-push" }
    delete input.delivery.number

    expect(validate("authorization", input).delivery.shape).toBe("direct-push")
  })

  test("keeps the authorization fixture valid and closed", () => {
    const input = structuredClone(fixtures.authorization)
    expect(validate("authorization", input)).toEqual(input)
    expect(errorCode(() => validate("authorization", { ...input, unexpected: true }))).toBe("CT_SCHEMA_INVALID")
  })

  test("rejects support proposal role, project, and schema drift", () => {
    const proposal = {
      schema: "support-proposal",
      schema_version: 1,
      proposal_id: "proposal-a",
      project_id: "project-a",
      caller_role: "MAIN",
      checkpoint_ref: "checkpoints/a.json",
      plan_enumeration_digest: `sha256:${"a".repeat(64)}`,
      ledger_digest: `sha256:${"b".repeat(64)}`,
      worker_claim: "claim-a",
      primary: { module_id: "M3.2.1", task_ids: ["T3.2.1.1"] },
      alternatives: [],
      conflicts: [],
      evidence_refs: [],
      expires_at: "2099-01-01T00:00:00.000Z",
      state: "EXECUTABLE",
    }
    expect(validate("supportProposal", proposal)).toEqual(proposal)
    expect(errorCode(() => validate("supportProposal", { ...proposal, caller_role: "WORKER" }))).toBe("CT_SCHEMA_INVALID")
    expect(errorCode(() => validate("supportProposal", { ...proposal, project_id: "" }))).toBe("CT_SCHEMA_INVALID")
    expect(errorCode(() => validate("supportProposal", { ...proposal, schema: "policy-report" }))).toBe("CT_SCHEMA_INVALID")
  })

  test("binds the pull request number to the pull-request shape only", () => {
    const withoutNumber = structuredClone(fixtures.authorization)
    delete withoutNumber.delivery.number
    expect(errorCode(() => validate("authorization", withoutNumber))).toBe("CT_SCHEMA_INVALID")

    const pushWithNumber = structuredClone(fixtures.authorization)
    pushWithNumber.delivery.shape = "direct-push"
    expect(errorCode(() => validate("authorization", pushWithNumber))).toBe("CT_SCHEMA_INVALID")
  })

  test("requires a delivery binding for MERGE and forbids one for START_JORNADA", () => {
    const merge = structuredClone(fixtures.authorization)
    delete merge.delivery
    expect(errorCode(() => validate("authorization", merge))).toBe("CT_SCHEMA_INVALID")

    const jornada = structuredClone(fixtures.authorization)
    jornada.action = "START_JORNADA"
    jornada.jornada_snapshot = {}
    expect(errorCode(() => validate("authorization", jornada))).toBe("CT_SCHEMA_INVALID")

    delete jornada.delivery
    expect(validate("authorization", jornada).action).toBe("START_JORNADA")
  })
})

describe("duplicate-safe structured parsing", () => {
  test("accepts quoted timestamps but rejects an implicit timestamp in an otherwise valid document", () => {
    const quoted = JSON.stringify(fixtures.planManifest)
    expect(validate("planManifest", quoted).created_at).toBe("2026-07-27T12:00:00Z")

    const implicit = quoted.replace('"2026-07-27T12:00:00Z"', "2026-07-27T12:00:00Z")
    expect(errorCode(() => validate("planManifest", implicit))).toBe("CT_SCHEMA_INVALID")
  })

  test("rejects forbidden YAML syntax", () => {
    const forbidden = [
      "schema: artifact-ref\nschema_version: 1\nvalue: &shared x\ncopy: *shared\n",
      "schema: artifact-ref\nschema_version: 1\ncreated_at: 2026-07-27\n",
      "schema: artifact-ref\nschema_version: 1\nunsafe: 9007199254740993\n",
      "schema: artifact-ref\nschema_version: 1\n1: non-string-key\n",
      "schema: artifact-ref\nschema_version: 1\ntagged: !custom value\n",
      "schema: artifact-ref\nschema_version: 1\nbase: &base {x: 1}\nmerged: {<<: *base}\n",
    ]

    for (const source of forbidden) {
      expect(errorCode(() => validate("artifactRef", source))).toBe("CT_SCHEMA_INVALID")
    }
  })

  test("rejects top-level, nested, and decoded-equivalent JSON keys", () => {
    const duplicates = [
      '{"schema":"artifact-ref","schema":"artifact-ref"}',
      '{"outer":{"value":1,"value":2}}',
      '{"a":1,"\\u0061":2}',
    ]

    for (const source of duplicates) {
      expect(errorCode(() => validate("artifactRef", source))).toBe("CT_SCHEMA_INVALID")
    }
  })
})

describe("cross-field schema invariants", () => {
  test("session snapshot identity and references fail through CT_SCHEMA_INVALID", () => {
    const fixture = fixtures.sessionPlanSnapshot
    const reseal = (mutate) => {
      const value = structuredClone(fixture)
      mutate(value)
      value.snapshot_digest = sessionPlanSnapshotDigest(value)
      return value
    }
    const escalation = {
      kind: "escala", body: "Resolve authority", classes: ["seguridad y permisos"], resolution: "open",
      contamination: { state: "active", session_ids: ["S9.9"] },
    }
    const invalidSnapshots = [
      { ...fixture, snapshot_digest: `sha256:${"0".repeat(64)}` },
      reseal((value) => value.graph.external_session_ids.push("S5.6")),
      reseal((value) => { value.graph.local_session_ids = ["S5.5"]; value.graph.external_session_ids = ["S5.6"] }),
      reseal((value) => value.graph.edges.push({ from: "S9.9", to: "S5.6" })),
      reseal((value) => { value.graph.local_session_ids.push("S5.5"); value.target.depends_on.push("S5.5") }),
      reseal((value) => { value.target.decisions = [escalation] }),
      reseal((value) => value.target.acceptance_criteria.push(structuredClone(value.target.acceptance_criteria[0]))),
      reseal((value) => { value.target.decisions = [{ ...escalation, contamination: { state: "none", session_ids: [] } }, { ...escalation, contamination: { state: "none", session_ids: [] } }] }),
      reseal((value) => { value.graph.local_session_ids.push("S5.5"); value.target.depends_on.push("S5.5"); value.graph.edges.push({ from: "S5.5", to: "S5.6" }, { from: "S5.6", to: "S5.5" }) }),
    ]
    for (const value of invalidSnapshots) expect(errorCode(() => validate("sessionPlanSnapshot", value))).toBe("CT_SCHEMA_INVALID")
  })

  test("freezes distinct candidate bytes, rejects stale identity, links successors, and runs an effect once", () => {
    const input = {
      schema: "candidate-revision", schema_version: 1, project_id: "project-a", plan_id: "plan-a", session_id: "S5.1",
      artifact_ref: "artifacts/a.json", base_sha: "a".repeat(40), result_sha: "b".repeat(40), tree_sha: "c".repeat(40),
      commit_sha: "d".repeat(40), head_sha: "d".repeat(40), target: { repository: "owner/repository", branch: "master" },
      assignment_id: "assignment-a", host_epoch: 1, policy_revision: 1, jornada_id: "jornada-a", jornada_revision: 3,
      manifest_revision: 1, registry_revision: 7, capability_revision: 1, verification_digest: `sha256:${"e".repeat(64)}`,
    }
    const candidate = freezeCandidate(input)
    const changed = freezeCandidate({ ...input, verification_digest: `sha256:${"1".repeat(64)}` })
    expect(candidate.candidate_revision).not.toBe(changed.candidate_revision)
    expect(isCurrentCandidate(candidate, input)).toBe(true)
    expect(isCurrentCandidate(candidate, { ...input, host_epoch: 2 })).toBe(false)
    expect(isCurrentCandidate(candidate, { ...input, artifact_ref: "artifacts/changed.json" })).toBe(false)
    const successor = successorCandidate(candidate, { ...input, host_epoch: 2 })
    expect(successor.predecessor_revision).toBe(candidate.candidate_revision)
    expect(errorCode(() => successorCandidate(candidate, input))).toBe("CT_SCHEMA_INVALID")

  })

  test("accepts an optional digest-only process receipt", () => {
    const { candidate_revision: _revision, ...identity } = fixtures.candidateRevision
    expect(freezeCandidate(identity)).not.toHaveProperty("process_receipt_digest")

    const processReceipt = `sha256:${"7".repeat(64)}`
    expect(freezeCandidate({ ...identity, process_receipt_digest: processReceipt }).process_receipt_digest).toBe(processReceipt)
    expect(errorCode(() => freezeCandidate({ ...identity, process_receipt_digest: "absent" }))).toBe("CT_SCHEMA_INVALID")
  })

  test("seals a supplied process receipt into frozen candidate identity", () => {
    const { candidate_revision: _revision, ...identity } = fixtures.candidateRevision
    const firstReceipt = `sha256:${"7".repeat(64)}`
    const secondReceipt = `sha256:${"8".repeat(64)}`
    const frozen = freezeCandidate({ ...identity, process_receipt_digest: firstReceipt })

    expect(isCurrentCandidate(frozen, { ...identity, process_receipt_digest: firstReceipt })).toBe(true)
    expect(isCurrentCandidate(frozen, { ...identity, process_receipt_digest: secondReceipt })).toBe(false)
    expect(errorCode(() => freezeCandidate({ ...frozen, process_receipt_digest: secondReceipt }))).toBe("CT_SCHEMA_INVALID")

    const withoutReceipt = freezeCandidate(identity)
    expect(errorCode(() => freezeCandidate({ ...withoutReceipt, process_receipt_digest: firstReceipt }))).toBe("CT_SCHEMA_INVALID")
  })

  test("requires candidate revisions to match their frozen identity", () => {
    const candidate = structuredClone(fixtures.candidateRevision)
    candidate.host_epoch = 2
    expect(errorCode(() => validate("candidateRevision", candidate))).toBe("CT_SCHEMA_INVALID")
  })

  test("keeps historical candidates valid while policy report digest changes frozen identity", () => {
    expect(validate("candidateRevision", fixtures.candidateRevision)).toEqual(fixtures.candidateRevision)
    const { candidate_revision: _revision, ...identity } = fixtures.candidateRevision
    const bound = freezeCandidate({ ...identity, policy_report_digest: `sha256:${"9".repeat(64)}` })
    expect(bound.policy_report_digest).toBe(`sha256:${"9".repeat(64)}`)
    expect(bound.candidate_revision).not.toBe(fixtures.candidateRevision.candidate_revision)
  })

  test("binds delivery ledger revisions and terminal states to the frozen candidate", () => {
    expect(validate("deliveryRecord", fixtures.deliveryRecord)).toEqual(fixtures.deliveryRecord)
    expect(errorCode(() => validate("deliveryRecord", { ...fixtures.deliveryRecord, revision: 2 }))).toBe("CT_SCHEMA_INVALID")
    expect(errorCode(() => validate("deliveryRecord", { ...fixtures.deliveryRecord, candidate_revision: "attempt-a" }))).toBe("CT_SCHEMA_INVALID")
  })

  test("capability roles resolve uniquely", () => {
    const duplicate = structuredClone(fixtures.agentCapabilityRegistry)
    duplicate.capabilities.push(structuredClone(duplicate.capabilities[0]))
    expect(errorCode(() => validate("agentCapabilityRegistry", duplicate))).toBe("CT_MANIFEST_INVALID")
  })

  test("catalog IDs and references resolve uniquely", () => {
    const duplicate = structuredClone(fixtures.planCatalog)
    duplicate.plans.push(structuredClone(duplicate.plans[0]))
    expect(errorCode(() => validate("planCatalog", duplicate))).toBe("CT_MANIFEST_INVALID")

    const unresolved = structuredClone(fixtures.planCatalog)
    unresolved.plans[0].manifest_ref = ""
    expect(errorCode(() => validate("planCatalog", unresolved))).toBe("CT_MANIFEST_INVALID")
  })

  test("manifest dependencies resolve and remain acyclic", () => {
    const unresolved = structuredClone(fixtures.planManifest)
    unresolved.slices[1].dependencies = ["missing"]
    expect(errorCode(() => validate("planManifest", unresolved))).toBe("CT_MANIFEST_INVALID")

    const cyclic = structuredClone(fixtures.planManifest)
    cyclic.slices[0].dependencies = ["notifications"]
    expect(errorCode(() => validate("planManifest", cyclic))).toBe("CT_MANIFEST_INVALID")
  })

  test("manifest excludes mutable runtime state and automatic merge", () => {
    const runtimeState = structuredClone(fixtures.planManifest)
    runtimeState.session_id = "runtime-session"
    expect(errorCode(() => validate("planManifest", runtimeState))).toBe("CT_MANIFEST_INVALID")

    const automaticMerge = structuredClone(fixtures.planManifest)
    automaticMerge.delivery_automation.automatic_merge = true
    expect(errorCode(() => validate("planManifest", automaticMerge))).toBe("CT_MANIFEST_INVALID")
  })

  test("delta corrections link the immediately previous immutable revision", () => {
    const correction = structuredClone(fixtures.bindingDelta)
    correction.artifact_revision = 2
    correction.inputs.previous_delta = { ...fixtures.artifactRef, artifact_revision: 1 }
    expect(validate("bindingDelta", correction).artifact_revision).toBe(2)

    correction.inputs.previous_delta.artifact_revision = 2
    expect(errorCode(() => validate("bindingDelta", correction))).toBe("CT_MANIFEST_INVALID")

    const missingLink = structuredClone(fixtures.bindingDelta)
    missingLink.artifact_revision = 2
    expect(errorCode(() => validate("bindingDelta", missingLink))).toBe("CT_MANIFEST_INVALID")
  })

  test("campaign step dependencies resolve and remain acyclic", () => {
    const cyclic = structuredClone(fixtures.campaign)
    cyclic.steps[0].depends_on = ["consumer"]
    expect(errorCode(() => validate("campaign", cyclic))).toBe("CT_MANIFEST_INVALID")
  })
})
