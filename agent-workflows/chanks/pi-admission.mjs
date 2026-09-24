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
  "runtimeIdentity", "statusDigest", "sessionDigest",
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

const run = (executable, args, cwd, deps) => {
  try {
    return deps.execFile(executable, args, { cwd, stdio: ["ignore", "pipe", "ignore"] })
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

// buildAdmission does the entire capture in one call: it never caches results across calls, so
// every field it returns reflects this exact invocation. `identidadActual` re-captures live
// evidence and re-reads the proof file on every call, which is what lets `pi-authority.mjs`
// revalidate before each governed operation instead of trusting a snapshot.
export const buildAdmission = ({ repositoryRoot, kind, sessionId, runtimeIdentity, candidateDigest, dependencies } = {}) => {
  const deps = withDefaults(dependencies)
  const root = canonicalRepositoryRoot(repositoryRoot, deps)
  if (kind !== "session" && kind !== "planning") fail("kind debe ser «session» o «planning»")
  if (kind === "session" && (typeof sessionId !== "string" || !SESSION.test(sessionId))) fail("sessionId inválido")
  if (typeof runtimeIdentity !== "string" || runtimeIdentity.trim() === "") fail("runtimeIdentity requerido")
  if (typeof candidateDigest !== "string" || !SHA_256.test(candidateDigest)) fail("candidateDigest inválido")

  const git = deps.git ?? resolveExecutable("git", root, deps)
  const radar = deps.radar ?? resolveExecutable("radar", root, deps)

  const capture = () => {
    const baseCommit = captureHead(git, root, deps)
    const status = captureStatus(radar, root, deps)
    const statusDigest = sha256(status.raw)
    if (kind === "session") {
      const row = sessionRow(status, sessionId)
      const sessionRaw = captureSessionRaw(radar, root, sessionId, deps)
      const statuses = archivoStatuses(root, row.archivos, deps)
      const authorizedFiles = statuses.filter((entry) => entry.exists).map((entry) => entry.path)
      const newFiles = statuses.filter((entry) => !entry.exists).map((entry) => entry.path)
      if (authorizedFiles.length === 0) fail("la Sesión no tiene archivos existentes para autorizar")
      return {
        baseCommit,
        statusDigest,
        sessionDigest: sha256(sessionRaw),
        effectiveSessionId: sessionId,
        authorizedFiles,
        newFiles,
        cimientoGrants: cimientosFromRow(root, row, authorizedFiles, deps),
        resources: resourcesFromRow(row),
      }
    }
    return {
      baseCommit,
      statusDigest,
      sessionDigest: "",
      effectiveSessionId: "PLANNING",
      authorizedFiles: PLANNING_FILES.map((relativePath) => canonicalRepoFile(root, relativePath, deps)),
      newFiles: [],
      cimientoGrants: [],
      resources: [],
    }
  }

  const first = capture()

  const bundle = Object.freeze({
    repositoryRoot: root,
    kind,
    sessionId: first.effectiveSessionId,
    baseCommit: first.baseCommit,
    candidateDigest,
    runtimeIdentity,
    radar: kind === "session"
      ? Object.freeze({ statusDigest: first.statusDigest, sessionDigest: first.sessionDigest })
      : Object.freeze({ statusDigest: first.statusDigest }),
    authorizedFiles: Object.freeze([...first.authorizedFiles]),
    newFiles: Object.freeze([...first.newFiles]),
    cimientoGrants: Object.freeze([...first.cimientoGrants]),
    resources: Object.freeze(first.resources.map((resource) => Object.freeze({ ...resource }))),
  })

  const proofPath = writeProof({
    repositoryRoot: root,
    kind,
    sessionId: first.effectiveSessionId,
    baseCommit: first.baseCommit,
    candidateDigest,
    runtimeIdentity,
    statusDigest: first.statusDigest,
    sessionDigest: first.sessionDigest,
  }, deps)

  const identidadActual = () => {
    const live = capture()
    const proof = readProof(proofPath, deps)
    const matches = (
      proof.repositoryRoot === root
      && proof.kind === kind
      && proof.sessionId === first.effectiveSessionId
      && proof.baseCommit === live.baseCommit
      && proof.candidateDigest === candidateDigest
      && proof.runtimeIdentity === runtimeIdentity
      && proof.statusDigest === live.statusDigest
      && proof.sessionDigest === live.sessionDigest
    )
    if (!matches) fail("la evidencia viva ya no coincide con la admisión")
    return {
      repositoryRoot: root,
      kind,
      sessionId: first.effectiveSessionId,
      baseCommit: live.baseCommit,
      candidateDigest,
      runtimeIdentity,
    }
  }

  const cerrar = () => {
    try { deps.rm(join(proofPath, ".."), { recursive: true, force: true }) } catch {}
  }

  return Object.freeze({ bundle, identidadActual, proofPath, cerrar })
}
