const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/
const refPattern = /^(?!\/|.*(?:\.\.|\/\.|\.lock(?:\/|$)))[A-Za-z0-9._/-]+(?<![/.])$/
const allowedEnvironment = new Set(["GH_TOKEN", "GH_ENTERPRISE_TOKEN", "NO_COLOR"])

const checked = (input) => {
  const keys = Object.keys(input ?? {}).sort().join("\0")
  if (keys !== ["base", "env", "head", "repository"].sort().join("\0")
    || !repositoryPattern.test(input.repository ?? "") || !refPattern.test(input.head ?? "")
    || !refPattern.test(input.base ?? "") || !input.env || Object.getPrototypeOf(input.env) !== Object.prototype
    || Object.entries(input.env).some(([key, value]) => !allowedEnvironment.has(key) || typeof value !== "string")) {
    fail("CT_DELIVERY_COMMAND_INVALID", "Pull request delivery requires exact argv coordinates and a separate environment")
  }
  return { repository: input.repository, head: input.head, base: input.base, env: { ...input.env } }
}

export const createPullRequestAdapter = ({ run } = {}) => {
  if (typeof run !== "function") fail("CT_DELIVERY_COMMAND_INVALID", "Pull request runner is required")
  const reconcile = async (input) => {
    const value = checked(input)
    const result = await run({
      command: "gh",
      argv: ["pr", "list", "--repo", value.repository, "--head", value.head, "--base", value.base, "--state", "all", "--json", "number,headRefName,baseRefName,state,isDraft,mergeStateStatus,statusCheckRollup,reviewDecision,mergedAt"],
      env: value.env,
    })
    if (result?.exitCode !== 0) return { status: "unknown", value, result }
    let matches
    try { matches = JSON.parse(String(result.stdout ?? "")) } catch { return { status: "unknown", value, result } }
    const exact = Array.isArray(matches) && matches.find((item) => item?.headRefName === value.head && item?.baseRefName === value.base)
    if (!exact) return { status: "absent", value }
    if (exact.mergedAt || exact.state === "MERGED") return { status: "delivered", value, number: exact.number }
    if (exact.state !== "OPEN" || exact.isDraft || ["DIRTY", "UNKNOWN"].includes(exact.mergeStateStatus)) return { status: "unknown", value, number: exact.number }
    const checks = exact.statusCheckRollup
    const checksComplete = Array.isArray(checks) && checks.length > 0 && checks.every(({ status, conclusion }) => status === "COMPLETED" && ["SUCCESS", "NEUTRAL", "SKIPPED"].includes(conclusion))
    if (!checksComplete || exact.reviewDecision !== "APPROVED") return { status: "checks_pending", value, number: exact.number }
    return { status: "delivered", value, number: exact.number }
  }
  return Object.freeze({
    reconcile,
    async create(input) {
      const inspected = await reconcile(input)
      if (inspected.status === "delivered") return Object.freeze({ status: "delivered", reconciled: true, mutated: false, number: inspected.number })
      if (inspected.status === "checks_pending") return Object.freeze({ status: "checks_pending", reconciled: true, mutated: false, number: inspected.number })
      if (inspected.status !== "absent") return Object.freeze({ status: "unknown", reconciled: false, mutated: false, evidence: inspected.result ?? null })
      const { value } = inspected
      const result = await run({ command: "gh", argv: ["pr", "create", "--repo", value.repository, "--head", value.head, "--base", value.base, "--fill"], env: value.env })
      return Object.freeze({ status: result?.exitCode === 0 ? "delivered" : "unknown", reconciled: true, mutated: true, evidence: result ?? null })
    },
  })
}
