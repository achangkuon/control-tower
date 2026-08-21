import * as nodeFs from "node:fs"
import { createHash } from "node:crypto"
import { isAbsolute, join, parse, resolve, sep } from "node:path"

import { canonicalize } from "../contracts/canonicalize.mjs"
import { candidateRevision } from "../contracts/candidate-revision.mjs"
import { validate } from "../contracts/validate.mjs"

const EVENT_NAME = /^(\d{20})-([a-f0-9]{64})\.json$/
const LOCK_NAME = ".candidate-fence.lock"
const VIEW_NAME = "candidate-fence.view.json"
const EVENT_KEYS = ["schema", "schema_version", "event", "exclusivity", "host_epoch", "previous_event_digest", "project_id", "candidate", "predecessor", "termination_proof_ref", "maintainer_decision_ref", "frozen_work"]
const CANDIDATE_KEYS = ["project_id", "candidate_revision", "host_id", "base_sha", "runtime_binding_ref", "role_binding_ref", "assignment_ref", "work_ref"]
const PREDECESSOR_KEYS = ["host_id", "host_epoch", "base_sha", "runtime_binding_ref", "role_binding_ref", "assignment_ref"]
const DECISION_KEYS = ["schema", "schema_version", "status", "decision_ref", "project_id", "predecessor_host_id", "predecessor_host_epoch", "candidate_revision", "candidate_host_id", "base_sha", "runtime_binding_ref", "role_binding_ref", "assignment_ref", "expires_at"]

const fail = (code, message, cause) => { throw Object.assign(new Error(message, { cause }), { code }) }
const own = (stats) => typeof process.getuid !== "function" || stats.uid === process.getuid()
const mode = (stats) => stats.mode & 0o777
const pause = (milliseconds) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds)
const exactKeys = (value, keys) => value && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0")
const deepFreeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}
const cloneFrozen = (value) => deepFreeze(structuredClone(value))
const identifier = (value, label) => {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)) fail("CT_FENCE_INVALID", `${label} is invalid`)
  return value
}
const reference = (value, label) => {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0") || isAbsolute(value) || value.split("/").includes("..")) fail("CT_FENCE_INVALID", `${label} is invalid`)
  return value
}
const gitSha = (value, label) => {
  if (typeof value !== "string" || !/^[a-f0-9]{40,64}$/.test(value)) fail("CT_FENCE_INVALID", `${label} is invalid`)
  return value
}
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex")
const digestRef = (digest) => `sha256:${digest}`
const canonicalBytes = (value) => Buffer.from(`${canonicalize(value)}\n`)

const inspectCandidate = (value) => {
  if (!exactKeys(value, CANDIDATE_KEYS)) fail("CT_FENCE_INVALID", "Candidate shape is invalid")
  const candidate = {
    project_id: identifier(value.project_id, "Project"),
    candidate_revision: /^sha256:[a-f0-9]{64}$/.test(value.candidate_revision ?? "") ? value.candidate_revision : fail("CT_FENCE_INVALID", "Candidate revision is invalid"),
    host_id: identifier(value.host_id, "Host"),
    base_sha: gitSha(value.base_sha, "Base SHA"),
    runtime_binding_ref: reference(value.runtime_binding_ref, "Runtime binding"),
    role_binding_ref: reference(value.role_binding_ref, "Role binding"),
    assignment_ref: reference(value.assignment_ref, "Assignment"),
    work_ref: reference(value.work_ref, "Work"),
  }
  if (candidate.candidate_revision !== candidateRevision(candidate)) fail("CT_FENCE_INVALID", "Candidate revision does not match candidate identity")
  return candidate
}
const inspectPredecessor = (value) => {
  if (!exactKeys(value, PREDECESSOR_KEYS) || !Number.isInteger(value.host_epoch) || value.host_epoch < 1) fail("CT_OWNERSHIP_UNCERTAIN", "Exact predecessor ownership is required")
  return {
    host_id: identifier(value.host_id, "Predecessor host"), host_epoch: value.host_epoch,
    base_sha: gitSha(value.base_sha, "Predecessor base SHA"),
    runtime_binding_ref: reference(value.runtime_binding_ref, "Predecessor runtime binding"),
    role_binding_ref: reference(value.role_binding_ref, "Predecessor role binding"),
    assignment_ref: reference(value.assignment_ref, "Predecessor assignment"),
  }
}
const assertPredecessor = (active, input) => {
  const predecessor = inspectPredecessor(input)
  const current = active.candidate
  if (predecessor.host_epoch !== active.host_epoch) fail("CT_OWNERSHIP_UNCERTAIN", "Predecessor epoch does not match current ownership")
  if (predecessor.host_id !== current.host_id) fail("CT_HOST_DRIFT", "Predecessor host drift")
  if (predecessor.base_sha !== current.base_sha) fail("CT_BASE_DRIFT", "Predecessor base drift")
  if (predecessor.runtime_binding_ref !== current.runtime_binding_ref) fail("CT_RUNTIME_DRIFT", "Predecessor runtime binding drift")
  if (predecessor.role_binding_ref !== current.role_binding_ref) fail("CT_ROLE_DRIFT", "Predecessor role binding drift")
  if (predecessor.assignment_ref !== current.assignment_ref) fail("CT_OWNERSHIP_UNCERTAIN", "Predecessor assignment drift")
  return predecessor
}
const assertDifferentHost = (active, candidate) => {
  if (active.candidate.host_id === candidate.host_id) fail("CT_HOST_DRIFT", "New activation must use a different host")
}
const frozenWorkFor = (events, baseSha) => events.find((event) => event.frozen_work?.base_sha === baseSha)?.frozen_work
const assertUsableBase = (events, baseSha) => {
  const frozen = frozenWorkFor(events, baseSha)
  if (frozen) fail("CT_FROZEN_WORK_UNRESOLVED", `Base carries frozen work ${frozen.work_ref}`)
}
const assertExactPredecessorChain = (predecessor, previous) => {
  const prior = previous.candidate
  if (predecessor.host_epoch !== previous.host_epoch || predecessor.host_id !== prior.host_id || predecessor.base_sha !== prior.base_sha
    || predecessor.runtime_binding_ref !== prior.runtime_binding_ref || predecessor.role_binding_ref !== prior.role_binding_ref
    || predecessor.assignment_ref !== prior.assignment_ref) fail("CT_FENCE_TAMPERED", "Fence predecessor chain is invalid")
}
const assertEvent = (event, epoch, previous, previousDigest) => {
  if (!exactKeys(event, EVENT_KEYS) || event.schema !== "candidate-fence-event" || event.schema_version !== 1
    || event.host_epoch !== epoch || event.previous_event_digest !== (previousDigest === null ? null : digestRef(previousDigest))
    || !["HOST_ADMITTED", "TAKEOVER_FORCED"].includes(event.event)) fail("CT_FENCE_TAMPERED", "Fence event shape or digest chain is invalid")
  const candidate = inspectCandidate(event.candidate)
  if (event.project_id !== candidate.project_id) fail("CT_FENCE_TAMPERED", "Fence event project is invalid")
  if (previous === null) {
    if (event.event !== "HOST_ADMITTED" || event.exclusivity !== "VERIFIED" || event.predecessor !== null
      || event.termination_proof_ref !== null || event.maintainer_decision_ref !== null || event.frozen_work !== null) fail("CT_FENCE_TAMPERED", "Initial fence event is invalid")
    return event
  }
  if (event.project_id !== previous.project_id || candidate.host_id === previous.candidate.host_id) fail("CT_FENCE_TAMPERED", "Fence project or host chain is invalid")
  const predecessor = inspectPredecessor(event.predecessor)
  assertExactPredecessorChain(predecessor, previous)
  if (event.event === "HOST_ADMITTED") {
    if (event.exclusivity !== "VERIFIED" || event.frozen_work !== null || event.maintainer_decision_ref !== null) fail("CT_FENCE_TAMPERED", "Verified admission evidence is invalid")
    reference(event.termination_proof_ref, "Termination proof")
  } else {
    if (event.exclusivity !== "BROKEN" || event.termination_proof_ref !== null) fail("CT_FENCE_TAMPERED", "Forced takeover evidence is invalid")
    reference(event.maintainer_decision_ref, "Maintainer decision")
    const prior = previous.candidate
    if (!exactKeys(event.frozen_work, ["state", "candidate_revision", "base_sha", "work_ref"]) || event.frozen_work.state !== "FROZEN"
      || event.frozen_work.candidate_revision !== prior.candidate_revision || event.frozen_work.base_sha !== prior.base_sha || event.frozen_work.work_ref !== prior.work_ref) {
      fail("CT_FENCE_TAMPERED", "Forced takeover did not freeze prior work")
    }
  }
  return event
}

export const createCandidateFenceStore = ({ rootPath, fs = nodeFs, lockTimeoutMs = 5_000, resolveTerminationProof, authorizeMaintainerDecision } = {}) => {
  if (!isAbsolute(rootPath ?? "") || rootPath.includes("\0") || resolve(rootPath) !== rootPath) fail("CT_FENCE_UNSAFE", "Trusted fence root must be an absolute canonical path")
  if (!Number.isInteger(lockTimeoutMs) || lockTimeoutMs < 0) fail("CT_FENCE_INVALID", "Fence lock timeout is invalid")
  if (typeof resolveTerminationProof !== "function" || typeof authorizeMaintainerDecision !== "function") fail("CT_FENCE_PORT_REQUIRED", "Canonical proof and maintainer-decision ports are required")
  const lockPath = join(rootPath, LOCK_NAME)
  const unsafe = (message, cause) => fail("CT_FENCE_UNSAFE", message, cause)
  const readFailed = (message, cause) => fail("CT_FENCE_READ_FAILED", message, cause)
  const assertOwnerFile = (stats, label) => {
    if (!stats.isFile() || stats.isSymbolicLink() || !own(stats) || mode(stats) !== 0o600 || stats.nlink !== 1) unsafe(`${label} is unsafe`)
  }
  const assertRoot = () => {
    const parsed = parse(rootPath)
    let cursor = parsed.root
    for (const component of rootPath.slice(parsed.root.length).split(sep).filter(Boolean)) {
      cursor = join(cursor, component)
      let stats
      try { stats = fs.lstatSync(cursor) } catch (error) { unsafe("Trusted fence root must pre-exist", error) }
      if (stats.isSymbolicLink()) unsafe("Trusted fence root contains a symlink component")
    }
    let stats
    try { stats = fs.lstatSync(rootPath) } catch (error) { unsafe("Trusted fence root must pre-exist", error) }
    if (!stats.isDirectory() || stats.isSymbolicLink() || !own(stats) || mode(stats) !== 0o700) unsafe("Trusted fence root must be an owner-only directory")
    let real
    try { real = fs.realpathSync(rootPath) } catch (error) { unsafe("Trusted fence root cannot be resolved", error) }
    if (real !== rootPath) unsafe("Trusted fence root is not canonical")
    return stats
  }
  const inspectNamedFile = (path, label, { read = false } = {}) => {
    let descriptor
    try {
      descriptor = fs.openSync(path, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW)
      assertOwnerFile(fs.fstatSync(descriptor), label)
      return read ? fs.readFileSync(descriptor) : null
    } catch (error) {
      if (error?.code?.startsWith("CT_")) throw error
      unsafe(`${label} cannot be opened safely`, error)
    } finally { if (descriptor !== undefined) try { fs.closeSync(descriptor) } catch (error) { readFailed(`${label} descriptor close failed`, error) } }
  }
  const scan = () => {
    assertRoot()
    let names
    try { names = fs.readdirSync(rootPath) } catch (error) { readFailed("Fence journal scan failed", error) }
    const byEpoch = new Map()
    for (const name of names) {
      const path = join(rootPath, name)
      if (name === LOCK_NAME || name === VIEW_NAME) { inspectNamedFile(path, name === LOCK_NAME ? "Fence lock" : "Fence view"); continue }
      const match = EVENT_NAME.exec(name)
      if (!match) fail("CT_FENCE_TAMPERED", `Unexpected fence journal entry: ${name}`)
      const epoch = Number(match[1]), bytes = inspectNamedFile(path, "Fence event", { read: true })
      const computed = sha256(bytes)
      if (computed !== match[2]) fail("CT_FENCE_TAMPERED", "Fence event filename digest does not match bytes")
      let event
      try { event = JSON.parse(bytes.toString("utf8")) } catch (error) { fail("CT_FENCE_TAMPERED", "Fence event JSON is invalid", error) }
      if (!bytes.equals(canonicalBytes(event))) fail("CT_FENCE_TAMPERED", "Fence event bytes are not canonical")
      const values = byEpoch.get(epoch) ?? []
      values.push({ event, digest: computed }); byEpoch.set(epoch, values)
    }
    for (const values of byEpoch.values()) if (values.length !== 1) fail("CT_FENCE_DUPLICATE_EPOCH", "Fence journal contains a duplicate epoch")
    if (byEpoch.size === 0) return { view: null, fingerprint: "empty" }
    const epochs = [...byEpoch.keys()].sort((left, right) => left - right)
    for (const [index, epoch] of epochs.entries()) if (epoch !== index + 1) fail("CT_FENCE_GAP", "Fence journal contains an epoch gap")
    const events = [], digests = []
    for (const epoch of epochs) {
      const { event, digest } = byEpoch.get(epoch)[0]
      try { assertEvent(event, epoch, events.at(-1) ?? null, digests.at(-1) ?? null) }
      catch (error) {
        if (error?.code === "CT_FENCE_TAMPERED") throw error
        fail("CT_FENCE_TAMPERED", "Fence event content is invalid", error)
      }
      events.push(event); digests.push(digest)
    }
    const view = { schema: "candidate-fence-journal", schema_version: 1, project_id: events[0].project_id, revision: events.length, events }
    return { view, fingerprint: digests.join("\0") }
  }
  const inspectExistingLock = () => {
    let stats
    try { stats = fs.lstatSync(lockPath) } catch (error) {
      if (error?.code === "ENOENT") return false
      unsafe("Fence lock inspection failed", error)
    }
    assertOwnerFile(stats, "Fence lock")
    return true
  }
  const removeOwnedLock = (identity) => {
    try {
      const stats = fs.lstatSync(lockPath)
      if (stats.dev === identity.dev && stats.ino === identity.ino && stats.isFile() && !stats.isSymbolicLink() && own(stats) && mode(stats) === 0o600 && stats.nlink === 1) fs.rmSync(lockPath)
    } catch (error) { if (error?.code !== "ENOENT") throw error }
  }
  const acquireLock = () => {
    const deadline = Date.now() + lockTimeoutMs
    while (true) {
      let descriptor
      try {
        descriptor = fs.openSync(lockPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW, 0o600)
        fs.fchmodSync(descriptor, 0o600)
        const stats = fs.fstatSync(descriptor)
        assertOwnerFile(stats, "Fence lock")
        return { descriptor, identity: { dev: stats.dev, ino: stats.ino } }
      } catch (error) {
        if (descriptor !== undefined) {
          let identity
          try { const stats = fs.fstatSync(descriptor); identity = { dev: stats.dev, ino: stats.ino } } catch {}
          try { fs.closeSync(descriptor) } catch {}
          if (identity) try { removeOwnedLock(identity) } catch {}
        }
        if (error?.code === "EEXIST") {
          inspectExistingLock()
          if (Date.now() >= deadline) fail("CT_FENCE_BUSY", "Candidate fence is busy")
          pause(Math.min(2, Math.max(1, deadline - Date.now())))
          continue
        }
        if (error?.code?.startsWith("CT_")) throw error
        fail("CT_FENCE_WRITE_FAILED", "Fence lock acquisition failed", error)
      }
    }
  }
  const releaseLock = ({ descriptor, identity }) => {
    try { fs.closeSync(descriptor) } catch {}
    try { removeOwnedLock(identity) } catch (error) { fail("CT_FENCE_WRITE_FAILED", "Owned fence lock cleanup failed", error) }
  }
  const syncRoot = (rootStats) => {
    let descriptor
    try {
      descriptor = fs.openSync(rootPath, fs.constants.O_RDONLY | (fs.constants.O_DIRECTORY ?? 0) | fs.constants.O_NOFOLLOW)
      const stats = fs.fstatSync(descriptor)
      if (!stats.isDirectory() || !own(stats) || mode(stats) !== 0o700 || stats.dev !== rootStats.dev || stats.ino !== rootStats.ino) unsafe("Opened fence root is unsafe")
      fs.fsyncSync(descriptor)
      fs.closeSync(descriptor); descriptor = undefined
    } finally { if (descriptor !== undefined) fs.closeSync(descriptor) }
  }
  const publish = (event) => {
    const bytes = canonicalBytes(event), digest = sha256(bytes)
    const finalPath = join(rootPath, `${String(event.host_epoch).padStart(20, "0")}-${digest}.json`)
    let descriptor, created = false
    try {
      descriptor = fs.openSync(finalPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW, 0o600)
      created = true
      fs.fchmodSync(descriptor, 0o600)
      assertOwnerFile(fs.fstatSync(descriptor), "Fence event")
      fs.writeFileSync(descriptor, bytes)
      fs.fsyncSync(descriptor)
      fs.closeSync(descriptor); descriptor = undefined
      syncRoot(assertRoot())
      return digest
    } catch (error) {
      if (descriptor !== undefined) try { fs.closeSync(descriptor) } catch {}
      if (created) fail("CT_FENCE_DURABILITY_UNKNOWN", "Fence event durability is unknown; perform exact readback before any retry", error)
      if (error?.code === "EEXIST") fail("CT_CAS_MISMATCH", "Fence epoch was already published", error)
      if (error?.code?.startsWith("CT_")) throw error
      fail("CT_FENCE_WRITE_FAILED", "Fence event create failed", error)
    }
  }
  const resolveProof = (proofRef, active) => {
    const requested = reference(proofRef, "Termination proof")
    let value
    try { value = resolveTerminationProof(requested) } catch (error) { fail("CT_STOP_PROOF_REQUIRED", "Canonical termination proof could not be resolved", error) }
    if (!value || typeof value !== "object" || typeof value.then === "function" || value.status === "AMBIGUOUS") fail("CT_STOP_PROOF_REQUIRED", "Canonical positive termination proof is required")
    let proof
    try { proof = validate("recoveryProof", value) } catch (error) { fail("CT_STOP_PROOF_INVALID", "Canonical termination proof is invalid", error) }
    if (proof.proof_id !== requested || proof.project_id !== active.project_id || proof.old_assignment_ref !== active.assignment_ref) fail("CT_STOP_PROOF_INVALID", "Termination proof provenance or ownership does not match")
    if (proof.base_sha !== active.base_sha) fail("CT_BASE_DRIFT", "Termination proof base drift")
    if (proof.runtime_binding_ref !== active.runtime_binding_ref) fail("CT_RUNTIME_DRIFT", "Termination proof runtime binding drift")
    if (proof.role_binding_ref !== active.role_binding_ref) fail("CT_ROLE_DRIFT", "Termination proof role binding drift")
    return requested
  }
  const resolveDecision = (decisionRef, predecessor, candidate) => {
    const requested = reference(decisionRef, "Maintainer decision")
    let value
    try { value = authorizeMaintainerDecision(requested) } catch (error) { fail("CT_MAINTAINER_REQUIRED", "Human takeover decision could not be authorized", error) }
    if (!exactKeys(value, DECISION_KEYS) || value.schema !== "candidate-fence-decision" || value.schema_version !== 1 || value.status !== "APPROVED" || value.decision_ref !== requested) fail("CT_MAINTAINER_REQUIRED", "Current approved human takeover decision is required")
    if (!Number.isFinite(Date.parse(value.expires_at)) || Date.parse(value.expires_at) <= Date.now()) fail("CT_MAINTAINER_DECISION_INVALID", "Human takeover decision is expired")
    if (value.project_id !== candidate.project_id || value.predecessor_host_id !== predecessor.host_id || value.predecessor_host_epoch !== predecessor.host_epoch
      || value.candidate_revision !== candidate.candidate_revision || value.candidate_host_id !== candidate.host_id) fail("CT_MAINTAINER_DECISION_INVALID", "Human takeover decision ownership does not match")
    if (value.base_sha !== candidate.base_sha) fail("CT_BASE_DRIFT", "Human takeover decision base drift")
    if (value.runtime_binding_ref !== candidate.runtime_binding_ref) fail("CT_RUNTIME_DRIFT", "Human takeover decision runtime drift")
    if (value.role_binding_ref !== candidate.role_binding_ref) fail("CT_ROLE_DRIFT", "Human takeover decision role drift")
    if (value.assignment_ref !== candidate.assignment_ref) fail("CT_OWNERSHIP_UNCERTAIN", "Human takeover decision assignment drift")
    return requested
  }
  const transact = (expectedRevision, build) => {
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) fail("CT_CAS_MISMATCH", "Expected journal revision is invalid")
    assertRoot()
    const lock = acquireLock()
    try {
      const current = scan()
      if ((current.view?.revision ?? 0) !== expectedRevision) fail("CT_CAS_MISMATCH", "Fence journal revision changed")
      const event = build(current.view)
      const revalidated = scan()
      if (revalidated.fingerprint !== current.fingerprint || (revalidated.view?.revision ?? 0) !== expectedRevision) fail("CT_CAS_MISMATCH", "Fence journal changed before publish")
      publish(event)
      return cloneFrozen(scan().view)
    } finally { releaseLock(lock) }
  }
  const initialEvent = (candidate) => ({
    schema: "candidate-fence-event", schema_version: 1, event: "HOST_ADMITTED", exclusivity: "VERIFIED",
    host_epoch: 1, previous_event_digest: null, project_id: candidate.project_id, candidate,
    predecessor: null, termination_proof_ref: null, maintainer_decision_ref: null, frozen_work: null,
  })
  const nextEvent = (current, candidate, predecessor, evidence) => {
    const previousName = fs.readdirSync(rootPath).find((name) => name.startsWith(`${String(current.revision).padStart(20, "0")}-`) && EVENT_NAME.test(name))
    if (!previousName) fail("CT_FENCE_TAMPERED", "Current epoch event is missing")
    return {
      schema: "candidate-fence-event", schema_version: 1, host_epoch: current.revision + 1,
      previous_event_digest: digestRef(EVENT_NAME.exec(previousName)[2]), project_id: candidate.project_id,
      candidate, predecessor, ...evidence,
    }
  }

  assertRoot()
  return Object.freeze({
    read() {
      const current = scan().view
      return current === null ? null : cloneFrozen(current)
    },
    assertExactCurrent(input = {}) {
      if (!exactKeys(input, ["project_id", "assignment_ref", "candidate_revision", "host_epoch"])
        || !Number.isSafeInteger(input.host_epoch) || input.host_epoch < 1) fail("CT_FENCE_INVALID", "Exact host identity is invalid")
      const project = identifier(input.project_id, "Project"), assignment = reference(input.assignment_ref, "Assignment")
      const revision = /^sha256:[a-f0-9]{64}$/.test(input.candidate_revision ?? "") ? input.candidate_revision : fail("CT_FENCE_INVALID", "Candidate revision is invalid")
      const active = scan().view?.events.at(-1), candidate = active?.candidate
      if (!active || active.host_epoch !== input.host_epoch || active.project_id !== project || candidate.assignment_ref !== assignment || candidate.candidate_revision !== revision) {
        fail("CT_ASSIGNMENT_STALE", "Assignment does not match the current host epoch")
      }
      return true
    },
    admit(input = {}) {
      const initialShape = exactKeys(input, ["candidate", "expectedRevision"])
      const nextShape = exactKeys(input, ["candidate", "predecessor", "terminationProofRef", "expectedRevision"])
      if (!initialShape && !nextShape) fail("CT_FENCE_INVALID", "Operational admission accepts only candidate, predecessor, proof ref, and expected revision")
      const candidate = inspectCandidate(input.candidate)
      return transact(input.expectedRevision, (current) => {
        if (current === null) {
          if (!initialShape) fail("CT_OWNERSHIP_UNCERTAIN", "Initial activation cannot claim predecessor evidence")
          return initialEvent(candidate)
        }
        if (!nextShape || current.project_id !== candidate.project_id) fail("CT_PROJECT_MISMATCH", "Candidate project does not match journal")
        const active = current.events.at(-1), predecessor = assertPredecessor(active, input.predecessor)
        assertDifferentHost(active, candidate); assertUsableBase(current.events, candidate.base_sha)
        const proofRef = resolveProof(input.terminationProofRef, active.candidate)
        return nextEvent(current, candidate, predecessor, {
          event: "HOST_ADMITTED", exclusivity: "VERIFIED", termination_proof_ref: proofRef,
          maintainer_decision_ref: null, frozen_work: null,
        })
      })
    },
    forceTakeover(input = {}) {
      if (!exactKeys(input, ["candidate", "predecessor", "maintainerDecisionRef", "expectedRevision"])) fail("CT_FENCE_INVALID", "Forced takeover accepts only candidate, predecessor, decision ref, and expected revision")
      const candidate = inspectCandidate(input.candidate)
      return transact(input.expectedRevision, (current) => {
        if (current === null || current.project_id !== candidate.project_id) fail("CT_OWNERSHIP_UNCERTAIN", "Current predecessor ownership is required")
        const active = current.events.at(-1), predecessor = assertPredecessor(active, input.predecessor)
        assertDifferentHost(active, candidate); assertUsableBase(current.events, candidate.base_sha)
        const decisionRef = resolveDecision(input.maintainerDecisionRef, predecessor, candidate)
        return nextEvent(current, candidate, predecessor, {
          event: "TAKEOVER_FORCED", exclusivity: "BROKEN", termination_proof_ref: null, maintainer_decision_ref: decisionRef,
          frozen_work: { state: "FROZEN", candidate_revision: active.candidate.candidate_revision, base_sha: active.candidate.base_sha, work_ref: active.candidate.work_ref },
        })
      })
    },
    assertBaseUsable({ projectId, baseSha } = {}) {
      const project = identifier(projectId, "Project"), base = gitSha(baseSha, "Base SHA")
      const current = scan().view
      if (current && current.project_id !== project) fail("CT_PROJECT_MISMATCH", "Foreign project base")
      assertUsableBase(current?.events ?? [], base)
      return true
    },
  })
}
