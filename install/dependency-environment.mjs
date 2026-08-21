import { createHash, randomUUID } from "node:crypto"
import { accessSync, closeSync, constants, cpSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, readlinkSync, realpathSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs"
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
function publishedEnvironment(target, error, lockDigest) {
  try {
    safeDirectory(target, error); if (realpathSync(target) !== target) fail(error)
    const metadataPath = join(target, "metadata.json"), modules = join(target, "node_modules"), info = lstatSync(metadataPath), bytes = readFileSync(metadataPath, "utf8"), metadata = JSON.parse(bytes), hex = /^[a-f0-9]{64}$/
    safeDirectory(modules, error); if (realpathSync(modules) !== modules || !info.isFile() || info.isSymbolicLink() || (info.mode & 0o777) !== 0o400) fail(error)
    const keys = ["bun", "commandPolicy", "host", "integrity", "lockDigest", "packageDigest", "schema", "sources", "topology", "treeDigest"]
    const validTopology = Array.isArray(metadata.topology) && metadata.topology.every((item) => same(Object.keys(item ?? {}).sort(), ["name", "version"]) && typeof item.name === "string" && item.name.length > 0 && typeof item.version === "string" && item.version.length > 0) && same(metadata.topology, [...metadata.topology].sort(byPackage)) && new Set(metadata.topology.map((item) => `${item.name}@${item.version}`)).size === metadata.topology.length
    const validSources = validTopology && Array.isArray(metadata.sources) && metadata.sources.length === metadata.topology.length && metadata.sources.every((item, index) => same(Object.keys(item ?? {}).sort(), ["digest", "name", "path", "version"]) && same({ name: item.name, version: item.version }, metadata.topology[index]) && typeof item.path === "string" && item.path.length > 0 && !isAbsolute(item.path) && !item.path.split(/[\\/]/).includes("..") && hex.test(item.digest))
    if (bytes !== canonical(metadata) || !same(Object.keys(metadata ?? {}).sort(), keys) || metadata.schema !== 1 || (lockDigest && metadata.lockDigest !== lockDigest) || !hex.test(metadata.lockDigest ?? "") || !hex.test(metadata.packageDigest ?? "") || !same(Object.keys(metadata.bun ?? {}).sort(), ["digest", "version"]) || metadata.bun.version !== "1.3.14" || !hex.test(metadata.bun.digest ?? "") || typeof metadata.host?.os !== "string" || !metadata.host.os || typeof metadata.host?.cpu !== "string" || !metadata.host.cpu || !same(metadata.commandPolicy, policy("<private-cache>", "<private-home>")) || !validSources || !hex.test(metadata.treeDigest ?? "") || metadata.integrity !== metadataIntegrity(metadata) || metadata.treeDigest !== treeDigest(modules, error)) fail(error)
    return metadata
  } catch (cause) { if (cause.code === `${C}${error}`) throw cause; fail(error, cause) }
}
function validateExisting(target, identity, expected) {
  const metadata = publishedEnvironment(target, "ENV_IMMUTABLE", identity.lockDigest)
  if (!same({ schema: metadata.schema, lockDigest: metadata.lockDigest, packageDigest: metadata.packageDigest, bun: metadata.bun, host: metadata.host }, identity) || !same(metadata.topology, expected)) fail("ENV_IMMUTABLE")
  return metadata
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

const bindingRecord = (digest) => ({ schema: 1, digest })
function bindingTarget(dataRoot, digest) {
  if (!isAbsolute(dataRoot ?? "") || !/^[a-f0-9]{64}$/.test(digest ?? "")) fail("BINDING_INVALID")
  const root = join(dataRoot, "dependency-environments"), environment = join(root, digest), modules = join(environment, "node_modules")
  try {
    for (const path of [dataRoot, root]) { safeDirectory(path, "BINDING_INVALID"); if (realpathSync(path) !== path) fail("BINDING_INVALID") }
    publishedEnvironment(environment, "BINDING_INVALID", digest)
    return modules
  } catch (cause) { if (cause.code === `${C}BINDING_INVALID`) throw cause; fail("BINDING_INVALID", cause) }
}
export function verifyDependencyEnvironmentBinding({ dataRoot, versionRoot, digest }) {
  try {
    safeDirectory(versionRoot, "BINDING_INVALID"); if (realpathSync(versionRoot) !== versionRoot) fail("BINDING_INVALID")
    const target = bindingTarget(dataRoot, digest), metadataPath = join(versionRoot, ".dependency-environment.json"), link = join(versionRoot, "node_modules"), expected = relative(versionRoot, target)
    const metadataInfo = lstatSync(metadataPath), bytes = readFileSync(metadataPath, "utf8"), metadata = JSON.parse(bytes), linkInfo = lstatSync(link), actual = readlinkSync(link)
    if (!metadataInfo.isFile() || metadataInfo.isSymbolicLink() || (metadataInfo.mode & 0o777) !== 0o400 || bytes !== canonical(metadata) || !same(Object.keys(metadata), ["schema", "digest"]) || !same(metadata, bindingRecord(digest)) || !linkInfo.isSymbolicLink() || isAbsolute(actual) || actual !== expected || realpathSync(link) !== target) fail("BINDING_INVALID")
    return { dependencyDigest: digest, target, linkTarget: expected }
  } catch (cause) { if (cause.code === `${C}BINDING_INVALID`) throw cause; fail("BINDING_INVALID", cause) }
}
export function bindDependencyEnvironment({ dataRoot, versionRoot, digest }) {
  try {
    const target = bindingTarget(dataRoot, digest), expected = relative(versionRoot, target); safeDirectory(versionRoot, "BINDING_INVALID")
    if (existsSync(join(versionRoot, ".dependency-environment.json")) || existsSync(join(versionRoot, "node_modules"))) fail("BINDING_INVALID")
    writeFileSync(join(versionRoot, ".dependency-environment.json"), canonical(bindingRecord(digest)), { mode: 0o400 }); symlinkSync(expected, join(versionRoot, "node_modules"))
    return verifyDependencyEnvironmentBinding({ dataRoot, versionRoot, digest })
  } catch (cause) { if (cause.code === `${C}BINDING_INVALID`) throw cause; fail("BINDING_INVALID", cause) }
}

function readBindingDigest(versionRoot, error = "RETENTION_INVALID") {
  const record = join(versionRoot, ".dependency-environment.json"), link = join(versionRoot, "node_modules")
  try {
    const present = (path) => { try { lstatSync(path); return true } catch (cause) { if (cause.code === "ENOENT") return false; fail(error, cause) } }
    const hasRecord = present(record), hasLink = present(link)
    if (!hasRecord && !hasLink) { if (!existsSync(join(versionRoot, "install/dependency-environment.mjs"))) return null; fail(error) }
    if (!hasRecord || !hasLink) fail(error)
    const metadata = JSON.parse(readFileSync(record, "utf8"))
    if (!same(Object.keys(metadata ?? {}), ["schema", "digest"]) || metadata.schema !== 1 || !/^[a-f0-9]{64}$/.test(metadata.digest ?? "")) fail(error)
    return metadata.digest
  } catch (cause) { if (cause.code === `${C}${error}`) throw cause; fail(error, cause) }
}

export function dependencyEnvironmentRetention(dataRoot) {
  try {
    const versions = join(dataRoot, "versions"), environments = join(dataRoot, "dependency-environments"), referenced = new Set()
    if (existsSync(versions)) {
      safeDirectory(versions, "RETENTION_INVALID")
      for (const name of readdirSync(versions).sort()) {
        if (name.startsWith(".tmp-")) continue
        const versionRoot = join(versions, name); safeDirectory(versionRoot, "RETENTION_INVALID")
        const digest = readBindingDigest(versionRoot); if (digest) { verifyDependencyEnvironmentBinding({ dataRoot, versionRoot, digest }); referenced.add(digest) }
      }
    }
    const candidates = [], temporaries = []
    if (existsSync(environments)) {
      safeDirectory(environments, "RETENTION_INVALID")
      for (const name of readdirSync(environments).sort()) {
        const path = join(environments, name), info = lstatSync(path)
        if (!info.isDirectory() || info.isSymbolicLink()) fail("RETENTION_INVALID")
        if (name.startsWith(".tmp-")) { if (!/^\.tmp-[a-f0-9]{64}-[0-9a-f-]{36}$/.test(name)) fail("RETENTION_INVALID"); temporaries.push(name); continue }
        if (!/^[a-f0-9]{64}$/.test(name)) fail("RETENTION_INVALID")
        publishedEnvironment(path, "RETENTION_INVALID", name)
        if (!referenced.has(name)) candidates.push(name)
      }
    }
    return { referenced: [...referenced].sort(), candidates, temporaries }
  } catch (cause) { if (cause.code === `${C}RETENTION_INVALID`) throw cause; fail("RETENTION_INVALID", cause) }
}

function dependencyInput(input) {
  const { dataRoot, packageBytes, lockBytes, bun, host = { os: process.platform, cpu: process.arch } } = input ?? {}
  if (!isAbsolute(dataRoot ?? "") || !Buffer.isBuffer(packageBytes) || !Buffer.isBuffer(lockBytes) || bun?.version !== "1.3.14" || !Buffer.isBuffer(bun.bytes) || !isAbsolute(bun.path ?? "") || !host.os || !host.cpu) fail("INPUT_INVALID")
  try {
    const lock = Bun.JSONC.parse(lockBytes.toString()), manifest = JSON.parse(packageBytes.toString()); if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) fail("INPUT_INVALID")
    const digest = hash(lockBytes), identity = { schema: 1, lockDigest: digest, packageDigest: hash(packageBytes), bun: { version: bun.version, digest: hash(bun.bytes) }, host }
    return { dataRoot, packageBytes, lockBytes, bun, host, lock, digest, identity, expected: expectedFrom(lock, host) }
  } catch (cause) { if (cause.code?.startsWith(C)) throw cause; fail("INPUT_INVALID", cause) }
}

export function resolveDependencyEnvironment(input) {
  const parsed = dependencyInput(input), path = join(parsed.dataRoot, "dependency-environments", parsed.digest)
  if (!existsSync(path)) return null
  return { created: false, digest: parsed.digest, path, metadata: validateExisting(path, parsed.identity, parsed.expected) }
}

export async function materializeDependencyEnvironment(input, adapters = {}) {
  const { dataRoot, packageBytes, lockBytes, bun, host, lock, digest, identity, expected } = dependencyInput(input)
  const parent = join(dataRoot, "dependency-environments"), target = join(parent, digest)
  if (existsSync(target)) { const metadata = validateExisting(target, identity, expected); return { created: false, digest, path: target, metadata } }
  const operation = join(parent, `.tmp-${digest}-${randomUUID()}`), privateCache = join(operation, "private-cache"), home = join(operation, "home"), cwd = join(operation, "input")
  mkdirSync(parent, { recursive: true, mode: 0o700 }); safeDirectory(dataRoot, "ENV_INVALID"); safeDirectory(parent, "ENV_INVALID"); for (const path of [privateCache, home, `${home}/.cache`, `${home}/tmp`, cwd]) mkdirSync(path, { recursive: true, mode: 0o700 })
  try {
    const command = policy(privateCache, home), usingDefault = !adapters.discover
    const discovered = expected.length ? await (adapters.discover ?? defaultDiscover)({ lock, host, bunPath: bun.path, cacheRun: adapters.cacheRun, env: command.env }) : []
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
    try { if (expected.length) outcome = await (adapters.run ?? defaultRun)({ cwd, cacheDir: privateCache, policy: command, bunPath: bun.path }); else { mkdirSync(join(cwd, "node_modules")); outcome = { exitCode: 0 } } } catch (cause) { if (cause.name === "TimeoutError") fail("MATERIALIZATION_TIMEOUT", cause); if (cause.code?.startsWith(C)) throw cause; fail("MATERIALIZATION_FAILED", cause) }
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
