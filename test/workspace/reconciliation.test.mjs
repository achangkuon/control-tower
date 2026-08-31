import { afterEach, describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { captureCheckpoint } from "../../workspace/checkpoint.mjs"
import { validate } from "../../contracts/validate.mjs"
import { git as runGit } from "../helpers/git.mjs"

const roots = []
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true }) })
const git = (cwd, args) => {
  const output = runGit(cwd, args, { stdio: ["ignore", "pipe", "pipe"] })
  return args[0] === "cat-file" || args.includes("-z") ? output : output.toString("utf8").trim()
}
const captureFixture = () => {
  const root = mkdtempSync(join(tmpdir(), "ct-reconcile-")); roots.push(root); mkdirSync(root, { recursive: true })
  git(root, ["init", "-q", "-b", "main"]); git(root, ["config", "user.email", "tower-test@example.invalid"]); git(root, ["config", "user.name", "Tower Test"])
  writeFileSync(join(root, "tracked.txt"), "base\n"); git(root, ["add", "tracked.txt"]); git(root, ["commit", "-q", "-m", "base"])
  const base = { commit: git(root, ["rev-parse", "HEAD"]), tree: git(root, ["rev-parse", "HEAD^{tree}"]) }
  writeFileSync(join(root, "tracked.txt"), "result\n"); git(root, ["add", "tracked.txt"]); git(root, ["commit", "-q", "-m", "result"])
  const result = { commit: git(root, ["rev-parse", "HEAD"]), tree: git(root, ["rev-parse", "HEAD^{tree}"]) }
  git(root, ["reset", "-q", "--mixed", base.commit]); git(root, ["add", "tracked.txt"])
  return captureCheckpoint({
    project_id: "control-tower", assignment_id: "assignment-s5-11", generation: 3,
    repositoryRoot: root, base, result,
    files: [{ path: "tracked.txt", bytes: new TextEncoder().encode("result\n"), mode: "raw-bytes" }],
  }, { git })
}
const evidenceFor = (capture) => ({
  project_id: capture.project_id, assignment_id: capture.assignment_id, generation: capture.generation,
  repository_root: capture.repository_root, git_common_dir: capture.git_common_dir,
  base: capture.base, result: capture.result,
  manifest_ref: "openspec/plans/manifest.yaml", candidate_ref: "candidates/s5-11.json",
  ledger_digest: `sha256:${"f".repeat(64)}`, runtime_projection_revision: 4, host_epoch: 2,
  jornada_id: "jornada-s5-11", jornada_revision: 3, registry_revision: 7, capability_revision: 5,
})
const loadReconciliation = () => import("../../workspace/reconciliation.mjs")
const errorCode = async (operation) => { try { await operation() } catch (error) { return error.code } return null }

describe("checkpoint reconciliation", () => {
  test("emits one deterministic deeply frozen VALID artifact bound to the exact live capture", async () => {
    const capture = captureFixture(), evidence = evidenceFor(capture)
    const { reconcileCheckpoint, assertCanonicalReconciledCheckpoint } = await loadReconciliation()
    const reconciliation = reconcileCheckpoint({ capture, evidence })
    const repeated = reconcileCheckpoint({ capture, evidence })

    expect(reconciliation).toEqual({
      schema: "reconciled-checkpoint", schema_version: 1,
      reconciliation_id: expect.stringMatching(/^reconciliation-[a-f0-9]{64}$/), digest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      state: "VALID", capture: { checkpoint_id: capture.checkpoint_id, digest: capture.digest },
      project_id: capture.project_id, assignment_id: capture.assignment_id, generation: capture.generation,
      repository_root: capture.repository_root, git_common_dir: capture.git_common_dir,
      base: capture.base, result: capture.result,
      evidence: {
        manifest_ref: evidence.manifest_ref, candidate_ref: evidence.candidate_ref, ledger_digest: evidence.ledger_digest,
        runtime_projection_revision: 4, host_epoch: 2, jornada_id: "jornada-s5-11", jornada_revision: 3,
        registry_revision: 7, capability_revision: 5,
      },
    })
    expect(assertCanonicalReconciledCheckpoint(reconciliation)).toBe(reconciliation)
    expect(Object.getPrototypeOf(reconciliation)).toBe(Object.prototype)
    expect(Object.isFrozen(reconciliation)).toBeTrue()
    expect(Object.isFrozen(reconciliation.capture)).toBeTrue()
    expect(Object.isFrozen(reconciliation.evidence)).toBeTrue()
    expect(repeated).not.toBe(reconciliation)
    expect(repeated.reconciliation_id).toBe(reconciliation.reconciliation_id)
    expect(repeated.digest).toBe(reconciliation.digest)
  })

  test("keeps generic integrity origin-neutral while exact origin rejects every reconstruction", async () => {
    const capture = captureFixture()
    const { reconcileCheckpoint, assertCanonicalReconciledCheckpoint } = await loadReconciliation()
    const reconciliation = reconcileCheckpoint({ capture, evidence: evidenceFor(capture) })
    expect(validate("reconciledCheckpoint", structuredClone(reconciliation))).toEqual(reconciliation)
    for (const value of [structuredClone(reconciliation), { ...reconciliation }, JSON.parse(JSON.stringify(reconciliation)), new Proxy(reconciliation, {})]) {
      expect(await errorCode(() => assertCanonicalReconciledCheckpoint(value))).toBe("CT_PROVENANCE_ORIGIN_INVALID")
    }
    expect(Reflect.ownKeys(reconciliation)).toEqual(Object.keys(reconciliation))
    expect(Object.getOwnPropertySymbols(reconciliation)).toEqual([])
    expect(JSON.parse(JSON.stringify(reconciliation))).toEqual(reconciliation)
  })

  test("rejects non-producer capture before touching reconciliation evidence", async () => {
    const capture = captureFixture()
    const { reconcileCheckpoint } = await loadReconciliation()
    const unreadable = new Proxy({}, { ownKeys() { throw new Error("evidence was inspected") } })
    for (const value of [structuredClone(capture), { ...capture }, JSON.parse(JSON.stringify(capture)), new Proxy(capture, {})]) {
      expect(await errorCode(() => reconcileCheckpoint({ capture: value, evidence: unreadable }))).toBe("CT_PROVENANCE_ORIGIN_INVALID")
    }
  })

  test("rejects missing, mismatched, or caller-owned reconciliation claims", async () => {
    const capture = captureFixture(), valid = evidenceFor(capture)
    const { reconcileCheckpoint } = await loadReconciliation()
    const changes = [
      (value) => { value.project_id = "other-project" }, (value) => { value.assignment_id = "other-assignment" },
      (value) => { value.generation += 1 }, (value) => { value.repository_root = "/tmp/other" },
      (value) => { value.git_common_dir = "/tmp/other/.git" }, (value) => { value.base = { ...value.base, commit: "0".repeat(40) } },
      (value) => { value.result = { ...value.result, tree: "1".repeat(40) } }, (value) => { delete value.manifest_ref },
      (value) => { value.unexpected = true }, (value) => { value.state = "VALID" }, (value) => { value.reconciliation_id = `reconciliation-${"a".repeat(64)}` },
      (value) => { value.digest = `sha256:${"a".repeat(64)}` }, (value) => { value.capture = {} }, (value) => { value.origin = true },
      (value) => { value.artifact = {} },
    ]
    for (const change of changes) {
      const evidence = structuredClone(valid); change(evidence)
      expect(await errorCode(() => reconcileCheckpoint({ capture, evidence }))).toBe("CT_SCHEMA_INVALID")
    }
  })
})
