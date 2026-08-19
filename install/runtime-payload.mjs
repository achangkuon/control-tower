import { lstatSync, readdirSync, readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { isAbsolute, join, relative, resolve, sep } from "node:path"

export const RUNTIME_PAYLOAD_FILES = [
  "bin/torre",
  "core.mjs",
  "hosts/herdr.mjs",
  "hosts/launcher.mjs",
  "hosts/launch-worker-cli.mjs",
  "hosts/launch-worker.mjs",
  "hosts/opencode-launcher.mjs",
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

const expected = new Set(RUNTIME_PAYLOAD_FILES)

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
      if (path && !["bin", "hosts", "install", "jornada", "main-store"].includes(path)) fail("CT_RUNTIME_PAYLOAD_INVALID", `unexpected directory ${path}`)
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
