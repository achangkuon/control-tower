import { createHash, randomUUID } from "node:crypto"
import { accessSync, closeSync, constants, cpSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, readlinkSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs"
import { basename, dirname, isAbsolute, join, relative } from "node:path"

const C = "CT_DEPENDENCY_", hash = (bytes) => createHash("sha256").update(bytes).digest("hex"), canonical = (value) => `${JSON.stringify(value)}\n`
const fail = (suffix, cause) => { const error = new Error(`${C}${suffix}`); error.code = `${C}${suffix}`; if (cause) error.cause = cause; throw error }
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right)
const allows = (rule, value) => { const list = rule ? [rule].flat() : []; return !list.includes(`!${value}`) && (!list.some((item) => !item.startsWith("!")) || list.includes(value)) }
const pair = (entry) => { const match = /^((?:@[^/]+\/)?[^@]+)@(.+)$/.exec(entry?.[0] ?? ""); return match && { name: match[1], version: match[2], meta: entry[2] ?? {} } }
const expectedFrom = (lock, host) => Object.values(lock.packages ?? {}).map(pair).filter(Boolean).filter(({ meta }) => allows(meta.os, host.os) && allows(meta.cpu, host.cpu)).map(({ name, version }) => ({ name, version })).sort(byPackage)
const byPackage = (a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`)
const fence = "http://127.0.0.1:1"
const policy = (cacheDir, home) => ({
  args: ["install", `--cache-dir=${cacheDir}`, `--registry=${fence}`, "--frozen-lockfile", "--linker=hoisted", "--backend=copyfile", "--ignore-scripts", "--no-save"], timeoutMs: 30_000, maxBuffer: 1024 * 1024,
  env: { HOME: home, XDG_CACHE_HOME: `${home}/.cache`, TMPDIR: `${home}/tmp`, BUN_INSTALL_CACHE_DIR: cacheDir, BUN_CONFIG_REGISTRY: fence, HTTP_PROXY: fence, HTTPS_PROXY: fence, ALL_PROXY: fence, http_proxy: fence, https_proxy: fence, all_proxy: fence, NO_PROXY: "", no_proxy: "" },
})

function safeDirectory(path, error) {
  try { const info = lstatSync(path); accessSync(path, constants.R_OK); if (!info.isDirectory() || info.isSymbolicLink() || (process.getuid?.() !== undefined && info.uid !== process.getuid())) fail(error) } catch (cause) { if (cause.code?.startsWith(C)) throw cause; fail(error, cause) }
}
function walk(root, error, visitor = () => {}) {
  const owner = process.getuid?.()
  const visit = (path, rel = "") => {
    let info
    try { info = lstatSync(path); accessSync(path, constants.R_OK) } catch (cause) { fail(error, cause) }
    if (info.isSymbolicLink() || (!info.isDirectory() && !info.isFile()) || (owner !== undefined && info.uid !== owner)) fail(error)
    visitor(path, rel, info); if (info.isDirectory()) for (const name of readdirSync(path).sort()) visit(join(path, name), rel ? `${rel}/${name}` : name)
  }
  visit(root)
}
function treeDigest(root, error, inodes) {
  safeDirectory(root, error); const digest = createHash("sha256"), owner = process.getuid?.(), base = realpathSync(root)
  const visit = (path, rel = "") => {
    let info
    try { info = lstatSync(path); if (!info.isSymbolicLink()) accessSync(path, constants.R_OK) } catch (cause) { fail(error, cause) }
    if (owner !== undefined && info.uid !== owner) fail(error)
    if (info.isSymbolicLink()) {
      const target = readlinkSync(path), resolved = realpathSync(path), confined = relative(base, resolved)
      if (basename(dirname(path)) !== ".bin" || isAbsolute(target) || !confined || confined.startsWith("..") || isAbsolute(confined) || !statSync(resolved).isFile()) fail(error)
      digest.update(`l\0${rel}\0${info.mode & 0o777}\0${target}\0`); return
    }
    if (!info.isDirectory() && !info.isFile()) fail(error)
    if (info.isFile()) { if (inodes?.has(`${info.dev}:${info.ino}`)) fail(error); digest.update(`f\0${rel}\0${info.mode & 0o777}\0`).update(readFileSync(path)); return }
    digest.update(`d\0${rel}\0${info.mode & 0o777}\0`); for (const name of readdirSync(path).sort()) visit(join(path, name), rel ? `${rel}/${name}` : name)
  }
  visit(root); return digest.digest("hex")
}
function readPackage(path, error) {
  try { const value = JSON.parse(readFileSync(join(path, "package.json"), "utf8")); if (!value.name || !value.version) fail(error); return { name: value.name, version: value.version } } catch (cause) { if (cause.code?.startsWith(C)) throw cause; fail(error, cause) }
}
function sourceSnapshot(entries, error = "CACHE_INVALID") {
  const digest = createHash("sha256"), inodes = new Set()
  for (const path of entries) walk(path, error, (file, rel, info) => { digest.update(`${path}\0${rel}\0${info.mode}\0${info.size}\0`); if (info.isFile()) { inodes.add(`${info.dev}:${info.ino}`); digest.update(readFileSync(file)) } })
  return { digest: digest.digest("hex"), inodes }
}
function metadataIntegrity(metadata) { const body = { ...metadata }; delete body.integrity; return hash(canonical(body)) }
function validateExisting(target, identity, expected) {
  try {
    safeDirectory(target, "ENV_IMMUTABLE"); const bytes = readFileSync(join(target, "metadata.json"), "utf8"), metadata = JSON.parse(bytes)
    const keys = ["bun", "commandPolicy", "host", "integrity", "lockDigest", "packageDigest", "schema", "sources", "topology", "treeDigest"]
    const validSources = Array.isArray(metadata.sources) && metadata.sources.length === expected.length && metadata.sources.every((item, index) => same(Object.keys(item ?? {}).sort(), ["digest", "name", "path", "version"]) && same({ name: item.name, version: item.version }, expected[index]) && typeof item.path === "string" && !isAbsolute(item.path) && !item.path.split("/").includes("..") && /^[a-f0-9]{64}$/.test(item.digest))
    if (bytes !== canonical(metadata) || !same(Object.keys(metadata).sort(), keys) || !same({ schema: metadata.schema, lockDigest: metadata.lockDigest, packageDigest: metadata.packageDigest, bun: metadata.bun, host: metadata.host }, identity) || !same(metadata.commandPolicy, policy("<private-cache>", "<private-home>")) || !same(metadata.topology, expected) || !validSources || metadata.integrity !== metadataIntegrity(metadata)) fail("ENV_IMMUTABLE")
    if (metadata.treeDigest !== treeDigest(join(target, "node_modules"), "ENV_IMMUTABLE")) fail("ENV_IMMUTABLE")
    return metadata
  } catch (cause) { if (cause.code?.startsWith(C)) throw cause; fail("ENV_IMMUTABLE", cause) }
}
function packageRoots(modules, error) {
  safeDirectory(modules, error); const roots = []
  for (const name of readdirSync(modules).sort()) {
    if (name === ".bin") continue
    const path = join(modules, name); safeDirectory(path, error)
    if (name.startsWith("@")) for (const child of readdirSync(path).sort()) { const scoped = join(path, child); safeDirectory(scoped, error); roots.push(scoped) }
    else roots.push(path)
  }
  return roots
}
function cacheRoots(root, error) {
  safeDirectory(root, error); try { if (realpathSync(root) !== root) fail(error) } catch (cause) { if (cause.code?.startsWith(C)) throw cause; fail(error, cause) }
  const roots = [], hasPackage = (path) => { try { const info = lstatSync(join(path, "package.json")); if (info.isSymbolicLink() || !info.isFile()) fail(error); return true } catch (cause) { if (cause.code === "ENOENT") return false; if (cause.code?.startsWith(C)) throw cause; fail(error, cause) } }
  const directories = (container) => readdirSync(container).sort().flatMap((name) => {
    const path = join(container, name); let info
    try { info = lstatSync(path) } catch (cause) { fail(error, cause) }
    if (info.isSymbolicLink() || (!info.isDirectory() && !info.isFile())) fail(error)
    if (info.isFile()) return []
    safeDirectory(path, error); return [path]
  })
  for (const path of directories(root)) {
    if (basename(path).startsWith("@")) { for (const scoped of directories(path)) if (hasPackage(scoped)) roots.push(scoped) }
    else if (hasPackage(path)) roots.push(path)
  }
  return roots
}
function installedTopology(modules, expected, cacheInodes) {
  const topology = [], seen = new Set(), visit = (container) => {
    for (const root of packageRoots(container, "ENV_INVALID")) {
      const item = readPackage(root, "ENV_INVALID"), key = `${item.name}@${item.version}`; if (seen.has(key)) fail("ENV_INVALID"); seen.add(key); topology.push(item)
      const nested = join(root, "node_modules"); if (existsSync(nested)) visit(nested)
    }
  }
  visit(modules); topology.sort(byPackage); if (!same(topology, expected)) fail("ENV_INVALID")
  return { topology, treeDigest: treeDigest(modules, "ENV_INVALID", cacheInodes) }
}
async function boundedSpawn({ bunPath, args, cwd, env, timeoutMs = 30_000, maxBuffer = 1024 * 1024 }) {
  const child = Bun.spawn([bunPath, ...args], { cwd, env, stdout: "pipe", stderr: "pipe" }); let timedOut = false, buffered = 0, stdout = ""
  const consume = async (stream, capture = false) => { const reader = stream.getReader(); while (true) { const { done, value } = await reader.read(); if (done) return; buffered += value.byteLength; if (buffered > maxBuffer) { child.kill(); fail("MATERIALIZATION_FAILED") } if (capture) stdout += new TextDecoder().decode(value) } }
  const timer = setTimeout(() => { timedOut = true; child.kill() }, timeoutMs)
  try { const [exitCode] = await Promise.all([child.exited, consume(child.stdout, true), consume(child.stderr)]); if (timedOut) fail("MATERIALIZATION_TIMEOUT"); return { exitCode, stdout } } finally { clearTimeout(timer) }
}
const defaultRun = ({ bunPath, cwd, policy: command }) => boundedSpawn({ bunPath, cwd, ...command })
async function defaultDiscover({ bunPath, cacheRun, env }) {
  const outcome = await (cacheRun ?? boundedSpawn)({ bunPath, args: ["pm", "cache"], env, timeoutMs: 30_000, maxBuffer: 1024 * 1024 })
  if (outcome?.exitCode !== 0) fail("CACHE_INCOMPLETE"); const lines = String(outcome.stdout ?? "").trim().split(/\r?\n/).filter(Boolean); if (lines.length !== 1 || !isAbsolute(lines[0])) fail("CACHE_INVALID")
  const root = lines[0]
  return cacheRoots(root, "CACHE_INVALID").map((path) => ({ path, relative: relative(root, path) }))
}
function syncTree(root) { const visit = (path) => { const info = lstatSync(path); if (info.isSymbolicLink()) return; if (info.isDirectory()) for (const name of readdirSync(path)) visit(join(path, name)); const fd = openSync(path, "r"); fsyncSync(fd); closeSync(fd) }; visit(root) }

export async function materializeDependencyEnvironment(input, adapters = {}) {
  const { dataRoot, packageBytes, lockBytes, bun, host = { os: process.platform, cpu: process.arch } } = input ?? {}
  if (!isAbsolute(dataRoot ?? "") || !Buffer.isBuffer(packageBytes) || !Buffer.isBuffer(lockBytes) || bun?.version !== "1.3.14" || !Buffer.isBuffer(bun.bytes) || !isAbsolute(bun.path ?? "") || !host.os || !host.cpu) fail("INPUT_INVALID")
  let lock
  try { lock = Bun.JSONC.parse(lockBytes.toString()); const manifest = JSON.parse(packageBytes.toString()); if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) fail("INPUT_INVALID") } catch (cause) { if (cause.code?.startsWith(C)) throw cause; fail("INPUT_INVALID", cause) }
  const expected = expectedFrom(lock, host), digest = hash(lockBytes), identity = { schema: 1, lockDigest: digest, packageDigest: hash(packageBytes), bun: { version: bun.version, digest: hash(bun.bytes) }, host }
  const parent = join(dataRoot, "dependency-environments"), target = join(parent, digest)
  if (existsSync(target)) { const metadata = validateExisting(target, identity, expected); return { created: false, digest, path: target, metadata } }
  const operation = join(parent, `.tmp-${digest}-${randomUUID()}`), privateCache = join(operation, "private-cache"), home = join(operation, "home"), cwd = join(operation, "input")
  mkdirSync(parent, { recursive: true, mode: 0o700 }); safeDirectory(dataRoot, "ENV_INVALID"); safeDirectory(parent, "ENV_INVALID"); for (const path of [privateCache, home, `${home}/.cache`, `${home}/tmp`, cwd]) mkdirSync(path, { recursive: true, mode: 0o700 })
  try {
    const command = policy(privateCache, home), usingDefault = !adapters.discover
    const discovered = await (adapters.discover ?? defaultDiscover)({ lock, host, bunPath: bun.path, cacheRun: adapters.cacheRun, env: command.env })
    if (!Array.isArray(discovered)) fail("CACHE_INVALID")
    const candidates = new Map(), wanted = new Set(expected.map((item) => `${item.name}@${item.version}`))
    for (const entry of discovered) {
      const path = typeof entry === "string" ? entry : entry?.path, relativePath = typeof entry === "string" ? basename(entry) : entry?.relative
      if (typeof path !== "string" || !isAbsolute(path) || !relativePath || isAbsolute(relativePath) || relativePath.split("/").includes("..")) fail("CACHE_INVALID")
      safeDirectory(path, "CACHE_INVALID"); const pkg = readPackage(path, "CACHE_INVALID"), key = `${pkg.name}@${pkg.version}`
      if (!wanted.has(key)) { if (usingDefault) continue; fail("CACHE_INVALID") } if (candidates.has(key)) fail("CACHE_INVALID"); walk(path, "CACHE_INVALID"); candidates.set(key, { path, relativePath })
    }
    const selected = expected.map((item) => candidates.get(`${item.name}@${item.version}`)); if (selected.some((entry) => !entry)) fail("CACHE_INCOMPLETE")
    const sourcePaths = selected.map((entry) => entry.path), clonePaths = selected.map((entry) => join(privateCache, entry.relativePath)), before = sourceSnapshot(sourcePaths)
    for (let index = 0; index < selected.length; index++) { mkdirSync(dirname(clonePaths[index]), { recursive: true }); cpSync(selected[index].path, clonePaths[index], { recursive: true, dereference: false, errorOnExist: true }) }
    const clone = sourceSnapshot(clonePaths); writeFileSync(join(cwd, "package.json"), packageBytes); writeFileSync(join(cwd, "bun.lock"), lockBytes)
    let outcome
    try { outcome = await (adapters.run ?? defaultRun)({ cwd, cacheDir: privateCache, policy: command, bunPath: bun.path }) } catch (cause) { if (cause.name === "TimeoutError") fail("MATERIALIZATION_TIMEOUT", cause); if (cause.code?.startsWith(C)) throw cause; fail("MATERIALIZATION_FAILED", cause) }
    if (outcome?.exitCode !== 0) fail("MATERIALIZATION_FAILED")
    if (sourceSnapshot(sourcePaths).digest !== before.digest || sourceSnapshot(clonePaths).digest !== clone.digest) fail("SOURCE_CHANGED")
    if (!readFileSync(join(cwd, "package.json")).equals(packageBytes) || !readFileSync(join(cwd, "bun.lock")).equals(lockBytes)) fail("ENV_INVALID")
    const verified = installedTopology(join(cwd, "node_modules"), expected, clone.inodes), metadata = { ...identity, commandPolicy: policy("<private-cache>", "<private-home>"), topology: verified.topology, treeDigest: verified.treeDigest, sources: selected.map((entry, index) => ({ name: expected[index].name, version: expected[index].version, path: entry.relativePath, digest: treeDigest(entry.path, "SOURCE_CHANGED") })) }
    metadata.integrity = metadataIntegrity(metadata); rmSync(privateCache, { recursive: true, force: true }); renameSync(join(cwd, "node_modules"), join(operation, "node_modules")); rmSync(cwd, { recursive: true }); rmSync(home, { recursive: true }); writeFileSync(join(operation, "metadata.json"), canonical(metadata), { mode: 0o400 })
    syncTree(join(operation, "node_modules")); for (const path of [join(operation, "metadata.json"), operation, parent]) { const fd = openSync(path, "r"); fsyncSync(fd); closeSync(fd) }
    try { renameSync(operation, target) } catch (cause) { if (!["EEXIST", "ENOTEMPTY"].includes(cause.code)) throw cause; const winner = validateExisting(target, identity, expected); return { created: false, digest, path: target, metadata: winner } }
    return { created: true, digest, path: target, metadata }
  } catch (cause) { if (cause.code?.startsWith(C)) throw cause; fail("ENV_INVALID", cause) } finally { if (existsSync(operation)) rmSync(operation, { recursive: true, force: true }) }
}
