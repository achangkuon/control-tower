import { afterEach, describe, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import * as realFs from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"

const roots = []
afterEach(() => roots.splice(0).forEach(root => realFs.rmSync(root, { recursive: true, force: true })))
const git = (cwd, argv, options = {}) => execFileSync("git", argv, { cwd, ...options }).toString("utf8").trim()
const fixture = () => {
  const root = realFs.mkdtempSync(join(tmpdir(), "ct-foundation-")); roots.push(root)
  git(root, ["init", "-q", "-b", "main"]); git(root, ["config", "user.email", "tower@example.invalid"]); git(root, ["config", "user.name", "Tower"])
  realFs.writeFileSync(join(root, "tracked"), "base\n"); git(root, ["add", "tracked"]); git(root, ["commit", "-qm", "base"])
  return { root: resolve(root), common: resolve(root, ".git"), oid: git(root, ["rev-parse", "HEAD"]), target: resolve(root, "slot-primary") }
}
const sha = c => `sha256:${c.repeat(64)}`
const request = (f, patch = {}) => ({ schema: "physical-slot-foundation", schema_version: 1, operation: "REPLACE", project_id: "control-tower", registry_revision: 7, repository_root: f.root, git_common_dir: f.common, slot_id: "primary", target_path: f.target, prior_binding_digest: null, jornada_id: "jornada-9", jornada_revision: 2, jornada_state_digest: sha("a"), occupancy_digest: sha("b"), assignment_revision: null, requested_branch: "work/fresh", base_oid: f.oid, ...patch })
const authority = f => { const value = request(f); delete value.schema; delete value.schema_version; delete value.operation; return value }
const snapshot = f => ({ refs: git(f.root, ["show-ref", "--head"]), worktrees: git(f.root, ["worktree", "list", "--porcelain"]), files: realFs.readdirSync(f.root).sort(), locks: realFs.existsSync(join(f.common, "control-tower")) })
const load = () => import("../../workspace/slot-lifecycle.mjs")
const wrapGit = (f, mutate = () => undefined, calls = []) => (cwd, argv, options) => { calls.push({ cwd, argv, options }); const changed = mutate(argv); return changed === undefined ? git(cwd, argv, options) : changed }

const unsafe = result => { expect(result.state).toBe("UNSAFE"); return result.reasons[0] }

describe("M9.1.2 canonical observation foundation correction", () => {
  test("owns a scalar authority snapshot without disclosure, serialization, digest inclusion, mutation, or freezing", async () => {
    const f = fixture(), secret = { token: "never-serialize" }, owned = { ...authority(f), secret, capability() {} }, { createPhysicalSlotLifecycle } = await load()
    const result = createPhysicalSlotLifecycle({ resolveAuthoritativeContext: () => owned }).inspect(request(f))
    expect(unsafe(result)).toBe("SEMANTIC_PROOF_REQUIRED")
    expect(JSON.stringify(result)).not.toContain("never-serialize"); expect(result.before.evidence.authority.secret).toBeUndefined()
    expect(Object.isFrozen(owned)).toBeFalse(); expect(Object.isFrozen(secret)).toBeFalse(); expect(owned.secret).toBe(secret)
    expect(result.before.digest).toBe(result.after.digest); expect(Object.isFrozen(result.before.evidence.authority)).toBeTrue()
  })

  test("rejects missing, extra, NUL/noncanonical, malformed and contradictory request/authority fields with stable precedence", async () => {
    const f = fixture(), { createPhysicalSlotLifecycle } = await load(), lifecycle = createPhysicalSlotLifecycle({ resolveAuthoritativeContext: () => authority(f) })
    for (const patch of [{ extra: 1 }, { requested_branch: "bad\0name" }, { requested_branch: "refs/heads/x" }, { base_oid: f.oid.slice(0, 12) }, { repository_root: `${f.root}/..` }, { target_path: resolve(f.root, "../escape") }]) expect(unsafe(lifecycle.inspect(request(f, patch)))).toBe("REQUEST_INVALID")
    const missing = request(f); delete missing.slot_id; expect(unsafe(lifecycle.inspect(missing))).toBe("REQUEST_INVALID")
    const wrong = createPhysicalSlotLifecycle({ resolveAuthoritativeContext: () => ({ ...authority(f), slot_id: "other" }) }); expect(unsafe(wrong.inspect(request(f)))).toBe("AUTHORITY_MISMATCH")
  })

  test("cross-binds full HEAD, branch/ref, requested ref absence, base, root/common-dir, and rejects malformed duplicate porcelain", async () => {
    const f = fixture(), { createPhysicalSlotLifecycle } = await load()
    const cases = [
      argv => argv[0] === "rev-parse" && argv[1] === "HEAD" ? f.oid.slice(0, 12) : undefined,
      argv => argv[0] === "symbolic-ref" ? "refs/heads/other" : undefined,
      argv => argv[0] === "rev-parse" && argv[1] === "--show-toplevel" ? dirname(f.root) : undefined,
      argv => argv[0] === "worktree" ? `${git(f.root, argv)}\n\n${git(f.root, argv)}` : undefined,
      argv => argv[0] === "show-ref" ? `${git(f.root, argv)}\n${f.oid} refs/heads/work/fresh` : undefined,
    ]
    for (const change of cases) expect(unsafe(createPhysicalSlotLifecycle({ resolveAuthoritativeContext: () => authority(f), git: wrapGit(f, change) }).inspect(request(f)))).toMatch(/GIT_(EVIDENCE_INVALID|IDENTITY_MISMATCH)/)
  })

  test("binds owner-safe repo and external common-dir paths to no-follow descriptor identity, timestamps and content", async () => {
    const f = fixture(), evidence = join(f.root, "evidence.json"); realFs.writeFileSync(evidence, "aa", { mode: 0o600 }); f.target = evidence
    const { createPhysicalSlotLifecycle } = await load(), flags = [], fs = { ...realFs, openSync(path, value) { flags.push(value); return realFs.openSync(path, value) } }
    const good = createPhysicalSlotLifecycle({ resolveAuthoritativeContext: () => authority(f), fs }).inspect(request(f)); expect(unsafe(good)).toBe("SEMANTIC_PROOF_REQUIRED")
    const descriptor = good.before.evidence.target_components.at(-1).descriptor
    expect(descriptor.content_digest).toMatch(/^sha256:[0-9a-f]{64}$/); expect(typeof descriptor.mtime_ns).toBe("string"); expect(typeof descriptor.ctime_ns).toBe("string")
    expect(flags.every(value => (value & realFs.constants.O_NOFOLLOW) && (value & realFs.constants.O_ACCMODE) === realFs.constants.O_RDONLY)).toBeTrue()
    const badOwner = { ...realFs, lstatSync(path) { const stat = realFs.lstatSync(path); return path === f.common ? new Proxy(stat, { get: (target, key) => key === "uid" ? target.uid + 1 : target[key] }) : stat } }
    expect(unsafe(createPhysicalSlotLifecycle({ resolveAuthoritativeContext: () => authority(f), fs: badOwner }).inspect(request(f)))).toBe("FILESYSTEM_UNSAFE")
    realFs.chmodSync(evidence, 0o644); expect(unsafe(createPhysicalSlotLifecycle({ resolveAuthoritativeContext: () => authority(f) }).inspect(request(f)))).toBe("FILESYSTEM_UNSAFE")
    realFs.chmodSync(evidence, 0o600); realFs.linkSync(evidence, `${evidence}.link`); expect(unsafe(createPhysicalSlotLifecycle({ resolveAuthoritativeContext: () => authority(f) }).inspect(request(f)))).toBe("FILESYSTEM_UNSAFE"); realFs.unlinkSync(`${evidence}.link`)
    realFs.rmSync(evidence); realFs.mkfifoSync?.(evidence, 0o600); if (realFs.existsSync(evidence)) { expect(unsafe(createPhysicalSlotLifecycle({ resolveAuthoritativeContext: () => authority(f) }).inspect(request(f)))).toBe("FILESYSTEM_UNSAFE"); realFs.rmSync(evidence) }
    realFs.symlinkSync(dirname(evidence), evidence); expect(unsafe(createPhysicalSlotLifecycle({ resolveAuthoritativeContext: () => authority(f) }).inspect(request(f)))).toBe("FILESYSTEM_UNSAFE")
  })

  test("detects same-size content/descriptor drift, deeply freezes owned output, and preserves zero effects", async () => {
    const f = fixture(), evidence = join(f.root, "evidence.json"); realFs.writeFileSync(evidence, "aa", { mode: 0o600 }); f.target = evidence
    const before = snapshot(f), { createPhysicalSlotLifecycle } = await load(), calls = [], fs = { ...realFs, readFileSync(fd) { const bytes = realFs.readFileSync(fd); if (bytes.toString() === "aa") realFs.writeFileSync(evidence, "bb"); return bytes } }
    expect(unsafe(createPhysicalSlotLifecycle({ resolveAuthoritativeContext: () => authority(f), fs }).inspect(request(f)))).toBe("FILESYSTEM_UNSAFE")
    realFs.writeFileSync(evidence, "aa"); const lifecycle = createPhysicalSlotLifecycle({ resolveAuthoritativeContext: () => authority(f), git: wrapGit(f, () => undefined, calls) }), result = lifecycle.inspect(request(f))
    expect(unsafe(result)).toBe("SEMANTIC_PROOF_REQUIRED"); expect(Object.isFrozen(result.before.evidence.target_components.at(-1).descriptor)).toBeTrue()
    expect(calls.every(({ argv, options }) => Array.isArray(argv) && options.env.GIT_OPTIONAL_LOCKS === "0")).toBeTrue(); expect(snapshot(f)).toEqual(before); expect(Object.keys(lifecycle)).toEqual(["inspect"])
  })
})
