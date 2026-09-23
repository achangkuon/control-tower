// Ephemeral authority for the Pi host boundary. The host supplies the already-admitted bundle;
// this module only validates and binds it. It neither reads planning artifacts nor calculates
// Radar state, and its closure is deliberately the only place the resulting authority lives.

import { randomUUID } from "node:crypto"
import { closeSync, constants, fstatSync, lstatSync, openSync, realpathSync } from "node:fs"
import { isAbsolute, relative, sep } from "node:path"

import { bloqueado } from "./controls.mjs"
import { aPi, gobernar } from "./pi-controls.mjs"

const SHA_1_OR_256 = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/
const SHA_256 = /^[a-f0-9]{64}$/
const SESSION = /^S[1-9][0-9]*$/
const RESOURCE_MODES = new Set(["exclusive", "serial"])

const fail = (field) => {
  throw new TypeError(`admisión de autoridad inválida: ${field}`)
}

const text = (value, field) => {
  if (typeof value !== "string" || value.trim() === "") fail(field)
  return value
}

const exactObject = (value, field) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(field)
  return value
}

const privateDependencies = (value) => {
  if (value === undefined) return { uuid: randomUUID, open: openSync, close: closeSync, noFollow: constants.O_NOFOLLOW }
  exactObject(value, "privateDependencies")
  if (typeof value.uuid !== "function" || typeof value.open !== "function" || typeof value.close !== "function") fail("privateDependencies")
  return value
}

const canonicalRoot = (root, field) => {
  text(root, field)
  if (!isAbsolute(root)) fail(field)
  let canonical
  try {
    canonical = realpathSync(root)
    if (!lstatSync(canonical).isDirectory()) fail(field)
  } catch {
    fail(field)
  }
  if (canonical !== root) fail(field)
  return canonical
}

const canonicalFile = (root, file, field) => {
  text(file, field)
  if (!isAbsolute(file)) fail(field)
  let canonical
  try {
    const stat = lstatSync(file)
    canonical = realpathSync(file)
    if (stat.isSymbolicLink() || !stat.isFile() || !Number.isSafeInteger(stat.nlink) || stat.nlink !== 1) fail(field)
  } catch {
    fail(field)
  }
  if (canonical !== file) fail(field)
  const contained = relative(root, canonical)
  if (contained === "" || contained === ".." || contained.startsWith(`..${sep}`) || isAbsolute(contained)) fail(field)
  return canonical
}

const identityFromStat = (ruta, stat, field) => {
  if (!Number.isSafeInteger(stat.dev) || stat.dev <= 0 || !Number.isSafeInteger(stat.ino) || stat.ino <= 0) fail(field)
  return { ruta, dispositivo: stat.dev, inodo: stat.ino }
}

const sameFileIdentity = (a, b) => a.ruta === b.ruta && a.dispositivo === b.dispositivo && a.inodo === b.inodo

const fileIdentity = (root, file, field) => {
  const ruta = canonicalFile(root, file, field)
  let stat
  try { stat = lstatSync(ruta) } catch { fail(field) }
  // Device and inode are the stable identity available through Node's filesystem contract. A
  // platform that cannot supply both does not provide trustworthy authority for a writable file.
  return identityFromStat(ruta, stat, field)
}

const closeHandles = (handles, close) => {
  for (const { descriptor } of handles) try { close(descriptor) } catch {}
}

const retainFiles = (root, files, field, dependencies) => {
  if (!Number.isSafeInteger(dependencies.noFollow) || dependencies.noFollow <= 0) fail("O_NOFOLLOW")
  const handles = []
  try {
    for (const file of files) {
      const expected = fileIdentity(root, file, field)
      let descriptor
      try {
        descriptor = dependencies.open(expected.ruta, constants.O_RDONLY | dependencies.noFollow)
        const held = identityFromStat(expected.ruta, fstatSync(descriptor), field)
        const current = fileIdentity(root, expected.ruta, field)
        if (!sameFileIdentity(expected, held) || !sameFileIdentity(expected, current)) fail(field)
        handles.push({ descriptor, ...expected })
        descriptor = null
      } finally {
        if (descriptor !== null && descriptor !== undefined) try { dependencies.close(descriptor) } catch {}
      }
    }
    return handles
  } catch (error) {
    closeHandles(handles, dependencies.close)
    throw error
  }
}

const exactFiles = (root, files, field) => {
  if (!Array.isArray(files) || files.length === 0) fail(field)
  const result = files.map((file) => canonicalFile(root, file, field))
  if (new Set(result).size !== result.length) fail(field)
  return result
}

const cimientoGrants = (root, grants, files) => {
  if (!Array.isArray(grants)) fail("cimientoGrants")
  const result = grants.map((file) => canonicalFile(root, file, "cimientoGrants"))
  if (new Set(result).size !== result.length) fail("cimientoGrants")
  if (result.some((file) => !files.includes(file))) fail("cimientoGrants")
  return result
}

const confirmedResources = (resources) => {
  if (!Array.isArray(resources) || resources.length === 0) fail("resources")
  const result = resources.map((resource) => {
    exactObject(resource, "resources")
    const id = text(resource.id, "resources.id")
    if (!RESOURCE_MODES.has(resource.mode) || resource.confirmed !== true) fail("resources")
    return { id, mode: resource.mode, confirmed: true }
  })
  if (new Set(result.map(({ id }) => id)).size !== result.length) fail("resources")
  return result
}

const binding = (source, field = "identity") => {
  exactObject(source, field)
  const repositoryRoot = canonicalRoot(source.repositoryRoot, `${field}.repositoryRoot`)
  const sessionId = text(source.sessionId, `${field}.sessionId`)
  const baseCommit = text(source.baseCommit, `${field}.baseCommit`)
  const candidateDigest = text(source.candidateDigest, `${field}.candidateDigest`)
  const runtimeIdentity = text(source.runtimeIdentity, `${field}.runtimeIdentity`)
  if (!SESSION.test(sessionId)) fail(`${field}.sessionId`)
  if (!SHA_1_OR_256.test(baseCommit)) fail(`${field}.baseCommit`)
  if (!SHA_256.test(candidateDigest)) fail(`${field}.candidateDigest`)
  return { repositoryRoot, sessionId, baseCommit, candidateDigest, runtimeIdentity }
}

const sameBinding = (a, b) => (
  a.repositoryRoot === b.repositoryRoot
  && a.sessionId === b.sessionId
  && a.baseCommit === b.baseCommit
  && a.candidateDigest === b.candidateDigest
  && a.runtimeIdentity === b.runtimeIdentity
)

const handlesForAuthority = new WeakMap()

const releaseAuthority = (authority) => {
  const retained = handlesForAuthority.get(authority)
  if (!retained) return
  handlesForAuthority.delete(authority)
  closeHandles(retained.handles, retained.close)
}

const freezeAuthority = (authority) => Object.freeze({
  vinculo: Object.freeze({ ...authority.vinculo }),
  radar: Object.freeze({ ...authority.radar }),
  archivos: Object.freeze([...authority.archivos]),
  cimientos: Object.freeze([...authority.cimientos]),
  identidadesArchivos: Object.freeze(authority.identidadesArchivos.map((file) => Object.freeze({ ...file }))),
  recursos: Object.freeze(authority.recursos.map((resource) => Object.freeze({ ...resource }))),
})

const authorityFrom = (bundle, dependencies) => {
  exactObject(bundle, "bundle")
  const current = binding(bundle, "bundle")
  const radar = exactObject(bundle.radar, "radar")
  const statusDigest = text(radar.statusDigest, "radar.statusDigest")
  const sessionDigest = text(radar.sessionDigest, "radar.sessionDigest")
  if (!SHA_256.test(statusDigest) || !SHA_256.test(sessionDigest)) fail("radar")

  const files = exactFiles(current.repositoryRoot, bundle.authorizedFiles, "authorizedFiles")
  const grants = cimientoGrants(current.repositoryRoot, bundle.cimientoGrants, files)
  const resources = confirmedResources(bundle.resources)
  let handles = []
  try {
    handles = retainFiles(current.repositoryRoot, files, "authorizedFiles", dependencies)
    const identities = handles.map(({ descriptor: _descriptor, ...identity }) => identity)
    const authority = freezeAuthority({
    vinculo: {
      repositorio: current.repositoryRoot,
      sesion: current.sessionId,
      base: current.baseCommit,
      candidato: current.candidateDigest,
      runtime: current.runtimeIdentity,
    },
    radar: { estadoDigest: statusDigest, sesionDigest: sessionDigest },
    archivos: files,
    cimientos: grants,
    identidadesArchivos: identities,
      recursos: resources,
    })
    handlesForAuthority.set(authority, { handles, close: dependencies.close })
    return authority
  } catch (error) {
    closeHandles(handles, dependencies.close)
    throw error
  }
}

const identityFromAuthority = (authority) => ({
  repositoryRoot: authority.vinculo.repositorio,
  sessionId: authority.vinculo.sesion,
  baseCommit: authority.vinculo.base,
  candidateDigest: authority.vinculo.candidato,
  runtimeIdentity: authority.vinculo.runtime,
})

// crearAutoridadPi is intentionally a closure factory: callers cannot recover authority after a
// reload, and only the opaque request identity created here can decide its pending bundle.
export const crearAutoridadPi = (host, injectedDependencies) => {
  exactObject(host, "host")
  if (typeof host.identidadActual !== "function") fail("host.identidadActual")
  const dependencies = privateDependencies(injectedDependencies)

  let state = "inactiva"
  let pending = null
  let active = null

  const discard = (...authorities) => {
    for (const authority of new Set(authorities.filter(Boolean))) releaseAuthority(authority)
  }

  const invalidate = () => {
    const changed = state !== "invalidada"
    discard(pending?.autoridad, active)
    pending = null
    active = null
    state = "invalidada"
    return changed
  }

  const liveIdentityMatches = (authority) => {
    try {
      const live = binding(host.identidadActual(), "host.identidadActual")
      if (!sameBinding(identityFromAuthority(authority), live)) return false
      const retained = handlesForAuthority.get(authority)
      if (!retained || retained.handles.length !== authority.identidadesArchivos.length) return false
      for (const [index, expected] of authority.identidadesArchivos.entries()) {
        const held = identityFromStat(expected.ruta, fstatSync(retained.handles[index].descriptor), "authorizedFiles")
        const observed = fileIdentity(live.repositoryRoot, expected.ruta, "authorizedFiles")
        if (!sameFileIdentity(expected, held) || !sameFileIdentity(expected, observed)) return false
      }
      return true
    } catch {
      return false
    }
  }

  const liveAuthority = () => {
    if (state !== "activa" || !active) return null
    if (!liveIdentityMatches(active)) {
      invalidate()
      return null
    }
    return active
  }

  const blockedCapability = () => {
    const decision = bloqueado("mutacion", "la autoridad Pi no está activa o dejó de coincidir con su vínculo validado")
    return { decision, pi: aPi(decision) }
  }

  // This is the only authority surface T2 receives. It never exposes the grant object; each
  // operation resolves it live, so retaining the capability cannot survive invalidation.
  const capability = Object.freeze({
    gobernar(evento, opciones) {
      const authority = liveAuthority()
      return authority ? gobernar(authority, evento, opciones) : blockedCapability()
    },
  })

  return Object.freeze({
    solicitar(bundle) {
      let requested = null
      try {
        requested = authorityFrom(bundle, dependencies)
        if (!liveIdentityMatches(requested)) fail("host.identidadActual")
        const solicitud = dependencies.uuid()
        discard(pending?.autoridad, active)
        active = null
        pending = { autoridad: requested, solicitud }
        state = "pendiente"
        return Object.freeze({ estado: state, solicitud: pending.solicitud })
      } catch (error) {
        releaseAuthority(requested)
        throw error
      }
    },

    aceptar(solicitud) {
      if (state !== "pendiente" || !pending || solicitud !== pending.solicitud || !liveIdentityMatches(pending.autoridad)) {
        if (state === "pendiente") invalidate()
        return false
      }
      active = pending.autoridad
      pending = null
      state = "activa"
      return true
    },

    rechazar(solicitud) {
      if (state !== "pendiente" || !pending || solicitud !== pending.solicitud) {
        if (state === "pendiente") invalidate()
        return false
      }
      releaseAuthority(pending.autoridad)
      pending = null
      state = "rechazada"
      return true
    },

    capacidad: () => (liveAuthority() ? capability : null),

    invalidar: invalidate,
    estado: () => state,
  })
}
