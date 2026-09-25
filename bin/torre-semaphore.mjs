#!/usr/bin/env bun
// One JSON request per invocation on stdin; identity always comes from cwd.
// This entry deliberately imports neither core.mjs nor continuation.
import * as semaphore from "../semaphore.mjs"

const revision = __CT_SEMAPHORE_REVISION__
const version = "1"
const fail = (code) => { throw Object.assign(new Error(code), { code }) }

const dispatch = (handle, operation, args) => {
  switch (operation) {
    case "tower_status": return semaphore.status(handle)
    case "tower_register": return semaphore.register(handle, args.role)
    case "tower_set_state": return semaphore.setState(handle, { state: args.state, task: args.task, note: args.note, prUrl: args.pr_url })
    case "tower_send": return semaphore.send(handle, { to: args.to, text: args.text })
    case "tower_receive": return semaphore.receive(handle) ?? { message: null }
    case "tower_acquire": return semaphore.acquire(handle, args.lock)
    case "tower_release": return semaphore.release(handle, args.lock)
    case "tower_transfer": return semaphore.transfer(handle, args.lock, args.to)
    default: fail("CT_SEMAPHORE_UNKNOWN_OPERATION")
  }
}

try {
  const request = JSON.parse(await Bun.stdin.text())
  if (!request || typeof request !== "object" || typeof request.operation !== "string" ||
      (request.args != null && (typeof request.args !== "object" || Array.isArray(request.args)))) {
    fail("CT_SEMAPHORE_INVALID_REQUEST")
  }
  const { operation, args = {} } = request
  if (operation === "version") {
    process.stdout.write(JSON.stringify({ version, sourceRevision: revision }) + "\n")
  } else {
    if (operation.startsWith("continuation") || ["bootstrapMain", "activate", "create", "validate", "publish", "claim", "ack", "attestCompletion", "complete", "reject", "revise", "recover", "beginRollback", "rebindMain", "finishRollback"].includes(operation)) {
      fail("CT_CONTINUATION_UNSUPPORTED")
    }
    if (!["tower_status", "tower_register", "tower_set_state", "tower_send", "tower_receive", "tower_acquire", "tower_release", "tower_transfer"].includes(operation)) {
      fail("CT_SEMAPHORE_UNKNOWN_OPERATION")
    }
    const handle = semaphore.open(process.cwd())
    try {
      process.stdout.write(JSON.stringify({ result: dispatch(handle, operation, args) }) + "\n")
    } finally {
      handle.db?.close()
    }
  }
} catch (error) {
  process.stdout.write(JSON.stringify({ error: { code: error.code ?? "CT_SEMAPHORE_OPERATION_FAILED", message: error.message } }) + "\n")
}
