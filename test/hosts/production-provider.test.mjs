import { expect, test } from "bun:test"

import { createProductionProvider, parseHostOutput } from "../../hosts/production-provider.mjs"

test("production provider rejects an unpackaged module before accepting caller launch authority", () => {
  expect(() => createProductionProvider({
    cwd: "/attacker", environment: { HERDR_ENV: "1", PATH: "/attacker" },
    recordPath: "/attacker/record.json", herdrBin: "/attacker/herdr", opencodeBin: "/attacker/opencode",
  })).toThrow("Main launch store is unavailable")
})

test("production provider exposes no caller supplied executable or environment configuration", () => {
  expect(createProductionProvider.length).toBe(0)
})

test("rejects duplicate raw JSON object keys before host response semantics", () => {
  const valid = '{"result":{"agent":{"agent_root_observation":{"pane_id":"pane-a","session_id":"root-a","parent_id":null}}}}'
  expect(parseHostOutput({ status: 0, stdout: valid })).toEqual(JSON.parse(valid))
  for (const duplicate of [
    '{"result":{},"result":{}}',
    '{"result":{"agent":{},"agent":{}}}',
    '{"result":{"agent":{"agent_root_observation":{},"agent_root_observation":{}}}}',
    '{"result":{"agent":{"agent_root_observation":{"pane_id":"foreign","pane_id":"pane-a","session_id":"root-a","parent_id":null}}}}',
    '{"result":{"agent":{"agent_root_observation":{"pane_id":"pane-a","session_id":"foreign","session_id":"root-a","parent_id":"parent","parent_id":null}}}}',
  ]) expect(() => parseHostOutput({ status: 0, stdout: duplicate })).toThrow("Host process returned invalid JSON")
})
