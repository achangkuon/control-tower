import { afterEach, expect, test } from "bun:test"
import { chmodSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createHash } from "node:crypto"

import { createPinnedHostRuntime } from "../../hosts/production-provider.mjs"

const directories = []
afterEach(() => directories.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })))
const contract = '{"schema":"herdr.agent_root_observation","schema_version":1,"capabilities":["pane_bound","opencode_session_lineage"]}\n'
const runtime = (scripts) => {
  const root = mkdtempSync(join(tmpdir(), "ct-pinned-runtime-")), dataRoot = join(root, "data"), version = "v1", versionRoot = join(dataRoot, "versions", version), bin = join(root, "bin")
  directories.push(root); mkdirSync(versionRoot, { recursive: true, mode: 0o700 }); mkdirSync(bin, { recursive: true, mode: 0o700 })
  const executable = (name, bytes) => {
    const path = join(bin, name); writeFileSync(path, bytes, { mode: 0o700 }); chmodSync(path, 0o700)
    const stat = statSync(path)
    return { path, sha256: createHash("sha256").update(bytes).digest("hex"), dev: stat.dev, ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs, ctimeMs: stat.ctimeMs, uid: stat.uid, mode: stat.mode & 0o777, nlink: stat.nlink }
  }
  const herdr = executable("herdr", scripts.herdr ?? `#!/bin/sh\nif [ "$1 $2 $3" = "contract agent-root-observation --json" ]; then printf '${contract}'; fi\n`)
  const opencode = executable("opencode", scripts.opencode ?? "#!/bin/sh\nprintf original\n")
  writeFileSync(join(dataRoot, "active.json"), JSON.stringify({ version }), { mode: 0o600 })
  writeFileSync(join(versionRoot, "host-runtime.json"), JSON.stringify({ schema: "control-tower.host-runtime/v1", runtimeVersion: version, herdr, opencode, herdr_contract: JSON.parse(contract) }), { mode: 0o600 })
  return { root: versionRoot, dataRoot, version, bin, opencode: opencode.path }
}

test("fails closed after an atomic pathname replacement without executing replacement bytes", () => {
  const fixture = runtime({}), pinned = createPinnedHostRuntime(fixture), replacement = join(fixture.bin, "replacement"), marker = join(fixture.bin, "replacement-ran")
  writeFileSync(replacement, `#!/bin/sh\nprintf replacement > ${marker}\n`, { mode: 0o700 }); renameSync(replacement, fixture.opencode)
  try {
    expect(() => pinned.run("opencode", [])).toThrow("Pinned host executable changed")
    expect(existsSync(marker)).toBe(false)
  } finally { pinned.close() }
})

test("kills a hanging pinned executable within the bounded timeout", () => {
  const fixture = runtime({ opencode: "#!/bin/sh\nwhile :; do :; done\n" }), pinned = createPinnedHostRuntime(fixture), started = Date.now()
  try {
    expect(() => pinned.run("opencode", [])).toThrow("Pinned host process exceeded its boundary")
    expect(Date.now() - started).toBeLessThan(1_800)
  } finally { pinned.close() }
})

test("rejects output that exceeds the bounded host-process buffer", () => {
  const fixture = runtime({ opencode: "#!/bin/sh\nwhile :; do printf x; done\n" }), pinned = createPinnedHostRuntime(fixture)
  try { expect(() => pinned.run("opencode", [])).toThrow("Pinned host process exceeded its boundary") }
  finally { pinned.close() }
})
