import { expect, test } from "bun:test"

import { createProductionProvider, parseHostOutput, parseOpenCodeAgent } from "../../hosts/production-provider.mjs"

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
