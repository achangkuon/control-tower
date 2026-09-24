// Builds the admission bundle that `pi-authority.mjs` expects, from git and the installed
// Radar alone. No external envelope is consumed: everything here is captured live, by this
// module, from trusted executables it resolves itself.
//
// Two kinds of key exist. `session` names one plan Session (state LISTO or EN CURSO) and
// derives its authorized files, Cimiento grants and declared resources from Radar's own
// structured status. `planning` names no Session and authorizes exactly the two planning
// artifacts — nothing here reads plan.yaml itself; Radar's installed binary is still the only
// source of truth about the repository.

import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  chmodSync, closeSync, constants, fstatSync, lstatSync, mkdtempSync, openSync,
  readSync, realpathSync, rmSync, writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { basename, delimiter, isAbsolute, join, relative, resolve, sep } from "node:path"

const LISTO_STATES = new Set(["LISTO", "EN CURSO"])
const PLANNING_FILES = ["openspec/plan.yaml", "openspec/ROADMAP.md"]
const SESSION = /^S[1-9][0-9]*$/
const SHA_256 = /^[a-f0-9]{64}$/
const PROOF_FIELDS = [
  "repositoryRoot", "kind", "sessionId", "baseCommit", "candidateDigest",
  "runtimeIdentity", "sessionDigest",
]

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
  runtimeDirectory: process.env.XDG_RUNTIME_DIR ?? tmpdir(),
  mkdtemp: mkdtempSync,
  chmod: chmodSync,
  writeFile: writeFileSync,
  realpath: realpathSync,
  lstat: lstatSync,
  open: openSync,
  fstat: fstatSync,
  read: readSync,
  close: closeSync,
  rm: rmSync,
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

const writeProof = (value, deps) => {
  const dir = deps.mkdtemp(join(deps.runtimeDirectory, "chanks-pi-admission-"))
  deps.chmod(dir, 0o700)
  const path = join(dir, "identity.json")
  deps.writeFile(path, JSON.stringify(value), { mode: 0o600, flag: "wx" })
  return path
}

const readProof = (path, deps) => {
  let descriptor
  try {
    const canonical = deps.realpath(path)
    if (canonical !== path) fail("el archivo de evidencia dejó de ser canónico")
    descriptor = deps.open(canonical, constants.O_RDONLY | constants.O_NOFOLLOW)
    const stat = deps.fstat(descriptor)
    if (!stat.isFile() || stat.nlink !== 1) fail("el archivo de evidencia no es regular")
    const buffer = Buffer.alloc(stat.size)
    deps.read(descriptor, buffer, 0, buffer.length, 0)
    const value = JSON.parse(buffer.toString("utf8"))
    if (PROOF_FIELDS.some((field) => !(field in value))) fail("el archivo de evidencia está incompleto")
    return value
  } catch (error) {
    fail(error instanceof Error && error.message.startsWith("pi-admission:") ? error.message : "el archivo de evidencia no se pudo leer")
  } finally {
    if (descriptor !== undefined) try { deps.close(descriptor) } catch {}
  }
}

// buildAdmission captures once, at construction, everything that needs the *whole* plan status
// to derive a Session's authorizedFiles/cimientoGrants/resources. `identidadActual` never
// repeats that whole-plan read: it only re-checks `git rev-parse HEAD` and, for a session key,
// `radar sesion <ID>` — this Session's own contract, rendered as text (state and archivos
// included) — never the full `radar status --json` digest. That whole-file digest used to be
// part of live identity (R3-status-digest-fragility / R3/R4-planning-key-self-invalidates): an
// unrelated Session's row changing, or writing plan.yaml itself, changed that digest and
// silently dropped a key that had nothing to do with either. Binding to the scoped
// `radar sesion <ID>` digest instead means only a change to THIS Session's own row (or base,
// candidate, runtime) still invalidates; a planning key does not call Radar again at all after
// being built, so it survives the very writes it exists to authorize.
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
    const sessionRaw = captureSessionRaw(radar, root, sessionId, deps)
    sessionDigest = sha256(sessionRaw)
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

  const proofPath = writeProof({
    repositoryRoot: root,
    kind,
    sessionId: effectiveSessionId,
    baseCommit,
    candidateDigest,
    runtimeIdentity,
    sessionDigest,
  }, deps)

  const identidadActual = () => {
    const liveBaseCommit = captureHead(git, root, deps)
    const liveSessionDigest = kind === "session"
      ? sha256(captureSessionRaw(radar, root, sessionId, deps))
      : ""
    const proof = readProof(proofPath, deps)
    const matches = (
      proof.repositoryRoot === root
      && proof.kind === kind
      && proof.sessionId === effectiveSessionId
      && proof.baseCommit === liveBaseCommit
      && proof.candidateDigest === candidateDigest
      && proof.runtimeIdentity === runtimeIdentity
      && proof.sessionDigest === liveSessionDigest
    )
    if (!matches) fail("la evidencia viva ya no coincide con la admisión")
    return {
      repositoryRoot: root,
      kind,
      sessionId: effectiveSessionId,
      baseCommit: liveBaseCommit,
      candidateDigest,
      runtimeIdentity,
    }
  }

  const cerrar = () => {
    try { deps.rm(join(proofPath, ".."), { recursive: true, force: true }) } catch {}
  }

  return Object.freeze({ bundle, identidadActual, proofPath, cerrar })
}
