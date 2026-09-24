// Per-repository switch for the Chanks Pi controls. The switch decides whether the generated
// Pi extension consults Chanks at all; it grants nothing by itself and never authorizes a file.
//
// State lives outside the versioned tree, under the repository's git *common* directory, so
// every worktree of the same repository shares one decision instead of each guessing its own.
// A worktree's own `.git` file only points at that common directory — nothing here writes
// inside the tracked working tree.
//
// Only a human is expected to call `on`/`off` (through the CLI below or an equivalent host
// action). The extension itself must only ever call `effectiveSwitch`, a read with no side
// effect, so a model turn can never flip its own gate.

import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { dirname, isAbsolute, join, resolve } from "node:path"

const STATE_RELATIVE = ["chanks", "controls", "switch.json"]
const PLAN_RELATIVE = "openspec/plan.yaml"

const fail = (message) => {
  throw new Error(`pi-switch: ${message}`)
}

const defaultDependencies = () => ({
  execFile: execFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  mkdirSync,
})

const withDefaults = (dependencies) => ({ ...defaultDependencies(), ...(dependencies ?? {}) })

// gitCommonDir resolves the directory every worktree of this repository shares. It is exported
// so a caller can prove where state will land without reading the state file itself.
export const gitCommonDir = (repoRoot, dependencies) => {
  const deps = withDefaults(dependencies)
  if (typeof repoRoot !== "string" || repoRoot.trim() === "" || !isAbsolute(repoRoot)) {
    fail("repoRoot debe ser una ruta absoluta")
  }
  let raw
  try {
    raw = deps.execFile(
      "git",
      ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      { cwd: repoRoot, stdio: ["ignore", "pipe", "ignore"] },
    ).toString("utf8")
  } catch {
    fail(`${repoRoot} no es un repositorio git`)
  }
  const trimmed = raw.trim()
  if (trimmed === "" || !isAbsolute(trimmed)) fail("git no devolvió una ruta absoluta para --git-common-dir")
  return trimmed
}

const statePathFromCommonDir = (commonDir) => join(commonDir, ...STATE_RELATIVE)

const statePath = (repoRoot, deps) => statePathFromCommonDir(gitCommonDir(repoRoot, deps))

const planExists = (repoRoot, deps) => deps.existsSync(join(repoRoot, PLAN_RELATIVE))

const readStateAt = (path, deps) => {
  if (!deps.existsSync(path)) return { on: false, path }
  try {
    const parsed = JSON.parse(deps.readFileSync(path, "utf8"))
    return { on: parsed?.on === true, path }
  } catch {
    // A corrupted or foreign state file never fails open. Absent, unreadable, and malformed are
    // the same case: off.
    return { on: false, path }
  }
}

// switchStatusAt takes an already-resolved git common directory instead of deriving it itself,
// so it never spawns `git` — only `existsSync`/`readFileSync`. This is the read the generated Pi
// extension must use on every `tool_call` (R4-switch-evaluated-once-at-load /
// R4-unbounded-sync-subprocess-per-tool-call): the common directory is computed once, at load,
// and every governed operation after that re-reads only these two files.
export const switchStatusAt = (commonDir, repoRoot, dependencies) => {
  const deps = withDefaults(dependencies)
  const state = readStateAt(statePathFromCommonDir(commonDir), deps)
  const plan = planExists(repoRoot, deps)
  return Object.freeze({ on: state.on, planExists: plan, effective: state.on && plan, path: state.path })
}

export const effectiveSwitchAt = (commonDir, repoRoot, dependencies) => (
  switchStatusAt(commonDir, repoRoot, dependencies).effective
)

// switchStatus is the convenience entry point for a human-facing caller (the CLI below, tests):
// it resolves the git common directory itself, via one `git` subprocess call, then delegates to
// switchStatusAt. `effective` is the field that matters: it folds in the plan requirement so a
// caller never has to remember to re-check it, and it goes false the moment
// `openspec/plan.yaml` disappears even if the switch was left on.
export const switchStatus = (repoRoot, dependencies) => {
  const deps = withDefaults(dependencies)
  return switchStatusAt(gitCommonDir(repoRoot, deps), repoRoot, deps)
}

export const effectiveSwitch = (repoRoot, dependencies) => switchStatus(repoRoot, dependencies).effective

// setSwitch is the human-facing mutation. It refuses to turn on without a plan rather than
// silently storing an intent that can never become effective — a stored `on` that never applies
// is exactly the confusing state this module exists to avoid.
export const setSwitch = (repoRoot, on, dependencies) => {
  const deps = withDefaults(dependencies)
  if (typeof on !== "boolean") fail("'on' debe ser boolean")
  if (on && !planExists(repoRoot, deps)) fail("no se puede encender sin openspec/plan.yaml en el repositorio")
  const path = statePath(repoRoot, deps)
  deps.mkdirSync(dirname(path), { recursive: true })
  const temporary = `${path}.tmp-${process.pid}-${Date.now()}`
  deps.writeFileSync(temporary, `${JSON.stringify({ on }, null, 2)}\n`, { mode: 0o600 })
  deps.renameSync(temporary, path)
  return switchStatus(repoRoot, deps)
}

const usage = "uso: node pi-switch.mjs on|off|status [-C repo]"

const runCli = (argv) => {
  const command = argv[0]
  const flagIndex = argv.indexOf("-C")
  const repo = resolve(flagIndex !== -1 && argv[flagIndex + 1] ? argv[flagIndex + 1] : process.cwd())
  if (command === "on") return console.log(JSON.stringify(setSwitch(repo, true)))
  if (command === "off") return console.log(JSON.stringify(setSwitch(repo, false)))
  if (command === "status") return console.log(JSON.stringify(switchStatus(repo)))
  console.error(usage)
  process.exitCode = 2
}

const invokedDirectly = () => {
  try {
    return import.meta.url === `file://${resolve(process.argv[1] ?? "")}`
  } catch {
    return false
  }
}

if (invokedDirectly()) {
  try {
    runCli(process.argv.slice(2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
