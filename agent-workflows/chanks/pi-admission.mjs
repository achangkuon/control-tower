// Builds the admission bundle that `pi-authority.mjs` expects, from git and the installed
// Radar alone. No external envelope is consumed: everything here is captured live, by this
// module, from trusted executables it resolves itself.
//
// Two kinds of key exist. `session` names one plan Session (state LISTO or EN CURSO) and
// derives its files, Cimiento grants and declared resources from Radar's own structured status,
// for display in Pi's own confirmation question. `planning` names no Session and authorizes
// exactly the two planning artifacts — nothing here reads plan.yaml itself; Radar's installed
// binary is still the only source of truth about the repository.
//
// Since Engram 11475, a key is purely referential: it identifies which Session (or planning) a
// Pi is working, for the Main agent, and confines nothing once active. Git and Radar are
// consulted here exactly once, at request time, to build the confirmation the human sees and the
// `radar` evidence pi-authority.mjs's admission validation still expects. `identidadActual()`
// never re-derives any of that: it is the fixed identity this request was built with, so HEAD
// advancing (the agent's own commits) and any plan row changing later — this Session's own row
// included — never drop the key, and no subprocess is ever spawned again on its account. (The
// generated Pi extension no longer even calls anything that would reach this function on every
// tool call — see install.py — but it stays this cheap regardless of who calls it.)

import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { lstatSync, realpathSync } from "node:fs"
import { basename, delimiter, isAbsolute, join, relative, resolve, sep } from "node:path"

const LISTO_STATES = new Set(["LISTO", "EN CURSO"])
const PLANNING_FILES = ["openspec/plan.yaml", "openspec/ROADMAP.md"]
const SESSION = /^S[1-9][0-9]*$/
const SHA_256 = /^[a-f0-9]{64}$/

const fail = (message) => {
  throw new Error(`pi-admission: ${message}`)
}

const inside = (root, path) => {
  const rel = relative(root, path)
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel))
}

const defaultDependencies = () => ({
  execFile: execFileSync,
  pathEnv: process.env.PATH ?? "",
  realpath: realpathSync,
  lstat: lstatSync,
})

const withDefaults = (dependencies) => ({ ...defaultDependencies(), ...(dependencies ?? {}) })

const canonicalRepositoryRoot = (root, deps) => {
  if (typeof root !== "string" || root.trim() === "" || !isAbsolute(root)) fail("repositoryRoot inválido")
  let canonical
  try {
    canonical = deps.realpath(root)
    if (!deps.lstat(canonical).isDirectory()) fail("repositoryRoot no es un directorio")
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("pi-admission:")) throw error
    fail("repositoryRoot no existe")
  }
  if (canonical !== root) fail("repositoryRoot debe estar ya resuelto de forma canónica")
  return canonical
}

const canonicalRepoFile = (root, relativePath, deps) => {
  const candidate = resolve(root, relativePath)
  let canonical
  let stat
  try {
    stat = deps.lstat(candidate)
    canonical = deps.realpath(candidate)
  } catch {
    fail(`«${relativePath}» no existe todavía en el repositorio`)
  }
  if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1) {
    fail(`«${relativePath}» no es un archivo regular autorizable`)
  }
  if (canonical !== candidate || !inside(root, canonical)) fail(`«${relativePath}» escapa del repositorio`)
  return canonical
}

// A file that does not exist yet on disk is not, by itself, a reason to refuse the whole
// admission (R3-new-file-blocks-admission): a Session may legitimately declare a file it plans
// to create. What still must hold is path safety — the candidate's containing directory already
// exists inside the repository, with no symlink anywhere in the chain down to it. Creating the
// file is left entirely to whatever harness the Session uses; pi-controls.mjs is not touched
// here and grants nothing for a path that does not exist.
const repoPathStatus = (root, relativePath, deps) => {
  const candidate = resolve(root, relativePath)
  let stat
  try {
    stat = deps.lstat(candidate)
  } catch {
    stat = null
  }
  if (stat) {
    let canonical
    try {
      canonical = deps.realpath(candidate)
    } catch {
      fail(`«${relativePath}» no se pudo resolver`)
    }
    if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1) {
      fail(`«${relativePath}» no es un archivo regular autorizable`)
    }
    if (canonical !== candidate || !inside(root, canonical)) fail(`«${relativePath}» escapa del repositorio`)
    return { path: canonical, exists: true }
  }
  let canonicalParent
  try {
    canonicalParent = deps.realpath(resolve(candidate, ".."))
    if (!deps.lstat(canonicalParent).isDirectory()) fail(`«${relativePath}» no es declarable`)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("pi-admission:")) throw error
    fail(`el directorio de «${relativePath}» no existe todavía en el repositorio`)
  }
  if (!inside(root, canonicalParent)) fail(`«${relativePath}» escapa del repositorio`)
  return { path: join(canonicalParent, basename(candidate)), exists: false }
}

// A file that may legitimately be absent (openspec/ROADMAP.md before it is ever rendered) is
// simply left out — never an error — while an existing-but-invalid path (a symlink, a
// directory, a non-regular file) still fails closed via canonicalRepoFile.
const optionalRepoFile = (root, relativePath, deps) => {
  const candidate = resolve(root, relativePath)
  try {
    deps.lstat(candidate)
  } catch {
    return null
  }
  return canonicalRepoFile(root, relativePath, deps)
}

const canonicalExecutable = (path, deps) => {
  try {
    const canonical = deps.realpath(path)
    if (canonical !== path) return null
    const stat = deps.lstat(canonical)
    if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o111) === 0) return null
    return canonical
  } catch {
    return null
  }
}

// resolveExecutable never trusts a model-, caller-, or repository-supplied path: it only ever
// walks the process PATH and refuses any candidate that resolves inside the repository.
export const resolveExecutable = (name, repositoryRoot, dependencies) => {
  const deps = withDefaults(dependencies)
  for (const dir of deps.pathEnv.split(delimiter).filter(Boolean)) {
    if (!isAbsolute(dir)) continue
    const candidate = canonicalExecutable(join(dir, name), deps)
    if (candidate && !inside(repositoryRoot, candidate)) return candidate
  }
  fail(`no se encontró un ejecutable confiable para «${name}» fuera del repositorio`)
}

// A timeout fails a mutation-relevant capture closed instead of letting a wedged git or Radar
// process hang admission forever (R3-no-exec-timeout).
const EXEC_TIMEOUT_MS = 10_000

const run = (executable, args, cwd, deps) => {
  try {
    return deps.execFile(executable, args, { cwd, stdio: ["ignore", "pipe", "ignore"], timeout: EXEC_TIMEOUT_MS })
  } catch (error) {
    fail(`no se pudo ejecutar ${[executable, ...args].join(" ")}: ${error.message}`)
  }
}

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex")

const captureHead = (git, root, deps) => {
  const raw = run(git, ["rev-parse", "HEAD"], root, deps).toString("utf8").trim()
  if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(raw)) fail("git rev-parse HEAD devolvió un valor inesperado")
  return raw
}

const captureStatus = (radar, root, deps) => {
  const raw = run(radar, ["status", "--json", "-C", root], root, deps)
  let parsed
  try {
    parsed = JSON.parse(raw.toString("utf8"))
  } catch {
    fail("radar status --json no devolvió JSON válido")
  }
  if (!parsed || parsed.schema !== "radar.snapshot/v1" || !Array.isArray(parsed.sesiones)) {
    fail("radar status --json no trae el schema esperado")
  }
  return { raw, parsed }
}

const captureSessionRaw = (radar, root, sessionId, deps) => {
  const raw = run(radar, ["sesion", sessionId, "-C", root], root, deps)
  if (!raw.toString("utf8").includes(sessionId)) fail("radar sesion no devolvió evidencia de la Sesión pedida")
  return raw
}

const sessionRow = (status, sessionId) => {
  const row = status.parsed.sesiones.find((entry) => entry?.id === sessionId)
  if (!row) fail(`la Sesión «${sessionId}» no aparece en radar status`)
  if (!LISTO_STATES.has(row.estado)) fail(`la Sesión «${sessionId}» no está LISTO ni EN CURSO`)
  return row
}

// Declared files that already exist go to `authorizedFiles`; declared files that do not yet
// exist go to `newFiles`, listed for the human but excluded from the retained-fd set below —
// there is nothing to retain a handle to. A Session with no existing file at all still has
// nothing to authorize, so the caller must reject an empty `authorizedFiles`.
const archivoStatuses = (root, list, deps) => {
  if (!Array.isArray(list) || list.length === 0) fail("la Sesión no declara archivos")
  const result = list.map((relativePath) => repoPathStatus(root, relativePath, deps))
  const paths = result.map((entry) => entry.path)
  if (new Set(paths).size !== paths.length) fail("archivos duplicados")
  return result
}

const cimientosFromRow = (root, row, authorizedFiles, deps) => {
  const declared = Array.isArray(row.cimientos) ? row.cimientos : []
  return declared.map((relativePath) => {
    const canonical = canonicalRepoFile(root, relativePath, deps)
    if (!authorizedFiles.includes(canonical)) {
      fail(`Cimiento «${relativePath}» no está entre los archivos autorizados de la Sesión`)
    }
    return canonical
  })
}

// Radar's `recurso` is free text, not a structured id/mode pair. Every declared resource is
// treated as exclusive: that is the coordination Radar's own model exists to name. `confirmed`
// is set true here because the one real confirmation gate is the human accepting Pi's own
// question before `pi-authority.mjs` moves this bundle from pending to active — there is no
// earlier, separate confirmation step to represent.
const resourcesFromRow = (row) => {
  const declared = Array.isArray(row?.recurso) ? row.recurso : []
  return declared.map((description) => ({ id: description, mode: "exclusive", confirmed: true }))
}

// buildAdmission captures once, at request time, everything Pi's own confirmation question
// needs to show: the Session's (or planning's) files, Cimientos, resources and base commit.
// `identidadActual` below never repeats any of this: a referential key has nothing left to
// revalidate against git or Radar, so it is simply the fixed identity captured here, forever.
export const buildAdmission = ({ repositoryRoot, kind, sessionId, runtimeIdentity, candidateDigest, dependencies } = {}) => {
  const deps = withDefaults(dependencies)
  const root = canonicalRepositoryRoot(repositoryRoot, deps)
  if (kind !== "session" && kind !== "planning") fail("kind debe ser «session» o «planning»")
  if (kind === "session" && (typeof sessionId !== "string" || !SESSION.test(sessionId))) fail("sessionId inválido")
  if (typeof runtimeIdentity !== "string" || runtimeIdentity.trim() === "") fail("runtimeIdentity requerido")
  if (typeof candidateDigest !== "string" || !SHA_256.test(candidateDigest)) fail("candidateDigest inválido")

  const git = deps.git ?? resolveExecutable("git", root, deps)
  const radar = deps.radar ?? resolveExecutable("radar", root, deps)

  const baseCommit = captureHead(git, root, deps)

  let effectiveSessionId
  let authorizedFiles
  let newFiles
  let cimientoGrants
  let resources
  let sessionDigest = ""

  if (kind === "session") {
    const status = captureStatus(radar, root, deps)
    const row = sessionRow(status, sessionId)
    // pi-authority.mjs's admission validation still expects a `radar.sessionDigest` for a
    // Session key — a real digest of this Session's own `radar sesion` text, computed once here
    // and never recomputed. It is evidence shown alongside the bundle, not a value anything ever
    // re-derives to decide whether the key survives (Engram 11475).
    sessionDigest = sha256(captureSessionRaw(radar, root, sessionId, deps))
    const statuses = archivoStatuses(root, row.archivos, deps)
    authorizedFiles = statuses.filter((entry) => entry.exists).map((entry) => entry.path)
    newFiles = statuses.filter((entry) => !entry.exists).map((entry) => entry.path)
    if (authorizedFiles.length === 0) fail("la Sesión no tiene archivos existentes para autorizar")
    cimientoGrants = cimientosFromRow(root, row, authorizedFiles, deps)
    resources = resourcesFromRow(row)
    effectiveSessionId = sessionId
  } else {
    effectiveSessionId = "PLANNING"
    // A missing openspec/ROADMAP.md must never block the planning key
    // (R3-missing-roadmap-blocks-planning): plan.yaml is always required, ROADMAP.md only when
    // it already exists.
    const roadmap = optionalRepoFile(root, PLANNING_FILES[1], deps)
    authorizedFiles = roadmap
      ? [canonicalRepoFile(root, PLANNING_FILES[0], deps), roadmap]
      : [canonicalRepoFile(root, PLANNING_FILES[0], deps)]
    newFiles = []
    cimientoGrants = []
    resources = []
  }

  const bundle = Object.freeze({
    repositoryRoot: root,
    kind,
    sessionId: effectiveSessionId,
    baseCommit,
    candidateDigest,
    runtimeIdentity,
    radar: kind === "session" ? Object.freeze({ sessionDigest }) : Object.freeze({}),
    authorizedFiles: Object.freeze([...authorizedFiles]),
    newFiles: Object.freeze([...newFiles]),
    cimientoGrants: Object.freeze([...cimientoGrants]),
    resources: Object.freeze(resources.map((resource) => Object.freeze({ ...resource }))),
  })

  // The identity a key is bound to, fixed forever at this point. No later call ever spawns git
  // or Radar again on its account (Engram 11475): the key only identifies, for the Main agent,
  // which Session or planning a Pi is working — it does not keep proving that identity is still
  // "live" in some stronger sense, because nothing here confines anything for it to protect.
  const fixedIdentity = Object.freeze({
    repositoryRoot: root,
    kind,
    sessionId: effectiveSessionId,
    baseCommit,
    candidateDigest,
    runtimeIdentity,
  })
  const identidadActual = () => fixedIdentity

  return Object.freeze({ bundle, identidadActual })
}
