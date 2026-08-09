import * as nodeFs from "node:fs"
import { randomUUID } from "node:crypto"
import { dirname, isAbsolute, join } from "node:path"

import { canonicalize } from "../contracts/canonicalize.mjs"
import { validate } from "../contracts/validate.mjs"

const fail = (code, message, cause) => { throw Object.assign(new Error(message, { cause }), { code }) }
const own = (stats) => typeof process.getuid !== "function" || stats.uid === process.getuid()
const mode = (stats) => stats.mode & 0o777
const pause = (milliseconds) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds)
const exactKeys = (value, keys) => value && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0")
const freeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child)
    Object.freeze(value)
  }
  return value
}
const id = (value, label) => {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)) fail("CT_FENCE_INVALID", `${label} is invalid`)
  return value
}
const ref = (value, label) => {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0") || isAbsolute(value) || value.split("/").includes("..")) fail("CT_FENCE_INVALID", `${label} is invalid`)
  return value
}
const gitSha = (value, label) => {
  if (typeof value !== "string" || !/^[a-f0-9]{40,64}$/.test(value)) fail("CT_FENCE_INVALID", `${label} is invalid`)
  return value
}
const digest = (value, label) => {
  if (typeof value !== "string" || !/^sha256:[a-f0-9]{64}$/.test(value)) fail("CT_FENCE_INVALID", `${label} is invalid`)
  return value
}

const candidateKeys = ["project_id", "candidate_revision", "host_id", "base_sha", "runtime_binding_ref", "role_binding_ref", "assignment_ref", "work_ref"]
const predecessorKeys = ["host_id", "host_epoch", "base_sha", "runtime_binding_ref", "role_binding_ref", "assignment_ref"]
const eventKeys = ["event", "exclusivity", "host_epoch", "candidate", "predecessor", "termination_proof_ref", "frozen_work", "maintainer_decision_ref"]
const ledgerKeys = ["schema", "schema_version", "project_id", "revision", "events"]

const inspectCandidate = (value) => {
  if (!exactKeys(value, candidateKeys)) fail("CT_FENCE_INVALID", "Candidate shape is invalid")
  return {
    project_id: id(value.project_id, "Project"),
    candidate_revision: digest(value.candidate_revision, "Candidate revision"),
    host_id: id(value.host_id, "Host"),
    base_sha: gitSha(value.base_sha, "Base SHA"),
    runtime_binding_ref: ref(value.runtime_binding_ref, "Runtime binding"),
    role_binding_ref: ref(value.role_binding_ref, "Role binding"),
    assignment_ref: ref(value.assignment_ref, "Assignment"),
    work_ref: ref(value.work_ref, "Work"),
  }
}
const inspectPredecessor = (value) => {
  if (!exactKeys(value, predecessorKeys)) fail("CT_OWNERSHIP_UNCERTAIN", "Exact predecessor ownership is required")
  if (!Number.isInteger(value.host_epoch) || value.host_epoch < 1) fail("CT_OWNERSHIP_UNCERTAIN", "Predecessor host epoch is invalid")
  return {
    host_id: id(value.host_id, "Predecessor host"), host_epoch: value.host_epoch,
    base_sha: gitSha(value.base_sha, "Predecessor base SHA"),
    runtime_binding_ref: ref(value.runtime_binding_ref, "Predecessor runtime binding"),
    role_binding_ref: ref(value.role_binding_ref, "Predecessor role binding"),
    assignment_ref: ref(value.assignment_ref, "Predecessor assignment"),
  }
}
const assertPredecessor = (currentEvent, input) => {
  const predecessor = inspectPredecessor(input)
  const current = currentEvent.candidate
  if (predecessor.host_epoch !== currentEvent.host_epoch) fail("CT_OWNERSHIP_UNCERTAIN", "Predecessor host epoch does not match current ownership")
  if (predecessor.host_id !== current.host_id) fail("CT_HOST_DRIFT", "Predecessor host drift")
  if (predecessor.base_sha !== current.base_sha) fail("CT_BASE_DRIFT", "Predecessor base drift")
  if (predecessor.runtime_binding_ref !== current.runtime_binding_ref) fail("CT_RUNTIME_DRIFT", "Predecessor runtime binding drift")
  if (predecessor.role_binding_ref !== current.role_binding_ref) fail("CT_ROLE_DRIFT", "Predecessor role binding drift")
  if (predecessor.assignment_ref !== current.assignment_ref) fail("CT_OWNERSHIP_UNCERTAIN", "Predecessor assignment does not match current ownership")
  return predecessor
}
const assertProof = (value, current) => {
  if (!value || typeof value !== "object" || value.schema !== "recovery-proof") fail("CT_STOP_PROOF_REQUIRED", "Positive termination proof is required")
  let proof
  try { proof = validate("recoveryProof", value) }
  catch (error) { fail("CT_STOP_PROOF_INVALID", "Termination proof is invalid", error) }
  if (proof.project_id !== current.project_id) fail("CT_STOP_PROOF_INVALID", "Termination proof project does not match")
  if (proof.old_assignment_ref !== current.assignment_ref) fail("CT_STOP_PROOF_INVALID", "Termination proof assignment does not match")
  if (proof.base_sha !== current.base_sha) fail("CT_BASE_DRIFT", "Termination proof base drift")
  if (proof.runtime_binding_ref !== current.runtime_binding_ref) fail("CT_RUNTIME_DRIFT", "Termination proof runtime binding drift")
  if (proof.role_binding_ref !== current.role_binding_ref) fail("CT_ROLE_DRIFT", "Termination proof role binding drift")
  return proof
}
const frozenWorkFor = (ledger, baseSha) => ledger?.events.find((event) => event.frozen_work?.base_sha === baseSha)?.frozen_work
const assertUsableBase = (ledger, baseSha) => {
  const frozenWork = frozenWorkFor(ledger, baseSha)
  if (frozenWork) fail("CT_FROZEN_WORK_UNRESOLVED", `Base carries frozen work ${frozenWork.work_ref}`)
}
const assertLedger = (value) => {
  if (!exactKeys(value, ledgerKeys) || value.schema !== "candidate-fence-ledger" || value.schema_version !== 1
    || !Number.isInteger(value.revision) || value.revision < 1 || !Array.isArray(value.events) || value.events.length !== value.revision) {
    fail("CT_FENCE_INVALID", "Fence ledger is invalid")
  }
  id(value.project_id, "Ledger project")
  for (const [index, event] of value.events.entries()) {
    if (!exactKeys(event, eventKeys) || event.host_epoch !== index + 1 || !["HOST_ADMITTED", "TAKEOVER_FORCED"].includes(event.event)) fail("CT_FENCE_INVALID", "Fence event is invalid")
    if (event.exclusivity !== (event.event === "TAKEOVER_FORCED" ? "BROKEN" : "VERIFIED")) fail("CT_FENCE_INVALID", "Fence exclusivity marker is invalid")
    const candidate = inspectCandidate(event.candidate)
    if (candidate.project_id !== value.project_id) fail("CT_FENCE_INVALID", "Fence event project is invalid")
    if (index === 0) {
      if (event.event !== "HOST_ADMITTED" || event.predecessor !== null || event.termination_proof_ref !== null
        || event.frozen_work !== null || event.maintainer_decision_ref !== null) fail("CT_FENCE_INVALID", "Initial fence event is invalid")
      continue
    }
    const previous = value.events[index - 1].candidate
    const predecessor = inspectPredecessor(event.predecessor)
    if (predecessor.host_epoch !== index || predecessor.host_id !== previous.host_id || predecessor.base_sha !== previous.base_sha
      || predecessor.runtime_binding_ref !== previous.runtime_binding_ref || predecessor.role_binding_ref !== previous.role_binding_ref
      || predecessor.assignment_ref !== previous.assignment_ref || candidate.host_id === previous.host_id) {
      fail("CT_FENCE_INVALID", "Fence predecessor chain is invalid")
    }
    if (event.event === "TAKEOVER_FORCED") {
      if (!exactKeys(event.frozen_work, ["state", "candidate_revision", "base_sha", "work_ref"]) || event.frozen_work.state !== "FROZEN"
        || event.frozen_work.candidate_revision !== previous.candidate_revision || event.frozen_work.base_sha !== previous.base_sha
        || event.frozen_work.work_ref !== previous.work_ref) fail("CT_FENCE_INVALID", "Forced takeover must freeze prior work")
      ref(event.maintainer_decision_ref, "Maintainer decision")
      if (event.termination_proof_ref !== null) fail("CT_FENCE_INVALID", "Forced takeover cannot claim termination proof")
    } else {
      ref(event.termination_proof_ref, "Termination proof")
      if (event.frozen_work !== null || event.maintainer_decision_ref !== null) fail("CT_FENCE_INVALID", "Verified admission cannot carry takeover evidence")
    }
  }
  return value
}

export const createCandidateFenceStore = ({ ledgerPath, fs = nodeFs, beforeCommit, lockTimeoutMs = 5_000 } = {}) => {
  if (!isAbsolute(ledgerPath ?? "") || ledgerPath.includes("\0")) fail("CT_FENCE_PATH_INVALID", "Fence ledger path must be absolute")
  const parent = dirname(ledgerPath), lockPath = `${ledgerPath}.lock`
  const unsafe = (message, cause) => fail("CT_FENCE_UNSAFE", message, cause)
  const assertDirectory = (stats) => {
    if (!stats.isDirectory() || stats.isSymbolicLink() || !own(stats) || mode(stats) !== 0o700) unsafe("Fence directory is unsafe")
  }
  const inspectParent = ({ create = false } = {}) => {
    if (create) {
      const missing = []
      let cursor = parent
      while (true) {
        try { fs.lstatSync(cursor); break } catch (error) {
          if (error?.code !== "ENOENT") throw error
          missing.push(cursor); cursor = dirname(cursor)
        }
      }
      for (const path of missing.reverse()) { fs.mkdirSync(path, { mode: 0o700 }); fs.chmodSync(path, 0o700); assertDirectory(fs.lstatSync(path)) }
    }
    let stats
    try { stats = fs.lstatSync(parent) } catch (error) {
      if (!create && error?.code === "ENOENT") return null
      fail("CT_FENCE_READ_FAILED", "Fence directory inspection failed", error)
    }
    assertDirectory(stats)
    return stats
  }
  const readCurrent = () => {
    if (!inspectParent()) return { document: null, bytes: null }
    let stats
    try { stats = fs.lstatSync(ledgerPath) } catch (error) {
      if (error?.code === "ENOENT") return { document: null, bytes: null }
      fail("CT_FENCE_READ_FAILED", "Fence ledger inspection failed", error)
    }
    if (!stats.isFile() || stats.isSymbolicLink() || !own(stats) || mode(stats) !== 0o600) unsafe("Fence ledger is unsafe")
    let descriptor
    try {
      descriptor = fs.openSync(ledgerPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW)
      const opened = fs.fstatSync(descriptor)
      if (!opened.isFile() || !own(opened) || mode(opened) !== 0o600) unsafe("Opened fence ledger is unsafe")
      const bytes = fs.readFileSync(descriptor)
      return { document: assertLedger(JSON.parse(bytes.toString("utf8"))), bytes }
    } catch (error) {
      if (error?.code?.startsWith("CT_")) throw error
      fail("CT_FENCE_READ_FAILED", "Fence ledger read failed", error)
    } finally { if (descriptor !== undefined) fs.closeSync(descriptor) }
  }
  const createdFile = (path, bytes) => {
    let descriptor
    try {
      descriptor = fs.openSync(path, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW, 0o600)
      fs.fchmodSync(descriptor, 0o600)
      const stats = fs.fstatSync(descriptor)
      if (!stats.isFile() || !own(stats) || mode(stats) !== 0o600) unsafe("Fence temporary file is unsafe")
      fs.writeFileSync(descriptor, bytes); fs.fsyncSync(descriptor); fs.closeSync(descriptor); descriptor = undefined
    } catch (error) {
      if (descriptor !== undefined) try { fs.closeSync(descriptor) } catch {}
      try { fs.rmSync(path, { force: true }) } catch {}
      if (error?.code?.startsWith("CT_")) throw error
      fail("CT_FENCE_WRITE_FAILED", "Fence temporary write failed", error)
    }
  }
  const syncParent = () => {
    const descriptor = fs.openSync(parent, fs.constants.O_RDONLY | (fs.constants.O_DIRECTORY ?? 0))
    try { fs.fsyncSync(descriptor) } finally { fs.closeSync(descriptor) }
  }
  const acquireLock = () => {
    const deadline = Date.now() + lockTimeoutMs
    while (true) {
      try {
        const descriptor = fs.openSync(lockPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW, 0o600)
        fs.fchmodSync(descriptor, 0o600)
        return descriptor
      } catch (error) {
        if (error?.code !== "EEXIST") fail("CT_FENCE_WRITE_FAILED", "Fence lock failed", error)
        if (Date.now() >= deadline) fail("CT_FENCE_BUSY", "Fence ledger is busy")
        pause(Math.min(2, Math.max(1, deadline - Date.now())))
      }
    }
  }
  const transact = (expectedRevision, build) => {
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) fail("CT_CAS_MISMATCH", "Expected revision is invalid")
    inspectParent({ create: true })
    let lockDescriptor, temporary, renamed = false, priorBytes = null
    try {
      lockDescriptor = acquireLock()
      const current = readCurrent()
      priorBytes = current.bytes
      if ((current.document?.revision ?? 0) !== expectedRevision) fail("CT_CAS_MISMATCH", "Fence ledger revision changed")
      const next = assertLedger(build(current.document))
      const bytes = Buffer.from(`${canonicalize(next)}\n`)
      temporary = join(parent, `.candidate-fence.${randomUUID()}.tmp`)
      createdFile(temporary, bytes)
      beforeCommit?.(ledgerPath, next)
      fs.renameSync(temporary, ledgerPath); temporary = undefined; renamed = true
      try { syncParent() } catch (error) {
        if (priorBytes === null) fs.rmSync(ledgerPath, { force: true })
        else {
          const rollback = join(parent, `.candidate-fence.${randomUUID()}.rollback`)
          createdFile(rollback, priorBytes)
          try { fs.renameSync(rollback, ledgerPath) } finally { fs.rmSync(rollback, { force: true }) }
        }
        syncParent()
        fail("CT_FENCE_WRITE_FAILED", "Fence directory sync failed", error)
      }
      return freeze(structuredClone(next))
    } catch (error) {
      if (error?.code?.startsWith("CT_")) throw error
      if (renamed) fail("CT_FENCE_DURABILITY_UNKNOWN", "Fence durability is unknown; reload before retry", error)
      fail("CT_FENCE_WRITE_FAILED", "Atomic fence write failed", error)
    } finally {
      if (temporary) try { fs.rmSync(temporary, { force: true }) } catch {}
      if (lockDescriptor !== undefined) {
        try { fs.closeSync(lockDescriptor) } catch {}
        try { fs.rmSync(lockPath, { force: true }) } catch {}
      }
    }
  }
  const append = (current, event) => ({
    schema: "candidate-fence-ledger", schema_version: 1, project_id: event.candidate.project_id,
    revision: (current?.revision ?? 0) + 1, events: [...(current?.events ?? []), event],
  })

  return Object.freeze({
    read() {
      const current = readCurrent().document
      return current === null ? null : freeze(structuredClone(current))
    },
    admit({ candidate: candidateInput, predecessor: predecessorInput, terminationProof, expectedRevision } = {}) {
      const nextCandidate = inspectCandidate(candidateInput)
      return transact(expectedRevision, (current) => {
        if (current && current.project_id !== nextCandidate.project_id) fail("CT_PROJECT_MISMATCH", "Foreign project candidate")
        if (!current) return append(null, {
          event: "HOST_ADMITTED", exclusivity: "VERIFIED", host_epoch: 1, candidate: nextCandidate,
          predecessor: null, termination_proof_ref: null, frozen_work: null, maintainer_decision_ref: null,
        })
        const active = current.events.at(-1)
        const predecessor = assertPredecessor(active, predecessorInput)
        if (nextCandidate.host_id === active.candidate.host_id) fail("CT_HOST_DRIFT", "New activation must use a different host")
        assertUsableBase(current, nextCandidate.base_sha)
        const proof = assertProof(terminationProof, active.candidate)
        return append(current, {
          event: "HOST_ADMITTED", exclusivity: "VERIFIED", host_epoch: active.host_epoch + 1,
          candidate: nextCandidate, predecessor, termination_proof_ref: proof.proof_id,
          frozen_work: null, maintainer_decision_ref: null,
        })
      })
    },
    forceTakeover({ actor, candidate: candidateInput, predecessor: predecessorInput, maintainerDecisionRef, expectedRevision } = {}) {
      if (actor !== "MAINTAINER") fail("CT_MAINTAINER_REQUIRED", "Forced takeover requires an explicit maintainer decision")
      const decisionRef = ref(maintainerDecisionRef, "Maintainer decision")
      const nextCandidate = inspectCandidate(candidateInput)
      return transact(expectedRevision, (current) => {
        if (!current || current.project_id !== nextCandidate.project_id) fail("CT_OWNERSHIP_UNCERTAIN", "Current predecessor ownership is required")
        const active = current.events.at(-1)
        const predecessor = assertPredecessor(active, predecessorInput)
        if (nextCandidate.host_id === active.candidate.host_id) fail("CT_HOST_DRIFT", "Forced takeover must use a different host")
        assertUsableBase(current, nextCandidate.base_sha)
        return append(current, {
          event: "TAKEOVER_FORCED", exclusivity: "BROKEN", host_epoch: active.host_epoch + 1,
          candidate: nextCandidate, predecessor, termination_proof_ref: null,
          frozen_work: { state: "FROZEN", candidate_revision: active.candidate.candidate_revision, base_sha: active.candidate.base_sha, work_ref: active.candidate.work_ref },
          maintainer_decision_ref: decisionRef,
        })
      })
    },
    assertBaseUsable({ projectId, baseSha } = {}) {
      const project = id(projectId, "Project"), base = gitSha(baseSha, "Base SHA")
      const current = readCurrent().document
      if (current && current.project_id !== project) fail("CT_PROJECT_MISMATCH", "Foreign project base")
      assertUsableBase(current, base)
      return true
    },
  })
}
