import { spawnSync } from "node:child_process"
import { basename, dirname } from "node:path"
import { fileURLToPath } from "node:url"

import { validateActiveHostRuntime } from "../install/lifecycle.mjs"
import { createOpenCodeCredentialChannel } from "./opencode-credential-channel.mjs"

export const OPENCODE_ATTACH_HELPER_PATH = fileURLToPath(import.meta.url)
const fail = (message) => { throw Object.assign(new Error(message), { code: "CT_ATTACH_REJECTED" }) }

export const createOpenCodeAttachHelper = ({ channel, attach } = {}) => {
  if (typeof channel?.take !== "function" || typeof attach !== "function") throw new TypeError("Private attach helper ports are required")
  return Object.freeze({
    run(input) {
      if (!input || Object.keys(input).length !== 1 || typeof input.worktree !== "string") fail("Attach helper accepts only its worktree")
      const credential = channel.take(input.worktree)
      const result = attach(credential)
      if (!result || typeof result !== "object" || !Number.isInteger(result.status)) fail("Attach helper failed")
      return Object.freeze({ status: result.status })
    },
  })
}

if (import.meta.main) {
  try {
    const root = dirname(dirname(fileURLToPath(import.meta.url))), dataRoot = dirname(dirname(root)), version = basename(root)
    const runtime = validateActiveHostRuntime(dataRoot, version, root)
    const helper = createOpenCodeAttachHelper({
      channel: createOpenCodeCredentialChannel(),
      attach: ({ backend_url, root_session_id, secret, worktree }) => spawnSync(runtime.opencode, ["attach", backend_url, "--session", root_session_id], {
        cwd: worktree, env: { PATH: "", OPENCODE_SERVER_PASSWORD: secret }, stdio: "inherit",
      }),
    })
    process.exitCode = helper.run({ worktree: process.cwd() }).status
  } catch (error) { process.stderr.write(`${error.code ?? "CT_ATTACH_REJECTED"}: ${error.message}\n`); process.exitCode = 1 }
}
