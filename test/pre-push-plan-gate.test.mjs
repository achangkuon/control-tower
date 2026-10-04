import { afterEach, expect, test } from "bun:test"
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

import { git } from "./helpers/git.mjs"

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const hooksPath = join(packageRoot, ".githooks")
const radarSource = join(packageRoot, "agent-workflows", "tools", "radar")

const temporaryRoots = []
const temporaryDirectory = (prefix) => {
  const root = mkdtempSync(join(tmpdir(), prefix))
  temporaryRoots.push(root)
  return root
}

const shellQuote = (value) => `'${value.replaceAll("'", "'\"'\"'")}'`

const resolveRadar = (_repositoryBinary) => {
  const buildDirectory = temporaryDirectory("pre-push-radar-")
  const compiled = join(buildDirectory, "radar")
  const build = spawnSync("go", ["build", "-o", compiled, "."], { cwd: radarSource, encoding: "utf8" })
  if (build.status !== 0) throw new Error(`could not compile radar: ${build.stderr || build.error}`)
  return compiled
}

const radarWrapper = (planPath, executable = resolveRadar()) => {
  const wrapper = join(temporaryDirectory("pre-push-radar-wrapper-"), "radar")
  writeFileSync(wrapper, `#!/bin/sh\nexec ${shellQuote(executable)} check -f ${shellQuote(resolve(planPath))}\n`, { mode: 0o755 })
  return wrapper
}

afterEach(() => {
  while (temporaryRoots.length > 0) rmSync(temporaryRoots.pop(), { recursive: true, force: true })
})

// A push origin plus a working clone, both wired to the repository's own hooks. The gate
// must behave identically for every runtime, so the test drives plain git and nothing else.
const scenario = () => {
  const root = temporaryDirectory("pre-push-gate-")
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
const withRadar = (work, executable) => ({
  ...process.env,
  RADAR_BIN: radarWrapper(join(work, "openspec", "plan.yaml"), executable),
  HOME: "/nonexistent-home-for-gate-test",
  PATH: [process.env.CT_GIT_PROXY_DIR, "/usr/bin", "/bin"].filter(Boolean).join(":"),
})

// The gate must find no trusted radar at all: PATH carries none, RADAR_BIN is cleared and
// HOME does not hold the fixed install location. Tests then add exactly one candidate back.
const noTrustedRadar = (work) => ({
  ...process.env,
  RADAR_BIN: "",
  HOME: join(work, "empty-home"),
  PATH: [process.env.CT_GIT_PROXY_DIR, "/usr/bin", "/bin"].filter(Boolean).join(":"),
})

// S179. The suite gate fires only when the hook physically belongs to the pushed root, so
// this scenario installs the repository's own hook inside the fixture and points
// core.hooksPath at it. Suite commands come from the fixture's package.json — the seam the
// gate reads, so no invocation is hardcoded in the hook. scripts.test stays pinned to
// exactly "bun test" because an existing test asserts it.
const hookSource = readFileSync(join(hooksPath, "pre-push"), "utf8")

const suiteScenario = ({ scripts = {}, files = {} } = {}) => {
  const { origin, work } = scenario()
  const workHooks = join(work, ".githooks")
  mkdirSync(workHooks)
  writeFileSync(join(workHooks, "pre-push"), hookSource, { mode: 0o755 })
  git(work, ["config", "core.hooksPath", workHooks])

  writeFileSync(
    join(work, "package.json"),
    JSON.stringify(
      {
        name: "suite-gate-fixture",
        private: true,
        type: "module",
        scripts: { test: "bun test", "test:go": "true", "test:python": "true", ...scripts },
      },
      null,
      2,
    ),
  )
  writeFileSync(join(work, "smoke.test.mjs"), 'import { expect, test } from "bun:test"\ntest("smoke", () => expect(1).toBe(1))\n')

  for (const [path, content] of Object.entries(files)) {
    const target = join(work, path)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, content)
  }

  commit(work, "suite gate fixture")
  return { origin, work }
}

// A controlled PATH: symlinks to the tools under test, never the ambient PATH, so a test
// that removes one tool proves the block instead of inheriting the tool from the machine.
const toolDirectory = (tools) => {
  const directory = temporaryDirectory("pre-push-suite-tools-")
  for (const tool of tools) {
    const resolved = spawnSync("sh", ["-c", `command -v ${tool}`], { encoding: "utf8" }).stdout.trim()
    if (!resolved) throw new Error(`test prerequisite missing: ${tool}`)
    symlinkSync(resolved, join(directory, tool))
  }
  return directory
}

// System utilities without any Python: the host already carries /usr/bin/python3, so a PATH
// that keeps /usr/bin cannot simulate a missing python3. These shims keep git, grep,
// mktemp and friends reachable while removing every candidate the gate is checking for.
const systemShims = () => {
  const directory = temporaryDirectory("pre-push-suite-shims-")
  for (const entry of readdirSync("/usr/bin")) {
    if (entry.startsWith("python")) continue
    symlinkSync(join("/usr/bin", entry), join(directory, entry))
  }
  return directory
}

const suiteEnvironment = (tools = ["bun", "go", "python3"]) => ({
  ...process.env,
  RADAR_BIN: "",
  PATH: [process.env.CT_GIT_PROXY_DIR, toolDirectory(tools), systemShims()].filter(Boolean).join(":"),
})

const push = (work, extra = [], env = withRadar(work)) =>
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

test("a present repository radar is ignored in favor of a temporary build", () => {
  const repositoryBinary = join(temporaryDirectory("pre-push-repository-radar-"), "radar")
  writeFileSync(repositoryBinary, "#!/bin/sh\nexit 99\n", { mode: 0o755 })

  const compiled = resolveRadar(repositoryBinary)
  expect(compiled).not.toBe(repositoryBinary)
  expect(existsSync(compiled)).toBeTrue()
})

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

test("a temporary Radar build blocks an invalid target plan", () => {
  const { origin, work } = scenario()
  mkdirSync(join(work, "openspec"), { recursive: true })
  writeFileSync(join(work, "openspec", "plan.yaml"), brokenPlan)
  commit(work, "invalid plan with temporary Radar build")

  const blocked = push(work)

  expect(blocked.status).not.toBe(0)
  expect(blocked.stderr).toContain("el plan no valida")
  expect(originCommits(origin)).toBe("")
})

test("radar receives the absolute target plan from a foreign cwd", () => {
  const { work } = scenario()
  const planPath = join(work, "openspec", "plan.yaml")
  mkdirSync(join(work, "openspec"), { recursive: true })
  writeFileSync(planPath, brokenPlan)
  commit(work, "invalid plan from foreign cwd")

  const argumentsPath = join(work, "radar-arguments")
  const fake = join(work, "fake-radar")
  writeFileSync(fake, `#!/bin/sh\nprintf '%s\\n' "$@" > ${shellQuote(argumentsPath)}\nexit 3\n`, { mode: 0o755 })

  const originalCwd = process.cwd()
  process.chdir(temporaryDirectory("pre-push-foreign-cwd-"))
  let blocked
  try {
    blocked = push(work, [], withRadar(work, fake))
  } finally {
    process.chdir(originalCwd)
  }

  expect(blocked.status).not.toBe(0)
  expect(readFileSync(argumentsPath, "utf8")).toBe(`check\n-f\n${resolve(planPath)}\n`)
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

  const blind = { ...withRadar(work), HOME: join(work, "empty-home"), RADAR_BIN: "" }
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

  const blocked = push(work, [], withRadar(work, fake))
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
  const blocked = push(work, [], withRadar(work, fake))
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
  const blind = { ...withRadar(work), HOME: join(work, "empty-home"), RADAR_BIN: "" }
  const result = push(work, [], blind)

  expect(existsSync(marker)).toBe(false)
  expect(result.stderr).toContain("se omite la validación del plan")
  expect(result.status).toBe(0)
})

// S175. The promise is stronger than "no repo-relative lookup": every candidate is
// resolved to the destination the kernel would execute, and any destination inside the
// tree being pushed is discarded. RADAR_BIN is chosen by the user, but a user can be
// tricked into pointing it at a checked-out file, so it gets the same treatment as PATH.
const plantedRadar = (work, directory) => {
  const marker = join(work, "planted-ran")
  const planted = join(directory, "radar")
  mkdirSync(directory, { recursive: true })
  writeFileSync(planted, `#!/bin/sh\ntouch ${JSON.stringify(marker)}\nexit 0\n`, { mode: 0o755 })
  return { marker, planted }
}

test("an absolute RADAR_BIN inside the working tree is never run", () => {
  const { origin, work } = scenario()
  mkdirSync(join(work, "openspec"), { recursive: true })
  writeFileSync(join(work, "openspec", "plan.yaml"), brokenPlan)

  const { marker, planted } = plantedRadar(work, join(work, "tools"))
  commit(work, "invalid plan with an absolute RADAR_BIN inside the tree")

  const result = push(work, [], { ...noTrustedRadar(work), RADAR_BIN: planted })

  expect(existsSync(marker)).toBe(false)
  expect(result.stderr).toContain("se omite la validación del plan")
  expect(result.status).toBe(0)
  expect(originCommits(origin)).toContain("absolute RADAR_BIN inside the tree")
})

// A relative candidate is resolved against the hook's cwd, which git sets to the root of
// the working tree. It must not escape the containment check by being relative.
test("a relative RADAR_BIN inside the working tree is never run", () => {
  const { origin, work } = scenario()
  mkdirSync(join(work, "openspec"), { recursive: true })
  writeFileSync(join(work, "openspec", "plan.yaml"), brokenPlan)

  const { marker } = plantedRadar(work, join(work, "tools"))
  commit(work, "invalid plan with a relative RADAR_BIN inside the tree")

  const result = push(work, [], { ...noTrustedRadar(work), RADAR_BIN: "tools/radar" })

  expect(existsSync(marker)).toBe(false)
  expect(result.stderr).toContain("se omite la validación del plan")
  expect(result.status).toBe(0)
  expect(originCommits(origin)).toContain("relative RADAR_BIN inside the tree")
})

// The candidate path can look external while the kernel would still execute a file inside
// the tree. Resolving symlinks before the containment check is what closes that gap.
test("a RADAR_BIN symlink resolving into the working tree is never run", () => {
  const { origin, work } = scenario()
  mkdirSync(join(work, "openspec"), { recursive: true })
  writeFileSync(join(work, "openspec", "plan.yaml"), brokenPlan)

  const { marker, planted } = plantedRadar(work, join(work, "tools"))
  commit(work, "invalid plan with a RADAR_BIN symlink into the tree")

  const outside = join(temporaryDirectory("pre-push-radar-symlink-"), "radar")
  symlinkSync(planted, outside)

  const result = push(work, [], { ...noTrustedRadar(work), RADAR_BIN: outside })

  expect(existsSync(marker)).toBe(false)
  expect(result.stderr).toContain("se omite la validación del plan")
  expect(result.status).toBe(0)
  expect(originCommits(origin)).toContain("RADAR_BIN symlink into the tree")
})

// A PATH entry can be a directory inside the checkout just as easily as RADAR_BIN can be a
// file there. `command -v` reports the path; the hook must still refuse to run it.
test("a PATH entry inside the working tree is never run", () => {
  const { origin, work } = scenario()
  mkdirSync(join(work, "openspec"), { recursive: true })
  writeFileSync(join(work, "openspec", "plan.yaml"), brokenPlan)

  const plantedDirectory = join(work, "tools", "bin")
  const { marker } = plantedRadar(work, plantedDirectory)
  commit(work, "invalid plan with a PATH entry inside the tree")

  const environment = {
    ...noTrustedRadar(work),
    PATH: [process.env.CT_GIT_PROXY_DIR, plantedDirectory, "/usr/bin", "/bin"].filter(Boolean).join(":"),
  }
  const result = push(work, [], environment)

  expect(existsSync(marker)).toBe(false)
  expect(result.stderr).toContain("se omite la validación del plan")
  expect(result.status).toBe(0)
  expect(originCommits(origin)).toContain("PATH entry inside the tree")
})

// Positive control for the containment check: a radar that really lives outside the tree,
// at the fixed install location under HOME, is still found and still runs the gate.
test("an external radar outside the tree is resolved and the gate runs", () => {
  const { origin, work } = scenario()
  mkdirSync(join(work, "openspec"), { recursive: true })
  writeFileSync(join(work, "openspec", "plan.yaml"), brokenPlan)
  commit(work, "invalid plan with an external radar")

  const marker = join(temporaryDirectory("pre-push-external-marker-"), "ran")
  const home = temporaryDirectory("pre-push-external-home-")
  const installed = join(home, ".local", "bin", "radar")
  mkdirSync(join(home, ".local", "bin"), { recursive: true })
  writeFileSync(installed, `#!/bin/sh\ntouch ${JSON.stringify(marker)}\nexit 3\n`, { mode: 0o755 })

  const result = push(work, [], { ...noTrustedRadar(work), HOME: home })

  expect(existsSync(marker)).toBe(true)
  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain("el plan no valida")
  expect(originCommits(origin)).not.toContain("invalid plan with an external radar")
})

// `core.hooksPath` is per-clone configuration and does not travel with the repository, so a
// fresh clone carries the hook file and runs none of it. That is the gap the installer has to
// close: shipping `.githooks/pre-push` in the tree is not the same as arming it. These two
// tests pin both halves — the gap, and the one command that closes it — so that a future
// change to the installer cannot silently stop wiring the gate.
const unwiredScenario = () => {
  const root = temporaryDirectory("pre-push-unwired-")
  const origin = join(root, "origin")
  const work = join(root, "work")
  mkdirSync(origin)
  mkdirSync(work)

  git(origin, ["init", "--quiet", "--bare", "."])
  git(work, ["init", "--quiet", "."])
  // Deliberately no core.hooksPath: this is what `git clone` leaves behind.
  git(work, ["config", "user.email", "gate@test"])
  git(work, ["config", "user.name", "gate"])
  git(work, ["remote", "add", "origin", origin])

  return { origin, work }
}

test("a clone that never configured core.hooksPath runs no gate at all", () => {
  const { origin, work } = unwiredScenario()
  mkdirSync(join(work, "openspec"), { recursive: true })
  writeFileSync(join(work, "openspec", "plan.yaml"), brokenPlan)
  commit(work, "invalid plan, unwired clone")

  const result = push(work)

  // The plan is invalid, yet nothing stops the push: the hook was never reachable.
  expect(result.status).toBe(0)
  expect(originCommits(origin)).toContain("invalid plan, unwired clone")
})

test("configuring core.hooksPath is the single step that arms the gate", () => {
  const { origin, work } = unwiredScenario()
  mkdirSync(join(work, "openspec"), { recursive: true })
  writeFileSync(join(work, "openspec", "plan.yaml"), brokenPlan)
  commit(work, "invalid plan, wired clone")

  git(work, ["config", "core.hooksPath", hooksPath])
  const result = push(work)

  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain("el plan no valida")
  expect(originCommits(origin)).toBe("")
})

// ── S179. The suite gate: Bun, Go and Python are all mandatory ───────────────
// These pushes carry no plan, so only the suite gate is exercised. Every assertion pins
// the verdict AND the name of the suite, because "el push falló" alone cannot tell a
// blocked push from an unrelated error.

test("all three suites passing lets the push through", () => {
  const { origin, work } = suiteScenario()

  const result = push(work, [], suiteEnvironment())

  expect(result.status).toBe(0)
  expect(result.stderr).toContain("las tres suites pasaron en verde")
  expect(originCommits(origin)).toContain("suite gate fixture")
})

test("a failing Go suite blocks the push and names the suite", () => {
  const { origin, work } = suiteScenario({ scripts: { "test:go": "exit 1" } })

  const result = push(work, [], suiteEnvironment())

  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain("la suite Go (test:go) falló")
  expect(originCommits(origin)).not.toContain("suite gate fixture")
})

test("a failing Python suite blocks the push and names the suite", () => {
  const { origin, work } = suiteScenario({ scripts: { "test:python": "exit 1" } })

  const result = push(work, [], suiteEnvironment())

  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain("la suite Python (test:python) falló")
  expect(originCommits(origin)).not.toContain("suite gate fixture")
})

// A missing tool must block with an explanation, never fail open: a suite that cannot run
// is not a suite that passed.
test("a missing go binary blocks the push with an explanation", () => {
  const { origin, work } = suiteScenario()

  const result = push(work, [], suiteEnvironment(["bun", "python3"]))

  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain("falta go")
  expect(result.stderr).toContain("go.dev/dl")
  expect(originCommits(origin)).not.toContain("suite gate fixture")
})

test("a missing python3 binary blocks the push with an explanation", () => {
  const { origin, work } = suiteScenario()

  const result = push(work, [], suiteEnvironment(["bun", "go"]))

  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain("falta python3")
  expect(result.stderr).toContain("python.org/downloads")
  expect(originCommits(origin)).not.toContain("suite gate fixture")
})

// A skipped test is legitimate and never blocks, but it is not green either. The hook must
// surface it instead of announcing a blanket pass over tests that never ran.
test("skipped tests are surfaced and never announced as a full green", () => {
  const { work } = suiteScenario({
    scripts: { "test:python": "python3 -m unittest discover -s fixture-tests -v" },
    files: {
      "fixture-tests/test_skip.py": [
        "import unittest",
        "",
        "class SkipCase(unittest.TestCase):",
        "    @unittest.skip('fixture skip')",
        "    def test_skipped(self):",
        "        self.fail('must not run')",
        "",
        "class PassCase(unittest.TestCase):",
        "    def test_passes(self):",
        "        self.assertTrue(True)",
        "",
      ].join("\n"),
    },
  })

  const result = push(work, [], suiteEnvironment())

  expect(result.status).toBe(0)
  expect(result.stderr).toContain("saltead")
  expect(result.stderr).not.toContain("pasaron en verde")
})

// Triangulation for the skip scan: a real Python suite with no skips must still come out
// green, so the detection cannot be matching unittest's ordinary verbose output.
test("a Python suite without skips still reports a full green", () => {
  const { work } = suiteScenario({
    scripts: { "test:python": "python3 -m unittest discover -s fixture-tests -v" },
    files: {
      "fixture-tests/test_pass.py": [
        "import unittest",
        "",
        "class PassCase(unittest.TestCase):",
        "    def test_passes(self):",
        "        self.assertTrue(True)",
        "",
      ].join("\n"),
    },
  })

  const result = push(work, [], suiteEnvironment())

  expect(result.status).toBe(0)
  expect(result.stderr).toContain("las tres suites pasaron en verde")
})

// Bun is checked first, so the whole gate refuses to run on a machine without it.
test("a missing bun binary blocks the push with an explanation", () => {
  const { origin, work } = suiteScenario()

  const result = push(work, [], suiteEnvironment(["go", "python3"]))

  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain("falta bun")
  expect(originCommits(origin)).not.toContain("suite gate fixture")
})

// The report is on demand now. Nothing in the hook may invoke it or consult
// RADIOGRAFIA_HOME on the push path.
test("the push no longer regenerates the report or honours RADIOGRAFIA_HOME", () => {
  const engine = temporaryDirectory("pre-push-suite-engine-")
  const marker = join(engine, "ran")
  writeFileSync(join(engine, "run.mjs"), `import { writeFileSync } from "node:fs"\nwriteFileSync(${JSON.stringify(marker)}, "ran")\n`)
  const { origin, work } = suiteScenario({ files: { "radiografia.json": "{}\n" } })

  const result = push(work, [], { ...suiteEnvironment(), RADIOGRAFIA_HOME: engine })

  expect(result.status).toBe(0)
  expect(existsSync(marker)).toBe(false)
  expect(result.stderr).not.toContain("radiografía")
  expect(originCommits(origin)).toContain("suite gate fixture")
})
