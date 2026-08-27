const identifierKinds = new Set(["runtime", "worktree", "process", "incarnation", "binding"])

export function createHostRuntimeIdentifier(kind, { randomBytes } = {}) {
  if (!identifierKinds.has(kind)) throw new TypeError("Unknown host-runtime identifier kind")
  if (typeof randomBytes !== "function") throw new TypeError("randomBytes must be a function")
  const bytes = randomBytes()
  if (!(bytes instanceof Uint8Array) || bytes.byteLength !== 16) {
    throw new TypeError("randomBytes must return exactly 16 bytes")
  }
  return `ct_${kind}_${Buffer.from(bytes).toString("hex")}`
}
