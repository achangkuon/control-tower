import { afterEach, describe, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { createRoutingController, dispatchDecisionRequest } from "../../escalation/routing.mjs"

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const roots = []
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))

const setup = (options = {}) => {
  const root = mkdtempSync(join(tmpdir(), "ct-routing-")); roots.push(root)
  const statePath = join(root, "routing-mode.json")
  const localIdentity = Object.freeze({ status: "VALID", subject_id: "maintainer-a" })
  const authenticateLocal = ({ proof }) => proof === "local-proof" ? localIdentity : { status: "INVALID" }
  const controller = createRoutingController({ statePath, authenticateLocal, ...options })
  return { controller, localIdentity, root, statePath }
}
const capture = (operation) => {
  try { operation() } catch (error) { return { code: error?.code, message: error?.message } }
  return { code: null, message: null }
}
const switchInput = (overrides = {}) => ({ actor: "MAINTAINER", route: "LOCAL_CLI", proof: "local-proof", mode: "remoto", ...overrides })

describe("routing mode", () => {
  test("an authenticated local maintainer switches idempotently and state survives another process", async () => {
    const { controller, localIdentity, statePath } = setup()

    const first = controller.switchMode(switchInput())
    const replay = controller.switchMode(switchInput())

    expect(first).toMatchObject({ mode: "remoto", revision: 1, maintainer_id: "maintainer-a" })
    expect(replay).toEqual(first)
    const script = `import { createRoutingController } from "./escalation/routing.mjs"; const controller=createRoutingController({statePath:process.argv[1]}); console.log(JSON.stringify({mode:controller.resolveMode({identity:{status:"VALID",subject_id:"maintainer-a"}})}));`
    const child = Bun.spawn([process.execPath, "-e", script, statePath], { cwd: projectRoot, env: { ...process.env, BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0" }, stdout: "pipe", stderr: "pipe" })
    const output = await new Response(child.stdout).text()
    expect(await child.exited).toBe(0)
    expect(JSON.parse(output)).toEqual({ mode: "remoto" })
    expect(controller.resolveMode({ identity: localIdentity })).toBe("remoto")
  })

  test("Main and agents fail closed with the rejected actor named", () => {
    const { controller } = setup()

    for (const actor of ["MAIN", "AGENT:worker-a"]) {
      const rejected = capture(() => controller.switchMode(switchInput({ actor })))
      expect(rejected.code).toBe("CT_ESCALATION_ACTOR_DENIED")
      expect(rejected.message).toContain(actor)
    }
  })

  test("missing, invalid, and ambiguous identities fail closed to local without mutation", () => {
    const { controller, statePath } = setup()
    const initial = readFileSync(controller.switchMode(switchInput()).record_path)

    for (const identity of [undefined, { status: "INVALID" }, { status: "AMBIGUOUS", subject_id: "maintainer-a" }, { status: "VALID", subject_id: "maintainer-b" }]) {
      expect(controller.resolveMode({ identity })).toBe("local")
      expect(readFileSync(statePath)).toEqual(initial)
    }
    const rejected = capture(() => controller.switchMode(switchInput({ proof: "wrong" })))
    expect(rejected.code).toBe("CT_ESCALATION_IDENTITY_INVALID")
    expect(readFileSync(statePath)).toEqual(initial)
  })

  test("remote callback is defined but disabled when S8.7 authentication is absent", () => {
    const { controller, localIdentity } = setup()

    const rejected = capture(() => controller.switchMode(switchInput({ route: "REMOTE_CALLBACK", proof: "remote-proof" })))

    expect(rejected.code).toBe("CT_ESCALATION_REMOTE_DISABLED")
    expect(controller.resolveMode({ identity: localIdentity })).toBe("local")
  })

  test("an injected S8.7 authenticator enables the already-defined remote callback route", () => {
    const remoteIdentity = Object.freeze({ status: "VALID", subject_id: "maintainer-phone" })
    const { controller } = setup({ authenticateRemote: ({ proof }) => proof === "remote-proof" ? remoteIdentity : { status: "INVALID" } })

    const switched = controller.switchMode(switchInput({ route: "REMOTE_CALLBACK", proof: "remote-proof" }))

    expect(switched).toMatchObject({ mode: "remoto", maintainer_id: "maintainer-phone", revision: 1 })
    expect(controller.resolveMode({ identity: remoteIdentity })).toBe("remoto")
  })

  test("absent, corrupt, ambiguous, and unsafe state resolves to local and never calls remote transport", () => {
    const { controller, localIdentity, statePath } = setup()
    let remoteCalls = 0
    const remoteTransport = { send() { remoteCalls += 1 } }
    const request = Object.freeze({ authorization_id: "decision-a", state: "PENDING" })
    const invalidStates = [
      null,
      "{",
      JSON.stringify({ schema: "routing-mode", schema_version: 1, mode: "remoto", revision: 1, maintainer_id: "maintainer-a", alternative_mode: "local" }),
      JSON.stringify({ schema: "routing-mode", schema_version: 1, mode: "remoto", revision: 1, maintainer_id: "maintainer-a" }),
    ]

    for (const bytes of invalidStates) {
      rmSync(statePath, { force: true })
      if (bytes !== null) writeFileSync(statePath, bytes)
      expect(controller.resolveMode({ identity: localIdentity })).toBe("local")
      expect(dispatchDecisionRequest({ controller, request, identity: localIdentity, remoteTransport })).toMatchObject({ mode: "local", delivered: false, pending: true, recoverable_locally: true })
    }
    expect(remoteCalls).toBe(0)
  })

  test("local operation needs no S8.7 transport", () => {
    const { controller, localIdentity } = setup()
    controller.switchMode(switchInput({ mode: "local" }))
    const request = Object.freeze({ authorization_id: "decision-local", state: "PENDING" })

    const result = dispatchDecisionRequest({ controller, request, identity: localIdentity })

    expect(result).toEqual({ mode: "local", delivered: false, pending: true, recoverable_locally: true, request })
  })

  test("missing or failed remote transport leaves the canonical request pending and locally recoverable", () => {
    const { controller, localIdentity } = setup()
    controller.switchMode(switchInput())
    const request = Object.freeze({ authorization_id: "decision-pending", state: "PENDING" })

    const absent = dispatchDecisionRequest({ controller, request, identity: localIdentity })
    const failed = dispatchDecisionRequest({ controller, request, identity: localIdentity, remoteTransport: { send() { throw new Error("offline") } } })

    expect(absent).toMatchObject({ mode: "remoto", delivered: false, pending: true, recoverable_locally: true, code: "CT_ESCALATION_TRANSPORT_UNAVAILABLE", request })
    expect(failed).toMatchObject({ mode: "remoto", delivered: false, pending: true, recoverable_locally: true, code: "CT_ESCALATION_TRANSPORT_UNAVAILABLE", request })
    expect(request.state).toBe("PENDING")
  })

  test("a supplied transport receives the request without consuming its authority", () => {
    const { controller, localIdentity } = setup()
    controller.switchMode(switchInput())
    const delivered = []
    const request = Object.freeze({ authorization_id: "decision-delivered", state: "PENDING" })

    const result = dispatchDecisionRequest({ controller, request, identity: localIdentity, remoteTransport: { send(value) { delivered.push(value) } } })

    expect(delivered).toEqual([request])
    expect(result).toEqual({ mode: "remoto", delivered: true, pending: true, recoverable_locally: true, request })
    expect(request.state).toBe("PENDING")
  })

  test("mode queries are byte-read-only in success and rejection", () => {
    const { controller, localIdentity, root, statePath } = setup()
    controller.switchMode(switchInput())
    const witnesses = [statePath, join(root, "tower.db"), join(root, "tower.db-wal"), join(root, "tower.db-shm"), join(root, "registry.json"), join(root, "control-tower-ACTIVE")]
    for (const [index, path] of witnesses.entries()) if (path !== statePath) writeFileSync(path, `witness-${index}\n`)
    const before = new Map(witnesses.map((path) => [path, readFileSync(path)]))

    expect(controller.resolveMode({ identity: localIdentity })).toBe("remoto")
    expect(controller.resolveMode({ identity: { status: "INVALID" } })).toBe("local")

    for (const path of witnesses) expect(readFileSync(path)).toEqual(before.get(path))
  })
})
