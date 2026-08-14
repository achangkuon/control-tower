import { afterEach, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(fileURLToPath(new URL("../..", import.meta.url)))
const directories = []
afterEach(() => directories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })))

test("torre launch-worker consumes only the opaque request ref before composing the external host ports", () => {
  const directory = mkdtempSync(join(tmpdir(), "ct-launch-cli-")), output = join(directory, "output.json"), runtime = join(directory, "runtime.mjs")
  directories.push(directory)
  writeFileSync(runtime, `
export const consumeLaunchBinding = async (request_ref) => {
  await Bun.write(${JSON.stringify(output)}, JSON.stringify({ request_ref }))
  return { assignment_ref: "assignments/a.json", brief: "Approved", brief_ref: "briefs/a.json", candidate_revision: "sha256:${"a".repeat(64)}", host_epoch: 3, project_id: "project-a", worktree: "/work/a" }
}
export const herdr = { createPane: async () => ({ pane_id: "pane-a", close: async () => {} }), bindRoot: async () => true }
export const opencode = { startRoot: async () => ({ root_session_id: "root-a" }) }
`)
  const result = spawnSync(join(root, "bin/torre"), ["launch-worker", "--request-ref", "request-a"], {
    cwd: root, env: { ...process.env, CONTROL_TOWER_HOST_RUNTIME: runtime, XDG_DATA_HOME: directory }, encoding: "utf8",
  })
  expect(result.status).toBe(0)
  expect(JSON.parse(readFileSync(output, "utf8"))).toEqual({ request_ref: "request-a" })
  expect(JSON.parse(result.stdout)).toEqual({ assignment_ref: "assignments/a.json", brief: "Approved", brief_ref: "briefs/a.json", candidate_revision: `sha256:${"a".repeat(64)}`, host_epoch: 3, project_id: "project-a", worktree: "/work/a", pane_id: "pane-a", root_session_id: "root-a" })
})
