import { chmodSync, closeSync, constants, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { dirname, isAbsolute, join } from "node:path"
import { randomUUID } from "node:crypto"

import { validate } from "../contracts/validate.mjs"
import { resolveJornadaLifecycle } from "../jornada/lifecycle.mjs"

// Terminal states an authorization may reach, mirroring authorization-v1's
// `state` enum minus PENDING. REJECTED records a denied decision, which the
// store previously could not express at all.
const TERMINAL_STATES = new Set(["APPROVED", "REJECTED", "EXPIRED", "REVOKED"])
const digest = (value) => typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value)
const fail = (code, message, cause) => { throw Object.assign(new Error(message, { cause }), { code }) }
const safeId = (value) => {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)) fail("CT_STORE_INVALID", "Invalid store identifier")
  return value
}
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

export const createMainStore = ({ root, authority, capability, beforeCommit } = {}) => {
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
  const withLock = (path, operation) => {
    const lock = `${path}.lock`
    let descriptor
    try {
      const deadline = Date.now() + 5_000
      while (descriptor === undefined) {
        try { descriptor = openSync(lock, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600) }
        catch (error) {
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
    let descriptor
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
        const directoryDescriptor = openSync(dirname(path), constants.O_RDONLY)
        try { fsyncSync(directoryDescriptor) } finally { closeSync(directoryDescriptor) }
      })
    } catch (error) {
      if (descriptor !== undefined) closeSync(descriptor)
      rmSync(temporary, { force: true })
      if (error?.code?.startsWith("CT_")) throw error
      fail("CT_STORE_WRITE_FAILED", "Atomic store write failed", error)
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

  return Object.freeze({
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
      const path = authorizationPath(input.authorization_id)
      if (!existsSync(path)) fail("CT_AUTH_INVALID", "Unknown authorization")
      const current = parse(path)
      if (current.state !== "PENDING") fail("CT_AUTH_TERMINAL", "Authorization is terminal")
      const expiresAt = Date.parse(current.expires_at)
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) fail("CT_AUTH_EXPIRED", "Authorization has expired")
      if (input.expected_revision !== current.revision) fail("CT_CAS_MISMATCH", "Authorization revision changed")
      if (!digest(input.candidate_revision) || input.candidate_revision !== current.extensions?.["control-tower/candidate-revision"]) fail("CT_AUTH_INVALID", "Authorization candidate does not match")
      return withLock(jornadaPath(current.jornada_id), () => {
        let jornada
        try { jornada = this.readJornada(current.jornada_id) }
        catch (error) { fail("CT_JORNADA_INVALID", "Authorization Jornada is unavailable", error) }
        if (jornada.state !== "AC" + "TIVE" || jornada.jornada_revision !== current.jornada_revision) fail("CT_AUTH_INVALID", "Authorization Jornada is not active at its bound revision")
        const audit = Object.freeze({ kind: "authorization-terminal", authorization_id: input.authorization_id, decision: input.decision, project_id: binding.project_id })
        return commit("authorizations", input.authorization_id, { actor: "MAIN", ...current, state: input.decision, terminal_audit: audit, audit_ref: { kind: audit.kind, record_path: path }, expected_revision: current.revision }, current.revision)
      })
    },
    admitCandidateEffect(input) {
      assertMain(input)
      if (!digest(input.candidate_revision)) fail("CT_AUTH_INVALID", "Candidate revision is invalid")
      const id = input.candidate_revision.slice(7)
      const path = join(directory("candidate-effects"), `${id}.json`)
      if (existsSync(path)) return frozen({ ...parse(path), admitted: false })
      try {
        return frozen({ ...commit("candidate-effects", id, { actor: "MAIN", project_id: binding.project_id, candidate_revision: input.candidate_revision, expected_revision: 0 }, 0), admitted: true })
      } catch (error) {
        if (error.code === "CT_CAS_MISMATCH" && existsSync(path)) return frozen({ ...parse(path), admitted: false })
        throw error
      }
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
