import { isDeepStrictEqual } from "node:util"

const requiredBindingKeys = Object.freeze([
  "project_id", "revision", "repository_root", "git_common_dir", "remote", "branch",
  "main_session_id", "store_path", "epoch",
])
const fail = (message) => { throw Object.assign(new Error(message), { code: "CT_AUTH_INVALID" }) }
const exactBinding = (value) => {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype
    || !isDeepStrictEqual(Object.keys(value).sort(), [...requiredBindingKeys].sort())
    || requiredBindingKeys.some((key) => value[key] === undefined || value[key] === null)) fail("Invalid Main binding")
  return Object.freeze(structuredClone(value))
}

export const bindMainAuthority = ({ trustedBindingProvider, rederiveBinding } = {}) => {
  if (typeof trustedBindingProvider !== "function" || typeof rederiveBinding !== "function") fail("Trusted startup binding is required")
  const binding = exactBinding(trustedBindingProvider())
  if (!isDeepStrictEqual(binding, exactBinding(rederiveBinding(binding)))) fail("Main binding facts changed")
  const capabilities = new WeakSet()
  const capability = Object.freeze(Object.create(null))
  capabilities.add(capability)
  let claimed = false

  return Object.freeze({
    get capability() {
      if (claimed) fail("Main capability is startup-only")
      claimed = true
      return capability
    },
    assert(candidate, expected = {}) {
      if (!capabilities.has(candidate)) fail("Untrusted Main capability")
      for (const [key, value] of Object.entries(expected)) if (binding[key] !== value) fail("Main binding mismatch")
      return binding
    },
    revoke(candidate) { return capabilities.delete(candidate) },
  })
}
