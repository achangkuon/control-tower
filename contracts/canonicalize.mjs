import { createHash } from "node:crypto"
import { isAlias, isMap, isScalar, parseDocument, visit } from "yaml"

import { failContract } from "./errors.mjs"

const invalid = (message, diagnostics = []) => failContract("CT_SCHEMA_INVALID", message, diagnostics)
const assertString = (value) => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1)
      if (!(next >= 0xdc00 && next <= 0xdfff)) invalid("Strings must contain valid Unicode scalar values")
      index += 1
    } else if (code >= 0xdc00 && code <= 0xdfff) invalid("Strings must contain valid Unicode scalar values")
  }
}

const inspectNode = (_key, node) => {
  if (isAlias(node) || node?.anchor || node?.tag) invalid("YAML aliases, anchors, and tags are forbidden")
  if (isScalar(node) && node.type === "PLAIN" && typeof node.value === "string" && /^\d{4}-\d{2}-\d{2}(?:T|$)/u.test(node.source)) {
    invalid("Implicit timestamps are forbidden")
  }
  if (isMap(node)) for (const pair of node.items) if (!isScalar(pair.key) || typeof pair.key.value !== "string" || pair.key.value === "<<") invalid("YAML keys must be non-merge strings")
}

const inspectValue = (value, ancestors = new WeakSet()) => {
  if (typeof value === "string") assertString(value)
  else if (typeof value === "number" && (!Number.isFinite(value) || Number.isInteger(value) && Math.abs(value) < 1e21 && !Number.isSafeInteger(value))) {
    invalid("Structured numbers must be finite and safe")
  } else if (["undefined", "bigint", "function", "symbol"].includes(typeof value)) invalid("Value is not JSON-compatible")
  else if (value && typeof value === "object") {
    if (ancestors.has(value)) invalid("Cyclic values are not JSON-compatible")
    ancestors.add(value)
    if (Array.isArray(value)) for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) invalid("Sparse arrays are not JSON-compatible")
      inspectValue(value[index], ancestors)
    } else {
      if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) invalid("Only plain JSON objects are supported")
      for (const [key, child] of Object.entries(value)) { assertString(key); inspectValue(child, ancestors) }
    }
    ancestors.delete(value)
  }
  return value
}

const deepFreeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}

export const parseStructured = (source) => {
  if (typeof source !== "string") {
    inspectValue(source)
    return deepFreeze(structuredClone(source))
  }
  const document = parseDocument(source, { schema: "core", version: "1.2", uniqueKeys: true, merge: false })
  if (document.errors.length || document.warnings.length) invalid("Structured document is not JSON-compatible YAML 1.2", [...document.errors, ...document.warnings].map(({ code, message }) => ({ code, message })))
  visit(document, inspectNode)
  return deepFreeze(inspectValue(document.toJS({ mapAsMap: false, maxAliasCount: 0 })))
}

const serialize = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(serialize).join(",")}]`
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${serialize(value[key])}`).join(",")}}`
}

export const canonicalize = (value) => serialize(inspectValue(value))

export const digestArtifact = (content, mode) => {
  let bytes
  if (mode === "raw-bytes") {
    if (!(content instanceof Uint8Array)) invalid("Raw digest content must be bytes")
    bytes = Buffer.from(content)
  }
  else if (mode === "rfc8785-jcs") bytes = Buffer.from(canonicalize(typeof content === "string" ? parseStructured(content) : content))
  else invalid(`Unknown digest mode: ${mode}`)
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`
}
