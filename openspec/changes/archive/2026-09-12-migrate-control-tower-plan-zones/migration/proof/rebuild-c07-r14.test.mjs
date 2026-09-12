import { afterEach, describe, expect, test } from "bun:test"
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { join } from "node:path"

const workspace = process.cwd()
const script = join(import.meta.dir, "rebuild-c07-r14.sh")
const scratch = []

const temp = () => {
  const path = mkdtempSync(join(workspace, ".tmp-c07-r14-"))
  scratch.push(path)
  return path
}

const run = (...args) => {
  try {
    return { status: 0, stdout: execFileSync(script, args, { encoding: "utf8" }) }
  } catch (error) {
    return { status: error.status, stdout: error.stdout?.toString() ?? "", stderr: error.stderr?.toString() ?? "" }
  }
}

const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex")

const mockedPreflight = (existingProofRoot) => {
  const root = temp(), proof = join(root, "fresh-proof"), bin = join(root, "bin"), hook = join(root, "doc-guard.sh"), log = join(root, "log")
  mkdirSync(join(root, ".git", "objects"), { recursive: true }); mkdirSync(bin); if (existingProofRoot) mkdirSync(proof)
  writeFileSync(hook, "#!/usr/bin/env bash\n"); chmodSync(hook, 0o700)
  writeFileSync(join(bin, "git"), `#!/usr/bin/env bash
printf 'git|%s|%s|%s|%s|%s\\n' "$*" "\${GIT_DIR-}" "\${GIT_WORK_TREE-}" "\${GIT_INDEX_FILE-}" "\${GIT_OPTIONAL_LOCKS-}" >> "$MOCK_LOG"
case "$*" in *"rev-parse --git-common-dir"*) printf '.git\\n' ;; init\\ *) for arg; do last=$arg; done; mkdir -p "$last/objects/info" ;; *read-tree*) test "$GIT_DIR" = "$MOCK_PROOF/.c07-private-git" && test "$GIT_WORK_TREE" = "$MOCK_PROOF" && test "$GIT_INDEX_FILE" = "$MOCK_PROOF/.c07-private-git/c07-r14.index" && exit 74 ;; esac
`); chmodSync(join(bin, "git"), 0o700)
  writeFileSync(join(bin, "bun"), `#!/usr/bin/env bash
printf 'bun|%s|%s|%s|%s\\n' "\${GIT_DIR-}" "\${GIT_WORK_TREE-}" "\${GIT_INDEX_FILE-}" "\${GIT_OPTIONAL_LOCKS-}" >> "$MOCK_LOG"
test -z "\${GIT_DIR-}\${GIT_WORK_TREE-}\${GIT_INDEX_FILE-}\${GIT_OPTIONAL_LOCKS-}" || exit 71
printf '{}\\n'
`); chmodSync(join(bin, "bun"), 0o700)
  return { root, proof, hook, log, bin }
}

afterEach(() => scratch.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })))

describe("rebuild-c07-r14 portable preconditions", () => {
  test("documents its four portable inputs", () => {
    const result = run("--help")
    expect(result.status).toBe(0)
    expect(result.stdout).toContain("ROOT PROOF_ROOT DOC_GUARD DOC_GUARD_SHA256")
  })

  test("rejects a nonempty proof root without modifying it", () => {
    const root = temp()
    const proof = temp()
    const hook = join(root, "doc-guard.sh")
    writeFileSync(join(proof, "keep"), "unchanged")
    writeFileSync(hook, "#!/usr/bin/env bash\n")
    chmodSync(hook, 0o700)

    const result = run(root, proof, hook, hash(hook))
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("PROOF_ROOT must be absent or empty")
    expect(readFileSync(join(proof, "keep"), "utf8")).toBe("unchanged")
  })

  test.each([false, true])("runs portable preflight from the normal root with an %s proof root", (existingProofRoot) => {
    const { root, proof, hook, log, bin } = mockedPreflight(existingProofRoot)
    const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, MOCK_LOG: log, MOCK_PROOF: proof, GIT_DIR: "hostile", GIT_WORK_TREE: "hostile", GIT_INDEX_FILE: "hostile", GIT_OPTIONAL_LOCKS: "1" }
    let result
    try { execFileSync(script, [root, proof, hook, hash(hook)], { cwd: workspace, env, encoding: "utf8" }) } catch (error) { result = { status: error.status, stderr: error.stderr.toString() } }
    expect(result.status).toBe(74)
    expect(readFileSync(join(proof, ".c07-private-git", "objects", "info", "alternates"), "utf8")).toBe(`${join(root, ".git", "objects")}\n`)
    const calls = readFileSync(log, "utf8").trim().split("\n"), privateCall = calls.at(-1).split("|")
    expect(calls.filter((call) => call.startsWith("bun|")).every((call) => call === "bun||||")).toBe(true)
    expect(calls.slice(0, -1).filter((call) => call.startsWith("git|")).every((call) => call.endsWith("||||"))).toBe(true)
    expect(privateCall).toEqual(["git", "read-tree 39bc8c27c0478321156761c35437123cecdde3ed", join(proof, ".c07-private-git"), proof, join(proof, ".c07-private-git", "c07-r14.index"), "0"])
  })

  test("fails closed for a missing hook and a mismatched hook digest", () => {
    const root = temp()
    const proof = join(root, "fresh-proof")
    const hook = join(root, "doc-guard.sh")
    const missing = run(root, proof, hook, "0".repeat(64))
    expect(missing.status).not.toBe(0)
    expect(missing.stderr).toContain("DOC_GUARD must be executable")
    expect(existsSync(proof)).toBe(false)

    writeFileSync(hook, "#!/usr/bin/env bash\ntouch hook-ran\n")
    chmodSync(hook, 0o700)
    const mismatch = run(root, proof, hook, "f".repeat(64))
    expect(mismatch.status).not.toBe(0)
    expect(mismatch.stderr).toContain("DOC_GUARD_SHA256 mismatch")
    expect(existsSync(join(root, "hook-ran"))).toBe(false)
    expect(existsSync(proof)).toBe(false)
  })
})
