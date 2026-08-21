import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

import { resolveActiveRuntime, resolveDataRoot } from "../install/active-pointer.mjs"

const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const installedRoot = dirname(dirname(fileURLToPath(import.meta.url)))

const validateInstalledRuntime = () => {
  const active = resolveActiveRuntime(resolveDataRoot())
  if (!active || active.root !== installedRoot || active.launchWorker !== fileURLToPath(import.meta.url)) {
    fail("CT_ACTIVE_RUNTIME_MISMATCH", "Launch worker CLI is not the validated active runtime")
  }
  return active
}

export const runLaunchWorkerCli = async (args) => {
  if (args.length !== 2 || args[0] !== "--request-ref" || typeof args[1] !== "string" || args[1].length === 0 || args[1].includes("\0")) {
    fail("CT_LAUNCH_REJECTED", "Usage: torre launch-worker --request-ref <opaque-ref>")
  }
  validateInstalledRuntime()
  try {
    const [{ createLaunchWorkerRuntime }, { createProductionProvider }] = await Promise.all([
      import("./launch-worker.mjs"),
      import("./production-provider.mjs"),
    ])
    return createLaunchWorkerRuntime(createProductionProvider()).launchWorker({ request_ref: args[1] })
  } catch (error) {
    if (error?.code) throw error
    fail("CT_LAUNCH_REJECTED", "Local Host Launcher runtime is invalid")
  }
}

if (import.meta.main) {
  try { console.log(JSON.stringify(await runLaunchWorkerCli(Bun.argv.slice(2)))) }
  catch (error) { console.error(`${error.code ?? "CT_LAUNCH_REJECTED"}: ${error.message}`); process.exitCode = 1 }
}
