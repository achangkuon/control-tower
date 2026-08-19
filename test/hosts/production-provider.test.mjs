import { expect, test } from "bun:test"

import { assertParentlessSessionCreation, createProductionProvider, parseCreatedRoot, parseHostOutput, parseOpenCodeAgent, parseServerAnnouncement } from "../../hosts/production-provider.mjs"

test("production provider rejects an unpackaged module before accepting caller launch authority", () => {
  expect(() => createProductionProvider({
    cwd: "/attacker", environment: { HERDR_ENV: "1", PATH: "/attacker" },
    recordPath: "/attacker/record.json", herdrBin: "/attacker/herdr", opencodeBin: "/attacker/opencode",
  })).toThrow("Main launch store is unavailable")
})

test("production provider exposes no caller supplied executable or environment configuration", () => {
  expect(createProductionProvider.length).toBe(0)
})

test("accepts only canonical Herdr 0.8 OpenCode custody responses", () => {
  const sessionId = `ses_${"a".repeat(26)}`
  const response = { result: { type: "agent_started", agent: { name: "ctopencode-w1p1", agent: "opencode", agent_status: "working", cwd: "/work/a", pane_id: "w1:p1", terminal_id: "term_a1", agent_session: { source: "herdr:opencode", agent: "opencode", kind: "id", value: sessionId } } } }
  expect(parseOpenCodeAgent(response, { type: "agent_started", name: "ctopencode-w1p1", pane_id: "w1:p1", worktree: "/work/a" })).toEqual({ name: "ctopencode-w1p1", pane_id: "w1:p1", terminal_id: "term_a1", session_id: sessionId, worktree: "/work/a" })
  const expected = { type: "agent_started", name: "ctopencode-w1p1", pane_id: "w1:p1", worktree: "/work/a" }
  for (const value of ["--help", "root-a", `ses_${"a".repeat(25)}`, `ses_${"a".repeat(27)}`, `ses_${"a".repeat(25)}-`]) {
    const invalid = structuredClone(response)
    invalid.result.agent.agent_session.value = value
    expect(() => parseOpenCodeAgent(invalid, expected)).toThrow("Herdr did not report canonical OpenCode custody")
  }
  for (const mutate of [
    (value) => { value.result.type = "agent_info" },
    (value) => { value.result.agent.name = "foreign" },
    (value) => { value.result.agent.agent = "pi" },
    (value) => { value.result.agent.cwd = "/work/other" },
    (value) => { value.result.agent.pane_id = "w1:p2" },
    (value) => { value.result.agent.terminal_id = "--help" },
    (value) => { value.result.agent.agent_session.source = "caller" },
    (value) => { value.result.agent.agent_session.agent = "pi" },
    (value) => { value.result.agent.agent_session.kind = "path" },
    (value) => { value.result.agent.agent_session.extra = true },
  ]) {
    const invalid = structuredClone(response); mutate(invalid)
    expect(() => parseOpenCodeAgent(invalid, expected)).toThrow("Herdr did not report canonical OpenCode custody")
  }
})

test("rejects duplicate raw JSON object keys before host response semantics", () => {
  const valid = `{"result":{"type":"agent_info","agent":{"agent_session":{"source":"herdr:opencode","agent":"opencode","kind":"id","value":"ses_${"a".repeat(26)}"}}}}`
  expect(parseHostOutput({ status: 0, stdout: valid })).toEqual(JSON.parse(valid))
  for (const duplicate of [
    '{"result":{},"result":{}}',
    '{"result":{"agent":{},"agent":{}}}',
    '{"result":{"agent":{"agent_session":{},"agent_session":{}}}}',
    '{"result":{"agent":{"agent_session":{"kind":"path","kind":"id"}}}}',
    '{"result":{"agent":{"agent_session":{"value":"foreign","value":"ses_aaaaaaaaaaaaaaaaaaaaaaaaaa"}}}}',
  ]) expect(() => parseHostOutput({ status: 0, stdout: duplicate })).toThrow("Host process returned invalid JSON")
})

// --- S4.5 / M4.5.2 — Main-owned backend wiring -------------------------------
// Decision A (maintainer, 2026-08-18): Main proves rootness BY CONSTRUCTION, because it is the
// creator and POST /api/session structurally cannot be asked for a parent. Three locks keep that
// honest: identity is minted only for a session created in the same call; the request schema is
// asserted to still lack any parent field; and the agent is verified by readback, never asserted.

const rootId = `ses_${"a".repeat(26)}`
const created = { data: { agent: "gentle-orchestrator", cost: 0, id: rootId, location: {}, projectID: "prj", time: {}, title: "", tokens: {} } }
const readback = { data: { ...created.data } }
const creationSchema = { type: "object", additionalProperties: false, properties: { agent: {}, id: {}, location: {}, model: {} } }
const thrown = (operation) => { try { operation() } catch (error) { return error.code }; return null }

test("reads the backend url only from the server's own announcement, on loopback", () => {
  expect(parseServerAnnouncement("opencode server listening on http://127.0.0.1:4096\n")).toBe("http://127.0.0.1:4096")
  expect(parseServerAnnouncement("noise\nopencode server listening on http://127.0.0.1:65535\n")).toBe("http://127.0.0.1:65535")
  for (const line of [
    "opencode server listening on http://10.0.0.5:4096",
    "opencode server listening on http://0.0.0.0:4096",
    "opencode server listening on https://127.0.0.1:4096",
    "opencode server listening on http://127.0.0.1",
    "opencode server listening on http://127.0.0.1:0",
    "listening on http://127.0.0.1:4096",
    "opencode server listening on --help",
    "", "x".repeat(70_000), null, 42,
  ]) expect(thrown(() => parseServerAnnouncement(line))).toBe("CT_BACKEND_REJECTED")
})

// Lock 2: the whole of decision A rests on this endpoint being unable to take a parent. If a future
// OpenCode adds one, the assumption must break loudly here instead of silently mislabelling a child.
test("asserts the creation endpoint still cannot be asked for a parent", () => {
  expect(assertParentlessSessionCreation(creationSchema)).toBe(true)
  for (const schema of [
    { ...creationSchema, additionalProperties: true },
    { ...creationSchema, additionalProperties: undefined },
    { ...creationSchema, properties: { ...creationSchema.properties, parentID: {} } },
    { ...creationSchema, properties: { ...creationSchema.properties, parent: {} } },
    { ...creationSchema, properties: { ...creationSchema.properties, parent_id: {} } },
    { ...creationSchema, properties: {} },
    { type: "object", additionalProperties: false },
    null, undefined, "object", [],
  ]) expect(thrown(() => assertParentlessSessionCreation(schema))).toBe("CT_BACKEND_REJECTED")
})

// Lock 3: the agent is the half the API does report, so it is verified against a readback of the
// exact session, never taken from the create response alone and never assumed.
test("mints a root descriptor only from a session it created and re-read", () => {
  expect(parseCreatedRoot(created, readback, rootId)).toEqual({ agent: "gentle-orchestrator", id: rootId, parentID: null })
  for (const [bad, note] of [
    [[{ data: { ...created.data, agent: "build" } }, readback], "create reports another agent"],
    [[created, { data: { ...readback.data, agent: "build" } }], "readback drifted to another agent"],
    [[created, { data: { ...readback.data, id: `ses_${"b".repeat(26)}` } }], "readback is a different session"],
    [[{ data: { ...created.data, id: "root-a" } }, readback], "non-canonical id"],
    [[{ data: { ...created.data, id: "--help" } }, readback], "option-shaped id"],
    [[{ data: { ...created.data, agent: undefined } }, readback], "no agent reported"],
    [[{ data: { ...created.data, parentID: rootId } }, readback], "create reported a parent"],
    [[created, { data: { ...readback.data, parentID: rootId } }], "readback reported a parent"],
    [[null, readback], "no create response"],
    [[created, null], "no readback"],
    [[{}, readback], "empty envelope"],
    [[created.data, readback], "unwrapped envelope"],
  ]) expect(thrown(() => parseCreatedRoot(bad[0], bad[1], rootId))).toBe("CT_BACKEND_REJECTED")
})

// Lock 1: identity is bound to the id the caller just created. A session it merely looked up cannot
// be laundered into a root by passing it here.
test("refuses to mint a root for any session other than the one just created", () => {
  for (const expected of [`ses_${"b".repeat(26)}`, "root-a", "--help", "", null, undefined]) {
    expect(thrown(() => parseCreatedRoot(created, readback, expected))).toBe("CT_BACKEND_REJECTED")
  }
})
