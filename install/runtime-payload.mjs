import { lstatSync, readdirSync, readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { isAbsolute, join, relative, resolve, sep } from "node:path"

// <generated:runtime-payload>
// Regenerate exactly with: BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun scripts/payload-closure.mjs --write
export const RUNTIME_PAYLOAD_FILES = [
  "bin/torre",
  "schemas/agent-capability-registry-v1.schema.json",
  "schemas/artifact-ref-v1.schema.json",
  "schemas/assignment-v1.schema.json",
  "schemas/assignment-v2.schema.json",
  "schemas/authorization-v1.schema.json",
  "schemas/binding-delta-v1.schema.json",
  "schemas/campaign-v1.schema.json",
  "schemas/candidate-revision-v1.schema.json",
  "schemas/checkpoint-capture-v1.schema.json",
  "schemas/completed-work-binding-v1.schema.json",
  "schemas/delivery-policy-v1.schema.json",
  "schemas/delivery-record-v1.schema.json",
  "schemas/jornada-v1.schema.json",
  "schemas/parked-checkpoint-binding-v1.schema.json",
  "schemas/parked-decision-response-v1.schema.json",
  "schemas/parked-decision-v1.schema.json",
  "schemas/plan-catalog-v1.schema.json",
  "schemas/plan-manifest-v1.schema.json",
  "schemas/policy-report-v1.schema.json",
  "schemas/policy-report-v2.schema.json",
  "schemas/project-registry-v1.schema.json",
  "schemas/reconciled-checkpoint-v1.schema.json",
  "schemas/recovery-proof-v1.schema.json",
  "schemas/session-plan-snapshot-v1.schema.json",
  "schemas/support-proposal-v1.schema.json",
  "console/executor.mjs",
  "console/validate.mjs",
  "console/vocabulary.mjs",
  "contracts/candidate-revision.mjs",
  "contracts/canonicalize.mjs",
  "contracts/completed-work-binding.mjs",
  "contracts/errors.mjs",
  "contracts/parked-checkpoint-binding.mjs",
  "contracts/parked-decision.mjs",
  "contracts/schema-registry.mjs",
  "contracts/session-plan-snapshot.mjs",
  "contracts/validate.mjs",
  "core.mjs",
  "hosts/candidate-fence.mjs",
  "hosts/epoch-enforcement.mjs",
  "hosts/herdr-topology.mjs",
  "hosts/launch-worker-cli.mjs",
  "hosts/launch-worker.mjs",
  "hosts/opencode-attach-helper.mjs",
  "hosts/opencode-credential-channel.mjs",
  "hosts/opencode-server.mjs",
  "hosts/opencode-view.mjs",
  "hosts/production-provider.mjs",
  "hosts/root-binding.mjs",
  "hosts/root-identity.mjs",
  "install/active-pointer.mjs",
  "install/lifecycle.mjs",
  "install/runtime-payload.mjs",
  "install/version-store.mjs",
  "jornada/lifecycle.mjs",
  "main-store/launch-consumer.mjs",
]
// </generated:runtime-payload>

const expected = new Set(RUNTIME_PAYLOAD_FILES)

// T8.10.1.3 — los directorios admitidos se derivan de los miembros exactos del payload, nunca de
// una lista paralela. Una lista escrita a mano se desincroniza en silencio la primera vez que el
// payload gana una familia nueva, y el instalador rechaza su propio contenido. El root queda fuera
// porque `relative` lo devuelve como cadena vacía.
const allowedDirectories = new Set(
  RUNTIME_PAYLOAD_FILES.flatMap((path) => {
    const segments = path.split("/")
    segments.pop()
    return segments.map((_, index) => segments.slice(0, index + 1).join("/"))
  }),
)

const fail = (code, detail) => {
  throw new Error(`${code}: ${detail}`)
}

const isBytes = (value) => Buffer.isBuffer(value) || value instanceof Uint8Array

export function validateRuntimePayload(files) {
  if (!files || typeof files !== "object" || Array.isArray(files)) {
    fail("CT_RUNTIME_PAYLOAD_INVALID", "payload must be an object")
  }

  const paths = Object.keys(files)
  const missing = RUNTIME_PAYLOAD_FILES.filter((path) => !Object.hasOwn(files, path))
  if (missing.length) fail("CT_RUNTIME_PAYLOAD_INCOMPLETE", `missing ${missing.join(",")}`)

  const extra = paths.filter((path) => !expected.has(path))
  if (extra.length) fail("CT_RUNTIME_PAYLOAD_INVALID", `unexpected ${extra.join(",")}`)

  for (const path of RUNTIME_PAYLOAD_FILES) {
    if (!isBytes(files[path])) fail("CT_RUNTIME_PAYLOAD_INVALID", `member ${path} is not bytes`)
  }

  return Object.fromEntries(RUNTIME_PAYLOAD_FILES.map((path) => [path, Buffer.from(files[path])]))
}

const readMember = (root, path) => {
  const member = join(root, path)
  let stat
  try { stat = lstatSync(member) } catch { fail("CT_RUNTIME_PAYLOAD_INCOMPLETE", `missing ${path}`) }
  if (!stat.isFile() || stat.isSymbolicLink()) fail("CT_RUNTIME_PAYLOAD_INVALID", `member ${path} is not a regular file`)
  return readFileSync(member)
}

const scanClosure = (root) => {
  const found = []
  const visit = (current) => {
    let stat
    try { stat = lstatSync(current) } catch { fail("CT_RUNTIME_PAYLOAD_INVALID", `unreadable ${current}`) }
    if (stat.isSymbolicLink()) fail("CT_RUNTIME_PAYLOAD_INVALID", `symlink ${current}`)
    if (stat.isDirectory()) {
      const path = relative(root, current).split(sep).join("/")
      if (path && !allowedDirectories.has(path)) fail("CT_RUNTIME_PAYLOAD_INVALID", `unexpected directory ${path}`)
      for (const entry of readdirSync(current)) visit(join(current, entry))
      return
    }
    if (!stat.isFile()) fail("CT_RUNTIME_PAYLOAD_INVALID", `non-file ${current}`)
    const path = relative(root, current).split(sep).join("/")
    found.push(path)
  }
  visit(root)
  return found
}

export function readRuntimePayload(root, { strict = true } = {}) {
  const resolved = resolve(root)
  if (!isAbsolute(resolved)) fail("CT_RUNTIME_PAYLOAD_INVALID", "root must be absolute")
  let stat
  try { stat = lstatSync(resolved) } catch { fail("CT_RUNTIME_PAYLOAD_INCOMPLETE", "root does not exist") }
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail("CT_RUNTIME_PAYLOAD_INVALID", "root is not a directory")

  if (strict) {
    const members = scanClosure(resolved)
    const extra = members.filter((path) => !expected.has(path))
    if (extra.length) fail("CT_RUNTIME_PAYLOAD_INVALID", `unexpected ${extra.join(",")}`)
  }

  return validateRuntimePayload(Object.fromEntries(
    RUNTIME_PAYLOAD_FILES.map((path) => [path, readMember(resolved, path)]),
  ))
}

export function isRuntimeCheckout(root) {
  const result = spawnSync("git", ["-C", resolve(root), "rev-parse", "--is-inside-work-tree"], { encoding: "utf8" })
  return result.status === 0 && result.stdout.trim() === "true"
}
