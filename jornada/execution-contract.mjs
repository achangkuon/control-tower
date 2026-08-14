import Ajv2020 from "ajv/dist/2020.js"
import { createHash } from "node:crypto"
import schema from "../schemas/execution-contract-v1.schema.json" with { type: "json" }

const isRfc3339DateTime = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(value)
  if (!match) return false
  const [year, month, day, hour, minute, second, offsetHour, offsetMinute] = [
    ...match.slice(1, 7), match[7] ?? "00", match[8] ?? "00",
  ].map(Number)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return month >= 1 && month <= 12 && day >= 1 && day <= monthDays[month - 1]
    && hour <= 23 && minute <= 59 && second <= 59 && offsetHour <= 23 && offsetMinute <= 59
    && Number.isFinite(Date.parse(value))
}
const ajv = new Ajv2020({ strict: true, strictTuples: false, strictRequired: false, allErrors: true, formats: { "date-time": isRfc3339DateTime } })
const validate = ajv.compile(schema)
const fail = (code, message, cause) => { throw Object.assign(new Error(message, { cause }), { code }) }
const freeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) freeze(child)
  }
  return value
}
const canonical = (value) => value === null || typeof value !== "object" ? JSON.stringify(value)
  : Array.isArray(value) ? `[${value.map(canonical).join(",")}]`
    : `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`
const sha256 = (value) => createHash("sha256").update(canonical(value)).digest("hex")
const exactContext = (contract, current) => {
  const expected = {
    repository_identity: contract.repository.identity,
    repository_root: contract.repository.root,
    git_common_dir: contract.repository.common_dir,
    worktree: contract.repository.worktree,
    branch: contract.repository.branch,
    base_ref: contract.repository.base_ref,
    base_sha: contract.repository.base_sha,
    sesion_id: contract.assignment.sesion_id,
  }
  for (const [key, value] of Object.entries(expected)) {
    if (current?.[key] !== value) fail("CT_EXECUTION_CONTRACT_CONTEXT", `Execution context mismatch: ${key}`)
  }
  if (typeof current?.jornada_root !== "string" || current.jornada_root.length === 0) fail("CT_EXECUTION_CONTRACT_CONTEXT", "Execution context mismatch: jornada_root")
}
const parseContract = (contractJson, now) => {
  let parsed
  try { parsed = JSON.parse(contractJson) } catch (error) { fail("CT_EXECUTION_CONTRACT_PARSE", "Execution contract is not JSON", error) }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) fail("CT_EXECUTION_CONTRACT_SCHEMA", "Execution contract does not match schema")
  if (Object.hasOwn(parsed, "runtime_result")) fail("CT_EXECUTION_CONTRACT_RUNTIME_RESULT", "Post-run contract cannot be prepared")
  if (!validate(parsed)) fail("CT_EXECUTION_CONTRACT_SCHEMA", "Execution contract does not match schema")
  const preimage = Object.fromEntries(Object.entries(parsed).filter(([key]) => !["contract_digest", "runtime_result"].includes(key)))
  if (sha256(preimage) !== parsed.contract_digest) fail("CT_EXECUTION_CONTRACT_DIGEST", "Execution contract digest mismatch")
  const expiresAt = Date.parse(parsed.expires_at)
  if (!Number.isFinite(expiresAt) || expiresAt <= now) fail("CT_EXECUTION_CONTRACT_EXPIRED", "Execution contract expired")
  return freeze(structuredClone(parsed))
}
const verifyAttestation = async (verifySupervision, evidence, contract, current, now) => {
  if (evidence === undefined || evidence === null) fail("CT_EXECUTION_SUPERVISION", "Supervision evidence is absent")
  if (typeof verifySupervision !== "function") fail("CT_EXECUTION_SUPERVISION", "Supervision verifier is unavailable")
  const expected = freeze({ contract_digest: contract.contract_digest, repository_identity: current.repository_identity, worktree: current.worktree, base_sha: current.base_sha, sesion_id: current.sesion_id })
  let attestation
  try { attestation = await verifySupervision(freeze(structuredClone(evidence)), expected, now) }
  catch (error) { fail("CT_EXECUTION_SUPERVISION", "Supervision verification failed", error) }
  try {
    if (!attestation || typeof attestation !== "object" || Array.isArray(attestation)) throw new TypeError("Attestation must be plain data")
    const prototype = Object.getPrototypeOf(attestation)
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError("Attestation must be a plain object")
    const descriptors = Object.getOwnPropertyDescriptors(attestation)
    const valueOf = (key) => {
      const descriptor = descriptors[key]
      if (!descriptor || !Object.hasOwn(descriptor, "value")) throw new TypeError(`Attestation field must be plain data: ${key}`)
      return descriptor.value
    }
    const valid = valueOf("valid"), expiresAtValue = valueOf("expires_at"), evidenceDigest = valueOf("evidence_digest")
    if (valid !== true || typeof expiresAtValue !== "string" || !isRfc3339DateTime(expiresAtValue)
      || Date.parse(expiresAtValue) <= now || typeof evidenceDigest !== "string" || !/^[0-9a-f]{64}$/.test(evidenceDigest)) {
      throw new TypeError("Attestation values are invalid or expired")
    }
    for (const [key, value] of Object.entries(expected)) {
      if (valueOf(key) !== value) throw new TypeError(`Attestation binding mismatch: ${key}`)
    }
    return evidenceDigest
  } catch (error) { fail("CT_EXECUTION_SUPERVISION", "Supervision attestation is invalid or expired", error) }
}

export const createExecutionContractPreparer = ({ persistence, verifySupervision, now = Date.now } = {}) => ({
  async prepare({ contractJson, currentContext, supervisionEvidence } = {}) {
    const clock = typeof now === "function" ? now() : now
    const contract = parseContract(contractJson, clock)
    exactContext(contract, currentContext)
    const evidenceDigest = await verifyAttestation(verifySupervision, supervisionEvidence, contract, currentContext, clock)
    if (persistence?.owner !== "JORNADA" || persistence?.root !== currentContext.jornada_root || typeof persistence?.persistPrepared !== "function") {
      fail("CT_EXECUTION_PERSISTENCE", "Jornada persistence capability is unavailable or foreign")
    }
    const recordData = {
      contract_id: contract.contract_id,
      contract_digest: contract.contract_digest,
      repository_identity: currentContext.repository_identity,
      repository_root: currentContext.repository_root,
      git_common_dir: currentContext.git_common_dir,
      worktree: currentContext.worktree,
      branch: currentContext.branch,
      base_ref: currentContext.base_ref,
      base_sha: currentContext.base_sha,
      sesion_id: currentContext.sesion_id,
      jornada_root: currentContext.jornada_root,
      validated_at: new Date(clock).toISOString(),
      supervision_evidence_digest: evidenceDigest,
    }
    const record = freeze({ ...recordData, record_digest: sha256(recordData) })
    let receipt
    try { receipt = await persistence.persistPrepared(record) }
    catch (error) { fail("CT_EXECUTION_PERSISTENCE", "Prepared record persistence failed", error) }
    if (!receipt || receipt.persisted !== true || receipt.owner !== "JORNADA" || receipt.root !== persistence.root || receipt.record_digest !== record.record_digest) {
      fail("CT_EXECUTION_PERSISTENCE", "Prepared record readback mismatch")
    }
    return freeze({ state: "prepared", ...record })
  },
})
