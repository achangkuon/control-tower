import { afterEach, describe, expect, test } from "bun:test"
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createRootBindingStore } from "../../hosts/root-binding.mjs"
import { ROOT_AGENT, parseRootIdentity } from "../../hosts/root-identity.mjs"

const sessionId = `ses_${"a".repeat(26)}`
const identityFor = (id) => parseRootIdentity({ agent: ROOT_AGENT, id, parentID: null })
const input = Object.freeze({
  assignment_ref: "assignment-a", backend_pid: 4321, backend_url: "http://127.0.0.1:4096",
  host_epoch: 3, project_id: "project-a", root_identity: identityFor(sessionId), worktree: "/work/a",
})
const record = Object.freeze({
  agent: ROOT_AGENT, assignment_ref: "assignment-a", backend_pid: 4321,
  backend_url: "http://127.0.0.1:4096", host_epoch: 3, project_id: "project-a",
  root_session_id: sessionId, worktree: "/work/a",
})
const code = (operation) => { try { operation() } catch (error) { return error.code }; return null }
const temporaries = []
afterEach(() => { while (temporaries.length) rmSync(temporaries.pop(), { recursive: true, force: true }) })
const setup = () => {
  const root = mkdtempSync(join(tmpdir(), "ct-root-binding-"))
  temporaries.push(root)
  chmodSync(root, 0o700)
  return { root, store: createRootBindingStore({ root }) }
}
const bindingPath = (root, ref = record.assignment_ref) => join(root, "root-bindings", `${ref}.json`)

describe("Main-owned primary root binding", () => {
  test("persists exactly one binding per assignment and reads back the exact record", () => {
    const { root, store } = setup()
    expect(store.bind(input)).toEqual(record)
    expect(Object.isFrozen(store.read(record.assignment_ref))).toBe(true)
    expect(store.read(record.assignment_ref)).toEqual(record)
    expect(lstatSync(bindingPath(root)).mode & 0o777).toBe(0o600)
    expect(JSON.parse(readFileSync(bindingPath(root), "utf8"))).toEqual(record)
  })

  test("refuses a second root for the same assignment, even byte-identical", () => {
    const { root, store } = setup()
    store.bind(input)
    const before = readFileSync(bindingPath(root), "utf8")
    expect(code(() => store.bind(input))).toBe("CT_ROOT_BINDING_EXISTS")
    expect(code(() => store.bind({ ...input, root_identity: identityFor(`ses_${"b".repeat(26)}`) }))).toBe("CT_ROOT_BINDING_EXISTS")
    expect(readFileSync(bindingPath(root), "utf8")).toBe(before)
  })

  // The decisive guarantee: a child session id is grammatically identical to a root one, so the binding
  // accepts only an identity minted by parseRootIdentity, which a caller cannot forge or clone.
  test("refuses any root the caller assembled itself, including a well-formed child session id", () => {
    const { root, store } = setup()
    const childId = `ses_${"d".repeat(26)}`
    const forged = [
      { agent: ROOT_AGENT, root_session_id: childId },
      { agent: ROOT_AGENT, root_session_id: sessionId },
      Object.freeze({ agent: ROOT_AGENT, root_session_id: sessionId }),
      { ...identityFor(sessionId) },
      structuredClone({ agent: ROOT_AGENT, root_session_id: sessionId }),
      JSON.parse(JSON.stringify(identityFor(sessionId))),
      sessionId, null, undefined,
    ]
    for (const root_identity of forged) {
      expect(code(() => store.bind({ ...input, root_identity }))).toBe("CT_ROOT_IDENTITY_INVALID")
    }
    expect(existsSync(bindingPath(root))).toBe(false)
  })

  test("rejects an ambiguous, foreign or extended binding shape before writing anything", () => {
    const { root, store } = setup()
    const { host_epoch, ...missing } = input
    for (const invalid of [null, undefined, "", [input], missing, { ...input, extra: true }, { ...input, agent: ROOT_AGENT }, { ...input, root_session_id: sessionId }, { ...input, assignment_ref: "../escape" }, { ...input, assignment_ref: "--help" }, { ...input, assignment_ref: "" }, { ...input, worktree: "relative/path" }, { ...input, worktree: "" }, { ...input, backend_url: "http://10.0.0.5:4096" }, { ...input, backend_url: "https://example.com" }, { ...input, backend_url: "file:///tmp" }, { ...input, backend_pid: 0 }, { ...input, backend_pid: -1 }, { ...input, backend_pid: 1.5 }, { ...input, host_epoch: 0 }, { ...input, host_epoch: -3 }, { ...input, project_id: "" }]) {
      expect(code(() => store.bind(invalid))).toBe("CT_ROOT_BINDING_INVALID")
    }
    // An invalid record leaves no trace at all: not even the bindings directory is brought into existence.
    expect(existsSync(join(root, "root-bindings"))).toBe(false)
    expect(existsSync(bindingPath(root))).toBe(false)
  })

  test("fails closed on malformed, foreign or unsafely stored bytes instead of reading them", () => {
    const { root, store } = setup()
    store.bind(input)
    for (const bytes of ["{}", "not json", JSON.stringify({ ...record, extra: true }), JSON.stringify({ ...record, assignment_ref: "other" }), JSON.stringify({ ...record, root_session_id: "root-a" }), JSON.stringify({ ...record, agent: "build" })]) {
      writeFileSync(bindingPath(root), bytes, { mode: 0o600 })
      expect(code(() => store.read(record.assignment_ref))).toBe("CT_ROOT_BINDING_INVALID")
    }
    chmodSync(bindingPath(root), 0o644)
    expect(code(() => store.read(record.assignment_ref))).toBe("CT_ROOT_BINDING_INVALID")
    rmSync(bindingPath(root))
    symlinkSync("/etc/passwd", bindingPath(root))
    expect(code(() => store.read(record.assignment_ref))).toBe("CT_ROOT_BINDING_INVALID")
  })

  test("rejects an unsafe or absent store root instead of creating authority", () => {
    const loose = mkdtempSync(join(tmpdir(), "ct-root-binding-loose-"))
    temporaries.push(loose)
    chmodSync(loose, 0o755)
    expect(code(() => createRootBindingStore({ root: loose }))).toBe("CT_ROOT_BINDING_INVALID")
    expect(code(() => createRootBindingStore({ root: join(loose, "absent") }))).toBe("CT_ROOT_BINDING_INVALID")
    expect(code(() => createRootBindingStore({ root: "relative" }))).toBe("CT_ROOT_BINDING_INVALID")
    expect(code(() => createRootBindingStore({}))).toBe("CT_ROOT_BINDING_INVALID")
  })

  test("reads back nothing for an unbound, foreign or option-shaped assignment", () => {
    const { store } = setup()
    store.bind(input)
    for (const ref of ["assignment-b", "--help", "../escape", "", null]) {
      expect(code(() => store.read(ref))).toBe("CT_ROOT_BINDING_INVALID")
    }
  })

  test("releases only its own binding and never a caller supplied path", () => {
    const { root, store } = setup()
    store.bind(input)
    expect(store.release(record.assignment_ref)).toBe(true)
    expect(existsSync(bindingPath(root))).toBe(false)
    expect(code(() => store.read(record.assignment_ref))).toBe("CT_ROOT_BINDING_INVALID")
    expect(code(() => store.release(record.assignment_ref))).toBe("CT_ROOT_BINDING_INVALID")
    const foreign = mkdtempSync(join(tmpdir(), "ct-root-binding-foreign-"))
    temporaries.push(foreign)
    const outside = join(foreign, "victim.json")
    writeFileSync(outside, "{}", { mode: 0o600 })
    for (const ref of ["../../victim", `../../${join(foreign, "victim")}`, outside, "--help"]) {
      expect(code(() => store.release(ref))).toBe("CT_ROOT_BINDING_INVALID")
    }
    expect(existsSync(outside)).toBe(true)
  })

  test("isolates bindings per assignment without sharing identity across worktrees", () => {
    const { store } = setup()
    const otherId = `ses_${"c".repeat(26)}`
    const other = Object.freeze({ ...input, assignment_ref: "assignment-b", worktree: "/work/b", backend_url: "http://127.0.0.1:4097", backend_pid: 4322, root_identity: identityFor(otherId) })
    store.bind(input)
    store.bind(other)
    expect(store.read("assignment-a")).toEqual(record)
    expect(store.read("assignment-b")).toEqual({ ...record, assignment_ref: "assignment-b", worktree: "/work/b", backend_url: "http://127.0.0.1:4097", backend_pid: 4322, root_session_id: otherId })
  })

  test("exposes no caller supplied path, executable or authority beyond the store root", () => {
    const { store } = setup()
    expect(Object.isFrozen(store)).toBe(true)
    expect(Object.keys(store).sort()).toEqual(["bind", "read", "release"])
  })
})

describe("root binding store directory safety", () => {
  test("refuses a bindings directory that is not owner-only", () => {
    const root = mkdtempSync(join(tmpdir(), "ct-root-binding-mode-"))
    temporaries.push(root)
    chmodSync(root, 0o700)
    mkdirSync(join(root, "root-bindings"), { recursive: true, mode: 0o700 })
    chmodSync(join(root, "root-bindings"), 0o777)
    const store = createRootBindingStore({ root })
    expect(code(() => store.bind(input))).toBe("CT_ROOT_BINDING_INVALID")
  })
})
