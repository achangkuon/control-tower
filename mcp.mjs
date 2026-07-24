#!/usr/bin/env bun
// Control Tower — MCP server (stdio, JSON-RPC 2.0, newline-delimited).
//
// Hand-rolled rather than pulling the MCP SDK: the surface is four methods and
// this has to start fast in every agent session, in three different CLIs.
//
// Identity comes from the process working directory, which is the session's
// worktree. No agent declares who it is, so no agent can claim to be another.

import * as tower from "./core.mjs"

const ACTIVE_PRECONDITION =
  "Call tower_status first. Do not call this tool unless it reports active:true."

const LEGACY_TOOLS = new Map([
  {
    name: "tower_register",
    description: `${ACTIVE_PRECONDITION} Join the tower as this worktree. Identity is derived from the working directory, not declared. The Main worktree uses orchestrator; other worktrees use agent.`,
    inputSchema: {
      type: "object",
      properties: {
        role: {
          type: "string",
          enum: ["orchestrator", "agent"],
          description:
            "orchestrator is reserved for the Main worktree; all other worktrees use agent",
        },
      },
      required: ["role"],
    },
  },
  {
    name: "tower_status",
    description:
      "Call this before any other tower tool. Reports whether the tower is active, every agent, its state, pending message count, and who holds each lock. Available while the tower is off.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "tower_send",
    description: `${ACTIVE_PRECONDITION} Queue a message for another agent. It is delivered when that agent's session next goes idle; it is never lost if the recipient is busy.`,
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string", description: "recipient agent name (its worktree basename)" },
        text: { type: "string", description: "the instruction or report, kept to a few lines" },
      },
      required: ["to", "text"],
    },
  },
  {
    name: "tower_set_state",
    description: `${ACTIVE_PRECONDITION} Update your own state. One of: ${tower.STATES.join(", ")}.`,
    inputSchema: {
      type: "object",
      properties: {
        state: { type: "string", enum: tower.STATES },
        task: { type: "string", description: "what you were assigned" },
        note: { type: "string", description: "one line of current status or evidence" },
        pr_url: { type: "string" },
      },
      required: ["state"],
    },
  },
  {
    name: "tower_acquire",
    description: `${ACTIVE_PRECONDITION} Request an exclusive lock. Returns granted:false with the current holder if someone else has it — do not proceed in that case. 'git-delivery' gates push/PR; 'db-writer' gates schema or data mutation. Parallel work is fine; delivery is not.`,
    inputSchema: {
      type: "object",
      properties: { lock: { type: "string", enum: tower.LOCKS } },
      required: ["lock"],
    },
  },
  {
    name: "tower_release",
    description:
      "Call tower_status first. Release a lock you hold. While active:false, use this only to recover a lock safely; do not attempt normal coordination. Release git-delivery only after the merge is verified on the remote.",
    inputSchema: {
      type: "object",
      properties: { lock: { type: "string", enum: tower.LOCKS } },
      required: ["lock"],
    },
  },
  {
    name: "tower_transfer",
    description: `${ACTIVE_PRECONDITION} Hand a lock you hold to another agent in one step, without it ever being free in between. The orchestrator reserves 'git-delivery', then transfers it to the unit whose turn it is, so the holder is always whoever is actually delivering. Only the holder can transfer.`,
    inputSchema: {
      type: "object",
      properties: {
        lock: { type: "string", enum: tower.LOCKS },
        to: { type: "string", description: "receiving agent name (its worktree basename)" },
      },
      required: ["lock", "to"],
    },
  },
  {
    name: "tower_receive",
    description: `${ACTIVE_PRECONDITION} Pull your next queued message manually. Sessions are normally woken with it automatically, so reach for this only when checking on purpose.`,
    inputSchema: { type: "object", properties: {} },
  },
].map((tool) => [tool.name, tool]))
const CONTINUATION_TOOL_DEFINITIONS = new Map([
  {
    name: "bootstrapMain",
    description: "Bind the canonical Main authority while continuation is OFF.",
    inputSchema: {
      type: "object", additionalProperties: false,
      properties: { request_identity: { type: "string" }, expected_anchor_id: { type: "string" }, expected_binding_epoch: { type: "integer", minimum: 0 } },
      required: ["request_identity", "expected_anchor_id", "expected_binding_epoch"],
    },
  },
  {
    name: "activate",
    description: "Explicitly activate continuation from the bound canonical Main.",
    inputSchema: {
      type: "object", additionalProperties: false,
      properties: { request_identity: { type: "string" }, expected_mode: { type: "string", enum: ["OFF"] }, expected_binding_epoch: { type: "integer", minimum: 0 }, evidence_digest: { type: "string" } },
      required: ["request_identity", "expected_mode", "expected_binding_epoch", "evidence_digest"],
    },
  },
  { name: "status", description: "Read exact continuation status without mutation.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  {
    name: "register",
    description: "Register the constructor-bound continuation claimant identity.",
    inputSchema: {
      type: "object", additionalProperties: false,
      properties: { request_identity: { type: "string" }, expected_binding_epoch: { type: "integer", minimum: 0 }, expected_binding_state: { type: "string", enum: ["ABSENT", "ACTIVE"] } },
      required: ["request_identity", "expected_binding_epoch", "expected_binding_state"],
    },
  },
  { name: "receive", description: "Peek continuation delivery without consuming it.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  {
    name: "create",
    description: "Create an immutable DRAFT generation-0 handoff from the canonical payload, under the ACTIVE producer identity.",
    inputSchema: {
      type: "object", additionalProperties: false,
      properties: {
        request_identity: { type: "string" },
        lineage_id: { type: "string" },
        revision: { type: "integer", minimum: 1 },
        payload: { type: "object" },
        payload_digest: { type: "string" },
      },
      required: ["request_identity", "lineage_id", "revision", "payload", "payload_digest"],
    },
  },
].map((tool) => [tool.name, tool]))

const GUARDED_TOOLS = new Set([
  "tower_register",
  "tower_send",
  "tower_set_state",
  "tower_acquire",
  "tower_transfer",
  "tower_receive",
])

const makeCall = (cwd, continuationTools, dispatch) => (name, args) => {
  if (continuationTools.has(name)) return dispatch(name, args)
  if (!LEGACY_TOOLS.has(name)) throw new Error(`unknown tool "${name}"`)
  // Reject before opening SQLite when possible. Every guarded core operation
  // checks again, so disarming between this precheck and dispatch is still safe.
  if (GUARDED_TOOLS.has(name)) tower.assertActive({ place: tower.locate(cwd) })
  const handle = tower.open(cwd)
  try {
    switch (name) {
      case "tower_register": return tower.register(handle, args.role)
      case "tower_status": return tower.status(handle)
      case "tower_send": return tower.send(handle, { to: args.to, text: args.text })
      case "tower_set_state": return tower.setState(handle, { state: args.state, task: args.task, note: args.note, prUrl: args.pr_url })
      case "tower_acquire": return tower.acquire(handle, args.lock)
      case "tower_release": return tower.release(handle, args.lock)
      case "tower_transfer": return tower.transfer(handle, args.lock, args.to)
      case "tower_receive": return tower.receive(handle) ?? { message: null }
      default: throw new Error(`unknown tool "${name}"`)
    }
  } finally { handle.db?.close() }
}

const send = (msg) => process.stdout.write(`${JSON.stringify(msg)}\n`)

export const createMcpHandler = ({ cwd = process.cwd(), trustedMetadata, processIdentity } = {}) => {
  const enabled = Boolean(trustedMetadata?.snapshot && processIdentity?.snapshot)
  const continuationTools = enabled ? CONTINUATION_TOOL_DEFINITIONS : new Map()
  const dispatch = enabled ? tower.createContinuationDispatcher({ cwd, trustedMetadata, processIdentity }) : null
  const call = makeCall(cwd, continuationTools, dispatch)
  return (req) => {
    const { method, params } = req
    switch (method) {
      case "initialize":
        return { protocolVersion: params?.protocolVersion ?? "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "control-tower", version: "0.1.0" } }
      case "tools/list": return { tools: [...LEGACY_TOOLS.values(), ...continuationTools.values()] }
      case "tools/call": {
        try {
          const result = call(params.name, params.arguments === undefined ? {} : params.arguments)
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] }
        } catch (error) {
          // Reported as a tool result, not a protocol error, so the model reads
          // the reason and can correct itself instead of seeing a dead call.
          return { content: [{ type: "text", text: `ERROR: ${error.message}` }], isError: true }
        }
      }
      default: return undefined
    }
  }
}

if (import.meta.main) {
  const handle = createMcpHandler()
  let buffer = ""
  process.stdin.setEncoding("utf8")
  process.stdin.on("data", (chunk) => {
    buffer += chunk
    let cut
    while ((cut = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, cut).trim()
      buffer = buffer.slice(cut + 1)
      if (!line) continue
      let req
      try { req = JSON.parse(line) } catch { continue }
      let result
      try { result = handle(req) } catch (error) {
        if (req.id !== undefined) send({ jsonrpc: "2.0", id: req.id, error: { code: -32603, message: error.message } })
        continue
      }
      if (req.id !== undefined && result !== undefined) send({ jsonrpc: "2.0", id: req.id, result })
    }
  })
}
