import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { validate } from "../../contracts/validate.mjs"
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

describe("V1 schema boundary", () => {
  for (const [name, payload] of Object.entries(fixtures)) {
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
  test("freezes distinct candidate bytes, rejects stale identity, links successors, and runs an effect once", () => {
    const input = {
      schema: "candidate-revision", schema_version: 1, project_id: "project-a", plan_id: "plan-a", session_id: "S5.1",
      artifact_ref: "artifacts/a.json", base_sha: "a".repeat(40), result_sha: "b".repeat(40), tree_sha: "c".repeat(40),
      commit_sha: "d".repeat(40), head_sha: "d".repeat(40), target: { repository: "owner/repository", branch: "master" },
      assignment_id: "assignment-a", host_epoch: 1, policy_revision: 1, jornada_id: "jornada-a", jornada_revision: 3,
      manifest_revision: 1, registry_revision: 7, capability_revision: 1, verification_digest: `sha256:${"e".repeat(64)}`,
      required_checks_digest: `sha256:${"f".repeat(64)}`, required_reviews_digest: `sha256:${"0".repeat(64)}`,
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

  test("requires candidate revisions to match their frozen identity", () => {
    const candidate = structuredClone(fixtures.candidateRevision)
    candidate.host_epoch = 2
    expect(errorCode(() => validate("candidateRevision", candidate))).toBe("CT_SCHEMA_INVALID")
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
