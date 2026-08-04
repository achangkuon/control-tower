import { createHash } from "node:crypto"
import { lstatSync, readFileSync, realpathSync } from "node:fs"
import { isAbsolute, relative, resolve } from "node:path"
import { parseDocument } from "yaml"

import { validate } from "../contracts/validate.mjs"

const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const strict = Object.freeze({
  merge: Object.freeze({ authorizing_party: "human" }),
  delivery: Object.freeze({ shape: "pull-request", target_branch: "master" }),
  planning: Object.freeze({ horizon_ceiling: 1 }),
  documentation_close: Object.freeze({ module: "full", session: "full" }),
})
const inside = (root, path) => relative(root, path) === "" || (!relative(root, path).startsWith("..") && !isAbsolute(relative(root, path)))
const digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`
const yamlBlock = (bytes) => {
  const match = bytes.toString("utf8").match(/```yaml\s*\n([\s\S]*?)\n```/)
  if (!match) return null
  const document = parseDocument(match[1], { version: "1.2", uniqueKeys: true, merge: false })
  if (document.errors.length || document.warnings.length) return null
  const value = document.toJS({ mapAsMap: false, maxAliasCount: 0 })
  return value?.schema === "delivery-policy" && value?.schema_version === 1 ? value : null
}
const unresolved = (reason) => Object.freeze({ ...strict, resolved: false, code: "CT_POLICY_UNRESOLVED", reason })
const choose = (global, project) => ({
  merge: { authorizing_party: global.merge.authorizing_party === "human" || project.merge.authorizing_party === "human" ? "human" : "automatic" },
  delivery: { shape: global.delivery.shape === "pull-request" || project.delivery.shape === "pull-request" ? "pull-request" : "direct-push", target_branch: global.delivery.target_branch },
  planning: { horizon_ceiling: Math.min(global.planning.horizon_ceiling, project.planning.horizon_ceiling) },
  documentation_close: {
    module: global.documentation_close.module === "full" || project.documentation_close.module === "full" ? "full" : "engram-only",
    session: global.documentation_close.session === "full" || project.documentation_close.session === "full" ? "full" : "engram-only",
  },
})
const canonicalPolicy = (policy) => {
  try { return validate("deliveryPolicy", policy) } catch { return null }
}

export const readDeliveryPolicy = ({ repository_root, project_id, source_path = "AGENTS.md", expected_digest, revision = 1 } = {}) => {
  if (!isAbsolute(repository_root ?? "")) return unresolved("repository root is not absolute")
  if (typeof expected_digest !== "string" || !/^sha256:[a-f0-9]{64}$/.test(expected_digest)) return unresolved("policy source digest is unbound")
  let root, source, bytes
  try {
    root = realpathSync(repository_root)
    source = resolve(root, source_path)
    if (!inside(root, source) || lstatSync(source).isSymbolicLink() || !inside(root, realpathSync(source))) return unresolved("policy source is outside the canonical root")
    bytes = readFileSync(source)
  } catch { return unresolved("policy source is unavailable") }
  if (digest(bytes) !== expected_digest) return unresolved("policy source digest does not match")
  const declared = yamlBlock(bytes)
  if (!declared) return unresolved("delivery-policy block is absent or malformed")
  const policy = { ...declared, project_id, source_path, source_digest: digest(bytes), revision }
  const result = resolveDeliveryPolicy({ global_policy: policy, project_policy: policy })
  return Object.freeze({ ...result, resolved: result.resolved, source_path: source_path, source_digest: digest(bytes), revision })
}

export const resolveDeliveryPolicy = ({ global_policy, project_policy } = {}) => {
  if (!global_policy || !project_policy) return unresolved("policy binding is incomplete")
  global_policy = canonicalPolicy(global_policy)
  project_policy = canonicalPolicy(project_policy)
  if (!global_policy || !project_policy) return unresolved("policy field is unresolved")
  try { return Object.freeze({ ...choose(global_policy, project_policy), resolved: true }) }
  catch { return unresolved("policy value is invalid") }
}

const floors = Object.freeze({
  EARLY_REMOTE_MUTATION: "remote mutation before DELIVERY_READY",
  FROZEN_CANDIDATE_REWRITE: "frozen candidate rewrite",
  LEDGER_DELETION: "append-only ledger deletion",
  WORKER_SELF_ASSIGNMENT: "worker self-assignment",
  NON_MAIN_DISPATCH: "non-Main dispatch",
})
export const assertFloorProtected = ({ floor } = {}) => {
  if (!floors[floor]) fail("CT_POLICY_DENIED", "Unknown security floor")
  fail("CT_POLICY_DENIED", `Policy and exceptions cannot relax ${floor}: ${floors[floor]}`)
}

export const restrictiveDefaults = strict
