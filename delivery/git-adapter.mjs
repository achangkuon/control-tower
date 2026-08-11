const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const shaPattern = /^[a-f0-9]{40}$/
const remotePattern = /^[A-Za-z0-9._-]+$/
const branchPattern = /^(?!\/|.*(?:\.\.|\/\.|\.lock(?:\/|$)))[A-Za-z0-9._/-]+(?<![/.])$/

const checked = (input) => {
  const { repository_root: root, remote, refspec, head, target } = input ?? {}
  if (typeof root !== "string" || !root.startsWith("/") || !shaPattern.test(head ?? "") || !shaPattern.test(input?.expected_base ?? "")
    || !remotePattern.test(remote ?? "") || remote.startsWith("-") || !remotePattern.test(target?.remote ?? "") || target.remote.startsWith("-")
    || !branchPattern.test(target?.branch ?? "")) fail("CT_DELIVERY_INVALID", "Explicit git delivery coordinates are required")
  const expected = `${head}:refs/heads/${target.branch}`
  if (remote !== target.remote || refspec !== expected) fail("CT_DELIVERY_TARGET_MISMATCH", "Git destination does not match the declared target")
  return { root, remote, refspec, head, expectedBase: input.expected_base, branch: target.branch }
}

export const createGitAdapter = ({ run } = {}) => {
  if (typeof run !== "function") fail("CT_DELIVERY_INVALID", "Git runner is required")
  const reconcile = async (input) => {
    const value = checked(input)
    const result = await run({ command: "git", argv: ["-C", value.root, "ls-remote", "--exit-code", value.remote, `refs/heads/${value.branch}`], env: {} })
    if (result?.exitCode === 2) return { status: "diverged", value, result }
    if (result?.exitCode !== 0) return { status: "unknown", value, result }
    const remoteHead = String(result.stdout ?? "").trim().split(/\s+/)[0]
    return { status: remoteHead === value.head ? "delivered" : remoteHead === value.expectedBase ? "eligible" : "diverged", value, result }
  }
  return Object.freeze({
    reconcile,
    async push(input) {
      const inspected = await reconcile(input)
      if (inspected.status === "delivered") return Object.freeze({ status: "delivered", reconciled: true, mutated: false })
      if (inspected.status === "diverged") return Object.freeze({ status: "diverged", reconciled: true, mutated: false })
      if (inspected.status !== "eligible") return Object.freeze({ status: "unknown", reconciled: false, mutated: false, evidence: inspected.result ?? null })
      const { value } = inspected
      const result = await run({ command: "git", argv: ["-C", value.root, "push", "--porcelain", value.remote, value.refspec], env: {} })
      return Object.freeze({ status: result?.exitCode === 0 ? "delivered" : "unknown", reconciled: true, mutated: true, evidence: result ?? null })
    },
  })
}
