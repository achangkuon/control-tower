#!/usr/bin/env bun
// Build into the caller's chosen path. No installed binary or global state.
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { isAbsolute, resolve } from "node:path"

const [output] = process.argv.slice(2)
if (!output || !isAbsolute(output) || existsSync(output)) {
  process.stderr.write("usage: bun scripts/build-semaphore.mjs <new-absolute-output-path>\n")
  process.exit(2)
}
const root = resolve(import.meta.dir, "..")
const revision = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" })
if (revision.status !== 0 || !/^[0-9a-f]{40}$/.test(revision.stdout.trim())) {
  process.stderr.write("cannot determine source revision\n")
  process.exit(1)
}
const result = spawnSync(process.execPath, [
  "build", "--compile", "--define", `__CT_SEMAPHORE_REVISION__=${JSON.stringify(revision.stdout.trim())}`,
  resolve(root, "bin/torre-semaphore.mjs"), "--outfile", output,
], { cwd: root, stdio: "inherit" })
process.exit(result.status ?? 1)
