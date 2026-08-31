import { afterEach, describe, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { digestArtifact } from "../../contracts/canonicalize.mjs"
import { verifyArtifactRef } from "../../contracts/artifact-ref.mjs"
import { git as runGit } from "../helpers/git.mjs"

const roots = []
const git = (root, ...args) => runGit(root, args, { encoding: "utf8" }).trim()
const repo = () => {
  const root = mkdtempSync(join(tmpdir(), "ct-artifact-ref-")); roots.push(root)
  git(root, "init", "-q"); git(root, "config", "user.email", "test@example.com"); git(root, "config", "user.name", "Test")
  return root
}
const commit = (root) => { git(root, "add", "."); git(root, "commit", "-qm", "fixture"); return git(root, "rev-parse", "HEAD") }
const refFor = (root, path, mediaType = "text/plain") => {
  const sourceCommit = git(root, "rev-parse", "HEAD")
  const bytes = runGit(root, ["show", `${sourceCommit}:${path}`])
  return { schema: "artifact-ref", schema_version: 1, artifact_id: "fixture", artifact_revision: 1,
    repository_id: "control-tower", repo_relative_path: path, media_type: mediaType,
    digest_mode: "raw-bytes", source_commit: sourceCommit, content_digest: digestArtifact(bytes, "raw-bytes") }
}
const errorCode = (operation) => { try { operation() } catch (error) { return error.code } return null }
afterEach(() => { while (roots.length) rmSync(roots.pop(), { recursive: true, force: true }) })

describe("immutable ArtifactRef verification", () => {
  test("accepts opaque documentation-like and executable paths without executing them", () => {
    const root = repo()
    const files = ["requirements.txt", "CMakeLists.txt", "guide.md", "component.mdx", "README.sh"]
    for (const file of files) { writeFileSync(join(root, file), `opaque:${file}\n`); chmodSync(join(root, file), 0o755) }
    commit(root)
    for (const file of files) {
      const result = verifyArtifactRef(refFor(root, file), { repositoryId: "control-tower", repositoryRoot: root })
      expect(result.repo_relative_path).toBe(file); expect(Object.isFrozen(result)).toBe(true)
    }
  })

  test("uses fixed git -C argv and verifies commit, blob, and structured digest", () => {
    const root = repo(); writeFileSync(join(root, "artifact.json"), '{"b":2,"a":1}\n'); commit(root)
    const ref = refFor(root, "artifact.json", "application/json")
    ref.digest_mode = "rfc8785-jcs"
    ref.content_digest = digestArtifact('{"b":2,"a":1}\n', "rfc8785-jcs")
    const calls = []
    const execFile = (file, args, options) => { calls.push([file, args]); return execFileSync(file, args, options) }
    expect(verifyArtifactRef(ref, { repositoryId: "control-tower", repositoryRoot: root, execFile }).content_digest).toBe(ref.content_digest)
    expect(calls.length).toBeGreaterThan(2)
    for (const [file, args] of calls) { expect(file).toBe("git"); expect(args.slice(0, 2)).toEqual(["-C", root]) }
  })

  test("rejects stale or mismatched identity, commit, path, digest, project, and revision", () => {
    const root = repo(); writeFileSync(join(root, "artifact.txt"), "first\n"); commit(root)
    const valid = refFor(root, "artifact.txt")
    const mutations = [
      { content_digest: `sha256:${"0".repeat(64)}` }, { source_commit: "0".repeat(40) },
      { repo_relative_path: "missing.txt" }, { repository_id: "foreign" }, { artifact_revision: 2 },
    ]
    for (const mutation of mutations) expect(errorCode(() => verifyArtifactRef({ ...valid, ...mutation }, {
      repositoryId: "control-tower", repositoryRoot: root, artifactId: "fixture", artifactRevision: 1,
    }))).toBe("CT_ARTIFACT_REF_INVALID")
  })

  test("requires digest mode to match the declared media type", () => {
    const root = repo(); writeFileSync(join(root, "artifact.json"), '{"value":1}\n'); writeFileSync(join(root, "notes.md"), "notes\n"); commit(root)
    const structuredAsRaw = refFor(root, "artifact.json", "application/json")
    const opaqueAsStructured = refFor(root, "notes.md", "text/markdown")
    opaqueAsStructured.digest_mode = "rfc8785-jcs"
    opaqueAsStructured.content_digest = digestArtifact('"notes"', "rfc8785-jcs")
    expect(errorCode(() => verifyArtifactRef(structuredAsRaw, { repositoryId: "control-tower", repositoryRoot: root }))).toBe("CT_ARTIFACT_REF_INVALID")
    expect(errorCode(() => verifyArtifactRef(opaqueAsStructured, { repositoryId: "control-tower", repositoryRoot: root }))).toBe("CT_ARTIFACT_REF_INVALID")
  })

  test("rejects traversal, symlink entries, root aliases, foreign roots, and self-reference", () => {
    const root = repo(); writeFileSync(join(root, "target.txt"), "target\n"); symlinkSync("target.txt", join(root, "link.txt")); commit(root)
    const valid = refFor(root, "target.txt")
    const alias = `${root}-alias`; symlinkSync(root, alias); roots.push(alias)
    expect(errorCode(() => verifyArtifactRef({ ...valid, repo_relative_path: "../target.txt" }, { repositoryId: "control-tower", repositoryRoot: root }))).toBe("CT_ARTIFACT_REF_INVALID")
    expect(errorCode(() => verifyArtifactRef(refFor(root, "link.txt"), { repositoryId: "control-tower", repositoryRoot: root }))).toBe("CT_ARTIFACT_REF_INVALID")
    expect(errorCode(() => verifyArtifactRef(valid, { repositoryId: "control-tower", repositoryRoot: alias, expectedRepositoryRoot: root }))).toBe("CT_ARTIFACT_REF_INVALID")
    const foreign = repo(); writeFileSync(join(foreign, "target.txt"), "target\n"); commit(foreign)
    expect(errorCode(() => verifyArtifactRef(valid, { repositoryId: "control-tower", repositoryRoot: foreign, expectedRepositoryRoot: root }))).toBe("CT_ARTIFACT_REF_INVALID")
    expect(errorCode(() => verifyArtifactRef(valid, { repositoryId: "control-tower", repositoryRoot: root, artifactRefPath: "target.txt" }))).toBe("CT_ARTIFACT_REF_INVALID")
  })
})
