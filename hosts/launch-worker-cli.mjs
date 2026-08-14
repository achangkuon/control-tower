import { isAbsolute } from "node:path"
import { pathToFileURL } from "node:url"

import { createLaunchWorkerRuntime } from "./launch-worker.mjs"

const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }

export const runLaunchWorkerCli = async (args, env = process.env) => {
  if (args.length !== 2 || args[0] !== "--request-ref" || typeof args[1] !== "string" || args[1].length === 0 || args[1].includes("\0")) {
    fail("CT_LAUNCH_REJECTED", "Usage: torre launch-worker --request-ref <opaque-ref>")
  }
  const runtimePath = env.CONTROL_TOWER_HOST_RUNTIME
  if (!isAbsolute(runtimePath ?? "")) fail("CT_LAUNCH_REJECTED", "A local Host Launcher runtime is required")
  let runtime
  try { runtime = await import(pathToFileURL(runtimePath).href) }
  catch (error) { fail("CT_LAUNCH_REJECTED", "Local Host Launcher runtime is unavailable") }
  try {
    return createLaunchWorkerRuntime({
      consumeBinding: runtime.consumeLaunchBinding,
      herdr: runtime.herdr,
      opencode: runtime.opencode,
    }).launchWorker({ request_ref: args[1] })
  } catch (error) {
    if (error?.code) throw error
    fail("CT_LAUNCH_REJECTED", "Local Host Launcher runtime is invalid")
  }
}

if (import.meta.main) {
  try { console.log(JSON.stringify(await runLaunchWorkerCli(Bun.argv.slice(2)))) }
  catch (error) { console.error(`${error.code ?? "CT_LAUNCH_REJECTED"}: ${error.message}`); process.exitCode = 1 }
}
