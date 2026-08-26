import { describe, expect, test } from "bun:test"
import { spawn, spawnSync } from "node:child_process"
import { resolve } from "node:path"
import { COMMAND_VOCABULARY, VERBS } from "../../console/vocabulary.mjs"

const root = resolve(import.meta.dir, "../..")
const torre = resolve(root, "bin/torre")
const fakeCore = resolve(import.meta.dir, "fake-core.mjs")
const baseStatus = {
  active: true, you: "main", locks: [], agents: [
    { name: "any", state: "COMPLETE", branch: "feat/work" },
    { name: "planned", state: "PLANNED", branch: "feat/work" },
    { name: "assigned", state: "ASSIGNED", branch: "feat/work" },
    { name: "working", state: "WORKING", branch: "feat/work" },
    { name: "ready", state: "READY", branch: "feat/work" },
    { name: "delivering", state: "DELIVERING", branch: "feat/work" },
    { name: "blocked", state: "BLOCKED", branch: "feat/work" },
    { name: "pr", state: "PR_OPEN", branch: "feat/work", pr_url: "https://example.test/pr/1" },
  ],
  escalations: { answer: { tower_id: "control-tower", agent: "blocked", status: "OPEN", claimed_by_console: true } },
}
const params = {
  CV_STATUS: {}, CV_INSPECT: { agent: "any" }, CV_REQUEST_CONTEXT: { agent: "any", question: "status?" },
  CV_ASSIGN: { agent: "planned", task: "do work" }, CV_PAUSE: { agent: "assigned", reason: "hold" },
  CV_RESUME: { agent: "blocked", note: "continue" }, CV_RUN_TESTS: { agent: "working" },
  CV_GRANT_DELIVERY: { agent: "ready" }, CV_HOLD_DELIVERY: { agent: "delivering", reason: "wait" },
  CV_STOP_DELIVERY: { agent: "delivering", reason: "stop" },
  CV_ANSWER: { escalation_id: "answer", verdict: "APPROVE" },
  CV_MERGE_MAIN: { agent: "pr", pr_url: "https://example.test/pr/1" },
  CV_DB_PUSH: { agent: "ready", environment: "production" },
}
const envFor = (status = baseStatus) => ({
  ...process.env, CONTROL_TOWER_CORE: fakeCore, CONTROL_TOWER_LIFECYCLE: "unused",
  CT_STATUS: JSON.stringify(status),
})
const run = (args, status) => spawnSync(torre, args, { cwd: root, env: envFor(status), encoding: "utf8" })
const outputLines = (result) => result.stdout.trim().split("\n").filter(Boolean).map(JSON.parse)

describe("torre console surface", () => {
  test("makes every and only vocabulary verb typeable from deterministic help", () => {
    const first = run(["--help"]), second = run(["--help"])
    expect(first.status).toBe(0)
    expect(first.stdout).toBe(second.stdout)
    const exposed = first.stdout.split("\n").filter((line) => line.startsWith("  CV_"))
      .map((line) => line.trim().split(" ")[0])
    expect(exposed).toEqual(VERBS)
    expect(exposed).toHaveLength(Object.keys(COMMAND_VOCABULARY).length)

    for (const verb of VERBS) {
      const args = [verb, ...Object.entries(params[verb]).flatMap(([name, value]) =>
        [`--${name.replaceAll("_", "-")}`, value])]
      const result = run(args)
      expect(result.stderr).not.toContain("no conozco")
      const [proposal] = outputLines(result)
      if (COMMAND_VOCABULARY[verb].risk === "R2") {
        expect(proposal).toMatchObject({ code: "CV_CONFIRMATION_REQUIRED" })
      } else {
        expect(proposal).toMatchObject({ ok: true, command: { verb } })
      }
    }
  })

  test("validates and executes an agent command using only its validated target", () => {
    const result = run(["CV_ASSIGN", "--agent", "planned", "--task", "do work"])
    expect(result.status).toBe(0)
    const [outcome] = outputLines(result)
    expect(outcome.command.target_agent).toBe("planned")
    expect(outcome.result.directive).toEqual({ to: "planned", text: JSON.stringify(outcome.command) })
  })

  test("keeps CV_STATUS as the local result and never creates an agent directive", () => {
    const status = { ...baseStatus, active: false }
    const result = run(["CV_STATUS"], status)
    expect(result.status).toBe(0)
    const [outcome] = outputLines(result)
    expect(outcome.result).toEqual(status)
    expect(outcome.command).not.toHaveProperty("target_agent")
    expect(outcome).not.toHaveProperty("directive")
  })

  test("surfaces validator refusals without invoking the executor ports", () => {
    const missing = run(["CV_ASSIGN", "--agent", "missing", "--task", "do work"])
    expect(missing.status).toBe(2)
    expect(outputLines(missing)[0]).toMatchObject({ ok: false, code: "CV_UNKNOWN_AGENT" })

    const illegal = run(["CV_ASSIGN", "--agent", "ready", "--task", "do work"])
    expect(illegal.status).toBe(2)
    expect(outputLines(illegal)[0]).toMatchObject({ ok: false, code: "CV_ILLEGAL_STATE", currentState: "READY" })
  })

  test("presents R2 evidence and TTL, then consumes only validateConfirmation", async () => {
    const child = spawn(torre, ["CV_MERGE_MAIN", "--agent", "pr", "--pr-url", "https://example.test/pr/1"], {
      cwd: root, env: envFor(), stdio: ["pipe", "pipe", "pipe"],
    })
    let stdout = "", first
    await new Promise((resolveFirst, reject) => {
      child.stdout.on("data", (chunk) => {
        stdout += chunk
        const newline = stdout.indexOf("\n")
        if (newline < 0 || first) return
        first = JSON.parse(stdout.slice(0, newline))
        resolveFirst()
      })
      child.once("error", reject)
    })
    expect(first).toMatchObject({
      code: "CV_CONFIRMATION_REQUIRED",
      confirmation: {
        evidenceRequirements: COMMAND_VOCABULARY.CV_MERGE_MAIN.evidence,
        tokenLifetimeMs: 600_000,
        command: { target_agent: "pr" },
      },
    })
    child.stdin.end(`${first.confirmation.token}\n`)
    const status = await new Promise((resolveExit, reject) => {
      child.once("close", resolveExit)
      child.once("error", reject)
    })
    expect(status).toBe(0)
    const lines = stdout.trim().split("\n").map(JSON.parse)
    expect(lines).toHaveLength(2)
    expect(lines[1]).toMatchObject({ ok: true, command: { verb: "CV_MERGE_MAIN", target_agent: "pr" } })
  })
})
