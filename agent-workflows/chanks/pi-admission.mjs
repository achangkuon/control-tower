// Worker admission is derived from the dispatch receipt, never from a tool argument.
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { closeSync, constants, existsSync, fstatSync, lstatSync, openSync, opendirSync, readSync, realpathSync } from "node:fs"
import { basename, delimiter, dirname, isAbsolute, join, relative, resolve, sep } from "node:path"

const fail = (reason) => { throw new Error(`pi-admission: ${reason}`) }
const inside = (root, file) => { const rel = relative(root, file); return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel) }
const dependenciesFor = (provided) => ({ execFile: execFileSync, realpath: realpathSync, lstat: lstatSync, pathEnv: process.env.PATH ?? "", ...provided })
const inCheckout = (file, deps) => {
  let directory = dirname(file)
  while (true) {
    try { deps.lstat(join(directory, ".git")); return true } catch {}
    const parent = dirname(directory)
    if (parent === directory) return false
    directory = parent
  }
}

export const resolveExecutable = (name, root, provided) => {
  const deps = dependenciesFor(provided)
  for (const dir of deps.pathEnv.split(delimiter)) {
    if (!isAbsolute(dir)) continue
    const candidate = join(dir, name)
    try {
      const stat = deps.lstat(candidate)
      if (deps.realpath(candidate) === candidate && stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o111) && !inside(root, candidate) && !inCheckout(candidate, deps)) return candidate
    } catch {}
  }
  fail(`ejecutable ${name} fuera del repositorio no disponible`)
}

const run = (exe, args, root, deps) => {
  try {
    const raw = deps.execFile(exe, args, { cwd: root, stdio: ["ignore", "pipe", "ignore"], timeout: 10_000, maxBuffer: 1024 * 1024 })
    if (!Buffer.isBuffer(raw) && typeof raw !== "string") fail("respuesta no acotada")
    return Buffer.from(raw)
  } catch { fail(`captura fallida: ${basename(exe)} ${args[0]}`) }
}
const line = (buffer) => buffer.toString("utf8").trim()
const sha = (raw) => createHash("sha256").update(raw).digest("hex")
const sameStat = (a, b) => a.dev === b.dev && a.ino === b.ino && a.mode === b.mode &&
  a.nlink === b.nlink && a.size === b.size && a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs
const uniqueJSONKeys = (raw) => {
  const tokens = [...raw.matchAll(/"(?:\\.|[^"\\])*"|[{}\[\]:]/g)].map((match) => match[0])
  const stack = []
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]
    if (token === "{") stack.push(new Set())
    else if (token === "[") stack.push(null)
    else if (token === "}" || token === "]") stack.pop()
    else if (token.startsWith('"') && tokens[index + 1] === ":") {
      const keys = stack.at(-1)
      const key = JSON.parse(token)
      if (!keys || keys.has(key)) fail("marcador con claves duplicadas")
      keys.add(key)
    }
  }
}

// Check every directory in the receipt chain, compare pathname and descriptor both before
// and after a bounded read, and reject duplicate JSON keys rather than JSON.parse's last-wins.
export const readDispatch = (commonDir, root, branch, provided = {}) => {
  const deps = { lstat: lstatSync, open: openSync, fstat: fstatSync, read: readSync, close: closeSync, opendir: opendirSync, ...provided }
  if (!isAbsolute(commonDir) || !/^refs\/heads\/[A-Za-z0-9._\/-]+$/.test(branch)) fail("identidad Git inválida")
  const dir = join(commonDir, "chanks", "despachos")
  const chain = [commonDir, join(commonDir, "chanks"), dir]
  const checked = []
  const directories = []
  const namespace = deps.descriptorNamespace ?? existsSync
  if (!namespace("/proc/self/fd")) fail("namespace de descriptores ausente")
  const inspect = (boundPath, namedPath, directory) => {
    const before = deps.lstat(namedPath)
    const atHandle = deps.lstat(boundPath)
    if (before.isSymbolicLink() || atHandle.isSymbolicLink() || !sameStat(before, atHandle) ||
      (directory ? !before.isDirectory() : !before.isFile()) || (!directory && before.nlink !== 1)) fail("marcador no regular")
    const fd = deps.open(boundPath, (directory ? constants.O_RDONLY | constants.O_DIRECTORY : constants.O_RDONLY) | constants.O_NOFOLLOW)
    try {
      if (!sameStat(before, deps.fstat(fd))) fail("marcador cambió durante apertura")
      checked.push({ path: namedPath, before })
      return fd
    } catch (error) { deps.close(fd); throw error }
  }
  try {
    let bound = commonDir
    for (const [index, path] of chain.entries()) {
      const fd = inspect(bound, path, true)
      directories.push(fd)
      bound = `/proc/self/fd/${fd}/${["chanks", "despachos"][index] ?? ""}`
    }
    const directoryPath = `/proc/self/fd/${directories.at(-1)}`
    const entries = []
    const directory = deps.opendir(directoryPath)
    try {
      for (let index = 0; index <= 256; index++) {
        const entry = directory.readSync()
        if (!entry) break
        entries.push(entry.name)
      }
    } finally { directory.closeSync() }
    if (entries.length > 256) fail("marcadores ambiguos o no acotados")
    let match = null
    for (const entry of entries) {
      if (!/^[A-Za-z][A-Za-z0-9._-]*\.json$/.test(entry)) fail("marcador desconocido")
      const path = join(dir, entry)
      const fd = inspect(join(directoryPath, entry), path, false)
      let raw
      try {
        const stat = deps.fstat(fd)
        if (stat.size > 4096) fail("marcador excede límite")
        const buffer = Buffer.alloc(4097)
        const count = deps.read(fd, buffer, 0, buffer.length, 0)
        if (count > 4096) fail("marcador excede límite")
        const confirm = Buffer.alloc(4097)
        const repeated = deps.read(fd, confirm, 0, confirm.length, 0)
        if (repeated !== count || !buffer.subarray(0, count).equals(confirm.subarray(0, repeated)) ||
          !sameStat(stat, deps.fstat(fd))) fail("marcador cambió durante lectura")
        raw = buffer.subarray(0, count).toString("utf8")
      } finally { deps.close(fd) }
      let marker
      try { marker = JSON.parse(raw); uniqueJSONKeys(raw) } catch { fail("marcador inválido o con claves duplicadas") }
      if (!marker || Array.isArray(marker) || marker.schema !== "radar.despacho/v1" ||
        marker.sesion !== entry.slice(0, -5) || !/^S[1-9][0-9]*$/.test(marker.sesion) ||
        typeof marker.worker !== "string" || !/^[A-Za-z0-9._-]+$/.test(marker.worker) ||
        typeof marker.worktree !== "string" || !isAbsolute(marker.worktree) || resolve(marker.worktree) !== marker.worktree ||
        typeof marker.branch !== "string" || !/^refs\/heads\/[A-Za-z0-9._\/-]+$/.test(marker.branch) || marker.branch.includes("..") ||
        Object.keys(marker).some((key) => !["schema", "sesion", "worker", "worktree", "branch", "review_ready"].includes(key))) fail("contrato del marcador inválido")
      if (marker.review_ready !== undefined) {
        const witness = marker.review_ready
        if (!witness || Array.isArray(witness) || typeof witness !== "object" ||
          Object.keys(witness).some((key) => !["transport", "type", "message_id", "sesion", "received_at", "worker", "worktree", "branch"].includes(key)) ||
          witness.transport !== "intercom" || witness.type !== "listo para revisión" ||
          typeof witness.message_id !== "string" || !/^[^\s]+$/.test(witness.message_id) ||
          typeof witness.received_at !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(witness.received_at) ||
          Number.isNaN(Date.parse(witness.received_at)) || witness.sesion !== marker.sesion ||
          witness.worker !== marker.worker || witness.worktree !== marker.worktree || witness.branch !== marker.branch) fail("testigo del marcador inválido")
      }
      if (marker.worktree === root && marker.branch === branch) {
        if (match) fail("más de un despacho coincide")
        match = { sessionId: marker.sesion, digest: sha(Buffer.from(raw)) }
      }
    }
    for (const { path, before } of checked) if (!sameStat(before, deps.lstat(path))) fail("marcador cambió durante lectura")
    if (!match) fail("no hay despacho exacto para este worktree y branch")
    return match
  } catch (error) { if (error?.message?.startsWith("pi-admission:")) throw error; fail("marcador ausente, inválido o inestable") }
  finally { for (const fd of directories.reverse()) try { deps.close(fd) } catch {} }
}
const fileStatus = (root, name, deps) => {
  if (typeof name !== "string" || !name || isAbsolute(name) || name.split(/[\\/]/).includes("..")) fail("ruta declarada inválida")
  const path = resolve(root, name)
  if (!inside(root, path)) fail("ruta fuera del repositorio")
  let stat
  try { stat = deps.lstat(path) } catch { stat = null }
  if (stat) {
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || deps.realpath(path) !== path) fail("archivo declarado no regular")
    return { path, exists: true }
  }
  const parent = resolve(path, "..")
  if (!inside(root, parent) && parent !== root) fail("directorio inválido")
  try { if (deps.realpath(parent) !== parent || !deps.lstat(parent).isDirectory()) fail("directorio no canónico") } catch { fail("directorio de archivo nuevo inválido") }
  return { path, exists: false }
}

export const buildAdmission = ({ repositoryRoot, kind, sessionId, runtimeIdentity, candidateDigest, dependencies } = {}) => {
  const deps = dependenciesFor(dependencies)
  if (kind !== undefined || sessionId !== undefined) fail("selección del llamador no admitida; hace falta despacho")
  if (!isAbsolute(repositoryRoot ?? "") || deps.realpath(repositoryRoot) !== repositoryRoot || !deps.lstat(repositoryRoot).isDirectory()) fail("repositoryRoot inválido")
  const root = repositoryRoot
  const git = deps.git ?? resolveExecutable("git", root, deps)
  const radar = deps.radar ?? resolveExecutable("radar", root, deps)
  const top = line(run(git, ["rev-parse", "--show-toplevel"], root, deps))
  const commonDir = line(run(git, ["rev-parse", "--path-format=absolute", "--git-common-dir"], root, deps))
  const branch = line(run(git, ["symbolic-ref", "--quiet", "HEAD"], root, deps))
  if (top !== root || !isAbsolute(commonDir) || deps.realpath(commonDir) !== commonDir ||
    !/^refs\/heads\/[A-Za-z0-9._\/-]+$/.test(branch) || branch.includes("..")) fail("identidad Git inválida")
  const marker = readDispatch(commonDir, root, branch, deps.dispatch)
  const capture = () => {
    const headBefore = line(run(git, ["rev-parse", "HEAD"], root, deps))
    const status = run(radar, ["status", "--json", "-C", root], root, deps)
    const headMiddle = line(run(git, ["rev-parse", "HEAD"], root, deps))
    const session = run(radar, ["sesion", marker.sessionId, "-C", root], root, deps)
    const headAfter = line(run(git, ["rev-parse", "HEAD"], root, deps))
    if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(headBefore) || headBefore !== headMiddle || headBefore !== headAfter) fail("HEAD cambió durante captura")
    let parsed
    try { parsed = JSON.parse(status.toString("utf8")) } catch { fail("Radar no devolvió JSON") }
    if (parsed?.schema !== "radar.snapshot/v1" || !Array.isArray(parsed.sesiones) || !session.toString("utf8").includes(marker.sessionId)) fail("Radar inválido")
    const rows = parsed.sesiones.filter((row) => row?.id === marker.sessionId)
    if (rows.length !== 1 || !["LISTO", "EN CURSO"].includes(rows[0].estado)) fail("Sesión no admisible o ambigua")
    return { head: headBefore, status, session, row: rows[0] }
  }
  const first = capture()
  const second = capture()
  if (first.head !== second.head || !first.status.equals(second.status) || !first.session.equals(second.session) ||
    line(run(git, ["symbolic-ref", "--quiet", "HEAD"], root, deps)) !== branch ||
    line(run(git, ["rev-parse", "--path-format=absolute", "--git-common-dir"], root, deps)) !== commonDir ||
    readDispatch(commonDir, root, branch, deps.dispatch).digest !== marker.digest) fail("Radar, HEAD o despacho inestable")
  const row = second.row
  if (!Array.isArray(row.archivos) || !row.archivos.length) fail("Sesión sin archivos")
  const statuses = row.archivos.map((path) => fileStatus(root, path, deps))
  if (new Set(statuses.map((entry) => entry.path)).size !== statuses.length) fail("archivos duplicados")
  if ((row.cimientos !== undefined && !Array.isArray(row.cimientos)) ||
    (row.recurso !== undefined && !Array.isArray(row.recurso))) fail("declaración de Cimiento/Recurso inválida")
  const foundations = row.cimientos ?? []
  const resources = row.recurso ?? []
  if (foundations.length || resources.length) fail("Cimiento/Recurso requiere evidencia de reserva/adquisición que este runtime no posee")
  const files = statuses.filter((entry) => entry.exists).map((entry) => entry.path)
  if (!files.length) fail("ningún archivo existente autorizable")
  const identity = Object.freeze({ repositoryRoot: root, kind: "session", sessionId: marker.sessionId,
    baseCommit: second.head, candidateDigest: candidateDigest ?? sha(second.status), runtimeIdentity: runtimeIdentity ?? `worker:${branch}` })
  const bundle = Object.freeze({ ...identity, radar: { sessionDigest: sha(second.session), statusDigest: sha(second.status), markerDigest: marker.digest },
    authorizedFiles: files, newFiles: statuses.filter((entry) => !entry.exists).map((entry) => entry.path),
    cimientoGrants: [], resources: [] })
  // The live identity is consulted only after a fresh Radar/Git/receipt recapture.
  const recapture = () => {
    const now = buildAdmission({ repositoryRoot: root, runtimeIdentity: identity.runtimeIdentity, candidateDigest: identity.candidateDigest, dependencies })
    if (now.bundle.sessionId !== identity.sessionId || now.bundle.baseCommit !== identity.baseCommit ||
      now.bundle.radar.sessionDigest !== bundle.radar.sessionDigest || now.bundle.radar.statusDigest !== bundle.radar.statusDigest ||
      now.bundle.radar.markerDigest !== bundle.radar.markerDigest ||
      JSON.stringify(now.bundle.authorizedFiles) !== JSON.stringify(bundle.authorizedFiles) ||
      JSON.stringify(now.bundle.newFiles) !== JSON.stringify(bundle.newFiles)) fail("deriva de admisión")
    return now.bundle
  }
  return Object.freeze({ bundle, recapture, identidadActual: () => { recapture(); return identity } })
}
