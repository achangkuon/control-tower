import { afterEach, expect, test } from "bun:test"
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { git } from "./helpers/git.mjs"

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const hooksPath = join(packageRoot, ".githooks")
const radarBinary = join(packageRoot, "agent-workflows", "tools", "radar", "radar")

const temporaryRoots = []

afterEach(() => {
  while (temporaryRoots.length > 0) rmSync(temporaryRoots.pop(), { recursive: true, force: true })
})

// A push origin plus a working clone, both wired to the repository's own hooks. The gate
// must behave identically for every runtime, so the test drives plain git and nothing else.
const scenario = () => {
  const root = mkdtempSync(join(tmpdir(), "pre-push-gate-"))
  temporaryRoots.push(root)
  const origin = join(root, "origin")
  const work = join(root, "work")
  mkdirSync(origin)
  mkdirSync(work)

  git(origin, ["init", "--quiet", "--bare", "."])
  git(work, ["init", "--quiet", "."])
  git(work, ["config", "core.hooksPath", hooksPath])
  git(work, ["config", "user.email", "gate@test"])
  git(work, ["config", "user.name", "gate"])
  git(work, ["remote", "add", "origin", origin])

  return { origin, work }
}

const commit = (work, message) => {
  git(work, ["add", "--all"])
  git(work, ["commit", "--quiet", "--message", message])
}

// Every push that asserts gate behavior must pin which radar the hook resolves. Left to
// the ambient machine, a test meaning "radar found, check fails, push blocked" can
// silently fall into the "radar missing, warn and pass" branch and still look green.
const withRadar = {
  ...process.env,
  RADAR_BIN: radarBinary,
  HOME: "/nonexistent-home-for-gate-test",
  PATH: [process.env.CT_GIT_PROXY_DIR, "/usr/bin", "/bin"].filter(Boolean).join(":"),
}

const push = (work, extra = [], env = withRadar) =>
  git(work, ["push", ...extra, "origin", "HEAD"], { result: true, encoding: "utf8", env })

const originCommits = (origin) =>
  git(origin, ["log", "--oneline"], { result: true, encoding: "utf8" }).stdout?.trim() ?? ""

// The gate reads openspec/plan.yaml. This plan is invalid on purpose: a Sesión with no
// zone and a Zona whose declared path owns no file.
const brokenPlan = [
  "schema: plan",
  "schema_version: 3",
  "producto: gate-test",
  "zonas:",
  "  - id: z1",
  "    nombre: Z1",
  "    rutas: [src/]",
  "sesiones:",
  "  - id: S1",
  "    resultado: invalid on purpose",
  "",
].join("\n")

test("a repository without a plan pushes untouched", () => {
  const { origin, work } = scenario()
  writeFileSync(join(work, "a.txt"), "x\n")
  commit(work, "no plan")

  expect(push(work).status).toBe(0)
  expect(originCommits(origin)).toContain("no plan")
})

test("an invalid plan stops the push and never reaches the remote", () => {
  const { origin, work } = scenario()
  writeFileSync(join(work, "a.txt"), "x\n")
  commit(work, "no plan")
  expect(push(work).status).toBe(0)

  mkdirSync(join(work, "openspec"))
  writeFileSync(join(work, "openspec", "plan.yaml"), brokenPlan)
  commit(work, "invalid plan")

  const blocked = push(work)
  expect(blocked.status).not.toBe(0)
  expect(blocked.stderr).toContain("el plan no valida")
  expect(originCommits(origin)).not.toContain("invalid plan")
})

test("--no-verify remains the documented escape hatch", () => {
  const { origin, work } = scenario()
  mkdirSync(join(work, "openspec"), { recursive: true })
  writeFileSync(join(work, "openspec", "plan.yaml"), brokenPlan)
  commit(work, "invalid plan")

  expect(push(work, ["--no-verify"]).status).toBe(0)
  expect(originCommits(origin)).toContain("invalid plan")
})

// A missing tool is not a broken plan. Without this the gate would block every push on
// any machine that has not built radar yet. The environment below removes all three
// lookup candidates the hook trusts: PATH, RADAR_BIN, and $HOME/.local/bin.
test("a missing radar warns and lets the push through", () => {
  const { origin, work } = scenario()
  mkdirSync(join(work, "openspec"), { recursive: true })
  writeFileSync(join(work, "openspec", "plan.yaml"), brokenPlan)
  commit(work, "invalid plan")

  const blind = { ...withRadar, HOME: join(work, "empty-home"), RADAR_BIN: "" }
  const skipped = push(work, [], blind)

  expect(skipped.status).toBe(0)
  expect(skipped.stderr).toContain("se omite la validación del plan")
  expect(originCommits(origin)).toContain("invalid plan")
})

// Expiry must be recorded by the watchdog, never inferred from an exit code. radar is
// free to exit 124 for its own reasons; reading that as "timed out, let it through"
// would turn an invalid plan into a silent pass.
test("an exit code of 124 from radar itself still blocks the push", () => {
  const { origin, work } = scenario()
  mkdirSync(join(work, "openspec"), { recursive: true })
  writeFileSync(join(work, "openspec", "plan.yaml"), brokenPlan)
  commit(work, "invalid plan")

  const fake = join(work, "fake-radar")
  writeFileSync(fake, "#!/bin/sh\nexit 124\n", { mode: 0o755 })

  const blocked = push(work, [], { ...withRadar, RADAR_BIN: fake })
  expect(blocked.status).not.toBe(0)
  expect(blocked.stderr).toContain("el plan no valida")
  expect(originCommits(origin)).not.toContain("invalid plan")
})

// The watchdog must not outlive the answer. An earlier version left a detached `sleep`
// holding git's pipes, so a push that had already been decided still waited out the full
// timeout. This asserts the gate returns promptly, not eventually.
test("a fast verdict returns immediately and does not wait out the timeout", () => {
  const { work } = scenario()
  mkdirSync(join(work, "openspec"), { recursive: true })
  writeFileSync(join(work, "openspec", "plan.yaml"), brokenPlan)
  commit(work, "invalid plan")

  const fake = join(work, "fake-radar")
  writeFileSync(fake, "#!/bin/sh\nexit 3\n", { mode: 0o755 })

  const started = Date.now()
  const blocked = push(work, [], { ...withRadar, RADAR_BIN: fake })
  const elapsed = Date.now() - started

  expect(blocked.status).not.toBe(0)
  expect(elapsed).toBeLessThan(10_000)
})

// The gate executes a binary and can stop a push, so it must never resolve that binary
// from inside the tree being pushed: a malicious branch would otherwise run arbitrary
// code with the contributor's privileges on their next push.
test("an executable planted inside the working tree is never run", () => {
  const { work } = scenario()
  mkdirSync(join(work, "openspec"), { recursive: true })
  writeFileSync(join(work, "openspec", "plan.yaml"), brokenPlan)

  const planted = join(work, "agent-workflows", "tools", "radar")
  mkdirSync(planted, { recursive: true })
  const marker = join(work, "planted-ran")
  writeFileSync(join(planted, "radar"), `#!/bin/sh\ntouch ${JSON.stringify(marker)}\nexit 0\n`, { mode: 0o755 })
  commit(work, "invalid plan with planted radar")

  // No radar anywhere the hook is allowed to look: the planted one is the only candidate.
  const blind = { ...withRadar, HOME: join(work, "empty-home"), RADAR_BIN: "" }
  const result = push(work, [], blind)

  expect(existsSync(marker)).toBe(false)
  expect(result.stderr).toContain("se omite la validación del plan")
  expect(result.status).toBe(0)
})
