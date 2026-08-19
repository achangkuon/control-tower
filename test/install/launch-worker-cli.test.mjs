import { afterEach, expect, test } from "bun:test"
import { execFileSync, spawnSync } from "node:child_process"
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { bindMainAuthority, createMainStore } from "../../main-store/index.mjs"
import { runCli } from "../../install/lifecycle.mjs"

const root = join(fileURLToPath(new URL("../..", import.meta.url)))
const directories = []
afterEach(() => directories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })))

test("installed torre launch-worker ignores legacy and PATH shims while consuming its deterministic Main binding", () => {
  const directory = mkdtempSync(join(tmpdir(), "ct-launch-cli-")), main = join(directory, "Main"), worker = join(directory, "Worker"), commands = join(directory, "commands")
  directories.push(directory)
  execFileSync("git", ["init", "-q", "-b", "master", main]); execFileSync("git", ["-C", main, "config", "user.email", "tower@example.invalid"]); execFileSync("git", ["-C", main, "config", "user.name", "Tower Test"]); execFileSync("git", ["-C", main, "commit", "-q", "--allow-empty", "-m", "fixture"]); execFileSync("git", ["-C", main, "worktree", "add", "-q", "-b", "worker", worker])
  const common = execFileSync("git", ["-C", main, "rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8" }).trim(), storePath = join(common, "control-tower", "main-store"), candidate = `sha256:${"a".repeat(64)}`
  const binding = { project_id: "project-a", revision: 1, repository_root: main, git_common_dir: common, remote: "git@example.invalid:a.git", branch: "master", main_session_id: "main-a", store_path: storePath, epoch: 1 }, authority = bindMainAuthority({ trustedBindingProvider: () => binding, rederiveBinding: () => ({ ...binding }) }), store = createMainStore({ root: storePath, authority, capability: authority.capability })
  const pointer = (id) => ({ schema: "artifact-ref", schema_version: 1, artifact_id: id, artifact_revision: 1, repository_id: "repository-a", repo_relative_path: `${id}.json`, media_type: "application/json", digest_mode: "rfc8785-jcs", source_commit: "a".repeat(40), content_digest: `sha256:${"a".repeat(64)}` })
  store.createJornada({ actor: "MAIN", schema: "jornada", schema_version: 1, jornada_id: "jornada-a", jornada_revision: 1, project_id: "project-a", registry_revision: 1, plan_id: "plan-a", preset: "standard", preset_revision: 1, effective_limits: { apply_ceiling: 1 }, starts_at: "2026-01-01T00:00:00.000Z", expires_at: "2099-01-01T00:00:00.000Z", execution_host: "opencode", allowed_operations: ["CREATE_COMMIT"], manifest_ref: pointer("manifest"), authorization_ref: pointer("authorization"), state: "DRAFT" }); store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id: "jornada-a", state: "PENDING_AUTHORIZATION", expected_revision: 1 }); store.transitionJornada({ actor: "MAIN", project_id: "project-a", jornada_id: "jornada-a", state: "ACTIVE", expected_revision: 2 })
  store.createAuthorization({ actor: "MAIN", schema: "authorization", schema_version: 1, authorization_id: "auth-a", action: "MERGE", project_id: "project-a", registry_revision: 1, plan_id: "plan-a", jornada_id: "jornada-a", jornada_revision: 3, delivery: { shape: "direct-push", repository: "owner/repository", target_branch: "master", base_sha: "a".repeat(40), head_sha: "b".repeat(40) }, required_checks_digest: `sha256:${"a".repeat(64)}`, policy_report_digest: `sha256:${"b".repeat(64)}`, created_at: "2099-01-01T00:00:00Z", expires_at: "2099-01-01T01:00:00.000Z", nonce_hash: `sha256:${"c".repeat(64)}`, extensions: { "control-tower/candidate-revision": candidate } }); store.consumeAuthorization({ actor: "MAIN", authorization_id: "auth-a", candidate_revision: candidate, decision: "APPROVED", expected_revision: 1 }); store.registerAssignmentLocation({ actor: "MAIN", project_id: "project-a", assignment_ref: "assignment-a", worktree: worker, fence_path: "/runtime/fence-a" }); store.issueLaunchBinding({ actor: "MAIN", project_id: "project-a", request_ref: "request-a", authorization_id: "auth-a", brief: "Approved", brief_ref: "briefs/a.json", assignment_ref: "assignment-a", candidate_revision: candidate, host_epoch: 2 })
  const effects = join(directory, "host-effects"), rootSession = `ses_${"a".repeat(26)}`
  mkdirSync(commands); writeFileSync(join(commands, "opencode"), `#!${process.execPath}
if (Bun.argv[2] === "serve") {
  const id = "${rootSession}"
  const schema = { additionalProperties: false, properties: { agent: {}, id: {}, location: {}, model: {} } }
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) {
    const path = new URL(request.url).pathname
    if (path === "/doc") return Response.json({ paths: { "/api/session": { post: { requestBody: { content: { "application/json": { schema } } } } } } })
    if (path === "/api/session" && request.method === "POST") return Response.json({ data: { cost: 0, id, location: {}, projectID: "prj", time: {}, title: "", tokens: {} } })
    if (path === "/api/session/" + id) return Response.json({ data: { agent: "gentle-orchestrator", id } })
    return new Response("not found", { status: 404 })
  } })
  console.log("opencode server listening on http://127.0.0.1:" + server.port)
  setTimeout(() => process.exit(0), 1_000)
} else console.log("gentle-orchestrator")
`); writeFileSync(join(commands, "herdr"), "#!/bin/sh\nprintf 'herdr' >> " + effects + "; for arg in \"$@\"; do printf ' %s' \"$arg\" >> " + effects + "; done; printf '\\n' >> " + effects + "\nif [ \"$1\" = \"--version\" ]; then printf 'herdr 0.8.0\\n'; exit; fi\ncase \"$1 $2\" in 'pane split') printf '%s\\n' '{\"result\":{\"pane\":{\"pane_id\":\"w1:p1\"}}}' ;; *) printf '%s\\n' '{}' ;; esac\n"); chmodSync(join(commands, "opencode"), 0o700); chmodSync(join(commands, "herdr"), 0o700)
  const xdg = join(directory, "xdg"), installEnv = { ...process.env, HOME: directory, XDG_DATA_HOME: xdg, XDG_CONFIG_HOME: join(directory, "config"), XDG_STATE_HOME: join(directory, "state") }
  runCli(["install", "launch-v1", root, "--herdr-bin", join(commands, "herdr"), "--opencode-bin", join(commands, "opencode")], installEnv)
  const installed = join(xdg, "control-tower/versions/launch-v1/bin/torre")
  writeFileSync(effects, "")
  expect(spawnSync(installed, ["launch-worker", "--request-ref", "missing"], { cwd: main, env: installEnv, encoding: "utf8" }).stderr).toContain("CT_LAUNCH_BINDING_INVALID")
  expect(readFileSync(effects, "utf8")).toBe("herdr --version\n")
  writeFileSync(join(commands, "bad-herdr"), "#!/bin/sh\nexit 99\n", { mode: 0o755 })
  const result = spawnSync(installed, ["launch-worker", "--request-ref", "request-a"], {
    cwd: main, env: { ...installEnv, CONTROL_TOWER_CORE: join(commands, "bad-herdr"), CONTROL_TOWER_LIFECYCLE: join(commands, "bad-herdr"), HERDR_ENV: "attacker", PATH: `${commands}:${process.env.PATH}` }, encoding: "utf8",
  })
  expect(result.status, result.stderr).toBe(0)
  expect(JSON.parse(result.stdout)).toMatchObject({ assignment_ref: "assignment-a", brief: "Approved", brief_ref: "briefs/a.json", candidate_revision: candidate, fence_path: "/runtime/fence-a", host_epoch: 2, project_id: "project-a", worktree: worker, pane_id: "w1:p1", root_session_id: rootSession })
  expect(JSON.parse(result.stdout).manual_command).toMatch(new RegExp(`^opencode attach http://127\\.0\\.0\\.1:\\d+ --session ${rootSession}$`))
  expect(readFileSync(effects, "utf8")).toMatch(new RegExp(`^herdr --version\\nherdr --version\\nherdr pane split --current --direction right --cwd ${worker} --no-focus\\nherdr pane run w1:p1 opencode attach http://127\\.0\\.0\\.1:\\d+ --session ${rootSession}\\n$`))
  expect(spawnSync(installed, ["launch-worker", "--request-ref", "request-a"], { cwd: main, env: { ...installEnv, HERDR_ENV: "attacker", PATH: `${commands}:${process.env.PATH}` }, encoding: "utf8" }).stderr).toContain("CT_LAUNCH_BINDING_CONSUMED")
  store.issueLaunchBinding({ actor: "MAIN", project_id: "project-a", request_ref: "request-stale", authorization_id: "auth-a", brief: "Approved", brief_ref: "briefs/a.json", assignment_ref: "assignment-a", candidate_revision: candidate, host_epoch: 2 })
  writeFileSync(join(storePath, "epoch-records/2.json"), JSON.stringify({ epoch: 2, project_id: "project-a" }), { mode: 0o600 })
  writeFileSync(join(storePath, "current-epoch.json"), JSON.stringify({ epoch: 2, project_id: "project-a" }), { mode: 0o600 })
  const beforeStale = readFileSync(effects, "utf8")
  expect(spawnSync(installed, ["launch-worker", "--request-ref", "request-stale"], { cwd: main, env: installEnv, encoding: "utf8" }).stderr).toContain("CT_LAUNCH_BINDING_STALE")
  expect(readFileSync(effects, "utf8")).toBe(`${beforeStale}herdr --version\n`)
})
