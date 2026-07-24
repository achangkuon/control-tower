import { STATES } from "../core.mjs"

const deepFreeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}

const states = (...names) => names.map((name) => {
  const canonical = STATES.find((state) => state === name)
  if (!canonical) throw new Error(`console vocabulary references unknown state: ${name}`)
  return canonical
})
const allStates = () => STATES.map((state) => state)
const entry = (risk, required = {}, legalStates = [], optional = {}, evidence = []) =>
  ({ risk, required, optional, legalStates, evidence })
const string = "string"

export const COMMAND_VOCABULARY = deepFreeze({
  CV_STATUS: entry("R0"),
  CV_INSPECT: entry("R0", { agent: string }, allStates()),
  CV_REQUEST_CONTEXT: entry("R0", { agent: string, question: string }, allStates()),
  CV_ASSIGN: entry("R1", { agent: string, task: "non-empty-string" }, states("PLANNED", "MERGED", "COMPLETE")),
  CV_PAUSE: entry("R1", { agent: string, reason: string }, states("ASSIGNED", "WORKING", "READY")),
  CV_RESUME: entry("R1", { agent: string, note: string }, states("BLOCKED", "WAITING_HUMAN")),
  CV_RUN_TESTS: entry("R1", { agent: string }, states("WORKING", "READY", "BLOCKED")),
  CV_GRANT_DELIVERY: entry("R1", { agent: string }, states("READY")),
  CV_HOLD_DELIVERY: entry("R1", { agent: string, reason: string }, states("READY", "DELIVERING")),
  CV_STOP_DELIVERY: entry("R1", { agent: string, reason: string }, states("READY", "DELIVERING")),
  CV_ANSWER: entry("R1", { escalation_id: string, verdict: ["APPROVE", "REJECT"] }, states("BLOCKED", "WAITING_HUMAN"), { note: string }),
  CV_MERGE_MAIN: entry("R2", { agent: string, pr_url: string }, states("PR_OPEN"), {}, ["pr", "checks", "mergeability", "main_currency", "git_delivery_holder", "agent_note"]),
  CV_DB_PUSH: entry("R2", { agent: string, environment: string }, states("WORKING", "READY"), {}, ["target", "environment", "main_currency", "db_writer_holder", "pending_migration_names"]),
})

export const VERBS = Object.freeze(Object.keys(COMMAND_VOCABULARY))
