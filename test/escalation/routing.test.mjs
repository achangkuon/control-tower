import { afterEach, describe, expect, test } from "bun:test"
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs"
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

  test("rejects unsafe and symlinked existing parents before permission or target mutation", () => {
    const root = mkdtempSync(join(tmpdir(), "ct-routing-parent-")); roots.push(root)
    const identity = Object.freeze({ status: "VALID", subject_id: "maintainer-a" })
    const authenticateLocal = () => identity

    const unsafeParent = join(root, "unsafe")
    mkdirSync(unsafeParent, { mode: 0o755 }); chmodSync(unsafeParent, 0o755)
    const unsafeState = join(unsafeParent, "routing-mode.json")
    const unsafe = createRoutingController({ statePath: unsafeState, authenticateLocal })
    expect(capture(() => unsafe.switchMode(switchInput())).code).toBe("CT_ESCALATION_STATE_WRITE_FAILED")
    expect(statSync(unsafeParent).mode & 0o777).toBe(0o755)
    expect(existsSync(unsafeState)).toBeFalse()
    expect(readdirSync(unsafeParent)).toEqual([])

    const targetParent = join(root, "target")
    mkdirSync(targetParent, { mode: 0o755 }); chmodSync(targetParent, 0o755)
    const linkedParent = join(root, "linked")
    symlinkSync(targetParent, linkedParent)
    const linkedState = join(linkedParent, "routing-mode.json")
    const linked = createRoutingController({ statePath: linkedState, authenticateLocal })
    expect(capture(() => linked.switchMode(switchInput())).code).toBe("CT_ESCALATION_STATE_WRITE_FAILED")
    expect(lstatSync(linkedParent).isSymbolicLink()).toBeTrue()
    expect(statSync(targetParent).mode & 0o777).toBe(0o755)
    expect(existsSync(join(targetParent, "routing-mode.json"))).toBeFalse()
  })

  test("serializes real concurrent writers across read-decide-write without a lost revision", async () => {
    const { root, statePath } = setup()
    const lockPath = `${statePath}.lock`
    writeFileSync(lockPath, "held\n", { mode: 0o600 }); chmodSync(lockPath, 0o600)
    const worker = String.raw`
      import { writeFileSync } from "node:fs";
      import { createRoutingController } from "./escalation/routing.mjs";
      const [statePath, readyPath, subject, mode] = process.argv.slice(1);
      writeFileSync(readyPath, "ready\n");
      const controller = createRoutingController({ statePath, authenticateLocal: () => ({ status:"VALID", subject_id:subject }) });
      try { console.log(JSON.stringify(controller.switchMode({ actor:"MAINTAINER", route:"LOCAL_CLI", proof:"proof", mode }))); }
      catch (error) { console.log(JSON.stringify({ code:error.code, message:error.message })); process.exitCode=2; }
    `
    const spawn = (subject, mode) => Bun.spawn([process.execPath, "-e", worker, statePath, join(root, `ready-${subject}`), subject, mode], {
      cwd: projectRoot, env: { ...process.env, BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0" }, stdout: "pipe", stderr: "pipe",
    })
    const first = spawn("maintainer-a", "remoto"), second = spawn("maintainer-b", "local")
    while (!existsSync(join(root, "ready-maintainer-a")) || !existsSync(join(root, "ready-maintainer-b"))) await Bun.sleep(2)
    await Bun.sleep(25)
    expect(first.exitCode).toBeNull()
    expect(second.exitCode).toBeNull()
    rmSync(lockPath)
    const [firstOutput, secondOutput] = await Promise.all([new Response(first.stdout).json(), new Response(second.stdout).json()])
    expect(await Promise.all([first.exited, second.exited])).toEqual([0, 0])
    expect([firstOutput.revision, secondOutput.revision].sort()).toEqual([1, 2])
    expect(JSON.parse(readFileSync(statePath, "utf8")).revision).toBe(2)
    expect(existsSync(lockPath)).toBeFalse()
    expect(readdirSync(root).filter((name) => name.includes(".tmp") || name.endsWith(".lock"))).toEqual([])
  })

  test("write failures preserve target bytes and clean owned temp and lock files", () => {
    const { controller, root, statePath } = setup()
    mkdirSync(statePath, { mode: 0o700 })
    const before = statSync(statePath)

    expect(capture(() => controller.switchMode(switchInput())).code).toBe("CT_ESCALATION_STATE_WRITE_FAILED")

    expect(statSync(statePath).ino).toBe(before.ino)
    expect(readdirSync(root).filter((name) => name.includes(".tmp") || name.endsWith(".lock"))).toEqual([])
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

  test("absent, corrupt, ambiguous, and unsafe state resolves to local and never calls remote transport", async () => {
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
      expect(await dispatchDecisionRequest({ controller, request, identity: localIdentity, remoteTransport })).toMatchObject({ mode: "local", delivered: false, pending: true, recoverable_locally: true })
    }
    expect(remoteCalls).toBe(0)
  })

  test("local operation needs no S8.7 transport", async () => {
    const { controller, localIdentity } = setup()
    controller.switchMode(switchInput({ mode: "local" }))
    const request = Object.freeze({ authorization_id: "decision-local", state: "PENDING" })

    const result = await dispatchDecisionRequest({ controller, request, identity: localIdentity })

    expect(result).toEqual({ mode: "local", delivered: false, pending: true, recoverable_locally: true, request })
  })

  test("missing, sync-failed, and async-rejected transport leaves the canonical request pending", async () => {
    const { controller, localIdentity } = setup()
    controller.switchMode(switchInput())
    const request = Object.freeze({ authorization_id: "decision-pending", state: "PENDING" })

    const absent = await dispatchDecisionRequest({ controller, request, identity: localIdentity })
    const syncFailed = await dispatchDecisionRequest({ controller, request, identity: localIdentity, remoteTransport: { send() { throw new Error("offline") } } })
    const asyncRejected = await dispatchDecisionRequest({ controller, request, identity: localIdentity, remoteTransport: { async send() { throw new Error("rejected") } } })

    for (const outcome of [absent, syncFailed, asyncRejected]) {
      expect(outcome).toMatchObject({ mode: "remoto", delivered: false, pending: true, recoverable_locally: true, code: "CT_ESCALATION_TRANSPORT_UNAVAILABLE", request })
    }
    expect(request.state).toBe("PENDING")
  })

  test("awaits async transport resolution before reporting delivery without consuming authority", async () => {
    const { controller, localIdentity } = setup()
    controller.switchMode(switchInput())
    const delivered = []
    const request = Object.freeze({ authorization_id: "decision-delivered", state: "PENDING" })
    let release
    const gate = new Promise((resolve) => { release = resolve })
    let settled = false

    const outcome = dispatchDecisionRequest({ controller, request, identity: localIdentity, remoteTransport: { async send(value) { delivered.push(value); await gate } } })
    outcome.then(() => { settled = true })
    await Bun.sleep(0)
    expect(settled).toBeFalse()
    release()
    const result = await outcome

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
