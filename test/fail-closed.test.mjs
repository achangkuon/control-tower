import { afterEach, describe, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { tmpdir } from "node:os"

import * as tower from "../core.mjs"
import { git as runGit } from "./helpers/git.mjs"

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const mcpPath = join(packageRoot, "mcp.mjs")
const torrePath = join(packageRoot, "bin", "torre")
const pausedSendPath = join(packageRoot, "test", "fixtures", "paused-send.mjs")
const temporaryDirectories = []

const git = (cwd, args) =>
  runGit(cwd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()

const createRepository = () => {
  const root = mkdtempSync(join(tmpdir(), "control-tower-test-"))
  const main = join(root, "main")
  const agent = join(root, "agent")
  temporaryDirectories.push(root)

  mkdirSync(main)
  git(main, ["init", "-q", "-b", "main"])
  git(main, ["config", "user.email", "tower-test@example.invalid"])
  git(main, ["config", "user.name", "Tower Test"])
  git(main, ["commit", "-q", "--allow-empty", "-m", "initial"])
  git(main, ["worktree", "add", "-q", "-b", "agent", agent])

  return { main, agent }
}

const runTorre = (cwd, command) =>
  execFileSync("bash", [torrePath, command], {
    cwd,
    env: { ...process.env, XDG_DATA_HOME: join(cwd, ".xdg-data") },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })

const arm = (cwd) => runTorre(cwd, "on")
const disarm = (cwd) => runTorre(cwd, "off")

const callMcp = async (cwd, request) => {
  const child = Bun.spawn([process.execPath, mcpPath], {
    cwd,
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  })

  child.stdin.write(`${JSON.stringify(request)}\n`)
  child.stdin.end()

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  return JSON.parse(stdout.trim())
}

const close = (...handles) => {
  for (const handle of handles) handle.db?.close()
}

const waitFor = async (condition, failureMessage) => {
  const deadline = Date.now() + 5000
  while (!condition()) {
    if (Date.now() >= deadline) throw new Error(failureMessage)
    await Bun.sleep(5)
  }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe("fail-closed core semantics", () => {
  test("inactive error takes precedence over guarded argument validation", () => {
    const { main } = createRepository()
    arm(main)
    const handle = tower.open(main)

    try {
      tower.register(handle, "orchestrator")
      disarm(main)

      expect(() => tower.setState(handle, { state: "NOT_A_STATE" })).toThrow(
        tower.INACTIVE_ERROR,
      )
      expect(() => tower.acquire(handle, "not-a-lock")).toThrow(tower.INACTIVE_ERROR)
      expect(() => tower.transfer(handle, "not-a-lock", handle.place.name)).toThrow(
        tower.INACTIVE_ERROR,
      )

      arm(main)
      expect(() => tower.setState(handle, { state: "NOT_A_STATE" })).toThrow("unknown state")
      expect(() => tower.acquire(handle, "not-a-lock")).toThrow("unknown lock")
      expect(() => tower.transfer(handle, "not-a-lock", handle.place.name)).toThrow("unknown lock")
    } finally {
      close(handle)
    }
  })

  test("off waits for a guarded operation that already passed its activation check", async () => {
    const { main, agent } = createRepository()
    arm(main)
    const mainHandle = tower.open(main)
    const agentHandle = tower.open(agent)
    const recipient = agentHandle.place.name
    const signals = join(dirname(main), "signals")
    mkdirSync(signals)

    try {
      tower.register(mainHandle, "orchestrator")
      tower.register(agentHandle, "agent")
    } finally {
      close(mainHandle, agentHandle)
    }

    const operation = Bun.spawn([process.execPath, pausedSendPath, main, recipient, signals], {
      cwd: main,
      stdout: "pipe",
      stderr: "pipe",
    })
    await waitFor(
      () => existsSync(join(signals, "operation-paused")),
      "guarded operation never reached its paused mutation",
    )

    const off = Bun.spawn(["bash", torrePath, "off"], {
      cwd: main,
      env: { ...process.env, XDG_DATA_HOME: join(main, ".xdg-data") },
      stdout: "pipe",
      stderr: "pipe",
    })
    let offReturned = false
    const offExit = off.exited.then((code) => {
      offReturned = true
      return code
    })
    const logPath = join(tower.locate(main).root, "tower.log")
    await waitFor(
      () =>
        existsSync(logPath) &&
        readFileSync(logPath, "utf8").includes("torre off waiting for an in-flight guarded operation"),
      "torre off never reached the SQLite writer barrier",
    )

    expect(offReturned).toBe(false)
    expect(tower.isActive({ place: tower.locate(main) })).toBe(true)
    writeFileSync(join(signals, "allow-operation"), "")

    const [operationStdout, operationStderr, operationExit, offStdout, offStderr, offCode] =
      await Promise.all([
        new Response(operation.stdout).text(),
        new Response(operation.stderr).text(),
        operation.exited,
        new Response(off.stdout).text(),
        new Response(off.stderr).text(),
        offExit,
      ])

    expect(operationExit).toBe(0)
    expect(operationStdout).toBe("")
    expect(operationStderr).toBe("")
    expect(existsSync(join(signals, "operation-returned"))).toBe(true)
    expect(offCode).toBe(0)
    expect(offStderr).toBe("")
    expect(offStdout).toContain("desarmada")

    const afterOff = tower.open(main)
    try {
      expect(tower.status(afterOff).active).toBe(false)
      expect(
        afterOff.db
          .query("SELECT COUNT(*) AS count FROM message WHERE text = ? AND consumed_at IS NULL")
          .get("interleaved message").count,
      ).toBe(1)
      expect(() =>
        tower.send(afterOff, { to: recipient, text: "must not commit after off" }),
      ).toThrow(tower.INACTIVE_ERROR)
    } finally {
      close(afterOff)
    }
  })

  test("off preserves state, rejects guarded calls, allows release, and resumes on arm", () => {
    const { main, agent } = createRepository()
    arm(main)
    const mainHandle = tower.open(main)
    const agentHandle = tower.open(agent)

    try {
      tower.register(mainHandle, "orchestrator")
      tower.register(agentHandle, "agent")
      tower.send(mainHandle, { to: agentHandle.place.name, text: "already delivered" })
      expect(tower.receive(agentHandle)?.text).toBe("already delivered")
      tower.send(mainHandle, { to: agentHandle.place.name, text: "leave pending" })
      expect(tower.acquire(agentHandle, "db-writer")).toEqual({
        granted: true,
        holder: agentHandle.place.name,
      })

      const stateBeforeOff = JSON.stringify({
        agents: mainHandle.db.query("SELECT * FROM agent ORDER BY name").all(),
        messages: mainHandle.db.query("SELECT * FROM message ORDER BY id").all(),
        locks: mainHandle.db.query("SELECT * FROM lock ORDER BY name").all(),
      })

      disarm(main)

      const guardedCalls = [
        () => tower.register(mainHandle, "agent"),
        () => tower.send(mainHandle, { to: agentHandle.place.name, text: "must not queue" }),
        () => tower.setState(mainHandle, { state: "WORKING", note: "must not change" }),
        () => tower.receive(agentHandle),
        () => tower.acquire(mainHandle, "git-delivery"),
        () => tower.transfer(agentHandle, "db-writer", mainHandle.place.name),
      ]
      for (const call of guardedCalls) expect(call).toThrow(tower.INACTIVE_ERROR)

      const stateAfterRejectedCalls = JSON.stringify({
        agents: mainHandle.db.query("SELECT * FROM agent ORDER BY name").all(),
        messages: mainHandle.db.query("SELECT * FROM message ORDER BY id").all(),
        locks: mainHandle.db.query("SELECT * FROM lock ORDER BY name").all(),
      })
      expect(stateAfterRejectedCalls).toBe(stateBeforeOff)

      const statusWhileOff = tower.status(mainHandle)
      expect(statusWhileOff.active).toBe(false)
      expect(statusWhileOff.agents.find(({ name }) => name === agentHandle.place.name)?.pending).toBe(1)
      expect(statusWhileOff.locks).toHaveLength(1)
      expect(tower.release(agentHandle, "db-writer")).toEqual({ released: true })

      arm(main)
      expect(tower.status(mainHandle).active).toBe(true)
      expect(tower.receive(agentHandle)?.text).toBe("leave pending")
      expect(tower.setState(mainHandle, { state: "WORKING" }).agents).toContainEqual(
        expect.objectContaining({ name: mainHandle.place.name, state: "WORKING" }),
      )
    } finally {
      close(mainHandle, agentHandle)
    }
  })

  test("fresh disarmed core calls do not create tower state", () => {
    const { main } = createRepository()
    const place = tower.locate(main)
    const handle = tower.open(main)

    try {
      expect(handle.db).toBeNull()
      expect(() => tower.register(handle, "orchestrator")).toThrow(tower.INACTIVE_ERROR)
      expect(tower.status(handle)).toEqual({
        active: false,
        you: handle.place.name,
        agents: [],
        locks: [],
      })
      expect(tower.release(handle, "git-delivery")).toEqual({
        released: false,
        reason: "nobody holds it",
      })
      expect(tower.forceRelease(handle, "git-delivery")).toEqual({
        released: false,
        reason: "nobody holds it",
      })
      expect(existsSync(place.root)).toBe(false)
    } finally {
      close(handle)
    }
  })

  test("inactive register preserves an existing database mtime", () => {
    const { main } = createRepository()
    arm(main)
    const activeHandle = tower.open(main)
    tower.register(activeHandle, "orchestrator")
    close(activeHandle)
    disarm(main)

    const place = tower.locate(main)
    const activePath = join(place.root, "ACTIVE")
    const dbPath = join(place.root, "tower.db")
    const inactiveHandle = tower.open(main)

    try {
      expect(existsSync(activePath)).toBe(false)
      const before = statSync(dbPath, { bigint: true }).mtimeNs
      expect(() => tower.register(inactiveHandle, "agent")).toThrow(tower.INACTIVE_ERROR)
      expect(statSync(dbPath, { bigint: true }).mtimeNs).toBe(before)
    } finally {
      close(inactiveHandle)
    }
  })
})

test("fresh disarmed MCP rejection happens before tower state is created", async () => {
  const { main } = createRepository()
  const place = tower.locate(main)
  const response = await callMcp(main, {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "tower_register", arguments: { role: "orchestrator" } },
  })
  expect(response.result.isError).toBe(true)
  expect(response.result.content[0].text).toContain(tower.INACTIVE_ERROR)
  expect(existsSync(place.root)).toBe(false)
})

test("disarmed status labels retained agent rows as stale", () => {
  const { main } = createRepository()
  arm(main)
  const handle = tower.open(main)
  tower.register(handle, "orchestrator")
  close(handle)
  disarm(main)

  const output = runTorre(main, "status")
  expect(output).toContain("desarmada")
  expect(output).toContain("registros retenidos (STALE)")
  expect(output).toContain("no representan sesiones activas")
})

test("MCP tool contract keeps status visible and gates mutation behind status", async () => {
  const { main } = createRepository()
  const response = await callMcp(main, {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {},
  })
  const tools = response.result.tools
  const byName = new Map(tools.map((tool) => [tool.name, tool]))

  expect(byName.has("tower_status")).toBe(true)
  expect(byName.get("tower_status").description).toStartWith("Call this before any other")
  for (const name of [
    "tower_register",
    "tower_send",
    "tower_set_state",
    "tower_acquire",
    "tower_transfer",
    "tower_receive",
  ]) {
    expect(byName.get(name).description).toStartWith("Call tower_status first.")
    expect(byName.get(name).description).toContain("active:true")
  }
  expect(byName.get("tower_release").description).toStartWith("Call tower_status first.")
  expect(byName.get("tower_release").description).toContain("active:false")
  expect(byName.get("tower_register").inputSchema.properties.role.description).toContain(
    "orchestrator is reserved for the Main worktree",
  )
})
