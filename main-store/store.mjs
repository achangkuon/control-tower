import { chmodSync, closeSync, constants, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { dirname, isAbsolute, join, resolve } from "node:path"
import { randomUUID } from "node:crypto"

import { validate, validateCheckpointProvenancePair } from "../contracts/validate.mjs"
import { canonicalize } from "../contracts/canonicalize.mjs"
import { assertParkedDecisionResponseBinding, parkedDecisionResponseDigest } from "../contracts/parked-decision.mjs"
import { assertParkedCheckpointBinding, createParkedCheckpointBinding } from "../contracts/parked-checkpoint-binding.mjs"
import { assertCompletedWorkBinding, createCompletedWorkBinding } from "../contracts/completed-work-binding.mjs"
import { freezeCandidate } from "../contracts/candidate-revision.mjs"
import { assertCanonicalCheckpointCapture } from "../workspace/checkpoint.mjs"
import { assertCanonicalReconciledCheckpoint } from "../workspace/reconciliation.mjs"
import { resolveJornadaLifecycle } from "../jornada/lifecycle.mjs"

// Terminal states an authorization may reach, mirroring authorization-v1's
// `state` enum minus PENDING. REJECTED records a denied decision, which the
// store previously could not express at all.
const TERMINAL_STATES = new Set(["APPROVED", "REJECTED", "EXPIRED", "REVOKED"])
const digest = (value) => typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value)
const fail = (code, message, cause) => { throw Object.assign(new Error(message, { cause }), { code }) }
const exactKeys = (value, keys) => value && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0")
const safeId = (value) => {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)) fail("CT_STORE_INVALID", "Invalid store identifier")
  return value
}
const safeRef = (value) => typeof value === "string" && value.length > 0 && !value.includes("\0")
const forbiddenKey = /(?:password|passwd|secret|token|credential|private[_-]?key|api[_-]?key)/i
const forbiddenSupportKey = /^(?:assignment|authority|privilege|capability|lock|worker)$/i
const assertCredentialFree = (value, seen = new WeakSet()) => {
  if (typeof value === "string" && (value.includes("-----BEGIN PRIVATE KEY-----") || /^[a-z][a-z0-9+.-]*:\/\/[^/@\s]+:[^/@\s]+@/i.test(value))) fail("CT_CREDENTIAL_FORBIDDEN", "Credentials cannot be persisted")
  if (!value || typeof value !== "object") return
  if (seen.has(value)) fail("CT_STORE_INVALID", "Cyclic records are forbidden")
  seen.add(value)
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKey.test(key)) fail("CT_CREDENTIAL_FORBIDDEN", "Credentials cannot be persisted")
    assertCredentialFree(child, seen)
  }
  seen.delete(value)
}
const assertSupportPayload = (value, seen = new WeakSet()) => {
  if (!value || typeof value !== "object") return
  if (seen.has(value)) fail("CT_STORE_INVALID", "Cyclic Support proposals are forbidden")
  seen.add(value)
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenSupportKey.test(key)) fail("CT_STORE_INVALID", "Support proposals cannot carry authority")
    assertSupportPayload(child, seen)
  }
  seen.delete(value)
}
const frozen = (value) => {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) frozen(child)
    Object.freeze(value)
  }
  return value
}
const parse = (path) => JSON.parse(readFileSync(path, "utf8"))
const render = (value) => typeof value === "string" ? value : value && typeof value === "object" ? canonicalize(value) : JSON.stringify(value)
const bindingError = (name, expected, actual) => fail("CT_AUTH_RESPONSE_BINDING", `Rejected response binding ${name}: expected ${render(expected)}, actual ${render(actual)}`)
const equalBinding = (name, expected, actual) => { if (canonicalize(expected) !== canonicalize(actual)) bindingError(name, expected, actual) }
const authorizationRecord = (value) => {
  const { actor: _actor, revision: _revision, revision_history: _history, terminal_audit: _audit, audit_ref: _ref, ...record } = value
  try { return validate("authorization", record) }
  catch (error) { fail("CT_AUTH_INVALID", "Authorization does not satisfy authorization-v1", error) }
}
const responsePair = (input) => {
  const hasParked = input.parked_decision !== undefined, hasResponse = input.parked_decision_response !== undefined
  if (hasParked !== hasResponse) fail("CT_AUTH_RESPONSE_INVALID", "Parked decision and response must be supplied together")
  if (!hasParked) return null
  try {
    const parked = validate("parkedDecision", structuredClone(input.parked_decision))
    const detached = structuredClone(input.parked_decision_response), suppliedDigest = detached.response_digest
    const expectedDigest = parkedDecisionResponseDigest(detached), digestDrift = digest(suppliedDigest) && suppliedDigest !== expectedDigest
    const response = validate("parkedDecisionResponse", digestDrift ? { ...detached, response_digest: expectedDigest } : detached)
    equalBinding("parked_decision_id", parked.parked_decision_id, response.parked_decision_id)
    equalBinding("parked_decision_digest", parked.parked_decision_digest, response.parked_decision_digest)
    if (!parked.options.some(({ option_id }) => option_id === response.option_id)) bindingError("option_id", parked.options.map(({ option_id }) => option_id), response.option_id)
    equalBinding("session_plan_snapshot_digest", parked.frozen_scope.session_plan_snapshot_digest, response.session_plan_snapshot_digest)
    assertParkedDecisionResponseBinding(response, parked)
    return { parked, response, bytes: canonicalize(response), digestDrift: digestDrift && { expected: expectedDigest, actual: suppliedDigest } }
  } catch (error) {
    if (error?.code === "CT_AUTH_RESPONSE_BINDING") throw error
    fail("CT_AUTH_RESPONSE_INVALID", "Parked decision response is invalid", error)
  }
}

export const createMainStore = ({ root, authority, capability, beforeCommit, testEpochTransactionHook, assertCurrentHost } = {}) => {
  if (!isAbsolute(root ?? "") || !authority || typeof authority.assert !== "function") fail("CT_STORE_INVALID", "A bound absolute store is required")
  const binding = authority.assert(capability, { store_path: root })
  mkdirSync(root, { recursive: true, mode: 0o700 })
  const rootStats = lstatSync(root)
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink() || rootStats.uid !== process.getuid()) fail("CT_STORE_INVALID", "Unsafe store root")
  chmodSync(root, 0o700)

  const directory = (kind) => {
    const path = join(root, kind)
    mkdirSync(path, { recursive: true, mode: 0o700 })
    const stats = lstatSync(path)
    if (!stats.isDirectory() || stats.isSymbolicLink() || stats.uid !== process.getuid() || (stats.mode & 0o777) !== 0o700) fail("CT_STORE_INVALID", "Unsafe store directory")
    return path
  }
  const assignmentLocationPath = (assignmentRef) => join(directory("assignment-locations"), `${encodeURIComponent(assignmentRef)}.json`)
  const withLock = (path, operation, testHook) => {
    const lock = `${path}.lock`
    let descriptor
    try {
      const deadline = Date.now() + 5_000
      while (descriptor === undefined) {
        try { descriptor = openSync(lock, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600) }
        catch (error) {
          if (error?.code === "EEXIST") testHook?.("contended")
          if (error?.code !== "EEXIST" || Date.now() >= deadline) throw error
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2)
        }
      }
      return operation()
    } finally {
      if (descriptor !== undefined) {
        closeSync(descriptor)
        rmSync(lock, { force: true })
      }
    }
  }
  const atomicWrite = (path, value, validate) => {
    const bytes = Buffer.from(`${JSON.stringify(value)}\n`)
    const temporary = join(dirname(path), `.${randomUUID()}.tmp`)
    let descriptor, renamed = false
    try {
      descriptor = openSync(temporary, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600)
      writeFileSync(descriptor, bytes)
      fsyncSync(descriptor)
      closeSync(descriptor)
      descriptor = undefined
      beforeCommit?.(path, value)
      withLock(path, () => {
        validate?.()
        renameSync(temporary, path)
        renamed = true
        const directoryDescriptor = openSync(dirname(path), constants.O_RDONLY)
        try { fsyncSync(directoryDescriptor) } finally { closeSync(directoryDescriptor) }
      })
    } catch (error) {
      if (descriptor !== undefined) closeSync(descriptor)
      rmSync(temporary, { force: true })
      if (error?.code?.startsWith("CT_")) throw error
      fail("CT_STORE_WRITE_FAILED", renamed ? "Atomic replacement completed; directory durability is indeterminate" : "Atomic store write failed", error)
    }
  }
  const assertMain = (input) => {
    authority.assert(capability, { project_id: binding.project_id, revision: binding.revision, epoch: binding.epoch })
    if (input?.actor !== "MAIN") fail("CT_AUTH_INVALID", "Only Main may mutate the store")
    if (input.project_id !== binding.project_id) fail("CT_PROJECT_MISMATCH", "Foreign project mutation")
    assertCredentialFree(input)
  }
  const commit = (kind, id, input, expectedRevision = input.expected_revision) => {
    assertMain(input)
    const records = directory(kind)
    const path = join(records, `${safeId(id)}.json`)
    const current = existsSync(path) ? parse(path) : null
    const revision = current?.revision ?? 0
    if (expectedRevision !== undefined && expectedRevision !== revision) fail("CT_CAS_MISMATCH", "Store revision changed")
    const prior = current && Object.fromEntries(Object.entries(current).filter(([key]) => key !== "revision_history"))
    const next = {
      ...input, expected_revision: undefined, revision: revision + 1,
      revision_history: current ? [...(current.revision_history ?? []), prior] : [],
    }
    delete next.expected_revision
    atomicWrite(path, next, () => {
      const committed = existsSync(path) ? parse(path) : null
      if ((committed?.revision ?? 0) !== revision) fail("CT_CAS_MISMATCH", "Store revision changed")
    })
    return frozen({ ...structuredClone(next), record_path: path })
  }
  const authorizationPath = (id) => join(directory("authorizations"), `${safeId(id)}.json`)
  const jornadaPath = (id) => join(directory("jornadas"), `${safeId(id)}.json`)
  const handoffCoordinatePath = (id) => join(directory("handoff-coordinates"), `${safeId(id)}.json`)
  const workerClaimPath = (id) => join(directory("worker-claims"), `${safeId(id)}.json`)
  const supportProposalPath = (id) => join(directory("support-proposals"), `${safeId(id)}.json`)
  const parkingPath = (id) => join(directory("decision-parkings"), `${safeId(id)}.json`)
  const completedWorkBindingPath = (id) => join(directory("completed-work-bindings"), `${safeId(id)}.json`)
  const launchBindingPath = (id) => join(directory("launch-bindings"), `${safeId(id)}.json`)
  const launchConsumptionPath = (id) => join(directory("launch-consumptions"), `${safeId(id)}.json`)
  const epochRecordPath = (epoch) => join(directory("epoch-records"), `${epoch}.json`)
  const currentEpochPath = join(root, "current-epoch.json")
  const safeEpochFile = (path) => {
    const stats = lstatSync(path)
    return stats.isFile() && !stats.isSymbolicLink() && stats.uid === process.getuid() && (stats.mode & 0o777) === 0o600 && stats.nlink === 1
  }
  const publishCurrentEpoch = () => withLock(join(root, "epoch-transaction"), () => {
    if (process.env.NODE_ENV === "test") testEpochTransactionHook?.("acquired")
    const record = { project_id: binding.project_id, epoch: binding.epoch }, recordPath = epochRecordPath(binding.epoch)
    if (existsSync(recordPath)) {
      if (!safeEpochFile(recordPath) || !exactKeys(parse(recordPath), ["epoch", "project_id"]) || parse(recordPath).project_id !== record.project_id || parse(recordPath).epoch !== record.epoch) {
        fail("CT_EPOCH_AUTHORITY_INVALID", "Epoch record is invalid")
      }
    } else {
      atomicWrite(recordPath, record, () => { if (existsSync(recordPath)) fail("CT_EPOCH_AUTHORITY_INVALID", "Epoch record already exists") })
    }
    if (existsSync(currentEpochPath)) {
      if (!safeEpochFile(currentEpochPath)) fail("CT_EPOCH_AUTHORITY_INVALID", "Current epoch pointer is invalid")
      const current = parse(currentEpochPath)
      if (exactKeys(current, ["epoch", "project_id"]) && current.epoch === record.epoch && current.project_id === record.project_id) return
    }
    atomicWrite(currentEpochPath, record, () => {
      if (!existsSync(recordPath) || !safeEpochFile(recordPath) || !exactKeys(parse(recordPath), ["epoch", "project_id"]) || parse(recordPath).project_id !== record.project_id || parse(recordPath).epoch !== record.epoch) {
        fail("CT_EPOCH_AUTHORITY_INVALID", "Epoch record changed during publication")
      }
    })
  }, process.env.NODE_ENV === "test" ? testEpochTransactionHook : undefined)
  publishCurrentEpoch()
  const approvedAuthorizationFor = (authorizationId, candidateRevision) => {
    if (typeof authorizationId !== "string" || authorizationId.length === 0) fail("CT_AUTH_INVALID", "Approved authorization is required")
    const path = authorizationPath(authorizationId)
    if (!existsSync(path)) fail("CT_AUTH_INVALID", "Unknown authorization")
    const current = parse(path)
    const {
      actor: _actor, revision: _revision, revision_history: _history,
      terminal_audit: _terminalAudit, audit_ref: _auditRef, ...record
    } = current
    let authorization
    try { authorization = validate("authorization", record) }
    catch (error) { fail("CT_AUTH_INVALID", "Authorization does not satisfy authorization-v1", error) }
    if (authorization.state !== "APPROVED") fail("CT_AUTH_INVALID", "Authorization is not approved")
    if (authorization.project_id !== binding.project_id || authorization.registry_revision !== binding.revision) fail("CT_AUTH_INVALID", "Authorization binding is stale")
    if (!digest(candidateRevision) || candidateRevision !== authorization.extensions?.["control-tower/candidate-revision"]) fail("CT_AUTH_INVALID", "Authorization candidate does not match")
    const createdAt = Date.parse(authorization.created_at), expiresAt = Date.parse(authorization.expires_at)
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) fail("CT_AUTH_EXPIRED", "Authorization has expired")
    if (!Number.isFinite(createdAt) || expiresAt <= createdAt || expiresAt > createdAt + 3_600_000) fail("CT_AUTH_INVALID", "Authorization lifetime is invalid")
    return authorization
  }
  const activeLaunchJornada = (authorization) => {
    let jornada
    try { jornada = resolveJornadaLifecycle(parse(jornadaPath(authorization.jornada_id))) }
    catch (error) { fail("CT_JORNADA_INVALID", "Launch authorization Jornada is unavailable", error) }
    if (jornada.state !== "AC" + "TIVE" || jornada.jornada_revision !== authorization.jornada_revision) fail("CT_LAUNCH_BINDING_STALE", "Launch authorization Jornada is not active at its bound revision")
    return jornada
  }
  const assertLaunchHost = (record) => {
    if (typeof assertCurrentHost !== "function") fail("CT_FENCE_PORT_REQUIRED", "Current host-epoch authority is required")
    return assertCurrentHost({ project_id: record.project_id, assignment_ref: record.assignment_ref, candidate_revision: record.candidate_revision, host_epoch: record.host_epoch, fence_path: record.fence_path })
  }

  return Object.freeze({
    parkDecision(input) {
      if (!exactKeys(input, ["actor", "project_id", "parked_decision", "checkpoint_capture", "reconciled_checkpoint"])) fail("CT_PARKING_INPUT_INVALID", "Parking requires one closed canonical input")
      assertMain(input)
      let parked, capture, reconciliation
      try {
        parked = validate("parkedDecision", input.parked_decision)
        capture = assertCanonicalCheckpointCapture(input.checkpoint_capture)
        reconciliation = assertCanonicalReconciledCheckpoint(input.reconciled_checkpoint)
        validateCheckpointProvenancePair(capture, reconciliation)
      } catch (error) {
        if (error?.code === "CT_PROVENANCE_ORIGIN_INVALID") throw error
        fail("CT_PARKING_INVALID", "Parking artifacts are invalid or mismatched", error)
      }
      if (capture.project_id !== binding.project_id) fail("CT_PROJECT_MISMATCH", "Checkpoint provenance belongs to a foreign project")
      let parked_checkpoint_binding
      try {
        parked_checkpoint_binding = createParkedCheckpointBinding({ parked_decision: parked, checkpoint_capture: capture, reconciled_checkpoint: reconciliation })
      } catch (error) { fail("CT_PARKING_INVALID", "Parking binding is invalid", error) }
      const record = { actor: "MAIN", project_id: binding.project_id, parked_decision: parked, checkpoint_capture: capture, reconciled_checkpoint: reconciliation, parked_checkpoint_binding }
      const path = parkingPath(parked.parked_decision_id)
      const replay = () => {
        const current = parse(path)
        const { revision: _revision, revision_history: _history, ...prior } = current
        if (canonicalize(prior) !== canonicalize(record)) fail("CT_PARKING_REPLAY_DIVERGENT", "Parking replay diverges from persisted canonical bytes")
        return frozen({ ...current, record_path: path, replayed: true })
      }
      if (existsSync(path)) return replay()
      try {
        return frozen({ ...commit("decision-parkings", parked.parked_decision_id, { ...record, expected_revision: 0 }, 0), replayed: false })
      } catch (error) {
        if (error.code === "CT_CAS_MISMATCH" && existsSync(path)) return replay()
        throw error
      }
    },
    // Decision 30: a standalone, immutable, versioned record under the same assertMain, lock and transaction.
    // It is sealed from the frozen candidate identity, so the caller cannot declare afterwards what governed it.
    bindCompletedWork(input) {
      const underOption = exactKeys(input, ["actor", "project_id", "candidate", "parked_decision", "parked_decision_response"])
      const underAssumption = exactKeys(input, ["actor", "project_id", "candidate", "parked_decision", "assumption"])
      if (underOption === underAssumption) fail("CT_WORK_BINDING_INPUT_INVALID", "Completed work binding requires one closed input naming exactly one enumerated option or one explicit assumption")
      assertMain(input)
      let candidate, completed_work_binding, parked, response
      try {
        // Persist the VALIDATED artifacts, never the caller's representation: `validate` accepts a YAML string
        // as readily as an object, and replay compares canonical bytes, so storing raw input would make an
        // identical retry in the other representation look like a re-attribution and lock the candidate out.
        parked = validate("parkedDecision", input.parked_decision)
        response = underOption ? validate("parkedDecisionResponse", input.parked_decision_response) : undefined
        candidate = freezeCandidate(input.candidate)
        completed_work_binding = createCompletedWorkBinding({
          candidate: input.candidate, parked_decision: parked,
          ...(underOption ? { parked_decision_response: response } : { assumption: input.assumption }),
        })
      } catch (error) { fail("CT_WORK_BINDING_INVALID", "Completed work binding sources are invalid or mismatched", error) }
      if (completed_work_binding.project_id !== binding.project_id) fail("CT_PROJECT_MISMATCH", "Completed work belongs to a foreign project")
      // Decision 30 forbids caller assertion, and both digests above are computable offline, so deriving from
      // caller-supplied artifacts is only caller assertion with extra steps. The decision must actually have
      // been parked HERE, and the option must trace to an authorization this store approved for THIS work.
      const parkedPath = parkingPath(parked.parked_decision_id)
      if (!existsSync(parkedPath)) fail("CT_WORK_BINDING_UNPARKED", "Parked decision was never parked in this store")
      let persisted
      try { persisted = validate("parkedDecision", parse(parkedPath).parked_decision) }
      catch (error) { fail("CT_WORK_BINDING_UNPARKED", "Persisted parked decision could not be resolved", error) }
      if (persisted.parked_decision_digest !== parked.parked_decision_digest) fail("CT_WORK_BINDING_UNPARKED", "Parked decision differs from the one parked in this store")
      // An assumption means no option was applied, so there is no authorization to resolve — only the parking.
      if (underOption) approvedAuthorizationFor(response.authorization_id, candidate.candidate_revision)
      const record = {
        actor: "MAIN", project_id: binding.project_id, candidate, parked_decision: parked,
        ...(underOption ? { parked_decision_response: response } : { assumption: completed_work_binding.assumption }),
        completed_work_binding,
      }
      const path = completedWorkBindingPath(completed_work_binding.binding_id)
      const replay = () => {
        const current = parse(path)
        const { revision: _revision, revision_history: _history, ...prior } = current
        if (canonicalize(prior) !== canonicalize(record)) fail("CT_WORK_BINDING_REPLAY_DIVERGENT", "Completed work binding replay diverges from persisted canonical bytes")
        return frozen({ ...current, record_path: path, replayed: true })
      }
      if (existsSync(path)) return replay()
      try {
        return frozen({ ...commit("completed-work-bindings", completed_work_binding.binding_id, { ...record, expected_revision: 0 }, 0), replayed: false })
      } catch (error) {
        if (error.code === "CT_CAS_MISMATCH" && existsSync(path)) return replay()
        throw error
      }
    },
    readCompletedWorkBinding(id) {
      const path = completedWorkBindingPath(id)
      if (!existsSync(path)) fail("CT_WORK_BINDING_NOT_FOUND", "Completed work binding does not exist")
      let record
      // A record we could not read is our failure, not a verdict on the work. Conflating the two would make a
      // retryable fault look like permanently corrupt provenance and refuse the attribution forever.
      try { record = parse(path) } catch (error) { fail("CT_WORK_BINDING_UNREADABLE", "Completed work binding could not be read", error) }
      try {
        const base = ["actor", "project_id", "candidate", "parked_decision", "completed_work_binding", "revision", "revision_history"]
        const underOption = exactKeys(record, [...base, "parked_decision_response"])
        if (underOption === exactKeys(record, [...base, "assumption"])) throw new Error("Completed work envelope is not canonical")
        if (record.actor !== "MAIN" || record.project_id !== binding.project_id
          || record.revision !== 1 || !Array.isArray(record.revision_history) || record.revision_history.length !== 0) {
          throw new Error("Completed work envelope is not canonical")
        }
        if (id !== record.completed_work_binding?.binding_id) throw new Error("Binding identity mismatch")
        // The envelope's project is not the binding's: pin the derived one too, or a record whose candidate
        // belongs to another project reads back as ours.
        if (record.completed_work_binding.project_id !== binding.project_id) throw new Error("Binding project mismatch")
        return frozen(structuredClone(assertCompletedWorkBinding(record.completed_work_binding, {
          candidate: record.candidate, parked_decision: record.parked_decision,
          ...(underOption ? { parked_decision_response: record.parked_decision_response } : { assumption: record.assumption }),
        })))
      } catch (error) { fail("CT_WORK_BINDING_INVALID", "Persisted completed work binding is invalid", error) }
    },
    readParking(id) { return frozen(parse(parkingPath(id))) },
    readParkedCheckpointBinding(id) {
      const path = parkingPath(id)
      if (!existsSync(path)) fail("CT_PARKING_BINDING_NOT_FOUND", "Parked checkpoint binding does not exist")
      try {
        const record = parse(path)
        if (!exactKeys(record, ["actor", "project_id", "parked_decision", "checkpoint_capture", "reconciled_checkpoint", "parked_checkpoint_binding", "revision", "revision_history"])
          || record.actor !== "MAIN" || record.project_id !== binding.project_id
          || record.revision !== 1 || !Array.isArray(record.revision_history) || record.revision_history.length !== 0) {
          throw new Error("Parking envelope is not canonical")
        }
        const parked = validate("parkedDecision", record.parked_decision)
        const capture = validate("checkpointCapture", record.checkpoint_capture)
        const reconciliation = validate("reconciledCheckpoint", record.reconciled_checkpoint)
        validateCheckpointProvenancePair(capture, reconciliation)
        if (capture.project_id !== binding.project_id || id !== parked.parked_decision_id || id !== record.parked_checkpoint_binding?.parked_decision_id) throw new Error("Binding identity mismatch")
        return frozen(structuredClone(assertParkedCheckpointBinding(record.parked_checkpoint_binding, {
          parked_decision: parked, checkpoint_capture: capture, reconciled_checkpoint: reconciliation,
        })))
      } catch (error) { fail("CT_PARKING_BINDING_INVALID", "Persisted parked checkpoint binding is invalid", error) }
    },
    persistReport(input) {
      if (!input?.artifact_ref || typeof input.artifact_ref !== "object") fail("CT_STORE_INVALID", "Opaque ArtifactRef is required")
      return commit("reports", input.artifact_ref.artifact_id, input)
    },
    persistCampaign(input) { return commit("campaigns", input.campaign_id, input) },
    persistSupportProposal(input) {
      assertMain(input)
      const { actor, expected_revision: _ignored, ...record } = input ?? {}
      assertSupportPayload(record)
      let proposal
      try { proposal = validate("supportProposal", record) }
      catch (error) { fail("CT_STORE_INVALID", "Support proposal does not satisfy support-proposal-v1", error) }
      const replay = () => {
        const current = parse(supportProposalPath(proposal.proposal_id))
        const { actor: _actor, revision: _revision, revision_history: _history, ...prior } = current
        if (JSON.stringify(prior) !== JSON.stringify(proposal)) fail("CT_STORE_INVALID", "Support proposal conflicts")
        return frozen({ ...current, replayed: true })
      }
      if (existsSync(supportProposalPath(proposal.proposal_id))) return replay()
      try {
        return frozen({ ...commit("support-proposals", proposal.proposal_id, { ...proposal, actor, expected_revision: 0 }, 0), replayed: false })
      } catch (error) {
        if (error.code === "CT_CAS_MISMATCH" && existsSync(supportProposalPath(proposal.proposal_id))) return replay()
        throw error
      }
    },
    createAuthorization(input) {
      // The record is validated against authorization-v1 rather than an ad-hoc
      // required list. A hand-maintained list beside a canonical schema is how
      // the two drifted apart in the first place; this makes that impossible.
      const { actor, expected_revision: _ignored, ...record } = input ?? {}
      let authorization
      try { authorization = validate("authorization", { ...record, state: "PENDING" }) }
      catch (error) { fail("CT_AUTH_INVALID", "Authorization does not satisfy authorization-v1", error) }
      if (authorization.registry_revision !== binding.revision) fail("CT_AUTH_INVALID", "Authorization revision mismatch")
      const createdAt = Date.parse(authorization.created_at), expiresAt = Date.parse(authorization.expires_at)
      if (!digest(authorization.extensions?.["control-tower/candidate-revision"]) || !Number.isFinite(createdAt) || !Number.isFinite(expiresAt) || expiresAt <= createdAt || expiresAt > createdAt + 3_600_000) fail("CT_AUTH_INVALID", "Authorization lifetime or candidate binding is invalid")
      return commit("authorizations", authorization.authorization_id, { ...authorization, actor, expected_revision: 0 }, 0)
    },
    consumeAuthorization(input) {
      assertMain({ ...input, project_id: binding.project_id })
      if (!TERMINAL_STATES.has(input.decision)) fail("CT_AUTH_INVALID", "Invalid terminal decision")
      const pair = responsePair(input), path = authorizationPath(input.authorization_id)
      if (!existsSync(path)) fail("CT_AUTH_INVALID", "Unknown authorization")
      const located = parse(path)
      return withLock(jornadaPath(located.jornada_id), () => {
        const current = parse(path)
        let anchor = current, replay = false
        if (current.state !== "PENDING") {
          if (!pair || !current.terminal_audit?.parked_decision_response) fail("CT_AUTH_TERMINAL", "Authorization is terminal")
          const predecessor = current.revision_history?.at(-1), audit = current.terminal_audit
          if (!predecessor || predecessor.state !== "PENDING" || current.revision !== predecessor.revision + 1 || audit.authorization_revision !== predecessor.revision || audit.authorization_id !== current.authorization_id) fail("CT_AUTH_INVALID", "Terminal authorization predecessor is incoherent")
          anchor = predecessor; replay = true
        }
        if (pair || replay) authorizationRecord(anchor)
        if (replay && canonicalize([current.project_id, current.registry_revision, current.extensions?.["control-tower/candidate-revision"], current.extensions?.["control-tower/decision-origin"], current.extensions?.["control-tower/decision-target"]]) !== canonicalize([anchor.project_id, anchor.registry_revision, anchor.extensions?.["control-tower/candidate-revision"], anchor.extensions?.["control-tower/decision-origin"], anchor.extensions?.["control-tower/decision-target"]])) fail("CT_AUTH_INVALID", "Terminal authorization context is incoherent")
        if (anchor.authorization_id !== input.authorization_id) fail("CT_AUTH_INVALID", "Authorization identity does not match")
        if (anchor.project_id !== binding.project_id || anchor.registry_revision !== binding.revision) fail("CT_AUTH_INVALID", "Authorization binding is stale")
        if (!digest(input.candidate_revision) || input.candidate_revision !== anchor.extensions?.["control-tower/candidate-revision"]) fail("CT_AUTH_INVALID", "Authorization candidate does not match")
        if (input.expected_revision !== anchor.revision) fail("CT_CAS_MISMATCH", "Authorization revision changed")
        if (pair) {
          equalBinding("authorization_id", anchor.authorization_id, pair.response.authorization_id)
          equalBinding("authorization_revision", anchor.revision, pair.response.authorization_revision)
          const origin = anchor.extensions?.["control-tower/decision-origin"], target = anchor.extensions?.["control-tower/decision-target"]
          if (origin === undefined) bindingError("origin", null, pair.parked.origin)
          if (target === undefined) bindingError("decision_target", null, pair.parked.question)
          equalBinding("origin", origin, pair.parked.origin)
          equalBinding("decision_target", target, pair.parked.question)
          if (pair.digestDrift) bindingError("response_digest", pair.digestDrift.expected, pair.digestDrift.actual)
        }
        if (replay) {
          const persisted = current.terminal_audit.parked_decision_response
          if (current.state !== input.decision || current.terminal_audit.decision !== input.decision || persisted.response_digest !== pair.response.response_digest || canonicalize(persisted) !== pair.bytes) fail("CT_AUTH_RESPONSE_REPLAY_DIVERGENT", "Terminal response replay diverges")
          return frozen({ ...structuredClone(current), replayed: true })
        }
        const expiresAt = Date.parse(anchor.expires_at)
        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) fail("CT_AUTH_EXPIRED", "Authorization has expired")
        let jornada
        try { jornada = this.readJornada(anchor.jornada_id) }
        catch (error) { fail("CT_JORNADA_INVALID", "Authorization Jornada is unavailable", error) }
        if (jornada.state !== "AC" + "TIVE" || jornada.jornada_revision !== anchor.jornada_revision) fail("CT_AUTH_INVALID", "Authorization Jornada is not active at its bound revision")
        const audit = Object.freeze({ kind: "authorization-terminal", authorization_id: input.authorization_id, authorization_revision: anchor.revision, decision: input.decision, project_id: binding.project_id, ...(pair && { parked_decision_origin: pair.parked.origin, parked_decision_response: pair.response }) })
        return commit("authorizations", input.authorization_id, { actor: "MAIN", ...current, state: input.decision, terminal_audit: audit, audit_ref: { kind: audit.kind, record_path: path }, expected_revision: anchor.revision }, anchor.revision)
      })
    },
    admitCandidateEffect(input) {
      assertMain(input)
      const authorization = approvedAuthorizationFor(input.authorization_id, input.candidate_revision)
      return withLock(jornadaPath(authorization.jornada_id), () => {
        const expiresAt = Date.parse(authorization.expires_at)
        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) fail("CT_AUTH_EXPIRED", "Authorization has expired")
        let jornada
        try { jornada = this.readJornada(authorization.jornada_id) }
        catch (error) { fail("CT_JORNADA_INVALID", "Authorization Jornada is unavailable", error) }
        if (jornada.state !== "AC" + "TIVE" || jornada.jornada_revision !== authorization.jornada_revision) fail("CT_AUTH_INVALID", "Authorization Jornada is not active at its bound revision")

        const id = input.candidate_revision.slice(7)
        const path = join(directory("candidate-effects"), `${id}.json`)
        if (existsSync(path)) return frozen({ ...parse(path), admitted: false })
        try {
          return frozen({ ...commit("candidate-effects", id, {
            actor: "MAIN", project_id: binding.project_id, authorization_id: authorization.authorization_id,
            candidate_revision: input.candidate_revision, expected_revision: 0,
          }, 0), admitted: true })
        } catch (error) {
          if (error.code === "CT_CAS_MISMATCH" && existsSync(path)) return frozen({ ...parse(path), admitted: false })
          throw error
        }
      })
    },
    issueLaunchBinding(input) {
      const keys = ["actor", "project_id", "request_ref", "authorization_id", "brief", "brief_ref", "assignment_ref", "candidate_revision", "host_epoch"]
      if (!exactKeys(input, keys) || !safeRef(input.brief) || !safeRef(input.brief_ref) || !safeRef(input.assignment_ref)
        || !digest(input.candidate_revision) || !Number.isSafeInteger(input.host_epoch) || input.host_epoch < 1) {
        fail("CT_LAUNCH_BINDING_INVALID", "Launch binding input is invalid")
      }
      assertMain(input)
      const authorization = approvedAuthorizationFor(input.authorization_id, input.candidate_revision)
      return withLock(jornadaPath(authorization.jornada_id), () => {
        const jornada = activeLaunchJornada(authorization)
        const path = launchBindingPath(input.request_ref)
        if (existsSync(path)) fail("CT_LAUNCH_BINDING_IMMUTABLE", "Launch binding already exists")
        const locationPath = assignmentLocationPath(input.assignment_ref)
        if (!existsSync(locationPath)) fail("CT_ASSIGNMENT_LOCATION_MISSING", "Assignment location is unavailable")
        const location = parse(locationPath)
        if (!exactKeys(location, ["assignment_ref", "fence_path", "project_id", "worktree"])
          || location.assignment_ref !== input.assignment_ref || location.project_id !== binding.project_id
          || !isAbsolute(location.worktree) || resolve(location.worktree) !== location.worktree
          || !isAbsolute(location.fence_path) || resolve(location.fence_path) !== location.fence_path) {
          fail("CT_ASSIGNMENT_LOCATION_INVALID", "Assignment location is invalid")
        }
        const { actor: _actor, ...record } = input
        const bindingRecord = {
          ...record,
          worktree: location.worktree,
          fence_path: location.fence_path,
          jornada_id: jornada.jornada_id,
          jornada_revision: jornada.jornada_revision,
          active_epoch: binding.epoch,
        }
        assertLaunchHost(bindingRecord)
        atomicWrite(path, bindingRecord, () => {
          if (existsSync(path)) fail("CT_LAUNCH_BINDING_IMMUTABLE", "Launch binding already exists")
          activeLaunchJornada(authorization)
          assertLaunchHost(bindingRecord)
        })
        return frozen({ ...structuredClone(bindingRecord), record_path: path })
      })
    },
    registerAssignmentLocation(input) {
      const keys = ["actor", "project_id", "assignment_ref", "worktree", "fence_path"]
      if (!exactKeys(input, keys) || !safeRef(input.assignment_ref) || !isAbsolute(input.worktree) || resolve(input.worktree) !== input.worktree
        || !isAbsolute(input.fence_path) || resolve(input.fence_path) !== input.fence_path) {
        fail("CT_ASSIGNMENT_LOCATION_INVALID", "Assignment location input is invalid")
      }
      assertMain(input)
      const path = assignmentLocationPath(input.assignment_ref)
      if (existsSync(path)) fail("CT_ASSIGNMENT_LOCATION_IMMUTABLE", "Assignment location already exists")
      const { actor: _actor, ...record } = input
      atomicWrite(path, record, () => {
        if (existsSync(path)) fail("CT_ASSIGNMENT_LOCATION_IMMUTABLE", "Assignment location already exists")
      })
      return frozen(structuredClone(record))
    },
    consumeLaunchBinding(requestRef) {
      const path = launchBindingPath(requestRef), consumption = launchConsumptionPath(requestRef)
      if (!existsSync(path)) fail("CT_LAUNCH_BINDING_INVALID", "Launch binding is unavailable")
      const record = parse(path)
      const keys = ["request_ref", "authorization_id", "brief", "brief_ref", "assignment_ref", "worktree", "candidate_revision", "host_epoch", "fence_path", "project_id", "jornada_id", "jornada_revision", "active_epoch"]
      if (!exactKeys(record, keys) || record.request_ref !== requestRef || record.project_id !== binding.project_id || record.active_epoch !== binding.epoch) fail("CT_LAUNCH_BINDING_STALE", "Launch binding is stale")
      return withLock(jornadaPath(record.jornada_id), () => {
        const authorization = approvedAuthorizationFor(record.authorization_id, record.candidate_revision)
        if (authorization.jornada_id !== record.jornada_id || authorization.jornada_revision !== record.jornada_revision) fail("CT_LAUNCH_BINDING_STALE", "Launch binding authorization drifted")
        activeLaunchJornada(authorization)
        assertLaunchHost(record)
        if (existsSync(consumption)) fail("CT_LAUNCH_BINDING_CONSUMED", "Launch binding was already consumed")
        atomicWrite(consumption, { request_ref: requestRef, binding_path: path }, () => {
          if (existsSync(consumption)) fail("CT_LAUNCH_BINDING_CONSUMED", "Launch binding was already consumed")
        })
        return frozen({ assignment_ref: record.assignment_ref, brief: record.brief, brief_ref: record.brief_ref, candidate_revision: record.candidate_revision, fence_path: record.fence_path, host_epoch: record.host_epoch, project_id: record.project_id, worktree: record.worktree })
      })
    },
    recordHandoffCoordinate(input) {
      if (typeof input?.module_id !== "string" || input.module_id.length === 0) fail("CT_STORE_INVALID", "Module coordinate is required")
      return commit("handoff-coordinates", input.handoff_id, input, 0)
    },
    readHandoffCoordinate(id) { return frozen(parse(handoffCoordinatePath(id))) },
    recordWorkerClaim(input) {
      assertMain(input)
      if (input?.expected_claim !== input?.actual_claim) fail("CT_CLAIM_MISMATCH", `Worker claim mismatch: expected ${input?.expected_claim}, actual ${input?.actual_claim}`)
      const replay = () => {
        const current = parse(workerClaimPath(input.handoff_id))
        if (current.project_id !== binding.project_id || current.expected_claim !== input.expected_claim || current.actual_claim !== input.actual_claim) fail("CT_CLAIM_MISMATCH", "Worker claim evidence conflicts")
        return frozen({ ...current, replayed: true })
      }
      if (existsSync(workerClaimPath(input.handoff_id))) return replay()
      try {
        return frozen({ ...commit("worker-claims", input.handoff_id, { ...input, expected_revision: 0 }, 0), replayed: false })
      } catch (error) {
        if (error.code === "CT_CAS_MISMATCH" && existsSync(workerClaimPath(input.handoff_id))) return replay()
        throw error
      }
    },
    readAuthorization(id) { return frozen(parse(authorizationPath(id))) },
    createJornada(input) {
      // jornada-v1 is the canonical record shape; do not duplicate its fields here.
      const { actor, expected_revision: _ignored, ...record } = input ?? {}
      let jornada
      try { jornada = validate("jornada", record) }
      catch (error) { fail("CT_JORNADA_INVALID", "Jornada does not satisfy jornada-v1", error) }
      if (jornada.state !== "DRAFT") fail("CT_JORNADA_INVALID", "Jornada must start in DRAFT")
      if (jornada.registry_revision !== binding.revision) fail("CT_JORNADA_INVALID", "Jornada revision mismatch")
      return commit("jornadas", jornada.jornada_id, { ...jornada, actor, expected_revision: 0 }, 0)
    },
    readJornada(id) { return frozen(resolveJornadaLifecycle(parse(jornadaPath(id)))) },
    transitionJornada(input) {
      assertMain(input)
      const path = jornadaPath(input.jornada_id)
      if (!existsSync(path)) fail("CT_JORNADA_INVALID", "Unknown Jornada")
      const current = parse(path)
      if (input.expected_revision !== current.revision) fail("CT_CAS_MISMATCH", "Jornada revision changed")
      const next = resolveJornadaLifecycle(current, { state: input.state })
      const { actor: _actor, revision: _revision, revision_history: _history, ...record } = next
      let jornada
      try { jornada = validate("jornada", record) }
      catch (error) { fail("CT_JORNADA_INVALID", "Jornada transition does not satisfy jornada-v1", error) }
      return commit("jornadas", jornada.jornada_id, { ...jornada, actor: "MAIN", expected_revision: current.revision }, current.revision)
    },
  })
}
