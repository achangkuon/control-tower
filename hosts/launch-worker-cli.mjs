import { createLaunchWorkerRuntime } from "./launch-worker.mjs"
import { createProductionProvider } from "./production-provider.mjs"

const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }

export const runLaunchWorkerCli = async (args) => {
  if (args.length !== 2 || args[0] !== "--request-ref" || typeof args[1] !== "string" || args[1].length === 0 || args[1].includes("\0")) {
    fail("CT_LAUNCH_REJECTED", "Usage: torre launch-worker --request-ref <opaque-ref>")
  }
  try {
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
