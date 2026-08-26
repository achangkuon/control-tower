import { afterEach, expect, test } from "bun:test"
import { chmodSync, linkSync, lstatSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createOpenCodeCredentialChannel } from "../../hosts/opencode-credential-channel.mjs"

const roots = [], target = { backend_url: "http://127.0.0.1:4096", root_session_id: `ses_${"a".repeat(26)}`, worktree: "/work/a" }
const setup = (options = {}) => { const root = mkdtempSync(join(tmpdir(), "ct-credentials-")); roots.push(root); chmodSync(root, 0o700); return { root, channel: createOpenCodeCredentialChannel({ root, randomRef: () => "r".repeat(43), now: () => 100, ...options }) } }
const failure = (operation) => { try { operation() } catch (error) { return error.code }; return null }
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))

test("mints one opaque ref and redeems the secret exactly once for its backend identity", () => {
  const { root, channel } = setup(), secret = "s".repeat(32)
  const credential_ref = channel.issue({ ...target, secret })
  expect(credential_ref).toBe("r".repeat(43))
  expect(JSON.stringify({ credential_ref, ...target })).not.toContain(secret)
  const [file] = Array.from(new Bun.Glob("*.json").scanSync(root))
  expect(lstatSync(join(root, file)).mode & 0o777).toBe(0o600)
  expect(readFileSync(join(root, file), "utf8")).toContain(secret)
  expect(channel.redeem({ credential_ref, ...target })).toBe(secret)
  expect(failure(() => channel.redeem({ credential_ref, ...target }))).toBe("CT_CREDENTIAL_REJECTED")
})

test("rejects foreign, stale, revoked and use-before-issue refs", () => {
  const { channel } = setup({ maxAgeMs: 10 }), ref = channel.issue({ ...target, secret: "s".repeat(32) })
  for (const changed of [{ worktree: "/work/b" }, { backend_url: "http://127.0.0.1:4097" }, { root_session_id: `ses_${"b".repeat(26)}` }]) {
    expect(failure(() => channel.redeem({ credential_ref: ref, ...target, ...changed }))).toBe("CT_CREDENTIAL_REJECTED")
  }
  expect(channel.revoke(ref, target.worktree)).toBe(true)
  expect(channel.revoke(ref, target.worktree)).toBe(true)
  expect(failure(() => channel.redeem({ credential_ref: ref, ...target }))).toBe("CT_CREDENTIAL_REJECTED")
  expect(failure(() => channel.redeem({ credential_ref: "x".repeat(43), ...target }))).toBe("CT_CREDENTIAL_REJECTED")
  let clock = 100
  const stale = setup({ now: () => clock, maxAgeMs: 10 }).channel, staleRef = stale.issue({ ...target, secret: "s".repeat(32) })
  clock = 111
  expect(failure(() => stale.redeem({ credential_ref: staleRef, ...target }))).toBe("CT_CREDENTIAL_REJECTED")
})

test("cleans a failed write without deleting a foreign pre-existing credential", () => {
  const broken = setup({ writeCredential: () => { throw new Error("disk full") } })
  expect(failure(() => broken.channel.issue({ ...target, secret: "s".repeat(32) }))).toBe("CT_CREDENTIAL_REJECTED")
  expect(Array.from(new Bun.Glob("*.json").scanSync(broken.root))).toEqual([])

  const foreign = setup(), ref = foreign.channel.issue({ ...target, secret: "f".repeat(32) })
  const file = join(foreign.root, Array.from(new Bun.Glob("*.json").scanSync(foreign.root))[0]), bytes = readFileSync(file, "utf8")
  expect(failure(() => foreign.channel.issue({ ...target, secret: "s".repeat(32) }))).toBe("CT_CREDENTIAL_REJECTED")
  expect(readFileSync(file, "utf8")).toBe(bytes)
  expect(foreign.channel.redeem({ credential_ref: ref, ...target })).toBe("f".repeat(32))
})

test("fails closed on owner mode, symlink, hardlink and path substitution", () => {
  for (const mutate of [
    ({ root }) => chmodSync(root, 0o755),
    ({ root, file }) => chmodSync(file, 0o644),
    ({ root, file }) => linkSync(file, `${file}.hard`),
    ({ root, file }) => { rmSync(file); symlinkSync(join(root, "foreign"), file) },
  ]) {
    const fixture = setup(), ref = fixture.channel.issue({ ...target, secret: "s".repeat(32) })
    const file = join(fixture.root, Array.from(new Bun.Glob("*.json").scanSync(fixture.root))[0]); mutate({ ...fixture, file })
    expect(failure(() => fixture.channel.redeem({ credential_ref: ref, ...target }))).toBe("CT_CREDENTIAL_REJECTED")
  }
  const { root, channel } = setup({ uid: process.getuid() + 1 })
  expect(failure(() => channel.issue({ ...target, secret: "s".repeat(32) }))).toBe("CT_CREDENTIAL_REJECTED")
  expect(lstatSync(root).mode & 0o777).toBe(0o700)
})
