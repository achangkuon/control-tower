import { createHostLauncher } from "./launcher.mjs"

const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const exact = (value) => value && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).length === 1 && Object.hasOwn(value, "request_ref")

export const createLaunchWorkerRuntime = ({ consumeBinding, herdr, opencode } = {}) => {
  if (typeof consumeBinding !== "function") throw new TypeError("Main launch binding consumer is required")
  return Object.freeze({
    async launchWorker(input) {
      if (!exact(input) || typeof input.request_ref !== "string" || input.request_ref.length === 0 || input.request_ref.includes("\0")) {
        fail("CT_LAUNCH_REJECTED", "Launch worker accepts only an opaque request ref")
      }
      const binding = await consumeBinding(input.request_ref)
      const launch = createHostLauncher({ approvedBinding: () => binding, herdr, opencode })
      return launch(binding)
    },
  })
}
