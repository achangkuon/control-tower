import { afterEach, describe, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const roots = []
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true }) })

const git = (cwd, args) => {
  const output = execFileSync("git", args, {
  cwd,
  stdio: ["ignore", "pipe", "pipe"],
  })
  return args[0] === "cat-file" || args.includes("-z") ? output : output.toString("utf8").trim()
}

const loadCapture = () => import("../../workspace/checkpoint.mjs")

const fixture = (content = "result\n") => {
  const root = mkdtempSync(join(tmpdir(), "ct-checkpoint-"))
  roots.push(root)
  mkdirSync(root, { recursive: true })
  git(root, ["init", "-q", "-b", "main"])
  git(root, ["config", "user.email", "tower-test@example.invalid"])
  git(root, ["config", "user.name", "Tower Test"])
  writeFileSync(join(root, "tracked.txt"), "base\n")
  git(root, ["add", "tracked.txt"])
  git(root, ["commit", "-q", "-m", "base"])
  const base = { commit: git(root, ["rev-parse", "HEAD"]), tree: git(root, ["rev-parse", "HEAD^{tree}"]) }
  writeFileSync(join(root, "tracked.txt"), content)
  git(root, ["add", "tracked.txt"])
  git(root, ["commit", "-q", "-m", "result"])
  const result = { commit: git(root, ["rev-parse", "HEAD"]), tree: git(root, ["rev-parse", "HEAD^{tree}"]) }
  git(root, ["reset", "-q", "--mixed", base.commit])
  git(root, ["add", "tracked.txt"])
  return { root, base, result, content }
}

const request = (value, overrides = {}) => ({
  project_id: "control-tower",
  assignment_id: "assignment-s5-11",
  generation: 3,
  repositoryRoot: value.root,
  base: value.base,
  result: value.result,
  files: [{ path: "tracked.txt", bytes: new TextEncoder().encode(value.content), mode: "raw-bytes" }],
  ...overrides,
})

const errorCode = async (operation) => {
  try { await operation() } catch (error) { return error.code }
  return null
}

describe("checkpoint capture", () => {
  test("captures canonical repository, full commit/tree identities, and immutable byte evidence", async () => {
    const value = fixture()
    const { captureCheckpoint, assertCanonicalCheckpointCapture } = await loadCapture()
    const calls = []
    const capture = captureCheckpoint(request(value), { git(cwd, args) { calls.push([cwd, args]); return git(cwd, args) } })

    expect(capture).toEqual({
      schema: "checkpoint-capture",
      schema_version: 1,
      checkpoint_id: expect.stringMatching(/^checkpoint-[a-f0-9]{64}$/),
      digest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      project_id: "control-tower",
      assignment_id: "assignment-s5-11",
      generation: 3,
      repository_root: value.root,
      git_common_dir: join(value.root, ".git"),
      base: value.base,
      result: value.result,
      files: [{ path: "tracked.txt", mode: "raw-bytes", git_mode: "100644", digest: "sha256:5656fafa00d4f294bcb606cf4f7d4fa877390e46f583e8b3c8744ace104a31d1" }],
    })
    expect(assertCanonicalCheckpointCapture(capture)).toBe(capture)
    expect(Object.getPrototypeOf(capture)).toBe(Object.prototype)
    expect(Object.isFrozen(capture)).toBeTrue()
    expect(Object.isFrozen(capture.base)).toBeTrue()
    expect(Object.isFrozen(capture.result)).toBeTrue()
    expect(Object.isFrozen(capture.files)).toBeTrue()
    expect(Object.isFrozen(capture.files[0])).toBeTrue()
    expect(calls.every(([, args]) => !args.includes("-C") && !args.includes("commit") && !args.includes("push") && !args.includes("fetch"))).toBeTrue()
  })

  test("separates enumerable integrity from exact live producer origin", async () => {
    const value = fixture()
    const { captureCheckpoint, assertCanonicalCheckpointCapture } = await loadCapture()
    const { validate } = await import("../../contracts/validate.mjs")
    const capture = captureCheckpoint(request(value), { git })
    const repeated = captureCheckpoint(request(value), { git })

    expect(repeated).not.toBe(capture)
    expect(repeated.checkpoint_id).toBe(capture.checkpoint_id)
    expect(repeated.digest).toBe(capture.digest)
    expect(validate("checkpointCapture", structuredClone(capture))).toEqual(capture)
    expect(Object.keys(capture)).toEqual([
      "schema", "schema_version", "checkpoint_id", "digest", "project_id", "assignment_id", "generation",
      "repository_root", "git_common_dir", "base", "result", "files",
    ])
    expect(Reflect.ownKeys(capture)).toEqual(Object.keys(capture))
    expect(Object.getOwnPropertySymbols(capture)).toEqual([])
    expect(JSON.parse(JSON.stringify(capture))).toEqual(capture)

    for (const copy of [structuredClone(capture), { ...capture }, JSON.parse(JSON.stringify(capture)), new Proxy(capture, {})]) {
      expect(await errorCode(() => assertCanonicalCheckpointCapture(copy))).toBe("CT_PROVENANCE_ORIGIN_INVALID")
    }
  })

  test("rejects producer-owned output claims and incomplete capture context", async () => {
    const value = fixture()
    const { captureCheckpoint } = await loadCapture()
    const claims = [
      { schema: "checkpoint-capture" }, { schema_version: 1 }, { checkpoint_id: `checkpoint-${"a".repeat(64)}` },
      { digest: `sha256:${"a".repeat(64)}` }, { repository_root: value.root }, { git_common_dir: join(value.root, ".git") },
      { provenance: {} }, { origin: true }, { artifact: {} },
    ]
    for (const claim of claims) expect(await errorCode(() => captureCheckpoint(request(value, claim), { git }))).toBe("CT_CHECKPOINT_UNSAFE")
    for (const missing of ["project_id", "assignment_id", "generation"]) {
      const input = request(value); delete input[missing]
      expect(await errorCode(() => captureCheckpoint(input, { git }))).toBe("CT_CHECKPOINT_UNSAFE")
    }
  })

  test.each([
    new Uint8Array([0]),
    new TextEncoder().encode("result?\n"),
  ])("rejects caller-provided bytes that differ from the staged result", async (bytes) => {
    const value = fixture()
    const { captureCheckpoint } = await loadCapture()

    expect(await errorCode(() => captureCheckpoint(request(value, {
      files: [{ path: "tracked.txt", bytes, mode: "raw-bytes" }],
    }), { git }))).toBe("CT_CHECKPOINT_UNSAFE")
  })

  test("derives an RFC 8785 digest from staged structured bytes", async () => {
    const value = fixture('{"content":"result"}\n')
    const { captureCheckpoint } = await loadCapture()
    const capture = captureCheckpoint(request(value, {
      files: [{ path: "tracked.txt", bytes: new TextEncoder().encode(value.content), mode: "rfc8785-jcs" }],
    }), { git })

    expect(capture.files[0]).toEqual({
      path: "tracked.txt",
      mode: "rfc8785-jcs",
      git_mode: "100644",
      digest: "sha256:d9185b480d90f7cf0e207bf96ed2ee6ad36ae94a82161675e86bc7364149ffe4",
    })
  })

  test.each([
    ["injected git selection", (value) => request(value, { repositoryRoot: "-C" })],
    ["escaping relative root", (value) => request(value, { repositoryRoot: "../outside" })],
    ["mismatched absolute root", (value) => request(value, { repositoryRoot: resolve(value.root, "..") })],
  ])("fails closed for %s without changing refs", async (_name, buildRequest) => {
    const value = fixture()
    const { captureCheckpoint } = await loadCapture()
    const before = git(value.root, ["show-ref", "--head"])
    const calls = []

    expect(await errorCode(() => captureCheckpoint(buildRequest(value), { git(cwd, args) { calls.push(args); return git(cwd, args) } }))).toBe("CT_CHECKPOINT_UNSAFE")
    expect(git(value.root, ["show-ref", "--head"])).toBe(before)
    expect(calls.every((args) => !args.includes("-C") && !args.includes("commit") && !args.includes("push") && !args.includes("fetch"))).toBeTrue()
  })

  test.each([
    ["an abbreviated commit", (value) => request(value, { base: { ...value.base, commit: value.base.commit.slice(0, 12) } })],
    ["a tree that does not belong to its commit", (value) => request(value, { result: { ...value.result, tree: value.base.tree } })],
  ])("rejects %s as an implicit identity", async (_name, buildRequest) => {
    const value = fixture()
    const { captureCheckpoint } = await loadCapture()

    expect(await errorCode(() => captureCheckpoint(buildRequest(value), { git }))).toBe("CT_CHECKPOINT_UNSAFE")
  })

  test.each([
    ["an empty index", (value) => { git(value.root, ["reset", "-q", "--mixed", value.base.commit]); return request(value) }],
    ["staged drift", (value) => { writeFileSync(join(value.root, "tracked.txt"), "drift\n"); git(value.root, ["add", "tracked.txt"]); return request(value) }],
  ])("rejects %s before capture", async (_name, buildRequest) => {
    const value = fixture()
    const { captureCheckpoint } = await loadCapture()

    expect(await errorCode(() => captureCheckpoint(buildRequest(value), { git }))).toBe("CT_CHECKPOINT_UNSAFE")
  })
})
