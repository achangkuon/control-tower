import { afterEach, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { bindMainAuthority, createMainStore } from "../../main-store/index.mjs"
import { createLaunchWorkerRuntime } from "../../hosts/launch-worker.mjs"
import { createProductionProvider } from "../../hosts/production-provider.mjs"

const directories = []
const candidate = `sha256:${"a".repeat(64)}`
const git = (cwd, args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim()
const code = async (operation) => { try { await operation() } catch (error) { return error.code }; return null }

const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), "ct-production-provider-")), main = join(root, "Main"), worker = join(root, "Worker")
  directories.push(root)
  execFileSync("git", ["init", "-q", "-b", "master", main]); git(main, ["config", "user.email", "tower@example.invalid"]); git(main, ["config", "user.name", "Tower Test"]); git(main, ["commit", "-q", "--allow-empty", "-m", "fixture"]); git(main, ["worktree", "add", "-q", "-b", "worker", worker])
  const common = git(main, ["rev-parse", "--path-format=absolute", "--git-common-dir"]), storePath = join(common, "control-tower", "main-store")
  const binding = { project_id: "project-a", revision: 1, repository_root: main, git_common_dir: common, remote: "git@example.invalid:a.git", branch: "master", main_session_id: "main-a", store_path: storePath, epoch: 1 }
  const authority = bindMainAuthority({ trustedBindingProvider: () => binding, rederiveBinding: () => ({ ...binding }) }), store = createMainStore({ root: storePath, authority, capability: authority.capability })
  const pointer = (name) => ({ schema: "artifact-ref", schema_version: 1, artifact_id: name, artifact_revision: 1, repository_id: "repository-a", repo_relative_path: `${name}.json`, media_type: "application/json", digest_mode: "rfc8785-jcs", source_commit: "a".repeat(40), content_digest: `sha256:${"a".repeat(64)}` })
  store.createJornada({ actor: "MAIN", schema: "jornada", schema_version: 1, jornada_id: "jornada-a", jornada_revision: 1, project_id: "project-a", registry_revision: 1, plan_id: "plan-a", preset: "standard", preset_revision: 1, effective_limits: { apply_ceiling: 1 }, starts_at: "2026-01-01T00:00:00.000Z", expires_at: "2099-01-01T00:00:00.000Z", execution_host: "opencode", allowed_operations: ["CREATE_COMMIT"], manifest_ref: pointer("manifest"), authorization_ref: pointer("authorization"), state: "DRAFT" })
  store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id: "jornada-a", state: "PENDING_AUTHORIZATION", expected_revision: 1 }); store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id: "jornada-a", state: "ACTIVE", expected_revision: 2 })
  store.createAuthorization({ actor: "MAIN", schema: "authorization", schema_version: 1, authorization_id: "auth-a", action: "MERGE", project_id: "project-a", registry_revision: 1, plan_id: "plan-a", jornada_id: "jornada-a", jornada_revision: 3, delivery: { shape: "direct-push", repository: "owner/repository", target_branch: "master", base_sha: "a".repeat(40), head_sha: "b".repeat(40) }, required_checks_digest: `sha256:${"a".repeat(64)}`, policy_report_digest: `sha256:${"b".repeat(64)}`, created_at: "2099-01-01T00:00:00Z", expires_at: "2099-01-01T01:00:00.000Z", nonce_hash: `sha256:${"c".repeat(64)}`, extensions: { "control-tower/candidate-revision": candidate } })
  store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-a", candidate_revision: candidate, decision: "APPROVED", expected_revision: 1 })
  store.issueLaunchBinding({ actor: "MAIN", project_id: "project-a", request_ref: "request-a", authorization_id: "auth-a", brief: "Approved", brief_ref: "briefs/a.json", assignment_ref: "assignments/a.json", worktree: worker, candidate_revision: candidate, host_epoch: 2, fence_path: "/runtime/fence-a" })
  return { main, worker }
}

afterEach(() => directories.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })))

test("deterministic provider consumes a Main binding once and drives documented Herdr/OpenCode ports", async () => {
  const { main, worker } = fixture(), calls = []
  const run = (command, args) => {
    calls.push([command, args])
    if (command === "opencode" && args[0] === "agent") return { status: 0, stdout: "gentle-orchestrator\n" }
    if (args[1] === "split") return { status: 0, stdout: JSON.stringify({ result: { pane: { pane_id: "pane-a" } } }) }
    if (args[1] === "start") return { status: 0, stdout: JSON.stringify({ result: { agent: { agent_session_id: "root-a" } } }) }
    if (args[1] === "get") return { status: 0, stdout: JSON.stringify({ result: { agent: { agent_session_id: "root-a" } } }) }
    return { status: 0, stdout: "{}" }
  }
  const provider = createProductionProvider({ cwd: main, environment: { HERDR_ENV: "1" }, run })
  const receipt = await createLaunchWorkerRuntime(provider).launchWorker({ request_ref: "request-a" })
  expect(receipt).toMatchObject({ worktree: worker, fence_path: "/runtime/fence-a", pane_id: "pane-a", root_session_id: "root-a" })
  expect(await code(() => createLaunchWorkerRuntime(provider).launchWorker({ request_ref: "request-a" }))).toBe("CT_LAUNCH_BINDING_CONSUMED")
  expect(calls).toContainEqual(["herdr", ["pane", "split", "--current", "--direction", "right", "--cwd", worker, "--no-focus"]])
  expect(calls).toContainEqual(["herdr", ["agent", "start", "ctopencode-panea", "--kind", "opencode", "--pane", "pane-a", "--", "--agent", "gentle-orchestrator"]])
})

test("fails before binding consumption outside a Herdr-managed process", () => {
  const { main } = fixture()
  expect(() => createProductionProvider({ cwd: main, environment: {} })).toThrow("Herdr-managed process context")
})
