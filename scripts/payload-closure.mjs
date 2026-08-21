import { lstatSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, isAbsolute, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

export const RUNTIME_PAYLOAD_ASSETS = ["bin/torre"]
export const RUNTIME_PAYLOAD_ROOTS = [
  "install/active-pointer.mjs",
  "install/lifecycle.mjs",
  "core.mjs",
  "hosts/launch-worker-cli.mjs",
]

const scanner = new Bun.Transpiler({ loader: "js" })
const toPosix = (path) => path.split(sep).join("/")
const fail = (code, detail) => { throw new Error(`${code}: ${detail}`) }
const generatedStart = "// <generated:runtime-payload>"
const generatedEnd = "// </generated:runtime-payload>"

const readModule = (repoRoot, path, importedBy, specifier) => {
  const absolute = resolve(repoRoot, path)
  const withinRoot = relative(repoRoot, absolute)
  if (isAbsolute(withinRoot) || withinRoot === ".." || withinRoot.startsWith(`..${sep}`)) {
    fail("CT_PAYLOAD_IMPORT_UNRESOLVED", `${importedBy} -> ${specifier}`)
  }

  let stat
  try { stat = lstatSync(absolute) } catch {
    if (importedBy === null) fail("CT_PAYLOAD_ROOT_MISSING", path)
    fail("CT_PAYLOAD_IMPORT_UNRESOLVED", `${importedBy} -> ${specifier}`)
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    if (importedBy === null) fail("CT_PAYLOAD_ROOT_MISSING", path)
    fail("CT_PAYLOAD_IMPORT_UNRESOLVED", `${importedBy} -> ${specifier}`)
  }
  return { absolute, source: readFileSync(absolute, "utf8") }
}

export function computePayloadClosure(repoRoot, { roots = RUNTIME_PAYLOAD_ROOTS } = {}) {
  const resolvedRoot = resolve(repoRoot)
  const pending = roots.map((path) => ({ path: toPosix(path), importedBy: null, specifier: null }))
  const visited = new Set()

  while (pending.length) {
    const next = pending.shift()
    if (visited.has(next.path)) continue
    const { absolute, source } = readModule(resolvedRoot, next.path, next.importedBy, next.specifier)
    visited.add(next.path)

    let imports
    const analyzableSource = source.startsWith("#!") ? source.replace(/^#![^\n]*(?:\n|$)/, "") : source
    try { imports = scanner.scanImports(analyzableSource) } catch (error) {
      fail("CT_PAYLOAD_PARSE_FAILED", `${next.path}: ${error.message}`)
    }
    for (const entry of imports) {
      if (!["import-statement", "dynamic-import"].includes(entry.kind) || !entry.path.startsWith(".")) continue
      const importedPath = toPosix(relative(resolvedRoot, resolve(dirname(absolute), entry.path)))
      if (!visited.has(importedPath)) pending.push({ path: importedPath, importedBy: next.path, specifier: entry.path })
    }
  }

  return [...visited].sort((left, right) => left.localeCompare(right))
}

export function runtimePayloadDrift(declared, closure) {
  const expected = [...RUNTIME_PAYLOAD_ASSETS, ...closure]
  return {
    extras: declared.filter((path) => !expected.includes(path)),
    missing: expected.filter((path) => !declared.includes(path)),
  }
}

export function renderRuntimePayloadDeclaration(closure) {
  const files = [...RUNTIME_PAYLOAD_ASSETS, ...closure]
  const entries = files.map((path) => `  ${JSON.stringify(path)},`).join("\n")
  return [
    generatedStart,
    "// Regenerate exactly with: BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun scripts/payload-closure.mjs --write",
    "export const RUNTIME_PAYLOAD_FILES = [",
    entries,
    "]",
    generatedEnd,
  ].join("\n")
}

export function writeRuntimePayload(repoRoot) {
  const target = resolve(repoRoot, "install/runtime-payload.mjs")
  const source = readFileSync(target, "utf8")
  const start = source.indexOf(generatedStart)
  const end = source.indexOf(generatedEnd)
  if (start === -1 || end < start) fail("CT_PAYLOAD_GENERATED_MARKER_MISSING", "install/runtime-payload.mjs")
  const afterEnd = end + generatedEnd.length
  const generated = renderRuntimePayloadDeclaration(computePayloadClosure(repoRoot))
  const updated = `${source.slice(0, start)}${generated}${source.slice(afterEnd)}`
  if (updated !== source) writeFileSync(target, updated)
  return updated === source ? "unchanged" : "updated"
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null
if (invokedPath === fileURLToPath(import.meta.url)) {
  const repoRoot = resolve(dirname(invokedPath), "..")
  if (process.argv[2] === "--write") {
    process.stdout.write(`${writeRuntimePayload(repoRoot)}\n`)
  } else {
    process.stdout.write(`${renderRuntimePayloadDeclaration(computePayloadClosure(repoRoot))}\n`)
  }
}
